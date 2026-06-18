-- ============================================================
-- E-COMMERCE DATABASE SCHEMA
-- PostgreSQL Schema for Product Catalog & Shopping Cart
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS TABLE (Optional - untuk guest checkout)
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255), -- Nullable untuk guest
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk login
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);

-- ============================================================
-- 2. CATEGORIES TABLE
-- ============================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL, -- Untuk nested categories
    image_url VARCHAR(500),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- ============================================================
-- 3. PRODUCTS TABLE
-- ============================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL, -- Stock Keeping Unit
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(500), -- Untuk preview
    
    -- Pricing
    base_price DECIMAL(12, 2) NOT NULL CHECK (base_price >= 0),
    discount_price DECIMAL(12, 2) CHECK (discount_price >= 0),
    discount_percentage INT CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    
    -- Inventory
    total_stock INT DEFAULT 0 CHECK (total_stock >= 0),
    available_stock INT DEFAULT 0 CHECK (available_stock >= 0),
    low_stock_threshold INT DEFAULT 5, -- Alert threshold
    
    -- Categorization
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    -- Media
    main_image_url VARCHAR(500),
    images TEXT[], -- Array of image URLs
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft', 'out_of_stock')),
    is_featured BOOLEAN DEFAULT false,
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- Indexes untuk performance
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_active ON products(status) WHERE status = 'active';
CREATE INDEX idx_products_price ON products(base_price);
CREATE INDEX idx_products_created ON products(created_at DESC);

-- Trigger untuk auto-update available_stock
CREATE OR REPLACE FUNCTION update_product_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_product_timestamp();

-- ============================================================
-- 4. PRODUCT VARIANTS TABLE (Size, Color, etc.)
-- ============================================================
CREATE TABLE variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Variant type dan value
    variant_type VARCHAR(50) NOT NULL CHECK (variant_type IN ('size', 'color', 'material', 'other')),
    variant_value VARCHAR(100) NOT NULL, -- 'L', 'Red', 'Cotton', etc.
    
    -- Pricing (override dari base_price)
    price_adjustment DECIMAL(10, 2) DEFAULT 0 CHECK (price_adjustment >= -1000000 AND price_adjustment <= 1000000),
    
    -- Inventory per variant
    stock INT DEFAULT 0 CHECK (stock >= 0),
    available_stock INT DEFAULT 0 CHECK (available_stock >= 0),
    
    -- SKU per variant
    sku VARCHAR(100) UNIQUE,
    
    -- Images for this variant (optional)
    image_url VARCHAR(500),
    
    -- Display
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: unique combination of product + type + value
    UNIQUE(product_id, variant_type, variant_value)
);

-- Indexes
CREATE INDEX idx_variants_product ON variants(product_id);
CREATE INDEX idx_variants_type_value ON variants(variant_type, variant_value);
CREATE INDEX idx_variants_sku ON variants(sku);
CREATE INDEX idx_variants_active ON variants(is_active) WHERE is_active = true;

CREATE TRIGGER trg_variants_updated_at
    BEFORE UPDATE ON variants
    FOR EACH ROW
    EXECUTE FUNCTION update_product_timestamp();

-- ============================================================
-- 5. SESSIONS TABLE (Untuk guest cart)
-- ============================================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Nullable untuk guest
    data JSONB, -- Session data
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Auto-cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cleanup_sessions
    AFTER INSERT ON sessions
    EXECUTE FUNCTION cleanup_expired_sessions();

-- ============================================================
-- 6. CARTS TABLE
-- ============================================================
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User association (nullable untuk guest)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255), -- Untuk guest cart
    
    -- Cart totals
    subtotal DECIMAL(12, 2) DEFAULT 0 CHECK (subtotal >= 0),
    discount DECIMAL(12, 2) DEFAULT 0 CHECK (discount >= 0),
    tax DECIMAL(12, 2) DEFAULT 0 CHECK (tax >= 0),
    total DECIMAL(12, 2) DEFAULT 0 CHECK (total >= 0),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'converted', 'expired')),
    
    -- Lock information
    locked_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    item_count INT DEFAULT 0 CHECK (item_count >= 0),
    currency VARCHAR(3) DEFAULT 'IDR',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_carts_user ON carts(user_id);
CREATE INDEX idx_carts_session ON carts(session_id);
CREATE INDEX idx_carts_status ON carts(status);
CREATE INDEX idx_carts_active ON carts(status) WHERE status = 'active';
CREATE INDEX idx_carts_expires ON carts(expires_at) WHERE status = 'active';

