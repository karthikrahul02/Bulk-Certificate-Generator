import { ChallanStatus, MovementType, Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/http.js";

type ChallanItemInput = {
  productId: string;
  quantity: number;
};

export async function createChallan(input: {
  customerId: string;
  status: ChallanStatus;
  items: ChallanItemInput[];
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new HttpError(404, "Customer not found");

    const uniqueProductIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await tx.product.findMany({ where: { id: { in: uniqueProductIds } } });
    if (products.length !== uniqueProductIds.length) {
      throw new HttpError(400, "One or more products do not exist");
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const totalQuantity = input.items.reduce((sum, item) => sum + item.quantity, 0);
    const challanNumber = await nextChallanNumber(tx);

    if (input.status === ChallanStatus.CONFIRMED) {
      await assertAndDeductStock(tx, input.items, productMap, input.userId, challanNumber);
    }

    return tx.challan.create({
      data: {
        challanNumber,
        customerId: input.customerId,
        totalQuantity,
        status: input.status,
        createdById: input.userId,
        items: {
          create: input.items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: product.id,
              productNameSnapshot: product.name,
              skuSnapshot: product.sku,
              unitPriceSnapshot: product.unitPrice,
              quantity: item.quantity
            };
          })
        }
      },
      include: { customer: true, items: true }
    });
  });
}

export async function confirmChallan(challanId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({
      where: { id: challanId },
      include: { items: true }
    });
    if (!challan) throw new HttpError(404, "Challan not found");
    if (challan.status === ChallanStatus.CONFIRMED) {
      throw new HttpError(409, "Challan is already confirmed");
    }
    if (challan.status === ChallanStatus.CANCELLED) {
      throw new HttpError(409, "Cancelled challans cannot be confirmed");
    }

    const productIds = challan.items.map((item) => item.productId);
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((product) => [product.id, product]));
    await assertAndDeductStock(tx, challan.items, productMap, userId, challan.challanNumber);

    return tx.challan.update({
      where: { id: challanId },
      data: { status: ChallanStatus.CONFIRMED },
      include: { customer: true, items: true }
    });
  });
}

export async function cancelChallan(challanId: string) {
  const challan = await prisma.challan.findUnique({ where: { id: challanId } });
  if (!challan) throw new HttpError(404, "Challan not found");
  if (challan.status === ChallanStatus.CONFIRMED) {
    throw new HttpError(409, "Confirmed challans cannot be cancelled without a reversal process");
  }
  return prisma.challan.update({
    where: { id: challanId },
    data: { status: ChallanStatus.CANCELLED },
    include: { customer: true, items: true }
  });
}

async function nextChallanNumber(tx: Prisma.TransactionClient) {
  const count = await tx.challan.count();
  const year = new Date().getFullYear();
  return `CH-${year}-${String(count + 1).padStart(5, "0")}`;
}

async function assertAndDeductStock(
  tx: Prisma.TransactionClient,
  items: ChallanItemInput[],
  productMap: Map<string, { id: string; name: string; currentStock: number }>,
  userId: string,
  challanNumber: string
) {
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) throw new HttpError(400, "Product no longer exists");
    if (product.currentStock < item.quantity) {
      throw new HttpError(409, `Insufficient stock for ${product.name}`, {
        productId: product.id,
        available: product.currentStock,
        requested: item.quantity
      });
    }
  }

  for (const item of items) {
    const product = productMap.get(item.productId)!;
    await tx.product.update({
      where: { id: product.id },
      data: { currentStock: { decrement: item.quantity } }
    });
    await tx.stockMovement.create({
      data: {
        productId: product.id,
        quantity: item.quantity,
        type: MovementType.OUT,
        reason: `Sales challan ${challanNumber}`,
        createdById: userId
      }
    });
  }
}

export const challanRoles = [Role.ADMIN, Role.SALES] as const;
