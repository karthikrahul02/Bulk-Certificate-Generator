import { Router } from "express";
import { MovementType, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles, type AuthRequest } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../utils/http.js";

const router = Router();
router.use(requireAuth);

const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  category: z.string().min(2),
  unitPrice: z.coerce.number().nonnegative(),
  currentStock: z.coerce.number().int().nonnegative().default(0),
  minStock: z.coerce.number().int().nonnegative().default(0),
  location: z.string().min(2)
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page || 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize || 10), 1), 50);
    const search = String(req.query.search || "").trim();
    const lowStock = req.query.lowStock === "true";
    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { sku: { contains: search, mode: "insensitive" as const } },
              { category: { contains: search, mode: "insensitive" as const } }
            ]
          }
        : {})
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      items: lowStock ? items.filter((item) => item.currentStock <= item.minStock) : items,
      total,
      page,
      pageSize
    });
  })
);

router.post(
  "/",
  requireRoles(Role.ADMIN, Role.WAREHOUSE),
  asyncHandler(async (req, res) => {
    const input = productSchema.parse(req.body);
    const product = await prisma.product.create({ data: input });
    res.status(201).json(product);
  })
);

router.put(
  "/:id",
  requireRoles(Role.ADMIN, Role.WAREHOUSE),
  asyncHandler(async (req, res) => {
    const input = productSchema.partial().parse(req.body);
    const product = await prisma.product.update({ where: { id: req.params.id }, data: input });
    res.json(product);
  })
);

const movementSchema = z.object({
  quantity: z.coerce.number().int().positive(),
  type: z.nativeEnum(MovementType),
  reason: z.string().min(3)
});

router.post(
  "/:id/stock-movements",
  requireRoles(Role.ADMIN, Role.WAREHOUSE),
  asyncHandler(async (req, res) => {
    const input = movementSchema.parse(req.body);
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: req.params.id } });
      if (!product) throw new HttpError(404, "Product not found");
      const nextStock =
        input.type === MovementType.IN
          ? product.currentStock + input.quantity
          : product.currentStock - input.quantity;
      if (nextStock < 0) throw new HttpError(409, "Stock cannot become negative");

      const updated = await tx.product.update({
        where: { id: product.id },
        data: { currentStock: nextStock }
      });
      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          quantity: input.quantity,
          type: input.type,
          reason: input.reason,
          createdById: (req as AuthRequest).user.id
        }
      });
      return { product: updated, movement };
    });
    res.status(201).json(result);
  })
);

router.get(
  "/:id/stock-movements",
  asyncHandler(async (req, res) => {
    const movements = await prisma.stockMovement.findMany({
      where: { productId: req.params.id },
      include: { createdBy: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" }
    });
    res.json(movements);
  })
);

export default router;