-- Constraint: Either user_id OR session_id must be present
ALTER TABLE carts ADD CONSTRAINT chk_carts_user_or_session
    CHECK (
        (user_id IS NOT NULL AND session_id IS NULL) OR
        (user_id IS NULL AND session_id IS NOT NULL)
    );

CREATE TRIGGER trg_carts_updated_at
    BEFORE UPDATE ON carts
    FOR EACH ROW
    EXECUTE FUNCTION update_product_timestamp();

-- ============================================================
-- 7. CART ITEMS TABLE
-- ============================================================
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign keys
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES variants(id) ON DELETE CASCADE, -- Nullable kalau produk gak punya varian
    
    -- Quantity & Pricing
    quantity INT NOT NULL CHECK (quantity > 0),
    price_at_add DECIMAL(12, 2) NOT NULL CHECK (price_at_add >= 0), -- Snapshot harga saat add to cart
    original_price DECIMAL(12, 2) CHECK (original_price >= 0), -- Harga sebelum diskon
    discount DECIMAL(12, 2) DEFAULT 0 CHECK (discount >= 0),
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0),
    
    -- Variant information (snapshot, in case variant changes)
    variant_name VARCHAR(100), -- e.g., 'Large', 'Red'
    variant_type VARCHAR(50),  -- e.g., 'size', 'color'
    
    -- Stock lock reference
    stock_lock_id UUID, -- References stock_locks(id)
    
    -- Timestamps
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product ON cart_items(product_id);
CREATE INDEX idx_cart_items_variant ON cart_items(variant_id);
CREATE INDEX idx_cart_items_product_variant ON cart_items(product_id, variant_id);
CREATE INDEX idx_cart_items_lock ON cart_items(stock_lock_id);

