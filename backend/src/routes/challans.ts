import { Router } from "express";
import { ChallanStatus, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles, type AuthRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";
import { cancelChallan, confirmChallan, createChallan } from "../services/challans.js";

const router = Router();
router.use(requireAuth);

const challanSchema = z.object({
  customerId: z.string().min(1),
  status: z.nativeEnum(ChallanStatus).default(ChallanStatus.DRAFT),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive()
      })
    )
    .min(1)
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 10), 1), 50);
    const status = req.query.status ? String(req.query.status) : undefined;
    const where = status ? { status: status as ChallanStatus } : {};

    const [items, total] = await Promise.all([
      prisma.challan.findMany({
        where,
        include: {
          customer: true,
          createdBy: { select: { name: true, role: true } },
          items: true
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.challan.count({ where })
    ]);

    res.json({ items, total, page, pageSize });
  })
);

router.post(
  "/",
  requireRoles(Role.ADMIN, Role.SALES),
  asyncHandler(async (req, res) => {
    const input = challanSchema.parse(req.body);
    const challan = await createChallan({
      ...input,
      userId: (req as AuthRequest).user.id
    });
    res.status(201).json(challan);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const challan = await prisma.challan.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        createdBy: { select: { name: true, role: true } },
        items: true
      }
    });
    res.json(challan);
  })
);

router.post(
  "/:id/confirm",
  requireRoles(Role.ADMIN, Role.SALES),
  asyncHandler(async (req, res) => {
    const challan = await confirmChallan(req.params.id, (req as AuthRequest).user.id);
    res.json(challan);
  })
);

router.post(
  "/:id/cancel",
  requireRoles(Role.ADMIN, Role.SALES),
  asyncHandler(async (req, res) => {
    const challan = await cancelChallan(req.params.id);
    res.json(challan);
  })
);

export default router;
