import express from 'express';
import { query } from '../db/index.js';

const router = express.Router();

// ==========================================
// GET /api/products
// Get all products with optional filters
// ==========================================
router.get('/', async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      search,
      sort = 'created_at',
      order = 'DESC',
      limit = 20,
      offset = 0,
      featured
    } = req.query;

    // Base query
    let sql = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.slug,
        p_short_description as shortDescription,
        p.base_price as basePrice,
        p.discount_price as discountPrice,
        p.discount_percentage as discountPercentage,
        p.available_stock as availableStock,
        p.total_stock as totalStock,
        p.main_image_url as mainImage,
        p.images,
        p.status,
        p.is_featured as isFeatured,
        p.created_at as createdAt,
        c.id as categoryId,
        c.name as categoryName,
        c.slug as categorySlug,
        CASE 
          WHEN p.available_stock = 0 THEN 'out_of_stock'
          WHEN p.available_stock <= p.low_stock_threshold THEN 'low_stock'
          ELSE 'in_stock'
        END as stockStatus
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active'
        AND p.deleted_at IS NULL
    `;

    const params = [];
    let paramIndex = 1;

    // Add filters
    if (category) {
      params.push(category);
      sql += ` AND (c.slug = $${paramIndex} OR c.id = $${paramIndex})`;
      paramIndex++;
    }

    if (minPrice) {
      params.push(parseFloat(minPrice));
      sql += ` AND p.base_price >= $${paramIndex}`;
      paramIndex++;
    }

    if (maxPrice) {
      params.push(parseFloat(maxPrice));
      sql += ` AND p.base_price <= $${paramIndex}`;
      paramIndex++;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (p.name ILIKE $${paramIndex} OR p.short_description ILIKE $${paramIndex})`;
      paramIndex++;
    }

    if (featured === 'true') {
      sql += ` AND p.is_featured = true`;
    }

    // Add sorting
    const validSorts = ['created_at', 'price', 'name', 'stock'];
    const sortBy = validSorts.includes(sort) ? sort : 'created_at';
    const orderBy = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    const sortMap = {
      'created_at': 'p.created_at',
      'price': 'p.base_price',
      'name': 'p.name',
      'stock': 'p.available_stock'
    };

    sql += ` ORDER BY ${sortMap[sortBy]} ${orderBy}`;

    // Add pagination
    params.push(parseInt(limit), parseInt(offset));
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

    const result = await query(sql, params);

    // Get total count for pagination
    const countSql = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active' AND p.deleted_at IS NULL
      ${category ? 'AND (c.slug = $1 OR c.id = $1)' : ''}
    `;
    
    const countResult = await query(countSql, category ? [category] : []);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        products: result.rows,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    });
  }
});

// ==========================================
// GET /api/products/:slug
// Get single product by slug
// ==========================================
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const sql = `
      SELECT 
        p.*,
        c.id as categoryId,
        c.name as categoryName,
        c.slug as categorySlug,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', v.id,
              'type', v.variantType,
              'value', v.variantValue,
              'priceAdjustment', v.priceAdjustment,
              'stock', v.stock,
              'availableStock', v.availableStock,
              'sku', v.sku
            )
          ) FILTER (WHERE v.id IS NOT NULL),
          '[]'
        ) as variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN variants v ON p.id = v.product_id AND v.is_active = true
      WHERE p.slug = $1
        AND p.status = 'active'
        AND p.deleted_at IS NULL
      GROUP BY p.id, c.id
    `;

    const result = await query(sql, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const product = result.rows[0];

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product'
    });
  }
});

// ==========================================
// GET /api/products/:id/variants
// Get variants for a specific product
// ==========================================
router.get('/:id/variants', async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        id,
        variant_type as type,
        variant_value as value,
        price_adjustment as priceAdjustment,
        stock,
        available_stock as availableStock,
        sku,
        image_url as imageUrl,
        display_order as displayOrder
      FROM variants
      WHERE product_id = $1
        AND is_active = true
      ORDER BY display_order, variant_type, variant_value
    `;

    const result = await query(sql, [id]);

    res.json({
      success: true,
      data: {
        productId: id,
        variants: result.rows,
        total: result.rows.length
      }
    });

  } catch (error) {
    console.error('Error fetching variants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch variants'
    });
  }
});

// ==========================================
// GET /api/categories
// Get all categories
// ==========================================
router.get('/categories', async (req, res) => {
  try {
    const sql = `
      WITH RECURSIVE category_tree AS (
        SELECT 
          id,
          name,
          slug,
          description,
          parent_id as parentId,
          image_url as imageUrl,
          display_order as displayOrder,
          0 as depth,
          ARRAY[id] as path
        FROM categories
        WHERE parent_id IS NULL
          AND is_active = true
        
        UNION ALL
        
        SELECT 
          c.id,
          c.name,
          c.slug,
          c.description,
          c.parent_id as parentId,
          c.image_url as imageUrl,
          c.display_order as displayOrder,
          ct.depth + 1,
          ct.path || c.id
        FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
        WHERE c.is_active = true
      )
      SELECT 
        id,
        name,
        slug,
        description,
        parentId,
        imageUrl,
        displayOrder,
        depth,
        path,
        (
          SELECT COUNT(*)
          FROM products p
          WHERE p.category_id = category_tree.id
            AND p.status = 'active'
            AND p.deleted_at IS NULL
        ) as productCount
      FROM category_tree
      ORDER BY path, display_order
    `;

    const result = await query(sql);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

export default router;