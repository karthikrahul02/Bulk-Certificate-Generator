import "dotenv/config";
import bcrypt from "bcryptjs";
import { ChallanStatus, CustomerStatus, CustomerType, MovementType, PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password@123", 10);
  const users = await Promise.all(
    [
      ["Admin User", "admin@mini-erp.test", Role.ADMIN],
      ["Sales User", "sales@mini-erp.test", Role.SALES],
      ["Warehouse User", "warehouse@mini-erp.test", Role.WAREHOUSE],
      ["Accounts User", "accounts@mini-erp.test", Role.ACCOUNTS]
    ].map(([name, email, role]) =>
      prisma.user.upsert({
        where: { email: String(email) },
        update: { name: String(name), role: role as Role, passwordHash },
        create: { name: String(name), email: String(email), role: role as Role, passwordHash }
      })
    )
  );

  const admin = users[0];
  const sales = users[1];

  const customer = await prisma.customer.upsert({
    where: { id: "seed-customer-alpha" },
    update: {},
    create: {
      id: "seed-customer-alpha",
      name: "Ravi Mehta",
      mobile: "9876543210",
      email: "ravi@mehtatraders.test",
      businessName: "Mehta Traders",
      gstNumber: "29ABCDE1234F1Z5",
      type: CustomerType.WHOLESALE,
      address: "Market Road, Bengaluru",
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      notes: "Prefers weekly dispatch and WhatsApp updates.",
      createdById: sales.id
    }
  });

  await prisma.followUp.create({
    data: {
      customerId: customer.id,
      note: "Discussed monthly bulk pricing and delivery schedule.",
      nextDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdById: sales.id
    }
  });

  const products = await Promise.all(
    [
      ["seed-product-rice", "Premium Basmati Rice", "BAS-RICE-25", "Grains", 1850, 120, 25, "Warehouse A"],
      ["seed-product-oil", "Sunflower Oil Carton", "SUN-OIL-15", "Edible Oil", 1420, 18, 20, "Warehouse B"],
      ["seed-product-sugar", "Refined Sugar Bag", "SUG-BAG-50", "Staples", 2100, 65, 15, "Warehouse A"]
    ].map(([id, name, sku, category, unitPrice, currentStock, minStock, location]) =>
      prisma.product.upsert({
        where: { sku: String(sku) },
        update: {},
        create: {
          id: String(id),
          name: String(name),
          sku: String(sku),
          category: String(category),
          unitPrice: Number(unitPrice),
          currentStock: Number(currentStock),
          minStock: Number(minStock),
          location: String(location)
        }
      })
    )
  );

  await Promise.all(
    products.map((product) =>
      prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity: product.currentStock,
          type: MovementType.IN,
          reason: "Opening stock",
          createdById: admin.id
        }
      })
    )
  );

  const existingChallan = await prisma.challan.findUnique({
    where: { challanNumber: "CH-2026-00001" }
  });

  if (!existingChallan) {
    await prisma.challan.create({
      data: {
        challanNumber: "CH-2026-00001",
        customerId: customer.id,
        totalQuantity: 8,
        status: ChallanStatus.DRAFT,
        createdById: sales.id,
        items: {
          create: [
            {
              productId: products[0].id,
              productNameSnapshot: products[0].name,
              skuSnapshot: products[0].sku,
              unitPriceSnapshot: products[0].unitPrice,
              quantity: 5
            },
            {
              productId: products[2].id,
              productNameSnapshot: products[2].name,
              skuSnapshot: products[2].sku,
              unitPriceSnapshot: products[2].unitPrice,
              quantity: 3
            }
          ]
        }
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
