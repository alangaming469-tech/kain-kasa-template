# 📡 Kain & Kasa API Documentation

Complete API documentation untuk e-commerce catalog & shopping cart system.

---

## 🌐 Base URL

**Development:**
```
http://localhost:3000/api
```

**Production:**
```
https://yourdomain.com/api
```

---

## 🔑 Authentication

### **Guest Users**
- Tidak perlu authentication
- Harus include `X-Session-ID` header (UUID format)
```bash
curl -X GET http://localhost:3000/api/cart \
  -H "X-Session-ID: 550e8400-e29b-41d4-a716-446655440000"
```

### **Registered Users**
- Include JWT token in Authorization header
```bash
curl -X GET http://localhost:3000/api/cart \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📚 API ENDPOINTS

### **Products API**

#### **1. GET /api/products**
Get all products with filters

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | - | Filter by category slug or ID |
| `minPrice` | number | - | Minimum price filter |
| `maxPrice` | number | - | Maximum price filter |
| `search` | string | - | Search by name/description |
| `sort` | string | `created_at` | `created_at`, `price`, `name`, `stock` |
| `order` | string | `DESC` | `ASC` or `DESC` |
| `limit` | number | `20` | Number of items per page |
| `offset` | number | `0` | Pagination offset |
| `featured` | boolean | - | Filter featured products only |

**Request:**
```bash
GET /api/products?category=clothing&minPrice=100000&maxPrice=300000&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "sku": "KAOS-001",
        "name": "Kaos Oversized Street",
        "slug": "kaos-oversized-street",
        "shortDescription": "Premium cotton...",
        "basePrice": 149000,
        "discountPrice": null,
        "discountPercentage": null,
        "availableStock": 48,
        "totalStock": 50,
        "mainImage": "/images/kaos.jpg",
        "images": ["/img1.jpg", "/img2.jpg"],
        "status": "active",
        "isFeatured": false,
        "createdAt": "2026-06-18T10:00:00Z",
        "categoryId": "uuid",
        "categoryName": "Clothing",
        "categorySlug": "clothing",
        "stockStatus": "in_stock"
      }
    ],
    "pagination": {
      "total": 25,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

#### **2. GET /api/products/:slug**
Get single product detail by slug

**Request:**
```bash
GET /api/products/kaos-oversized-street
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sku": "KAOS-001",
    "name": "Kaos Oversized Street",
    "slug": "kaos-oversized-street",
    "description": "Full description...",
    "basePrice": 149000,
    "availableStock": 48,
    "mainImage": "/images/kaos.jpg",
    "images": ["/img1.jpg", "/img2.jpg", "/img3.jpg"],
    "categoryId": "uuid",
    "categoryName": "Clothing",
    "variants": [
      {
        "id": "uuid",
        "type": "size",
        "value": "M",
        "priceAdjustment": 0,
        "stock": 15,
        "availableStock": 15,
        "sku": "KAOS-001-M"
      },
      {
        "id": "uuid",
        "type": "size",
        "value": "L",
        "priceAdjustment": 0,
        "stock": 20,
        "availableStock": 20,
        "sku": "KAOS-001-L"
      }
    ]
  }
}
```

---

#### **3. GET /api/products/:id/variants**
Get all variants for a product

**Request:**
```bash
GET /api/products/uuid-kaos/variants
```

**Response:**
```json
{
  "success": true,
  "data": {
    "productId": "uuid-kaos",
    "variants": [
      {
        "id": "uuid",
        "type": "size",
        "value": "M",
        "priceAdjustment": 0,
        "stock": 15,
        "availableStock": 15,
        "sku": "KAOS-001-M",
        "imageUrl": null,
        "displayOrder": 0
      }
    ],
    "total": 3
  }
}
```

---

#### **4. GET /api/categories**
Get all categories (support nested)

**Request:**
```bash
GET /api/categories
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Clothing",
      "slug": "clothing",
      "description": "Fashion category",
      "parentId": null,
      "imageUrl": "/img/clothing.jpg",
      "displayOrder": 0,
      "depth": 0,
      "productCount": 15
    },
    {
      "id": "uuid",
      "name": "T-Shirts",
      "slug": "t-shirts",
      "description": null,
      "parentId": "uuid-parent",
      "imageUrl": null,
      "displayOrder": 1,
      "depth": 1,
      "productCount": 8
    }
  ]
}
```

---

### **Cart API**

#### **1. GET /api/cart**
Get current user's cart

**Headers:**
```
X-Session-ID: 550e8400-e29b-41d4-a716-446655440000
```

**Request:**
```bash
GET /api/cart
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-cart",
    "userId": null,
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "items": [
      {
        "cartItemId": "uuid-item",
        "productId": "uuid-product",
        "variantId": "uuid-variant",
        "quantity": 2,
        "priceAtAdd": 149000,
        "subtotal": 298000,
        "variantName": "L",
        "variantType": "size",
        "productName": "Kaos Oversized Street",
        "productSlug": "kaos-oversized-street",
        "productImage": "/images/kaos.jpg",
        "productSku": "KAOS-001",
        "variantValue": "Large",
        "lockExpiresAt": "2026-06-18T11:00:00Z"
      }
    ],
    "itemCount": 2,
    "subtotal": 298000,
    "discount": 0,
    "tax": 0,
    "total": 298000,
    "currency": "IDR",
    "createdAt": "2026-06-18T10:30:00Z",
    "updatedAt": "2026-06-18T10:35:00Z",
    "expiresAt": "2026-06-18T11:00:00Z",
    "minutesUntilExpiry": 25
  }
}
```

---

#### **2. POST /api/cart/items** ⭐ **CRITICAL**
Add item to cart (with automatic stock locking)

**Body:**
```json
{
  "productId": "uuid-product",
  "variantId": "uuid-variant", // Optional
  "quantity": 2,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000" // If not in header
}
```

**Headers:**
```
X-Session-ID: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
```

**Request:**
```bash
curl -X POST http://localhost:3000/api/cart/items \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "productId": "uuid-kaos",
    "variantId": "uuid-variant-L",
    "quantity": 2
  }'
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Item added to cart successfully",
  "data": {
    "cartId": "uuid-cart",
    "cartItemId": "uuid-item",
    "lockId": "uuid-lock",
    "expiresAt": "2026-06-18T11:00:00Z",
    "minutesUntilExpiry": 15,
    "cart": {
      "id": "uuid-cart",
      "itemCount": 2,
      "total": 298000,
      "items": [
        {
          "cartItemId": "uuid-item",
          "productId": "uuid-kaos",
          "quantity": 2,
          "subtotal": 298000,
          "productName": "Kaos Oversized Street"
        }
      ]
    }
  },
  "warning": null
}
```

**Error Response (400) - Stock Habis:**
```json
{
  "success": false,
  "error": "Stock tidak mencukupi",
  "errorCode": "INSUFFICIENT_STOCK"
}
```

**Error Response (400) - Lock Expired:**
```json
{
  "success": false,
  "error": "Some items in your cart are no longer available",
  "errorCode": "STOCK_CHANGED",
  "warning": "Hurry! Your cart will expire soon"
}
```

---

#### **3. PUT /api/cart/items/:itemId**
Update cart item quantity

**Body:**
```json
{
  "quantity": 3 // Set to 0 to remove
}
```

**Request:**
```bash
curl -X PUT http://localhost:3000/api/cart/items/uuid-item \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "quantity": 3
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Cart updated",
  "data": {
    "id": "uuid-item",
    "cart_id": "uuid-cart",
    "product_id": "uuid-product",
    "quantity": 3,
    "subtotal": 447000
  }
}
```

---

#### **4. DELETE /api/cart/items/:itemId**
Remove item from cart (auto-release stock lock)

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/cart/items/uuid-item \
  -H "X-Session-ID: 550e8400-e29b-41d4-a716-446655440000"
```

**Response:**
```json
{
  "success": true,
  "message": "Item removed from cart"
}
```

---

#### **5. POST /api/cart/checkout**
Process checkout & payment

**Body:**
```json
{
  "shippingAddress": {
    "name": "Alan",
    "phone": "+6281234567890",
    "address": "Jl. Example No. 123",
    "city": "Jakarta",
    "province": "DKI Jakarta",
    "postalCode": "12345"
  },
  "paymentMethod": "midtrans"
}
```

**Request:**
```bash
curl -X POST http://localhost:3000/api/cart/checkout \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "shippingAddress": {...},
    "paymentMethod": "midtrans"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Checkout successful!",
  "data": {
    "orderId": "new-uuid",
    "cartId": "uuid-cart",
    "total": 298000
  }
}
```

---

#### **6. POST /api/cart/merge**
Merge guest cart with user cart (on login)

**Body:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Request:**
```bash
curl -X POST http://localhost:3000/api/cart/merge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbG..." \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Cart merged successfully"
}
```

---

#### **7. DELETE /api/cart**
Clear/abandon cart (release all stock locks)

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/cart \
  -H "X-Session-ID: 550e8400-e29b-41d4-a716-446655440000"
```

