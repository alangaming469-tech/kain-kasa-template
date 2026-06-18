/**
 * Cart Context - React Global State Management
 * Using Context API + useReducer for cart state
 * 
 * Features:
 * - Global cart state accessible anywhere in app
 * - Add/Update/Remove items with smart merge logic
 * - Auto-calculate totals
 * - Persist to localStorage
 * - Sync with backend API
 * - Loading & error states
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import * as api from '../api/axios-api.js';

// ==========================================
// CONSTANTS
// ==========================================

const STORAGE_KEY = 'kain_kasa_cart';

// ==========================================
// ACTION TYPES
// ==========================================

const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_ITEMS: 'SET_ITEMS',
  ADD_ITEM: 'ADD_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  CLEAR_CART: 'CLEAR_CART',
  SET_TOTALS: 'SET_TOTALS',
  SYNC_COMPLETE: 'SYNC_COMPLETE',
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const getItemKey = (productId, variantId = null) => {
  return variantId ? `${productId}_${variantId}` : productId;
};

const formatPrice = (price) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
};

// ==========================================
// REDUCER
// ==========================================

const cartReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case ActionTypes.SET_ITEMS:
      return {
        ...state,
        items: action.payload,
        itemCount: action.payload.reduce((sum, item) => sum + item.quantity, 0),
      };

    case ActionTypes.ADD_ITEM: {
      const newItem = action.payload;
      const itemKey = getItemKey(newItem.productId, newItem.variantId);
      
      // Check if item already exists
      const existingIndex = state.items.findIndex(
        (item) => getItemKey(item.productId, item.variantId) === itemKey
      );

      let newItems;
      if (existingIndex !== -1) {
        // Merge quantities
        const existingItem = state.items[existingIndex];
        newItems = [...state.items];
        newItems[existingIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + newItem.quantity,
          subtotal: newItem.price * (existingItem.quantity + newItem.quantity),
          updatedAt: new Date().toISOString(),
        };
        console.log(
          `[Cart] Merged item: ${existingItem.quantity} + ${newItem.quantity} = ${newItems[existingIndex].quantity}`
        );
      } else {
        // Add new item
        newItems = [...state.items, { ...newItem, addedAt: new Date().toISOString() }];
        console.log(`[Cart] Added new item: ${newItem.productName}`);
      }

      // Recalculate totals
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
      const total = subtotal - state.discount + state.tax;

      return {
        ...state,
        items: newItems,
        itemCount,
        subtotal,
        total,
        lastUpdated: new Date().toISOString(),
      };
    }

    case ActionTypes.UPDATE_ITEM: {
      const { itemKey, quantity } = action.payload;
      
      if (quantity <= 0) {
        // Remove item
        const newItems = state.items.filter(
          (item) => getItemKey(item.productId, item.variantId) !== itemKey
        );
        
        const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
        const total = subtotal - state.discount + state.tax;

        return {
          ...state,
          items: newItems,
          itemCount,
          subtotal,
          total,
          lastUpdated: new Date().toISOString(),
        };
      } else {
        // Update quantity
        const newItems = state.items.map((item) => {
          if (getItemKey(item.productId, item.variantId) === itemKey) {
            return {
              ...item,
              quantity,
              subtotal: item.price * quantity,
              updatedAt: new Date().toISOString(),
            };
          }
          return item;
        });

        const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
        const total = subtotal - state.discount + state.tax;

        return {
          ...state,
          items: newItems,
          itemCount,
          subtotal,
          total,
          lastUpdated: new Date().toISOString(),
        };
      }
    }

    case ActionTypes.REMOVE_ITEM: {
      const itemKey = action.payload;
      const newItems = state.items.filter(
        (item) => getItemKey(item.productId, item.variantId) !== itemKey
      );
      
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
      const total = subtotal - state.discount + state.tax;

      return {
        ...state,
        items: newItems,
        itemCount,
        subtotal,
        total,
        lastUpdated: new Date().toISOString(),
      };
    }

    case ActionTypes.CLEAR_CART:
      return {
        ...state,
        items: [],
        itemCount: 0,
        subtotal: 0,
        total: 0,
        discount: 0,
        tax: 0,
        expiresAt: null,
        lastUpdated: new Date().toISOString(),
      };

    case ActionTypes.SET_TOTALS:
      return {
        ...state,
        ...action.payload,
      };

    case ActionTypes.SYNC_COMPLETE:
      return {
        ...state,
        items: action.payload.items,
        itemCount: action.payload.itemCount,
        subtotal: action.payload.subtotal,
        discount: action.payload.discount,
        tax: action.payload.tax,
        total: action.payload.total,
        expiresAt: action.payload.expiresAt,
        lastUpdated: new Date().toISOString(),
        loading: false,
        error: null,
      };

    default:
      return state;
  }
};

// ==========================================
// INITIAL STATE
// ==========================================

const getInitialState = () => {
  const defaultState = {
    items: [],
    itemCount: 0,
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    loading: false,
    error: null,
    lastUpdated: null,
    expiresAt: null,
  };

  // Try to load from localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      
      // Check if expired (24 hours)
      const lastUpdated = new Date(data.lastUpdated);
      const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / 3600000;
      
      if (hoursSinceUpdate > 24) {
        console.log('[Cart] Cart expired, using default state');
        localStorage.removeItem(STORAGE_KEY);
        return defaultState;
      }

      console.log('[Cart] Loaded from storage');
      return {
        ...defaultState,
        items: data.items || [],
        itemCount: data.itemCount || 0,
        subtotal: data.subtotal || 0,
        total: data.total || 0,
        lastUpdated: data.lastUpdated,
      };
    }
  } catch (error) {
    console.error('[Cart] Load error:', error);
  }

  return defaultState;
};

// ==========================================
// CONTEXT
// ==========================================

const CartContext = createContext(null);

// ==========================================
// PROVIDER COMPONENT
// ==========================================

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, null, getInitialState);

  // Persist to localStorage on changes
  useEffect(() => {
    if (state.items.length > 0 || state.lastUpdated) {
      const data = {
        items: state.items,
        itemCount: state.itemCount,
        subtotal: state.subtotal,
        total: state.total,
        lastUpdated: state.lastUpdated,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [state]);

  // Sync with backend on mount (optional)
  useEffect(() => {
    syncWithBackend();
  }, []);

  // ==========================================
  // ACTIONS
  // ==========================================

  const setLoading = useCallback((loading) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: loading });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: ActionTypes.SET_ERROR, payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_ERROR });
  }, []);

  const syncWithBackend = useCallback(async () => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });

    try {
      const result = await api.getCart();

      if (result.success) {
        dispatch({
          type: ActionTypes.SYNC_COMPLETE,
          payload: {
            items: result.data.items || [],
            itemCount: result.data.itemCount || 0,
            subtotal: result.data.subtotal || 0,
            discount: result.data.discount || 0,
            tax: result.data.tax || 0,
            total: result.data.total || 0,
            expiresAt: result.data.expiresAt,
          },
        });
      } else {
        dispatch({ type: ActionTypes.SET_ERROR, payload: result.error });
      }
    } catch (error) {
      console.error('[Cart] Sync error:', error);
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
    }
  }, []);

  const addItem = useCallback(async (product, quantity = 1, variantId = null) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    dispatch({ type: ActionTypes.CLEAR_ERROR });

    try {
      const price = product.discountPrice || product.basePrice;

      // Add to local state first (optimistic update)
      dispatch({
        type: ActionTypes.ADD_ITEM,
        payload: {
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          productImage: product.mainImage,
          variantId,
          variantName: variantId ? product.variants?.find(v => v.id === variantId)?.variantValue : null,
          price,
          quantity,
          subtotal: price * quantity,
        },
      });

      // Sync with backend
      const result = await api.addToCart(product.id, quantity, variantId);

      if (result.success) {
        // Refresh from backend to ensure consistency
        await syncWithBackend();

        return {
          success: true,
          message: result.message,
          warning: result.warning,
        };
      } else {
        // Rollback on error
        dispatch({ type: ActionTypes.SET_ERROR, payload: result.error });
        
        // Remove the optimistically added item
        const itemKey = getItemKey(product.id, variantId);
        dispatch({ type: ActionTypes.REMOVE_ITEM, payload: itemKey });

        return {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
        };
      }
    } catch (error) {
      console.error('[Cart] Add item error:', error);
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  }, [syncWithBackend]);

  const updateQuantity = useCallback(async (productId, quantity, variantId = null) => {
    const itemKey = getItemKey(productId, variantId);
    const item = state.items.find(
      (i) => getItemKey(i.productId, i.variantId) === itemKey
    );

    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    // Optimistic update
    dispatch({
      type: ActionTypes.UPDATE_ITEM,
      payload: { itemKey, quantity },
    });

    // Sync with backend if quantity changed
    if (quantity > 0) {
      try {
        const result = await api.updateCartItem(item.cartItemId || itemKey, quantity);
        
        if (!result.success) {
          // Rollback
          dispatch({
            type: ActionTypes.UPDATE_ITEM,
            payload: { itemKey, quantity: item.quantity },
          });
          dispatch({ type: ActionTypes.SET_ERROR, payload: result.error });
          
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error('[Cart] Update error:', error);
        // Rollback
        dispatch({
          type: ActionTypes.UPDATE_ITEM,
          payload: { itemKey, quantity: item.quantity },
        });
        
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  }, [state.items]);

  const removeFromCart = useCallback(async (productId, variantId = null) => {
    const itemKey = getItemKey(productId, variantId);
    const item = state.items.find(
      (i) => getItemKey(i.productId, i.variantId) === itemKey
    );

    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    // Optimistic remove
    dispatch({ type: ActionTypes.REMOVE_ITEM, payload: itemKey });

    // Sync with backend
    try {
      const result = await api.removeFromCart(item.cartItemId || itemKey);
      
      if (!result.success) {
        // Rollback - add back
        dispatch({
          type: ActionTypes.ADD_ITEM,
          payload: item,
        });
        dispatch({ type: ActionTypes.SET_ERROR, payload: result.error });
        
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[Cart] Remove error:', error);
      // Rollback
      dispatch({
        type: ActionTypes.ADD_ITEM,
        payload: item,
      });
      
      return { success: false, error: error.message };
    }

    return { success: true };
  }, [state.items]);

  const clearCart = useCallback(async () => {
    dispatch({ type: ActionTypes.CLEAR_CART });
    localStorage.removeItem(STORAGE_KEY);

    try {
      await api.clearCart();
    } catch (error) {
      console.error('[Cart] Clear error:', error);
    }

    return { success: true };
  }, []);

  const checkout = useCallback(async (checkoutData) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });

    try {
      const result = await api.checkout(checkoutData);

      if (result.success) {
        dispatch({ type: ActionTypes.CLEAR_CART });
        return {
          success: true,
          data: result.data,
          message: result.message,
        };
      } else {
        dispatch({ type: ActionTypes.SET_ERROR, payload: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[Cart] Checkout error:', error);
      dispatch({ type: ActionTypes.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, []);

  // ==========================================
  // SELECTORS
  // ==========================================

  const getItemQuantity = useCallback((productId, variantId = null) => {
    const item = state.items.find(
      (i) => getItemKey(i.productId, i.variantId) === getItemKey(productId, variantId)
    );
    return item ? item.quantity : 0;
  }, [state.items]);

  const isInCart = useCallback((productId, variantId = null) => {
    return state.items.some(
      (i) => getItemKey(i.productId, i.variantId) === getItemKey(productId, variantId)
    );
  }, [state.items]);

  const getItem = useCallback((productId, variantId = null) => {
    return state.items.find(
      (i) => getItemKey(i.productId, i.variantId) === getItemKey(productId, variantId)
    );
  }, [state.items]);

  const getItemSubtotal = useCallback((productId, variantId = null) => {
    const item = getItem(productId, variantId);
    return item ? item.subtotal : 0;
  }, [getItem]);

  // ==========================================
  // VALUE
  // ==========================================

  const value = {
    // State
    items: state.items,
    itemCount: state.itemCount,
    subtotal: state.subtotal,
    discount: state.discount,
    tax: state.tax,
    total: state.total,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    expiresAt: state.expiresAt,
    isEmpty: state.items.length === 0,

    // Actions
    addItem,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkout,
    syncWithBackend,
    clearError,

    // Selectors
    getItemQuantity,
    isInCart,
    getItem,
    getItemSubtotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// ==========================================
// HOOK
// ==========================================

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
};

// ==========================================
// EXPORT
// ==========================================

export default { CartProvider, useCart };