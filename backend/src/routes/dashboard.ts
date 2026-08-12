import { Router } from "express";
import { ChallanStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [customers, products, confirmedChallans, recentChallans, recentMovements] =
      await Promise.all([
        prisma.customer.count(),
        prisma.product.count(),
        prisma.challan.count({ where: { status: ChallanStatus.CONFIRMED } }),
        prisma.challan.findMany({
          take: 6,
          orderBy: { createdAt: "desc" },
          include: { customer: true, items: true }
        }),
        prisma.stockMovement.findMany({
          take: 8,
          orderBy: { createdAt: "desc" },
          include: { product: true, createdBy: { select: { name: true } } }
        })
      ]);

    const allProducts = await prisma.product.findMany({ orderBy: { updatedAt: "desc" } });
    const lowStockProducts = allProducts.filter(
      (product) => product.currentStock <= product.minStock
    );

    res.json({
      metrics: {
        customers,
        products,
        confirmedChallans,
        lowStockProducts: lowStockProducts.length
      },
      lowStockProducts: lowStockProducts.slice(0, 8),
      recentChallans,
      recentMovements
    });
  })
);

export default router;
