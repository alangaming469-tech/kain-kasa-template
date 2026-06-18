/**
 * API Service for Kain & Kasa E-commerce
 * Menggunakan Fetch API (native browser)
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get session ID from localStorage (for guest users)
 */
const getSessionId = () => {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

/**
 * Format error response
 */
const handleApiError = (error) => {
  if (error.response) {
    // API returned error response
    return {
      success: false,
      error: error.response.data?.error || 'Unknown error',
      statusCode: error.response.status,
    };
  } else if (error.request) {
    // Request made but no response
    return {
      success: false,
      error: 'No response from server. Please check your connection.',
      statusCode: null,
    };
  } else {
    // Other errors
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
      statusCode: null,
    };
  }
};

/**
 * Fetch wrapper with automatic headers and error handling
 */
const fetchApi = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  // Add session ID for guest users
  if (!options.headers?.Authorization) {
    defaultHeaders['X-Session-ID'] = getSessionId();
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return {
      success: true,
      data: data.data,
      meta: data.meta,
    };
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    return handleApiError({ 
      response: { 
        status: error.response?.status, 
        data: { error: error.message } 
      } 
    });
  }
};

// ==========================================
// PRODUCTS API FUNCTIONS
// ==========================================

/**
 * GET /api/products
 * Fetch all products with optional filters
 * 
 * @param {Object} filters - Query parameters
 * @param {string} filters.category - Filter by category slug
 * @param {number} filters.minPrice - Minimum price
 * @param {number} filters.maxPrice - Maximum price
 * @param {string} filters.search - Search query
 * @param {string} filters.sort - Sort field (created_at, price, name, stock)
 * @param {string} filters.order - Sort order (ASC, DESC)
 * @param {number} filters.limit - Items per page
 * @param {number} filters.offset - Pagination offset
 * @param {boolean} filters.featured - Featured products only
 * 
 * @returns {Promise<Object>} Products list with pagination
 */
export const getProducts = async (filters = {}) => {
  const params = new URLSearchParams();

  // Add filters to query string
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });

  const queryString = params.toString();
  const endpoint = `/products${queryString ? `?${queryString}` : ''}`;

  return await fetchApi(endpoint);
};

/**
 * GET /api/products/:slug
 * Fetch single product by slug
 * 
 * @param {string} slug - Product slug
 * @returns {Promise<Object>} Product detail with variants
 */
export const getProductBySlug = async (slug) => {
  return await fetchApi(`/products/${slug}`);
};

/**
 * GET /api/products/:id/variants
 * Fetch variants for a specific product
 * 
 * @param {string} productId - Product UUID
 * @returns {Promise<Object>} List of variants
 */
export const getProductVariants = async (productId) => {
  return await fetchApi(`/products/${productId}/variants`);
};

/**
 * GET /api/categories
 * Fetch all categories (support nested)
 * 
 * @returns {Promise<Object>} List of categories
 */
export const getCategories = async () => {
  return await fetchApi('/products/categories');
};

// ==========================================
// CART API FUNCTIONS
// ==========================================

/**
 * GET /api/cart
 * Get current user's cart
 * 
 * @returns {Promise<Object>} Cart with items
 */
export const getCart = async () => {
  return await fetchApi('/cart');
};

/**
 * POST /api/cart/items
 * Add item to cart (with automatic stock locking)
 * 
 * @param {string} productId - Product UUID
 * @param {number} quantity - Quantity to add
 * @param {string|null} variantId - Variant UUID (optional)
 * 
 * @returns {Promise<Object>} Updated cart info
 */
export const addToCart = async (productId, quantity = 1, variantId = null) => {
  return await fetchApi('/cart/items', {
    method: 'POST',
    body: JSON.stringify({
      productId,
      variantId,
      quantity,
    }),
  });
};

/**
 * PUT /api/cart/items/:itemId
 * Update cart item quantity
 * 
 * @param {string} itemId - Cart item UUID
 * @param {number} quantity - New quantity (0 to remove)
 * 
 * @returns {Promise<Object>} Updated cart item
 */
export const updateCartItem = async (itemId, quantity) => {
  return await fetchApi(`/cart/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  });
};

/**
 * DELETE /api/cart/items/:itemId
 * Remove item from cart (auto-release stock lock)
 * 
 * @param {string} itemId - Cart item UUID
 * @returns {Promise<Object>} Success message
 */
export const removeFromCart = async (itemId) => {
  return await fetchApi(`/cart/items/${itemId}`, {
    method: 'DELETE',
  });
};

/**
 * POST /api/cart/checkout
 * Process checkout and payment
 * 
 * @param {Object} checkoutData - Checkout information
 * @param {Object} checkoutData.shippingAddress - Shipping address
 * @param {string} checkoutData.paymentMethod - Payment method
 * 
 * @returns {Promise<Object>} Order confirmation
 */
export const checkout = async (checkoutData) => {
  return await fetchApi('/cart/checkout', {
    method: 'POST',
    body: JSON.stringify(checkoutData),
  });
};

/**
 * DELETE /api/cart
 * Clear/abandon cart (release all stock locks)
 * 
 * @returns {Promise<Object>} Success message
 */
export const clearCart = async () => {
  return await fetchApi('/cart', {
    method: 'DELETE',
  });
};

// ==========================================
// STOCK API FUNCTIONS
// ==========================================

/**
 * GET /api/stock/:productId
 * Check stock availability
 * 
 * @param {string} productId - Product UUID
 * @returns {Promise<Object>} Stock information
 */
export const checkStock = async (productId) => {
  return await fetchApi(`/stock/${productId}`);
};

// ==========================================
// EXPORT
// ==========================================

export default {
  getProducts,
  getProductBySlug,
  getProductVariants,
  getCategories,
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  checkout,
  clearCart,
  checkStock,
};