# Mini ERP + CRM Operations Portal

Full-stack case-study implementation for a wholesale/distribution company. The system covers role-based access, customer CRM, product inventory, stock movement logs, sales challans, and a live dashboard.

## Tech Stack

- Backend: Node.js, TypeScript, Express, Prisma, PostgreSQL, JWT, Zod
- Frontend: React, TypeScript, Vite, responsive CSS
- Database: PostgreSQL
- DevOps: Docker Compose for local Postgres, deployable to Render/Railway/Fly.io plus Vercel/Netlify

## Core Business Rules

- Roles: Admin, Sales, Warehouse, Accounts.
- Backend enforces permissions; frontend role checks are only for navigation and UX.
- Product `currentStock` stores current inventory.
- `StockMovement` stores historical IN/OUT stock changes.
- Challan items store product snapshot fields: name, SKU, unit price, and quantity.
- Confirmed challans reduce stock inside a database transaction.
- Stock cannot become negative; insufficient stock returns HTTP `409`.
- Confirmed challans cannot be cancelled without a separate reversal process.

## Test Logins

All seeded users use password `Password@123`.

| Role | Email |
| --- | --- |
| Admin | `admin@mini-erp.test` |
| Sales | `sales@mini-erp.test` |
| Warehouse | `warehouse@mini-erp.test` |
| Accounts | `accounts@mini-erp.test` |

## Local Setup

1. Copy environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Start PostgreSQL:

```bash
docker compose up -d
```

3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client and create tables:

```bash
npm run prisma:generate --workspace backend
npm run prisma:migrate --workspace backend
```

5. Seed demo data:

```bash
npm run seed
```

6. Run both apps:

```bash
npm run dev
```

Backend: `http://localhost:4000`  
Frontend: `http://localhost:5173`

## API Overview

Detailed examples are in [docs/API.md](docs/API.md) and the Postman collection at [docs/postman_collection.json](docs/postman_collection.json).

Main endpoints:

- `POST /auth/login`
- `GET /dashboard`
- `GET /customers`
- `POST /customers`
- `PUT /customers/:id`
- `POST /customers/:id/follow-ups`
- `GET /products`
- `POST /products`
- `PUT /products/:id`
- `POST /products/:id/stock-movements`
- `GET /products/:id/stock-movements`
- `GET /challans`
- `POST /challans`
- `POST /challans/:id/confirm`
- `POST /challans/:id/cancel`

## Deployment

Free hosting options:

- Frontend: Vercel, Netlify, or Render Static Site.
- Backend: Render, Railway, or Fly.io.
- Database: Neon, Supabase, Render Postgres, or Railway Postgres.

Backend environment variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `FRONTEND_ORIGIN`

Frontend environment variables:

- `VITE_API_URL`

Deployment flow:

1. Provision PostgreSQL and set `DATABASE_URL`.
2. Deploy backend with build command `npm install && npm run build --workspace backend`.
3. Run Prisma migration on the backend environment.
4. Set `FRONTEND_ORIGIN` to the frontend URL.
5. Deploy frontend with `VITE_API_URL` pointing to the backend API.

## Architecture

Backend request flow:

`Route -> Auth/Role Middleware -> Zod Validation -> Controller Route Handler -> Service -> Prisma -> PostgreSQL`

The challan confirmation service owns the critical transaction: it validates product availability, decrements stock, records OUT movements, and updates challan status as one atomic operation.

## Assumptions

- Invoices and purchase orders are part of the business context, but the required modules focus on CRM, products, stock movements, and sales challans.
- Confirmed challan cancellation needs a reversal workflow, so it is intentionally blocked.
- Product images, PDF invoice export, S3 upload, and CI are bonus items and are not required for the core case-study flow.

## Known Limitations

- The frontend currently creates challans with one product line at a time; the backend already supports multiple products.
- Search/filter/pagination is implemented on API list endpoints; the UI exposes search for customers and full list loading for products/challans.
- No live deployment URL is included until hosting credentials/accounts are connected.
