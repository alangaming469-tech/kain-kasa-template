/**
 * React Hooks for Kain & Kasa API
 * Custom hooks untuk product & cart operations
 * 
 * Usage:
 * const { products, loading, error } = useProducts();
 * const { addToCart, isAdding } = useCart();
 */

import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/axios-api.js';

// ==========================================
// PRODUCTS HOOKS
// ==========================================

/**
 * Fetch all products with filters
 * 
 * @param {Object} filters - Query parameters
 * @returns {Object} { products, loading, error, refetch, hasMore, loadMore }
 */
export const useProducts = (filters = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.getProducts(filters);
      
      if (result.success) {
        setProducts(result.data.products);
        setPagination(result.data.pagination);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Load more for infinite scroll
  const loadMore = async () => {
    if (!pagination?.hasMore) return;

    const nextOffset = (pagination.offset || 0) + (pagination.limit || 10);
    const result = await api.getProducts({ ...filters, offset: nextOffset });

    if (result.success) {
      setProducts(prev => [...prev, ...result.data.products]);
      setPagination(result.data.pagination);
    }
  };

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
    pagination,
    hasMore: pagination?.hasMore || false,
    loadMore,
  };
};

/**
 * Fetch single product by slug
 * 
 * @param {string} slug - Product slug
 * @returns {Object} { product, loading, error, refetch }
 */
export const useProduct = (slug) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProduct = useCallback(async () => {
    if (!slug) return;
    
    setLoading(true);
    setError(null);

    try {
      const result = await api.getProductBySlug(slug);
      
      if (result.success) {
        setProduct(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch product');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return {
    product,
    loading,
    error,
    refetch: fetchProduct,
  };
};

/**
 * Fetch product variants
 * 
 * @param {string} productId - Product UUID
 * @returns {Object} { variants, loading, error }
 */
export const useProductVariants = (productId) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVariants = useCallback(async () => {
    if (!productId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.getProductVariants(productId);
      
      if (result.success) {
        setVariants(result.data.variants);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch variants');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  return {
    variants,
    loading,
    error,
    refetch: fetchVariants,
  };
};

// ==========================================
// CART HOOKS
// ==========================================

/**
 * Shopping cart operations
 * 
 * @returns {Object} { cart, loading, error, addToCart, updateQuantity, removeFromCart, clearCart }
 */
export const useCart = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  // Fetch cart on mount
  const fetchCart = useCallback(async () => {
    setLoading(true);
    
    try {
      const result = await api.getCart();
      
      if (result.success) {
        setCart(result.data);
      }
    } catch (err) {
      console.error('[useCart] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Add to cart
  const addToCart = useCallback(async (productId, quantity = 1, variantId = null) => {
    setIsAdding(true);
    setError(null);

    try {
      const result = await api.addToCart(productId, quantity, variantId);
      
      if (result.success) {
        // Refresh cart
        await fetchCart();
        return { success: true, data: result.data, warning: result.warning };
      } else {
        setError(result.error);
        return { success: false, error: result.error, errorCode: result.errorCode };
      }
    } catch (err) {
      setError(err.message || 'Failed to add to cart');
      return { success: false, error: err.message };
    } finally {
      setIsAdding(false);
    }
  }, [fetchCart]);

  // Update quantity
  const updateQuantity = useCallback(async (itemId, quantity) => {
    try {
      const result = await api.updateCartItem(itemId, quantity);
      
      if (result.success) {
        await fetchCart();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [fetchCart]);

  // Remove item
  const removeFromCart = useCallback(async (itemId) => {
    try {
      const result = await api.removeFromCart(itemId);
      
      if (result.success) {
        await fetchCart();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [fetchCart]);

  // Clear cart
  const clearCart = useCallback(async () => {
    try {
      const result = await api.clearCart();
      
      if (result.success) {
        setCart(null);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Checkout
  const checkout = useCallback(async (checkoutData) => {
    try {
      const result = await api.checkout(checkoutData);
      
      if (result.success) {
        setCart(null);
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  return {
    cart,
    loading,
    error,
    isAdding,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkout,
    refreshCart: fetchCart,
    itemCount: cart?.itemCount || 0,
    total: cart?.total || 0,
  };
};

// ==========================================
// CATEGORIES HOOK
// ==========================================

/**
 * Fetch all categories
 * 
 * @returns {Object} { categories, loading, error }
 */
export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const result = await api.getCategories();
        
        if (result.success) {
          setCategories(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
  };
};

// ==========================================
// STOCK HOOK
// ==========================================

/**
 * Check stock availability for a product
 * 
 * @param {string} productId - Product UUID
 * @returns {Object} { stock, loading, error, refetch }
 */
export const useStock = (productId) => {
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkStock = useCallback(async () => {
    if (!productId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.checkStock(productId);
      
      if (result.success) {
        setStock(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'Failed to check stock');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    checkStock();
  }, [checkStock]);

  return {
    stock,
    loading,
    error,
    refetch: checkStock,
  };
};

// ==========================================
// EXPORT ALL HOOKS
// ==========================================

export default {
  useProducts,
  useProduct,
  useProductVariants,
  useCart,
  useCategories,
  useStock,
};