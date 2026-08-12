# API Documentation

Base URL: `http://localhost:4000`

Use `Authorization: Bearer <token>` for all endpoints except login.

## Authentication

### POST /auth/login

```json
{
  "email": "admin@mini-erp.test",
  "password": "Password@123"
}
```

Returns a JWT token and user profile.

## Dashboard

### GET /dashboard

Returns live metrics, low-stock products, recent challans, and recent stock movements.

## Customers

### GET /customers?search=mehta&page=1&pageSize=10

Returns paginated customer records.

### POST /customers

Roles: Admin, Sales.

```json
{
  "name": "Ravi Mehta",
  "mobile": "9876543210",
  "email": "ravi@example.com",
  "businessName": "Mehta Traders",
  "gstNumber": "29ABCDE1234F1Z5",
  "type": "WHOLESALE",
  "address": "Market Road, Bengaluru",
  "status": "LEAD",
  "notes": "Interested in bulk pricing"
}
```

### POST /customers/:id/follow-ups

Roles: Admin, Sales.

```json
{
  "note": "Called customer and shared revised quote.",
  "nextDate": "2026-08-20T10:00:00.000Z"
}
```

## Products

### GET /products?search=rice&page=1&pageSize=10

Returns paginated product records.

### POST /products

Roles: Admin, Warehouse.

```json
{
  "name": "Premium Basmati Rice",
  "sku": "BAS-RICE-25",
  "category": "Grains",
  "unitPrice": 1850,
  "currentStock": 120,
  "minStock": 25,
  "location": "Warehouse A"
}
```

### POST /products/:id/stock-movements

Roles: Admin, Warehouse.

```json
{
  "quantity": 25,
  "type": "IN",
  "reason": "New purchase received"
}
```

OUT movements are rejected if stock would become negative.

## Challans

### GET /challans?status=DRAFT&page=1&pageSize=10

Returns challans with customer and item snapshots.

### POST /challans

Roles: Admin, Sales.

```json
{
  "customerId": "customer-id",
  "status": "DRAFT",
  "items": [
    {
      "productId": "product-id",
      "quantity": 5
    }
  ]
}
```

If status is `CONFIRMED`, stock is deducted immediately.

### POST /challans/:id/confirm

Roles: Admin, Sales.

Confirms a draft challan, deducts stock, and records stock movements.

### POST /challans/:id/cancel

Roles: Admin, Sales.

Cancels only draft challans. Confirmed challans are blocked to avoid silent inventory reversal.
