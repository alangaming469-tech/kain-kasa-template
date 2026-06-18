# 🗄️ E-Commerce Database Schema (PostgreSQL)

Complete database schema untuk e-commerce catalog & shopping cart dengan **stock locking mechanism** untuk prevent overselling.

---

## 📋 **Daftar Tabel**

### **Core Tables:**

| Tabel | Deskripsi | Foreign Keys |
|-------|-----------|--------------|
| `users` | Data user (registered customers) | - |
| `categories` | Kategori produk (support nested) | `parent_id` → `categories.id` |
| `products` | Master data produk | `category_id` → `categories.id` |
| `variants` | Varian produk (size, color, dll) | `product_id` → `products.id` |
| `sessions` | Session untuk guest users | `user_id` → `users.id` |
| `carts` | Shopping cart | `user_id` → `users.id` |
| `cart_items` | Item dalam cart | `cart_id` → `carts.id`<br>`product_id` → `products.id`<br>`variant_id` → `variants.id` |
| `stock_locks` | **CRITICAL** - Lock stok sementara | `product_id` → `products.id`<br>`variant_id` → `variants.id`<br>`cart_id` → `carts.id`<br>`cart_item_id` → `cart_items.id` |
| `cart_audit_log` | Audit trail untuk cart activity | `cart_id` → `carts.id`<br>`cart_item_id` → `cart_items.id` |

---

## 🔑 **Foreign Key Relationships**

```
users (1) ←───→ carts (N)
                    │
                    │ (1)
                    ↓
                cart_items (N)
                    │
          ┌─────────┼─────────┐
          │         │         │
          ↓         ↓         ↓
     products   variants   stock_locks
          │         │         │
          └─────────┴─────────┘
                    │
                    ↓
              categories
```

### **Detailed Relationships:**

#### 1. **Products → Categories**
```sql
products.category_id → categories.id
ON DELETE SET NULL
```
- Produk bisa tetap ada walau kategori dihapus
- Category di-set ke NULL

#### 2. **Variants → Products**
```sql
variants.product_id → products.id
ON DELETE CASCADE
```
- Variant ikut terhapus kalau produk dihapus
- **One-to-Many**: 1 produk punya N variants

#### 3. **Cart Items → Carts, Products, Variants**
```sql
cart_items.cart_id → carts.id
ON DELETE CASCADE

cart_items.product_id → products.id
ON DELETE CASCADE

cart_items.variant_id → variants.id
ON DELETE CASCADE
```
- Item ikut terhapus kalau cart dihapus
- Item ikut terhapus kalau produk/variant dihapus

#### 4. **Stock Locks → Products, Variants, Carts, Cart Items**
```sql
stock_locks.product_id → products.id
ON DELETE CASCADE

stock_locks.variant_id → variants.id
ON DELETE CASCADE

stock_locks.cart_id → carts.id
ON DELETE CASCADE

stock_locks.cart_item_id → cart_items.id
ON DELETE CASCADE
```
- **CRITICAL TABLE** - Prevent overselling
- Lock otomatis terhapus kalau product/cart dihapus

---

## 🛠️ **Cara Menggunakan**

### **Step 1: Create Database**

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE ecommerce_db;

# Connect to database
\c ecommerce_db
```

### **Step 2: Run Schema**

```bash
# Execute schema.sql
psql -U postgres -d ecommerce_db -f schema.sql
```

### **Step 3: Verify Tables**

```sql
-- List all tables
\dt

-- Check table structure
\d products
\d cart_items
\d stock_locks
```

---

## 📚 **Core Functions**

### **1. Add to Cart (Complete Workflow)**

```sql
SELECT add_to_cart(
    p_user_id := NULL, -- NULL untuk guest
    p_session_id := 'session_abc123',
    p_product_id := 'uuid-produk',
    p_variant_id := 'uuid-variant-L', -- NULL kalau no variant
    p_quantity := 2,
    p_lock_duration_minutes := 15
);
```

**Returns:**
```json
{
  "success": true,
  "cart_id": "uuid-cart",
  "cart_item_id": "uuid-item",
  "lock_id": "uuid-lock",
  "expires_at": "2026-06-18T12:45:00Z",
  "message": "Product added to cart successfully"
}
```

### **2. Create Stock Lock (Manual)**

```sql
SELECT create_stock_lock(
    p_product_id := 'uuid-produk',
    p_variant_id := 'uuid-variant',
    p_cart_id := 'uuid-cart',
    p_cart_item_id := 'uuid-item',
    p_quantity := 3,
    p_lock_duration_minutes := 20
);
```

### **3. Release Stock Lock**

```sql
SELECT release_stock_lock(
    p_lock_id := 'uuid-lock',
    p_reason := 'user_removed_item' -- 'expired', 'manual_release', 'purchased'
);
```

### **4. Release Expired Locks (Cleanup Job)**

```sql
-- Run ini via cron job setiap 5 menit
SELECT release_expired_locks();
```

**Returns:** Jumlah lock yang di-release

---

## 🗂️ **Query Examples**

### **View Active Carts**

```sql
SELECT 
    id,
    user_id,
    session_id,
    item_count,
    total,
    minutes_until_expiry,
    expires_at
FROM v_active_carts
ORDER BY created_at DESC;
```

### **View Cart Items dengan Product Details**

```sql
SELECT 
    cart_id,
    product_name,
    variant_name,
    quantity,
    price_at_add,
    subtotal,
    lock_expires_at,
    lock_status