-- Constraint: unique product + variant per cart
CREATE UNIQUE INDEX idx_cart_items_unique_product_variant
    ON cart_items(cart_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Trigger untuk auto-calculate subtotal
CREATE OR REPLACE FUNCTION calculate_cart_item_subtotal()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate item subtotal (price * quantity - discount)
    NEW.subtotal = (NEW.price_at_add * NEW.quantity) - NEW.discount;
    
    -- Update cart timestamp
    UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.cart_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cart_items_subtotal
    BEFORE INSERT OR UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_cart_item_subtotal();

-- ============================================================
-- 8. STOCK LOCKS TABLE (CRITICAL - Prevent Overselling)
-- ============================================================
CREATE TABLE stock_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign keys
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES variants(id) ON DELETE CASCADE, -- Nullable
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    cart_item_id UUID REFERENCES cart_items(id) ON DELETE CASCADE,
    
    -- Lock details
    quantity INT NOT NULL CHECK (quantity > 0),
    
    -- Lock timing
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'locked' CHECK (status IN ('locked', 'released', 'purchased', 'expired')),
    
    -- Release reason (if released/expired)
    release_reason VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes untuk performance cleanup
CREATE INDEX idx_stock_locks_product ON stock_locks(product_id);
CREATE INDEX idx_stock_locks_variant ON stock_locks(variant_id);
CREATE INDEX idx_stock_locks_cart ON stock_locks(cart_id);
CREATE INDEX idx_stock_locks_status ON stock_locks(status);
CREATE INDEX idx_stock_locks_expires ON stock_locks(expires_at, status) WHERE status = 'locked';
CREATE INDEX idx_stock_locks_active ON stock_locks(status) WHERE status = 'locked';

-- Trigger untuk auto-update cart timestamp
CREATE OR REPLACE FUNCTION update_cart_on_lock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'locked' THEN
        UPDATE carts SET locked_at = NEW.locked_at, expires_at = NEW.expires_at WHERE id = NEW.cart_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_locks_update_cart
    AFTER INSERT OR UPDATE ON stock_locks
    FOR EACH ROW
    WHEN (NEW.status = 'locked')
    EXECUTE FUNCTION update_cart_on_lock();

-- ============================================================
-- 9. CART HISTORY / AUDIT LOG (Optional but Recommended)
-- ============================================================
CREATE TABLE cart_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    cart_item_id UUID REFERENCES cart_items(id) ON DELETE CASCADE,
    
    -- Action
    action VARCHAR(50) NOT NULL CHECK (action IN ('item_added', 'item_updated', 'item_removed', 'cart_created', 'cart_updated', 'cart_abandoned', 'cart_converted')),
    
    -- Details
    old_data JSONB,
    new_data JSONB,
    reason VARCHAR(255), -- e.g., "Stock expired", "User removed"
    
    -- Actor
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_cart_audit_cart ON cart_audit_log(cart_id);
CREATE INDEX idx_cart_audit_action ON cart_audit_log(action);
CREATE INDEX idx_cart_audit_created ON cart_audit_log(created_at DESC);

-- ============================================================
-- VIEWS FOR EASY QUERYING
-- ============================================================

-- View: Active carts with item count
CREATE VIEW v_active_carts AS
SELECT 
    c.id,
    c.user_id,
    c.session_id,
    c.item_count,
    c.total,
    c.created_at,
    c.updated_at,
    c.expires_at,
    EXTRACT(EPOCH FROM (c.expires_at - CURRENT_TIMESTAMP)) / 60 AS minutes_until_expiry
FROM carts c
WHERE c.status = 'active'
  AND (c.expires_at IS NULL OR c.expires_at > CURRENT_TIMESTAMP);

-- View: Cart items with product details
CREATE VIEW v_cart_items_detail AS
SELECT 
    ci.id AS cart_item_id,
    ci.cart_id,
    ci.product_id,
    ci.variant_id,
    ci.quantity,
    ci.price_at_add,
    ci.subtotal,
    ci.variant_name,
    ci.variant_type,
    p.name AS product_name,
    p.slug AS product_slug,
    p.main_image_url,
    p.sku AS product_sku,
    v.variant_value,
    v.sku AS variant_sku,
    sl.expires_at AS lock_expires_at,
    sl.status AS lock_status
FROM cart_items ci
JOIN products p ON ci.product_id = p.id
LEFT JOIN variants v ON ci.variant_id = v.id
LEFT JOIN stock_locks sl ON ci.stock_lock_id = sl.id AND sl.status = 'locked';

-- View: Product availability with locked stock
CREATE VIEW v_product_availability AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.total_stock,
    p.available_stock,
    COALESCE(SUM(sl.quantity) FILTER (WHERE sl.status = 'locked'), 0) AS locked_stock,
    p.available_stock - COALESCE(SUM(sl.quantity) FILTER (WHERE sl.status = 'locked'), 0) AS truly_available
FROM products p
LEFT JOIN stock_locks sl ON p.id = sl.product_id AND sl.status = 'locked' AND sl.expires_at > CURRENT_TIMESTAMP
GROUP BY p.id, p.name, p.sku, p.total_stock, p.available_stock;

-- ============================================================
-- FUNCTIONS & PROCEDURES
-- ============================================================

-- Function: Create stock lock
CREATE OR REPLACE FUNCTION create_stock_lock(
    p_product_id UUID,
    p_variant_id UUID,
    p_cart_id UUID,
    p_cart_item_id UUID,
    p_quantity INT,
    p_lock_duration_minutes INT DEFAULT 15
)
RETURNS UUID AS $$
DECLARE
    v_lock_id UUID;
    v_available INT;
BEGIN
    -- Check available stock
    IF p_variant_id IS NOT NULL THEN
        SELECT available_stock INTO v_available
        FROM variants
        WHERE id = p_variant_id;
    ELSE
        SELECT available_stock INTO v_available
        FROM products
        WHERE id = p_product_id;
    END IF;
    
    -- Validate stock
    IF v_available < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_available, p_quantity;
    END IF;
    
    -- Create lock
    INSERT INTO stock_locks (
        product_id,
        variant_id,
        cart_id,
        cart_item_id,
        quantity,
        expires_at
    ) VALUES (
        p_product_id,
        p_variant_id,
        p_cart_id,
        p_cart_item_id,
        p_quantity,
        CURRENT_TIMESTAMP + (p_lock_duration_minutes || ' minutes')::INTERVAL
    ) RETURNING id INTO v_lock_id;
    
    -- Update available stock
    IF p_variant_id IS NOT NULL THEN
        UPDATE variants
        SET available_stock = available_stock - p_quantity
        WHERE id = p_variant_id;
    ELSE
        UPDATE products
        SET available_stock = available_stock - p_quantity
        WHERE id = p_product_id;
    END IF;
    
    RETURN v_lock_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Release stock lock
CREATE OR REPLACE FUNCTION release_stock_lock(
    p_lock_id UUID,
    p_reason VARCHAR DEFAULT 'manual_release'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_lock stock_locks%ROWTYPE;
    v_success BOOLEAN := false;
BEGIN
    -- Get lock details
    SELECT * INTO v_lock
    FROM stock_locks
    WHERE id = p_lock_id AND status = 'locked';
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Update lock status
    UPDATE stock_locks
    SET status = 'released',
        release_reason = p_reason
    WHERE id = p_lock_id
    RETURNING true INTO v_success;
    
    -- Restore stock
    IF v_lock.variant_id IS NOT NULL THEN
        UPDATE variants
        SET available_stock = available_stock + v_lock.quantity
        WHERE id = v_lock.variant_id;
    ELSE
        UPDATE products
        SET available_stock = available_stock + v_lock.quantity
        WHERE id = v_lock.product_id;
    END IF;
    
    -- Remove cart item
    DELETE FROM cart_items WHERE stock_lock_id = p_lock_id;
    
    RETURN v_success;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-release expired locks (run via cron)
CREATE OR REPLACE FUNCTION release_expired_locks()
RETURNS INT AS $$
DECLARE
    v_released_count INT := 0;
    v_lock stock_locks%ROWTYPE;
BEGIN
    -- Loop through expired locks
    FOR v_lock IN 
        SELECT * FROM stock_locks
        WHERE status = 'locked'
          AND expires_at <= CURRENT_TIMESTAMP
    LOOP
        -- Release lock
        PERFORM release_stock_lock(v_lock.id, 'expired');
        v_released_count := v_released_count + 1;
    END LOOP;
    
    RETURN v_released_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Add item to cart (complete workflow)
CREATE OR REPLACE FUNCTION add_to_cart(
    p_user_id UUID, -- NULL untuk guest
    p_session_id VARCHAR, -- Required untuk guest
    p_product_id UUID,
    p_variant_id UUID,
    p_quantity INT,
    p_lock_duration_minutes INT DEFAULT 15
)
RETURNS JSONB AS $$
DECLARE
    v_cart_id UUID;
    v_cart_item_id UUID;
    v_lock_id UUID;
    v_price DECIMAL(12,2);
    v_product_name VARCHAR;
    v_variant_name VARCHAR;
    v_variant_type VARCHAR;
    v_result JSONB;
BEGIN
    -- Get or create cart
    IF p_user_id IS NOT NULL THEN
        SELECT id INTO v_cart_id FROM carts WHERE user_id = p_user_id AND status = 'active';
    ELSE
        SELECT id INTO v_cart_id FROM carts WHERE session_id = p_session_id AND status = 'active';
    END IF;
    
    IF v_cart_id IS NULL THEN
        INSERT INTO carts (user_id, session_id, status)
        VALUES (p_user_id, p_session_id, 'active')
        RETURNING id INTO v_cart_id;
    END IF;
    
    -- Get product price
    IF p_variant_id IS NOT NULL THEN
        SELECT 
            v.price_adjustment + p.base_price,
            p.name,
            v.variant_value,
            v.variant_type
        INTO v_price, v_product_name, v_variant_name, v_variant_type
        FROM variants v
        JOIN products p ON v.product_id = p.id
        WHERE v.id = p_variant_id;
    ELSE
        SELECT base_price, name INTO v_price, v_product_name
        FROM products
        WHERE id = p_product_id;
    END IF;
    
    -- Check if item already exists in cart
    SELECT id INTO v_cart_item_id
    FROM cart_items
    WHERE cart_id = v_cart_id
      AND product_id = p_product_id
      AND (variant_id = p_variant_id OR (variant_id IS NULL AND p_variant_id IS NULL));
    
    IF v_cart_item_id IS NOT NULL THEN
        -- Update existing item
        UPDATE cart_items
        SET quantity = quantity + p_quantity,
            price_at_add = v_price
        WHERE id = v_cart_item_id
        RETURNING id INTO v_cart_item_id;
    ELSE
        -- Create new cart item
        INSERT INTO cart_items (
            cart_id,
            product_id,
            variant_id,
            quantity,
            price_at_add,
            variant_name,
            variant_type
        ) VALUES (
            v_cart_id,
            p_product_id,
            p_variant_id,
            p_quantity,
            v_price,
            v_variant_name,
            v_variant_type
        ) RETURNING id INTO v_cart_item_id;
    END IF;
    
    -- Create stock lock
    v_lock_id := create_stock_lock(
        p_product_id,
        p_variant_id,
        v_cart_id,
        v_cart_item_id,
        p_quantity,
        p_lock_duration_minutes
    );
    
    -- Update cart item with lock ID
    UPDATE cart_items SET stock_lock_id = v_lock_id WHERE id = v_cart_item_id;
    
    -- Recalculate cart totals
    PERFORM recalculate_cart_totals(v_cart_id);
    
    -- Return result
    SELECT jsonb_build_object(
        'success', true,
        'cart_id', v_cart_id,
        'cart_item_id', v_cart_item_id,
        'lock_id', v_lock_id,
        'expires_at', (SELECT expires_at FROM stock_locks WHERE id = v_lock_id),
        'message', 'Product added to cart successfully'
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function: Recalculate cart totals
CREATE OR REPLACE FUNCTION recalculate_cart_totals(p_cart_id UUID)
RETURNS VOID AS $$
DECLARE
    v_subtotal DECIMAL(12,2);
    v_item_count INT;
BEGIN
    -- Calculate subtotal
    SELECT COALESCE(SUM(subtotal), 0), COALESCE(SUM(quantity), 0)
    INTO v_subtotal, v_item_count
    FROM cart_items
    WHERE cart_id = p_cart_id;
    
    -- Update cart
    UPDATE carts
    SET 
        subtotal = v_subtotal,
        item_count = v_item_count,
        total = v_subtotal - discount + tax,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_cart_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SEED DATA (Contoh)
-- ============================================================

-- Insert sample category
INSERT INTO categories (name, slug, description) VALUES
('Clothing', 'clothing', 'Pakaian dan aksesoris fashion'),
('T-Shirts', 't-shirts', 'Kaos dan t-shirt', (SELECT id FROM categories WHERE slug = 'clothing'));

-- Insert sample products
INSERT INTO products (sku, name, slug, description, base_price, total_stock, available_stock, category_id, main_image_url, status) VALUES
('KAOS-001', 'Kaos Oversized Street', 'kaos-oversized-street', 'Kaos oversized dengan desain streetwear modern. Bahan premium cotton 24s.', 149000, 50, 50, (SELECT id FROM categories WHERE slug = 't-shirts'), '/images/kaos-oversized.jpg', 'active'),
('HOODIE-001', 'Hoodie Local Pride', 'hoodie-local-pride', 'Hoodie hangat dengan desain local pride. Perfect untuk cuaca Indonesia.', 249000, 30, 30, (SELECT id FROM categories WHERE slug = 'clothing'), '/images/hoodie-local.jpg', 'active');

-- Insert sample variants
INSERT INTO variants (product_id, variant_type, variant_value, stock, available_stock, sku) VALUES
((SELECT id FROM products WHERE sku = 'KAOS-001'), 'size', 'M', 15, 15, 'KAOS-001-M'),
((SELECT id FROM products WHERE sku = 'KAOS-001'), 'size', 'L', 20, 20, 'KAOS-001-L'),
((SELECT id FROM products WHERE sku = 'KAOS-001'), 'size', 'XL', 15, 15, 'KAOS-001-XL');

-- ============================================================
-- GRANTS (Security)
-- ============================================================

-- Create read-only role
CREATE ROLE ecommerce_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ecommerce_readonly;

-- Create read-write role
CREATE ROLE ecommerce_readwrite;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ecommerce_readwrite;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ecommerce_readwrite;

-- Create admin role
CREATE ROLE ecommerce_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ecommerce_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ecommerce_admin;

-- ============================================================
-- COMMENTS (Documentation)
-- ============================================================

COMMENT ON TABLE products IS 'Master data produk e-commerce';
COMMENT ON TABLE variants IS 'Varian produk (size, color, material, dll)';
COMMENT ON TABLE carts IS 'Shopping cart untuk user (registered & guest)';
COMMENT ON TABLE cart_items IS 'Item-item dalam shopping cart';
COMMENT ON TABLE stock_locks IS 'Lock stok sementara saat item di cart (prevent overselling)';
COMMENT ON COLUMN stock_locks.expires_at IS 'Waktu otomatis release lock jika user tidak checkout';
COMMENT ON COLUMN cart_items.price_at_add IS 'Snapshot harga saat item ditambahkan ke cart';
COMMENT ON FUNCTION create_stock_lock IS 'Create stock lock untuk prevent overselling';
COMMENT ON FUNCTION release_stock_lock IS 'Release stock lock dan restore available stock';
COMMENT ON FUNCTION release_expired_locks IS 'Cleanup function untuk expired locks (run via cron)';
COMMENT ON FUNCTION add_to_cart IS 'Complete workflow untuk add item to cart dengan auto-lock';

-- ============================================================
-- MAINTENANCE JOBS (Run via pg_cron or external scheduler)
-- ============================================================

-- Install pg_cron extension (requires superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule auto-cleanup of expired locks every 5 minutes
-- SELECT cron.schedule(
--     'release-expired-locks',
--     '*/5 * * * *',
--     'SELECT release_expired_locks()'
-- );

-- Schedule auto-cleanup of abandoned carts (older than 30 days)
-- SELECT cron.schedule(
--     'cleanup-abandoned-carts',
--     '0 2 * * *',
--     'UPDATE carts SET status = ''expired'' WHERE status = ''abandoned'' AND updated_at < CURRENT_TIMESTAMP - INTERVAL ''30 days'''
-- );

-- ============================================================
-- END OF SCHEMA
-- ============================================================