**Response:**
```json
{
  "success": true,
  "message": "Cart cleared"
}
```

---

### **Stock API**

#### **GET /api/stock/:productId**
Check stock availability

**Request:**
```bash
GET /api/stock/uuid-product
```

**Response:**
```json
{
  "success": true,
  "data": {
    "productId": "uuid-product",
    "totalStock": 50,
    "availableStock": 48,
    "lockedStock": 2,
    "trulyAvailable": 48,
    "stockStatus": "in_stock"
  }
}
```

---

## 📊 ERROR CODES

| Code | Description | Solution |
|------|-------------|----------|
| `INSUFFICIENT_STOCK` | Stock tidak cukup | Kurangi quantity atau pilih varian lain |
| `STOCK_CHANGED` | Stock berubah saat di cart | Refresh cart, item tidak tersedia lagi |
| `CART_EXPIRED` | Cart lock expired (>15 min) | Add ulang item ke cart |
| `PRODUCT_NOT_FOUND` | Produk tidak ada | Check product ID/slug |
| `VARIANT_NOT_FOUND` | Varian tidak ada | Check variant ID |

---

## 🔒 RATE LIMITING

```
100 requests per 15 minutes per IP
```

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1629345600
```

**Exceed limit:**
```json
{
  "success": false,
  "error": "Too many requests, please try again later"
}
```

---

## 🌐 CORS

**Allowed Origins:**
```
http://localhost:8080
https://alangaming469-tech.github.io
```

**Headers Required:**
```
X-Session-ID: (for guest users)
Authorization: Bearer <token> (for registered users)
```

---

## 🚀 FRONTEND INTEGRATION EXAMPLE

### **JavaScript/React:**

```javascript
// api.js
const API_BASE = 'http://localhost:3000/api';

// Get session ID (generate if not exists)
const getSessionId = () => {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

// Get products
export const getProducts = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const res = await fetch(`${API_BASE}/products?${params}`);
  return res.json();
};

// Get single product
export const getProduct = async (slug) => {
  const res = await fetch(`${API_BASE}/products/${slug}`);
  return res.json();
};

// Get cart
export const getCart = async () => {
  const res = await fetch(`${API_BASE}/cart`, {
    headers: {
      'X-Session-ID': getSessionId()
    }
  });
  return res.json();
};

// Add to cart
export const addToCart = async (productId, variantId, quantity) => {
  const res = await fetch(`${API_BASE}/cart/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': getSessionId()
    },
    body: JSON.stringify({
      productId,
      variantId,
      quantity
    })
  });
  return res.json();
};

// Remove from cart
export const removeFromCart = async (itemId) => {
  const res = await fetch(`${API_BASE}/cart/items/${itemId}`, {
    method: 'DELETE',
    headers: {
      'X-Session-ID': getSessionId()
    }
  });
  return res.json();
};
```

---

## 📞 NEED HELP?

- API Health Check: `GET /health`
- Logs: Check `api/logs/` folder
- Database: PostgreSQL `ecommerce_db`

**Happy Coding! 🚀**