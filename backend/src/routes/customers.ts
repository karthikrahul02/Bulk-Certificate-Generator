import { Router } from "express";
import { CustomerStatus, CustomerType, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles, type AuthRequest } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../utils/http.js";

const router = Router();
router.use(requireAuth);

const customerSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
  businessName: z.string().min(2),
  gstNumber: z.string().optional(),
  type: z.nativeEnum(CustomerType),
  address: z.string().min(5),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.LEAD),
  followUpDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional()
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 10), 1), 50);
    const search = String(req.query.search || "").trim();
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { businessName: { contains: search, mode: "insensitive" as const } },
            { mobile: { contains: search, mode: "insensitive" as const } }
          ]
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.customer.count({ where })
    ]);

    res.json({ items, total, page, pageSize });
  })
);

router.post(
  "/",
  requireRoles(Role.ADMIN, Role.SALES),
  asyncHandler(async (req, res) => {
    const input = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({
      data: {
        ...input,
        email: input.email || null,
        followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
        createdById: (req as AuthRequest).user.id
      }
    });
    res.status(201).json(customer);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        followUps: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } },
        challans: { orderBy: { createdAt: "desc" } }
      }
    });
    if (!customer) throw new HttpError(404, "Customer not found");
    res.json(customer);
  })
);

router.put(
  "/:id",
  requireRoles(Role.ADMIN, Role.SALES),
  asyncHandler(async (req, res) => {
    const input = customerSchema.partial().parse(req.body);
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...input,
        email: input.email === "" ? null : input.email,
        followUpDate: input.followUpDate ? new Date(input.followUpDate) : undefined
      }
    });
    res.json(customer);
  })
);

const followUpSchema = z.object({
  note: z.string().min(3),
  nextDate: z.string().datetime().optional().nullable()
});

router.post(
  "/:id/follow-ups",
  requireRoles(Role.ADMIN, Role.SALES),
  asyncHandler(async (req, res) => {
    const input = followUpSchema.parse(req.body);
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) throw new HttpError(404, "Customer not found");

    const followUp = await prisma.followUp.create({
      data: {
        customerId: req.params.id,
        note: input.note,
        nextDate: input.nextDate ? new Date(input.nextDate) : null,
        createdById: (req as AuthRequest).user.id
      }
    });
    res.status(201).json(followUp);
  })
);

export default router;
