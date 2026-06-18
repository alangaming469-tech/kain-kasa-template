/**
 * Cart Store - Vanilla JS Event-Based State Management
 * Features:
 * - Add/Update/Remove items
 * - Auto-calculate totals
 * - Persistent to localStorage
 * - Event system for reactivity
 * - Sync with backend API
 */

// ==========================================
// CONSTANTS
// ==========================================

const STORAGE_KEY = 'kain_kasa_cart';
const LOCK_DURATION_MINUTES = 15;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Generate unique item key (product + variant combo)
 */
const getItemKey = (productId, variantId = null) => {
  return variantId ? `${productId}_${variantId}` : productId;
};

/**
 * Format price to IDR
 */
const formatPrice = (price) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
};

/**
 * Get session ID
 */
const getSessionId = () => {
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

// ==========================================
// CART STORE CLASS
// ==========================================

class CartStore {
  constructor() {
    // State
    this.items = [];
    this.itemCount = 0;
    this.subtotal = 0;
    this.discount = 0;
    this.tax = 0;
    this.total = 0;
    this.loading = false;
    this.error = null;
    this.lastUpdated = null;
    this.expiresAt = null;

    // Event listeners
    this.listeners = new Map();
    this.apiClient = null;

    // Load from localStorage
    this.loadFromStorage();

    // Auto-save on changes
    this.subscribe((state) => {
      this.saveToStorage();
    });

    // Check expired locks periodically
    this.startExpiryCheck();
  }

  // ==========================================
  // EVENT SYSTEM
  // ==========================================

  /**
   * Subscribe to state changes
   * @param {Function} callback - Receives current state
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    const id = Date.now() + Math.random();
    this.listeners.set(id, callback);
    
    // Notify immediately with current state
    callback(this.getState());

    // Return unsubscribe function
    return () => {
      this.listeners.delete(id);
    };
  }

  /**
   * Notify all listeners
   */
  notify() {
    const state = this.getState();
    this.listeners.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        console.error('[CartStore] Listener error:', error);
      }
    });
  }

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  /**
   * Get current state
   */
  getState() {
    return {
      items: [...this.items],
      itemCount: this.itemCount,
      subtotal: this.subtotal,
      discount: this.discount,
      tax: this.tax,
      total: this.total,
      loading: this.loading,
      error: this.error,
      lastUpdated: this.lastUpdated,
      expiresAt: this.expiresAt,
      isEmpty: this.items.length === 0,
    };
  }

  /**
   * Set loading state
   */
  setLoading(loading) {
    this.loading = loading;
    this.notify();
  }

  /**
   * Set error state
   */
  setError(error) {
    this.error = error;
    this.loading = false;
    this.notify();
  }

  /**
   * Clear error
   */
  clearError() {
    this.error = null;
    this.notify();
  }

  // ==========================================
  // CALCULATIONS
  // ==========================================

  /**
   * Recalculate cart totals
   */
  recalculate() {
    // Calculate item count
    this.itemCount = this.items.reduce((sum, item) => sum + item.quantity, 0);

    // Calculate subtotal
    this.subtotal = this.items.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    // Calculate total (subtotal - discount + tax)
    this.total = this.subtotal - this.discount + this.tax;

    // Update timestamp
    this.lastUpdated = new Date().toISOString();

    console.log('[CartStore] Recalculated:', {
      itemCount: this.itemCount,
      subtotal: formatPrice(this.subtotal),
      total: formatPrice(this.total),
    });
  }

  // ==========================================
  // CORE OPERATIONS
  // ==========================================

  /**
   * Add item to cart
   * Logic:
   * - If product+variant already exists → increment quantity
   * - If new → add as new item
   * - Recalculate totals
   * 
   * @param {Object} product - Product data
   * @param {number} quantity - Quantity to add
   * @param {string|null} variantId - Variant ID (optional)
   * @param {number} price - Price at time of add
   * @returns {Object} Result { success, item, updated }
   */
  addItem(product, quantity = 1, variantId = null, price = null) {
    try {
      const itemKey = getItemKey(product.id, variantId);
      const existingIndex = this.items.findIndex(
        (item) => item.key === itemKey
      );

      // Use product price if not provided
      const unitPrice = price || product.discountPrice || product.basePrice;

      if (existingIndex !== -1) {
        // Product already in cart - update quantity
        const existingItem = this.items[existingIndex];
        const newQuantity = existingItem.quantity + quantity;

        console.log(
          `[CartStore] Product exists, updating quantity: ${existingItem.quantity} → ${newQuantity}`
        );

        this.items[existingIndex] = {
          ...existingItem,
          quantity: newQuantity,
          subtotal: unitPrice * newQuantity,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // New product - add to cart
        const newItem = {
          key: itemKey,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          productImage: product.mainImage,
          variantId: variantId,
          variantName: variantId ? product.variants?.find((v) => v.id === variantId)?.variantValue : null,
          variantType: variantId ? product.variants?.find((v) => v.id === variantId)?.variantType : null,
          quantity: quantity,
          price: unitPrice,
          subtotal: unitPrice * quantity,
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        console.log(`[CartStore] Adding new item:`, newItem);
        this.items.push(newItem);
      }

      // Recalculate totals
      this.recalculate();

      // Notify listeners
      this.notify();

      return {
        success: true,
        item: this.items.find((item) => item.key === itemKey),
        updated: existingIndex !== -1,
        message: existingIndex !== -1 
          ? `Quantity updated to ${this.items[existingIndex].quantity}`
          : 'Item added to cart',
      };
    } catch (error) {
      console.error('[CartStore] Error adding item:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update item quantity
   * @param {string} itemKey - Item key (productId_variantId)
   * @param {number} quantity - New quantity (0 to remove)
   * @returns {Object} Result
   */
  updateQuantity(itemKey, quantity) {
    try {
      const index = this.items.findIndex((item) => item.key === itemKey);

      if (index === -1) {
        return {
          success: false,
          error: 'Item not found',
        };
      }

      const item = this.items[index];

      if (quantity <= 0) {
        // Remove item
        this.items.splice(index, 1);
        console.log(`[CartStore] Removed item: ${item.productName}`);
      } else {
        // Update quantity
        this.items[index] = {
          ...item,
          quantity: quantity,
          subtotal: item.price * quantity,
          updatedAt: new Date().toISOString(),
        };
        console.log(
          `[CartStore] Updated quantity: ${item.quantity} → ${quantity}`
        );
      }

      // Recalculate
      this.recalculate();
      this.notify();

      return {
        success: true,
        item: this.items[index],
      };
    } catch (error) {
      console.error('[CartStore] Error updating quantity:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Remove item from cart
   * @param {string} itemKey - Item key
   * @returns {Object} Result
   */
  removeItem(itemKey) {
    try {
      const index = this.items.findIndex((item) => item.key === itemKey);

      if (index === -1) {
        return {
          success: false,
          error: 'Item not found',
        };
      }

      const removedItem = this.items[index];
      this.items.splice(index, 1);

      console.log(`[CartStore] Removed item: ${removedItem.productName}`);

      // Recalculate
      this.recalculate();
      this.notify();

      return {
        success: true,
        item: removedItem,
      };
    } catch (error) {
      console.error('[CartStore] Error removing item:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clear entire cart
   */
  clear() {
    this.items = [];
    this.itemCount = 0;
    this.subtotal = 0;
    this.discount = 0;
    this.tax = 0;
    this.total = 0;
    this.expiresAt = null;

    console.log('[CartStore] Cart cleared');
    this.recalculate();
    this.notify();

    return { success: true };
  }

  // ==========================================
  // API INTEGRATION
  // ==========================================

  /**
   * Set API client for backend sync
   */
  setApiClient(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Sync cart with backend
   */
  async syncWithBackend() {
    if (!this.apiClient) {
      console.warn('[CartStore] No API client set');
      return;
    }

    this.setLoading(true);

    try {
      // Fetch cart from backend
      const result = await this.apiClient.getCart();

      if (result.success) {
        // Map backend items to local format
        this.items = result.data.items.map((item) => ({
          key: getItemKey(item.productId, item.variantId),
          productId: item.productId,
          productName: item.productName,
          productSlug: item.productSlug,
          productImage: item.productImage,
          variantId: item.variantId,
          variantName: item.variantName,
          variantType: item.variantType,
          quantity: item.quantity,
          price: item.priceAtAdd,
          subtotal: item.subtotal,
          addedAt: item.addedAt,
          updatedAt: item.updatedAt,
          lockExpiresAt: item.lockExpiresAt,
        }));

        this.itemCount = result.data.itemCount;
        this.subtotal = result.data.subtotal;
        this.discount = result.data.discount;
        this.tax = result.data.tax;
        this.total = result.data.total;
        this.expiresAt = result.data.expiresAt;

        console.log('[CartStore] Synced with backend');
        this.recalculate();
        this.notify();
      } else {
        this.setError(result.error);
      }
    } catch (error) {
      console.error('[CartStore] Sync error:', error);
      this.setError(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Add item and sync with backend
   */
  async addItemAndSync(product, quantity = 1, variantId = null) {
    if (!this.apiClient) {
      // No API client, add locally only
      return this.addItem(product, quantity, variantId);
    }

    this.setLoading(true);
    this.clearError();

    try {
      const result = await this.apiClient.addToCart(
        product.id,
        quantity,
        variantId
      );

      if (result.success) {
        // Refresh from backend
        await this.syncWithBackend();

        return {
          success: true,
          item: this.items.find(
            (item) => item.key === getItemKey(product.id, variantId)
          ),
          warning: result.warning,
          message: result.message,
        };
      } else {
        this.setError(result.error);
        return {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
        };
      }
    } catch (error) {
      console.error('[CartStore] Add item error:', error);
      this.setError(error.message);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Update quantity and sync with backend
   */
  async updateQuantityAndSync(itemKey, quantity) {
    if (!this.apiClient) {
      return this.updateQuantity(itemKey, quantity);
    }

    const item = this.items.find((i) => i.key === itemKey);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    this.setLoading(true);

    try {
      const result = await this.apiClient.updateCartItem(
        item.key, // cart_item_id
        quantity
      );

      if (result.success) {
        await this.syncWithBackend();
        return { success: true };
      } else {
        this.setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[CartStore] Update quantity error:', error);
      this.setError(error.message);
      return { success: false, error: error.message };
    } finally {
      this.setLoading(false);
    }
  }

  // ==========================================
  // PERSISTENCE
  // ==========================================

  /**
   * Save to localStorage
   */
  saveToStorage() {
    try {
      const data = {
        items: this.items,
        itemCount: this.itemCount,
        subtotal: this.subtotal,
        total: this.total,
        lastUpdated: this.lastUpdated,
        expiresAt: this.expiresAt,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[CartStore] Save error:', error);
    }
  }

  /**
   * Load from localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        console.log('[CartStore] No stored cart found');
        return;
      }

      const data = JSON.parse(stored);

      // Check if cart is expired (optional - e.g., 24 hours)
      const lastUpdated = new Date(data.lastUpdated);
      const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / 3600000;

      if (hoursSinceUpdate > 24) {
        console.log('[CartStore] Cart expired, clearing');
        this.clear();
        return;
      }

      this.items = data.items || [];
      this.itemCount = data.itemCount || 0;
      this.subtotal = data.subtotal || 0;
      this.total = data.total || 0;
      this.lastUpdated = data.lastUpdated;
      this.expiresAt = data.expiresAt;

      this.recalculate();
      this.notify();

      console.log('[CartStore] Loaded from storage:', {
        itemCount: this.itemCount,
        total: formatPrice(this.total),
      });
    } catch (error) {
      console.error('[CartStore] Load error:', error);
    }
  }

  /**
   * Clear storage
   */
  clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ==========================================
  // EXPIRY MANAGEMENT
  // ==========================================

  /**
   * Check for expired locks every minute
   */
  startExpiryCheck() {
    setInterval(() => {
      const now = new Date();

      if (this.expiresAt) {
        const expiresAt = new Date(this.expiresAt);

        if (now > expiresAt) {
          console.warn('[CartStore] Cart locks expired!');
          // Optional: Clear cart or show warning
          // this.clear();
        }
      }
    }, 60000); // Check every minute
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Get item by key
   */
  getItem(itemKey) {
    return this.items.find((item) => item.key === itemKey);
  }

  /**
   * Check if product is in cart
   */
  isInCart(productId, variantId = null) {
    const itemKey = getItemKey(productId, variantId);
    return this.items.some((item) => item.key === itemKey);
  }

  /**
   * Get item quantity
   */
  getItemQuantity(productId, variantId = null) {
    const item = this.getItem(getItemKey(productId, variantId));
    return item ? item.quantity : 0;
  }

  /**
   * Export cart data
   */
  export() {
    return {
      items: this.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      })),
      itemCount: this.itemCount,
      subtotal: this.subtotal,
      total: this.total,
      expiresAt: this.expiresAt,
    };
  }
}

// ==========================================
// EXPORT SINGLETON INSTANCE
// ==========================================

const cartStore = new CartStore();

export default cartStore;
export { CartStore, formatPrice, getItemKey };