/**
 * API Service for Kain & Kasa E-commerce
 * Menggunakan Axios (better error handling & interceptors)
 * 
 * Install: npm install axios
 */

import axios from 'axios';

// ==========================================
// CONFIGURATION
// ==========================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Create Axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==========================================
// INTERCEPTORS
// ==========================================

/**
 * Request Interceptor
 * Add session ID and auth token automatically
 */
apiClient.interceptors.request.use(
  (config) => {
    // Add session ID for guest users
    if (!config.headers.Authorization) {
      const sessionId = getSessionId();
      if (sessionId) {
        config.headers['X-Session-ID'] = sessionId;
      }
    }

    // Add auth token if exists
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handle common errors globally
 */
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          console.error('[API] Unauthorized - clearing auth');
          localStorage.removeItem('authToken');
          // Redirect to login or refresh token
          break;
        
        case 403:
          console.error('[API] Forbidden');
          break;
        
        case 404:
          console.error('[API] Resource not found');
          break;
        
        case 429:
          console.error('[API] Rate limit exceeded');
          break;
        
        case 500:
          console.error('[API] Server error');
          break;
        
        default:
          console.error(`[API] Error ${status}:`, data?.error);
      }
    } else if (error.request) {
      console.error('[API] No response received:', error.request);
    } else {
      console.error('[API] Request error:', error.message);
    }

    return Promise.reject({
      success: false,
      error: data?.error || error.message || 'Unknown error',
      statusCode: error.response?.status || null,
      data: data,
    });
  }
);

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
 * Retry failed requests (optional)
 */
const retryRequest = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      console.log(`[Retry] Attempt ${i + 1}/${maxRetries} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
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
 * @returns {Promise<Object>} { success: boolean, data: { products, pagination, filters }, meta }
 */
export const getProducts = async (filters = {}) => {
  try {
    const response = await apiClient.get('/products', { params: filters });
    return {
      success: true,
      data: response.data.data,
      meta: response.data.meta,
    };
  } catch (error) {
    console.error('[getProducts] Error:', error);
    return {
      success: false,
      error: error.error || 'Failed to fetch products',
      data: null,
    };
  }
};

/**
 * GET /api/products/:slug
 * Fetch single product by slug
 * 
 * @param {string} slug - Product slug
 * @returns {Promise<Object>} Product detail with variants
 */
export const getProductBySlug = async (slug) => {
  try {
    const response = await apiClient.get(`/products/${slug}`);
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    console.error('[getProductBySlug] Error:', error);
    return {
      success: false,
      error: error.error || 'Product not found',
      data: null,
    };
  }
};

/**
 * GET /api/products/:id/variants
 * Fetch variants for a specific product
 * 
 * @param {string} productId - Product UUID
 * @returns {Promise<Object>} List of variants
 */
export const getProductVariants = async (productId) => {
  try {
    const response = await apiClient.get(`/products/${productId}/variants`);
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    console.error('[getProductVariants] Error:', error);
    return {
      success: false,
      error: error.error || 'Failed to fetch variants',
      data: null,
    };
  }
};

/**
 * GET /api/categories
 * Fetch all categories
 * 
 * @returns {Promise<Object>} List of categories
 */
export const getCategories = async () => {
  try {
    const response = await apiClient.get('/products/categories');
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    console.error('[getCategories] Error:', error);
    return {
      success: false,
      error: error.error || 'Failed to fetch categories',
      data: null,
    };
  }
};

// ==========================================
// CART API FUNCTIONS
// ==========================================

/**
 * GET /api/cart
 * Get current user's cart
 */
export const getCart = async () => {
  try {
    const response = await apiClient.get('/cart');
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    console.error('[getCart] Error:', error);
    return {
      success: false,
      error: error.error || 'Failed to fetch cart',
      data: null,
    };
  }
};

/**
 * POST /api/cart/items
 * Add item to cart (with automatic stock locking)
 * 
 * @param {string} productId - Product UUID
 * @param {number} quantity - Quantity to add
 * @param {string|null} variantId - Variant UUID (optional)
 */
export const addToCart = async (productId, quantity = 1, variantId = null) => {
  try {
    const response = await apiClient.post('/cart/items', {
      productId,
      variantId,
      quantity,
    });
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
      warning: response.data.warning,
    };
  } catch (error) {
    console.error('[addToCart] Error:', error);
    return {
      success: false,
      error: error.error || 'Failed to add to cart',
      errorCode: error.data?.errorCode,
      data: null,
    };
  }
};

/**
 * PUT /api/cart/items/:itemId
 * Update cart item quantity
 */
export const updateCartItem = async (itemId, quantity) => {
  try {
    const response = await apiClient.put(`/cart/items/${itemId}`, {
      quantity,
    });
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('[updateCartItem] Error:', error);
    return {
      success: false,
      error: error.error || 'Failed to update cart',
      data: null,
    };
  }
};

/**
 * DELETE /api/cart/items/:itemId
 * Remove item from cart
 */
export const removeFromCart = async (itemId) => {
  try {
    const response = await apiClient.delete(`/cart/items/${itemId}`);
    return {
      success: true,
      message: response.data.message,
    };
  } catch (error) {
    console.error('[removeFromCart] Error:', error);
    return {
      success: false,
      error: error.error || 'Failed to remove item',
      data: null,
    };
  }
};

/**
 * POST /api/cart/checkout
 * Process checkout
 */
export const checkout = async (checkoutData) => {
  try {
    const response = await apiClient.post('/cart/checkout', checkoutData);
    return {
      success: true,
      data: response.data.data,
      message: response.data.message,
    };
  } catch (error) {
    console.error('[checkout] Error:', error);
    return {
      success: false,
      error: error.error || 'Checkout failed',
      data: null,
    };
  }
};

/**
 * DELETE /api/cart
 * Clear cart
 */
export const clearCart = async () => {
  try {
    const response = await apiClient.delete('/cart');
    return {
      success: true,
      message: response.data.message,
    };
  } catch (error) {
    console.error('[clearCart] Error:', error);
    return {
      success: false,
      error: error.error || 'Failed to clear cart',
      data: null,
    };
  }
};

// ==========================================
// STOCK API FUNCTIONS
// ==========================================

/**
 * GET /api/stock/:productId
 * Check stock availability
 */
export const checkStock = async (productId) => {
  try {
    const response = await apiClient.get(`/stock/${productId}`);
    return {
      success: true,
      data: response.data.data,
    };
  } catch (error) {
    console.error('[checkStock] Error:', error);
    return {
      success: false,
      error: error.error || 'Failed to check stock',
      data: null,
    };
  }
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