FROM v_cart_items_detail
WHERE cart_id = 'uuid-cart';
```

### **Check Product Availability (Include Locked Stock)**

```sql
SELECT 
    name,
    sku,
    total_stock,
    available_stock,
    locked_stock,
    truly_available
FROM v_product_availability
WHERE sku = 'KAOS-001';
```

### **Get User Cart**

```sql
SELECT 
    ci.quantity,
    ci.price_at_add,
    ci.subtotal,
    ci.variant_name,
    p.name AS product_name,
    p.main_image_url
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
WHERE ci.cart_id = (
    SELECT id FROM carts 
    WHERE user_id = 'user-uuid' AND status = 'active'
);
```

### **Find Expired Locks**

```sql
SELECT 
    id,
    product_id,
    variant_id,
    cart_id,
    quantity,
    locked_at,
    expires_at,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - expires_at)) / 60 AS minutes_expired
FROM stock_locks
WHERE status = 'locked'
  AND expires_at <= CURRENT_TIMESTAMP
ORDER BY expires_at;
```

---

## ⚠️ **Important Notes**

### **Stock Locking Mechanism**

1. **Lock Duration:** Default 15 menit (configurable)
2. **Auto-Release:** Lock expired → stock kembali ke pool
3. **Prevent Overselling:** Stock di-check AT TIME OF LOCK, bukan sebelum
4. **Concurrent Safety:** Gunakan database transactions

### **Guest Checkout**

```sql
-- Guest cart pake session_id (user_id NULL)
INSERT INTO carts (session_id, status) 
VALUES ('session_abc123', 'active');

-- On user login, merge guest cart dengan user cart
UPDATE carts 
SET user_id = 'user-uuid', session_id = NULL
WHERE session_id = 'session_abc123';
```

### **Price Snapshot**

```sql
-- price_at_add di-save saat item ditambahkan
-- Ini penting kalau harga produk berubah nanti
INSERT INTO cart_items (
    cart_id,
    product_id,
    variant_id,
    quantity,
    price_at_add, -- SNAPSHOT!
    subtotal
) VALUES (
    'cart-uuid',
    'product-uuid',
    'variant-uuid',
    2,
    149000, -- Harga saat add to cart
    298000
);
```

---

## 🔧 **Maintenance**

### **Setup pg_cron (Optional but Recommended)**

```sql
-- Install extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Auto-release expired locks setiap 5 menit
SELECT cron.schedule(
    'release-expired-locks',
    '*/5 * * * *',
    'SELECT release_expired_locks()'
);

-- Cleanup abandoned carts setiap hari jam 2 pagi
SELECT cron.schedule(
    'cleanup-abandoned-carts',
    '0 2 * * *',
   $query$
    UPDATE carts 
    SET status = 'expired' 
    WHERE status = 'abandoned' 
      AND updated_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
    $query$
);
```

### **Manual Cleanup (If Not Using pg_cron)**

```sql
-- Run ini via external cron job (node-cron, celery, dll)
SELECT release_expired_locks();
```

---

## 🔐 **Security Roles**

### **Read-Only Role**

```sql
-- Untuk analytics dashboard, reporting
SET ROLE ecommerce_readonly;
SELECT * FROM v_product_availability;
```

### **Read-Write Role**

```sql
-- Untuk aplikasi e-commerce
SET ROLE ecommerce_readwrite;
SELECT add_to_cart(...);
```

### **Admin Role**

```sql
-- Untuk admin panel, database management
SET ROLE ecommerce_admin;
ALTER TABLE products ADD COLUMN ...;
```

---

## 📊 **Schema Diagram**

```
┌─────────────┐
│   users     │
└──────┬──────┘
       │
       │ 1:N
       ↓
┌─────────────┐         ┌─────────────┐
│    carts    │←───────→│  sessions   │
└──────┬──────┘         └─────────────┘
       │
       │ 1:N
       ↓
┌─────────────┐
│ cart_items  │
└──┬──┬──┬────┘
   │  │  │
   │  │  │ N:1
   │  │  └──────────────────┐
   │  │                     │
   │  │  N:1                │
   │  └───────────────┐     │
   │                  │     │
   ↓                  ↓     ↓
┌─────────┐      ┌──────────┐      ┌─────────────┐
│products │      │ variants │      │ stock_locks │
└────┬────┘      └────┬─────┘      └──────┬──────┘
     │                │                   │
     │                │                   │
     └────────────────┴───────────────────┘
                      │
                      │ N:1
                      ↓
               ┌─────────────┐
               │ categories  │
               └─────────────┘
```

---

## 🚀 **Next Steps**

1. ✅ **Run schema.sql** ke PostgreSQL database
2. ⚙️ **Setup pg_cron** untuk auto-cleanup expired locks
3. 🔌 **Buat API** (Express.js/FastAPI) untuk connect frontend ke database
4. 🎨 **Frontend integration** dengan React/Vue/Svelte
5. 🧪 **Testing** concurrent cart operations
6. 📊 **Monitoring** lock expiration dan cart abandonment rate

---

## 📞 **Support**

Need help atau customization? Reach out:
- Create issue di repo
- Check PostgreSQL logs untuk errors
- Review `cart_audit_log` untuk debugging

---

**Happy Coding! 🚀**