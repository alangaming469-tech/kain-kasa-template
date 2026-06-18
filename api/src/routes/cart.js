import express from 'express';
import { query, transaction } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ==========================================
// HELPER: Get or create cart for user/session
// ==========================================
const getOrCreateCart = async (userId, sessionId) => {
  let cart;
  
  if (userId) {
    // Get user's active cart
    const result = await query(
      'SELECT * FROM carts WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );
    cart = result.rows[0];
  } else if (sessionId) {
    // Get guest cart
    const result = await query(
      'SELECT * FROM carts WHERE session_id = $1 AND status = $2',
      [sessionId, 'active']
    );
    cart = result.rows[0];
  }

  // Create new cart if none exists
  if (!cart) {
    const createSql = `
      INSERT INTO carts (user_id, session_id, status)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await query(createSql, [userId || null, sessionId || null, 'active']);
    cart = result.rows[0];
  }

  return cart;
};

// ==========================================
// GET /api/cart
// Get current user's cart
// ==========================================
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id; // From auth middleware
    const sessionId = req.headers['x-session-id'];

    if (!userId && !sessionId) {
      return res.status(401).json({
        success: false,
        error: 'User ID or Session ID required'
      });
    }

    const cart = await getOrCreateCart(userId, sessionId);

    if (!cart) {
      return res.json({
        success: true,
        data: {
          id: null,
          items: [],
          subtotal: 0,
          total: 0,
          itemCount: 0
        }
      });
    }

    // Get cart items with product details
    const itemsSql = `
      SELECT 
        ci.id as cartItemId,
        ci.product_id as productId,
        ci.variant_id as variantId,
        ci.quantity,
        ci.price_at_add as priceAtAdd,
        ci.subtotal,
        ci.variant_name as variantName,
        ci.variant_type as variantType,
        p.name as productName,
        p.slug as productSlug,
        p.main_image_url as productImage,
        p.sku as productSku,
        v.variant_value as variantValue,
        sl.expires_at as lockExpiresAt
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN variants v ON ci.variant_id = v.id
      LEFT JOIN stock_locks sl ON ci.stock_lock_id = sl.id AND sl.status = 'locked'
      WHERE ci.cart_id = $1
      ORDER BY ci.added_at DESC
    `;

    const itemsResult = await query(itemsSql, [cart.id]);

    res.json({
      success: true,
      data: {
        id: cart.id,
        userId: cart.user_id,
        sessionId: cart.session_id,
        items: itemsResult.rows,
        itemCount: cart.item_count,
        subtotal: parseFloat(cart.subtotal),
        discount: parseFloat(cart.discount),
        tax: parseFloat(cart.tax),
        total: parseFloat(cart.total),
        currency: cart.currency,
        createdAt: cart.created_at,
        updatedAt: cart.updated_at,
        expiresAt: cart.expires_at,
        minutesUntilExpiry: cart.expires_at 
          ? Math.round((new Date(cart.expires_at) - new Date()) / 60000)
          : null
      }
    });

  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cart'
    });
  }
});

// ==========================================
// POST /api/cart/items
// Add item to cart
// ==========================================
router.post('/items', async (req, res) => {
  try {
    const { productId, variantId, quantity } = req.body;
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || req.body.sessionId;

    // Validation
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be at least 1'
      });
    }

    if (!userId && !sessionId) {
      return res.status(401).json({
        success: false,
        error: 'User ID or Session ID required'
      });
    }

    const lockDuration = parseInt(process.env.CART_LOCK_DURATION_MINUTES) || 15;

    // Use database function for atomic operation
    const result = await query(
      `SELECT add_to_cart($1, $2, $3, $4, $5, $6)`,
      [
        userId || null,
        sessionId || null,
        productId,
        variantId || null,
        quantity,
        lockDuration
      ]
    );

    const cartData = result.rows[0].add_to_cart;

    if (!cartData.success) {
      return res.status(400).json({
        success: false,
        error: cartData.error || 'Failed to add item to cart'
      });
    }

    // Fetch updated cart
    const updatedCart = await getOrCreateCart(userId, sessionId);
    
    const itemsSql = `
      SELECT 
        ci.id as cartItemId,
        ci.product_id as productId,
        ci.quantity,
        ci.subtotal,
        p.name as productName,
        p.slug as productSlug
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = $1
    `;
    
    const itemsResult = await query(itemsSql, [updatedCart.id]);

    res.status(201).json({
      success: true,
      message: 'Item added to cart successfully',
      data: {
        cartId: cartData.cart_id,
        cartItemId: cartData.cart_item_id,
        lockId: cartData.lock_id,
        expiresAt: cartData.expires_at,
        minutesUntilExpiry: Math.round((new Date(cartData.expires_at) - new Date()) / 60000),
        cart: {
          id: updatedCart.id,
          itemCount: updatedCart.item_count,
          total: parseFloat(updatedCart.total),
          items: itemsResult.rows
        }
      },
      warning: cartData.minutes_until_expiry < 10 
        ? 'Hurry! Your cart will expire soon' 
        : null
    });

  } catch (error) {
    console.error('Error adding to cart:', error);
    
    // Handle stock lock errors
    if (error.message.includes('Insufficient stock')) {
      return res.status(400).json({
        success: false,
        error: 'Stock tidak mencukupi',
        errorCode: 'INSUFFICIENT_STOCK'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to add item to cart',
      details: error.message
    });
  }
});

// ==========================================
// PUT /api/cart/items/:itemId
// Update cart item quantity
// ==========================================
router.put('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user?.id;

    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity cannot be negative'
      });
    }

    const cart = await getOrCreateCart(userId, req.headers['x-session-id']);

    // Update or remove item
    if (quantity === 0) {
      // Remove item and release lock
      await query(
        `DELETE FROM cart_items WHERE id = $1 AND cart_id = $2`,
        [itemId, cart.id]
      );
      
      res.json({
        success: true,
        message: 'Item removed from cart'
      });
    } else {
      // Update quantity
      const result = await query(
        `UPDATE cart_items SET quantity = $1 WHERE id = $2 AND cart_id = $3 RETURNING *`,
        [quantity, itemId, cart.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Cart item not found'
        });
      }

      // Recalculate cart totals
      await query('SELECT recalculate_cart_totals($1)', [cart.id]);

      res.json({
        success: true,
        message: 'Cart updated',
        data: result.rows[0]
      });
    }

  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cart item'
    });
  }
});

// ==========================================
// DELETE /api.cart/items/:itemId
// Remove item from cart
// ==========================================
router.delete('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user?.id;
    const cart = await getOrCreateCart(userId, req.headers['x-session-id']);

    // Get item to find stock_lock_id
    const itemResult = await query(
      `SELECT stock_lock_id FROM cart_items WHERE id = $1 AND cart_id = $2`,
      [itemId, cart.id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in cart'
      });
    }

    const { stock_lock_id } = itemResult.rows[0];

    // Release stock lock if exists
    if (stock_lock_id) {
      await query('SELECT release_stock_lock($1, $2)', [
        stock_lock_id,
        'user_removed_item'
      ]);
    }

    // Delete cart item
    await query(
      `DELETE FROM cart_items WHERE id = $1 AND cart_id = $2`,
      [itemId, cart.id]
    );

    res.json({
      success: true,
      message: 'Item removed from cart'
    });

  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove item from cart'
    });
  }
});

// ==========================================
// POST /api/cart/checkout
// Process checkout
// ==========================================
router.post('/checkout', async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];
    const { shippingAddress, paymentMethod } = req.body;

    if (!userId && !sessionId) {
      return res.status(401).json({
        success: false,
        error: 'User ID or Session ID required'
      });
    }

    const cart = await getOrCreateCart(userId, sessionId);

    if (!cart || cart.item_count === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cart is empty'
      });
    }

    // Validate all locks are still active
    const locksSql = `
      SELECT sl.*
      FROM stock_locks sl
      JOIN cart_items ci ON sl.cart_item_id = ci.id
      WHERE ci.cart_id = $1
        AND sl.status = 'locked'
    `;

    const locksResult = await query(locksSql, [cart.id]);

    if (locksResult.rows.length !== cart.item_count) {
      return res.status(400).json({
        success: false,
        error: 'Some items in your cart are no longer available',
        errorCode: 'STOCK_CHANGED'
      });
    }

    // Process payment (integration with Midtrans/Xendit here)
    // For now, we'll just mark as success
    const paymentSuccess = true;

    if (paymentSuccess) {
      // Convert locks to purchases
      await transaction(async (client) => {
        // Update stock locks to purchased
        await client.query(
          `UPDATE stock_locks SET status = 'purchased' WHERE cart_id = $1`,
          [cart.id]
        );

        // Mark cart as converted
        await client.query(
          `UPDATE carts SET status = 'converted' WHERE id = $1`,
          [cart.id]
        );

        // Create order record (you'd have an orders table)
        // ...
      });

      res.json({
        success: true,
        message: 'Checkout successful!',
        data: {
          orderId: uuidv4(),
          cartId: cart.id,
          total: parseFloat(cart.total)
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Payment failed'
      });
    }

  } catch (error) {
    console.error('Error during checkout:', error);
    res.status(500).json({
      success: false,
      error: 'Checkout failed',
      details: error.message
    });
  }
});

// ==========================================
// POST /api/cart/merge
// Merge guest cart with user cart (on login)
// ==========================================
router.post('/merge', async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.body.sessionId;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required'
      });
    }

    await transaction(async (client) => {
      // Get guest cart
      const guestCartResult = await client.query(
        `SELECT * FROM carts WHERE session_id = $1 AND status = 'active'`,
        [sessionId]
      );

      if (guestCartResult.rows.length === 0) {
        return; // No guest cart to merge
      }

      const guestCart = guestCartResult.rows[0];

      // Get or create user cart
      const userCartResult = await client.query(
        `SELECT * FROM carts WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );

      if (userCartResult.rows.length === 0) {
        // No user cart, just assign guest cart to user
        await client.query(
          `UPDATE carts SET user_id = $1, session_id = NULL WHERE id = $2`,
          [userId, guestCart.id]
        );
      } else {
        const userCart = userCartResult.rows[0];

        // Merge items (complex logic - simplified here)
        // In production, handle conflicts properly
        await client.query(
          `UPDATE cart_items SET cart_id = $1 WHERE cart_id = $2`,
          [userCart.id, guestCart.id]
        );

        // Delete empty guest cart
        await client.query(
          `DELETE FROM carts WHERE id = $1`,
          [guestCart.id]
        );

        // Recalculate user cart
        await client.query('SELECT recalculate_cart_totals($1)', [userCart.id]);
      }
    });

    res.json({
      success: true,
      message: 'Cart merged successfully'
    });

  } catch (error) {
    console.error('Error merging cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to merge carts'
    });
  }
});

// ==========================================
// DELETE /api/cart
// Clear/abandon cart
// ==========================================
router.delete('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];
    const cart = await getOrCreateCart(userId, sessionId);

    // Release all stock locks
    const locksResult = await query(
      `SELECT id FROM stock_locks WHERE cart_id = $1 AND status = 'locked'`,
      [cart.id]
    );

    for (const lock of locksResult.rows) {
      await query('SELECT release_stock_lock($1, $2)', [
        lock.id,
        'cart_abandoned'
      ]);
    }

    // Mark cart as abandoned
    await query(
      `UPDATE carts SET status = 'abandoned' WHERE id = $1`,
      [cart.id]
    );

    res.json({
      success: true,
      message: 'Cart cleared'
    });

  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cart'
    });
  }
});

export default router;