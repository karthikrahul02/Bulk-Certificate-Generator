# Architecture

## Modules

- Auth: JWT login and role claims.
- Customers: CRM records, search, detail, and follow-up notes.
- Products: Inventory master data and stock thresholds.
- Stock Movements: Audit trail for IN and OUT changes.
- Challans: Sales dispatch flow with draft, confirmed, and cancelled statuses.
- Dashboard: Aggregated operational metrics from real backend data.

## Data Model

- One customer can have many follow-ups and challans.
- One product can have many stock movements and challan items.
- One challan contains many challan items.
- Challan items keep product snapshots so historical documents remain accurate after product changes.

## Critical Transaction

Challan confirmation runs inside a Prisma transaction:

1. Load challan and item records.
2. Validate the challan is still draft.
3. Validate each product has enough stock.
4. Decrement product stock.
5. Create OUT stock movements.
6. Mark challan confirmed.

If any step fails, no stock or challan change is committed.
