/**
 * Main App - Kain & Kasa E-commerce
 * SIMPLIFIED VERSION FOR DEPLOYMENT
 * 
 * Features:
 * - Load products from API
 * - Add to cart with state management
 * - Real-time cart counter
 * - Persistent storage
 */

import React, { useState, useEffect, createContext, useContext, useReducer } from 'react';

// ==========================================
// CONSTANTS
// ==========================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const STORAGE_KEY = 'kain_kasa_cart';

// ==========================================
// CART CONTEXT
// ==========================================

const CartContext = createContext(null);

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const newItem = action.payload;
      const existingIndex = state.items.findIndex(
        item => item.productId === newItem.productId && item.variantId === newItem.variantId
      );

      let newItems;
      if (existingIndex !== -1) {
        newItems = [...state.items];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + newItem.quantity,
          subtotal: newItems[existingIndex].price * (newItems[existingIndex].quantity + newItem.quantity)
        };
      } else {
        newItems = [...state.items, newItem];
      }

      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);

      return {
        ...state,
        items: newItems,
        itemCount,
        subtotal,
        total: subtotal,
        lastUpdated: new Date().toISOString()
      };
    }

    case 'SET_ITEMS':
      const itemCount = action.payload.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = action.payload.reduce((sum, item) => sum + item.subtotal, 0);
      return {
        ...state,
        items: action.payload,
        itemCount,
        subtotal,
        total: subtotal
      };

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        itemCount: 0,
        subtotal: 0,
        total: 0
      };

    case 'UPDATE_QUANTITY': {
      const { index, quantity } = action.payload;
      if (quantity <= 0) {
        const newItems = state.items.filter((_, i) => i !== index);
        const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
        return {
          ...state,
          items: newItems,
          itemCount,
          subtotal,
          total: subtotal
        };
      } else {
        const newItems = [...state.items];
        newItems[index] = {
          ...newItems[index],
          quantity,
          subtotal: newItems[index].price * quantity
        };
        const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const subtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
        return {
          ...state,
          items: newItems,
          itemCount,
          subtotal,
          total: subtotal
        };
      }
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter((_, i) => i !== action.payload);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const subtotal = newItems.reduce((sum, item) => sum + item.subtotal, 0);
      return {
        ...state,
        items: newItems,
        itemCount,
        subtotal,
        total: subtotal
      };
    }

    default:
      return state;
  }
};

const getInitialState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        items: data.items || [],
        itemCount: data.itemCount || 0,
        subtotal: data.subtotal || 0,
        total: data.total || 0,
        loading: false,
        error: null
      };
    }
  } catch (e) {
    console.error('Load cart error:', e);
  }
  return { items: [], itemCount: 0, subtotal: 0, total: 0, loading: false, error: null };
};

function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, null, getInitialState);

  useEffect(() => {
    if (state.items.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        items: state.items,
        itemCount: state.itemCount,
        subtotal: state.subtotal,
        total: state.total
      }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state]);

  const addItem = async (product, quantity = 1, variantId = null) => {
    const price = product.discountPrice || product.basePrice;
    
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        productId: product.id,
        productName: product.name,
        productImage: product.mainImage,
        variantId,
        variantName: variantId ? 'Variant' : null,
        price,
        quantity,
        subtotal: price * quantity
      }
    });

    // Try to sync with backend (optional, will fail if backend not running)
    try {
      const response = await fetch(`${API_BASE_URL}/cart/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity, variantId })
      });
      
      if (!response.ok) {
        console.log('Backend not available, using local-only mode');
      }
    } catch (e) {
      console.log('Local mode: Backend not connected');
    }

    return { success: true, message: 'Added to cart!' };
  };

  const updateQuantity = (index, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { index, quantity } });
  };

  const removeFromCart = (index) => {
    dispatch({ type: 'REMOVE_ITEM', payload: index });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  return (
    <CartContext.Provider value={{
      ...state,
      addItem,
      updateQuantity,
      removeFromCart,
      clearCart,
      isEmpty: state.items.length === 0
    }}>
      {children}
    </CartContext.Provider>
  );
}

function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

// ==========================================
// COMPONENTS
// ==========================================

function CartIcon({ onClick }) {
  const { itemCount, total } = useCart();
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <button
      onClick={onClick}
      className="relative p-3 hover:bg-gray-100 rounded-full transition-colors"
    >
      <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {itemCount}
        </span>
      )}
    </button>
  );
}

function CartSidebar({ isOpen, onClose }) {
  const { items, itemCount, total, updateQuantity, removeFromCart, clearCart, isEmpty } = useCart();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-indigo-600 text-white">
          <h2 className="text-xl font-bold">Shopping Cart ({itemCount})</h2>
          <button onClick={onClose} className="text-2xl">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isEmpty ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-500">Your cart is empty</p>
              <button onClick={onClose} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-full font-semibold">
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex gap-4 border-b pb-4">
                  <img src={item.productImage} alt={item.productName} className="w-20 h-20 object-cover rounded" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.productName}</h3>
                    <p className="text-indigo-600 font-bold">{formatPrice(item.price)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        className="px-2 py-1 border rounded"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        className="px-2 py-1 border rounded"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="ml-auto text-red-600 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatPrice(item.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isEmpty && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-2xl font-bold text-indigo-600">{formatPrice(total)}</span>
            </div>
            <button
              onClick={clearCart}
              className="w-full py-3 border-2 border-red-600 text-red-600 rounded-xl font-semibold mb-2"
            >
              Clear Cart
            </button>
            <button className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold">
              Checkout (Coming Soon)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, onAddToCart }) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleAddToCart = async () => {
    setIsAdding(true);
    await addItem(product, 1);
    setIsAdding(false);
    alert('✅ Added to cart: ' + product.name);
  };

  const stockColors = {
    in_stock: 'text-green-600 bg-green-50 border-green-200',
    low_stock: 'text-orange-600 bg-orange-50 border-orange-200',
    out_of_stock: 'text-red-600 bg-red-50 border-red-200'
  };

  const stockLabels = {
    in_stock: `✅ ${product.availableStock} left`,
    low_stock: `⚠️ Only ${product.availableStock} left!`,
    out_of_stock: '❌ Out of stock'
  };

  const isOutOfStock = product.stockStatus === 'out_of_stock';
  const hasDiscount = product.discountPrice && product.discountPrice < product.basePrice;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-2">
      <div className="relative h-64 bg-gray-200">
        <img
          src={product.mainImage}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => e.target.src = 'https://via.placeholder.com/400x300?text=No+Image'}
        />
        
        {product.isFeatured && (
          <span className="absolute top-3 left-3 bg-yellow-400 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            ⭐ Featured
          </span>
        )}
        
        {hasDiscount && (
          <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            -{product.discountPercentage}% OFF
          </span>
        )}
        
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-bold">❌ Out of Stock</span>
          </div>
        )}
      </div>

      <div className="p-5">
        <span className="text-xs font-medium uppercase text-indigo-600">{product.categoryName}</span>
        <h3 className="text-lg font-bold mt-1 mb-2">{product.name}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.shortDescription}</p>

        <div className="flex items-center justify-between mb-4">
          <div>
            {hasDiscount ? (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-indigo-600">{formatPrice(product.discountPrice)}</span>
                <span className="text-sm text-gray-400 line-through">{formatPrice(product.basePrice)}</span>
              </div>
            ) : (
              <span className="text-xl font-bold text-indigo-600">{formatPrice(product.basePrice)}</span>
            )}
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${stockColors[product.stockStatus] || stockColors.out_of_stock}`}>
            {stockLabels[product.stockStatus] || stockLabels.out_of_stock}
          </span>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAdding}
          className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            isOutOfStock
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : isAdding
              ? 'bg-indigo-400 text-white'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
          }`}
        >
          {isAdding ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Adding...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {isOutOfStock ? 'Notify Me' : 'Add to Cart'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// MAIN APP
// ==========================================

function ShopPage() {
  const [cartOpen, setCartOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/products`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const result = await response.json();
        
        if (result.success && result.data.products) {
          setProducts(result.data.products);
        } else {
          // Use dummy data for demo
          console.log('Using demo data');
          setProducts([
            {
              id: '1',
              name: 'Kaos Oversized Street',
              slug: 'kaos-oversized-street',
              shortDescription: 'Kaos oversized dengan desain streetwear modern. Bahan premium cotton 24s.',
              basePrice: 149000,
              discountPrice: null,
              discountPercentage: null,
              availableStock: 50,
              stockStatus: 'in_stock',
              mainImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
              isFeatured: true,
              categoryName: 'Clothing'
            },
            {
              id: '2',
              name: 'Hoodie Local Pride',
              slug: 'hoodie-local-pride',
              shortDescription: 'Hoodie hangat dengan desain local pride. Perfect untuk cuaca Indonesia.',
              basePrice: 249000,
              discountPrice: 229000,
              discountPercentage: 8,
              availableStock: 28,
              stockStatus: 'in_stock',
              mainImage: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
              isFeatured: true,
              categoryName: 'Clothing'
            },
            {
              id: '3',
              name: 'Jacket Bomber Indo',
              slug: 'jacket-bomber-indo',
              shortDescription: 'Jacket bomber stylish dengan sentuhan lokal. Tahan air dan angin.',
              basePrice: 299000,
              discountPrice: null,
              discountPercentage: null,
              availableStock: 5,
              stockStatus: 'low_stock',
              mainImage: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400',
              isFeatured: false,
              categoryName: 'Outerwear'
            },
            {
              id: '4',
              name: 'Celana Chino Slim Fit',
              slug: 'celana-chino-slim-fit',
              shortDescription: 'Celana chino slim fit, nyaman dan stylish untuk daily wear.',
              basePrice: 199000,
              discountPrice: null,
              discountPercentage: null,
              availableStock: 0,
              stockStatus: 'out_of_stock',
              mainImage: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400',
              isFeatured: false,
              categoryName: 'Pants'
            }
          ]);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
        
        // Fallback to demo data
        setProducts([
          {
            id: '1',
            name: 'Kaos Oversized Street',
            slug: 'kaos-oversized-street',
            shortDescription: 'Kaos oversized dengan desain streetwear modern.',
            basePrice: 149000,
            availableStock: 50,
            stockStatus: 'in_stock',
            mainImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
            isFeatured: true,
            categoryName: 'Clothing'
          },
          {
            id: '2',
            name: 'Hoodie Local Pride',
            slug: 'hoodie-local-pride',
            shortDescription: 'Hoodie hangat dengan desain local pride.',
            basePrice: 249000,
            discountPrice: 229000,
            discountPercentage: 8,
            availableStock: 28,
            stockStatus: 'in_stock',
            mainImage: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400',
            isFeatured: true,
            categoryName: 'Clothing'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              🇮🇩 Kain & Kasa
            </div>
            <CartIcon onClick={() => setCartOpen(true)} />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Premium Local Pride</h1>
          <p className="text-lg text-indigo-100 mb-6">Clothing brand untuk UMKM Indonesia</p>
          <button
            onClick={() => setCartOpen(true)}
            className="px-6 py-2 bg-white text-indigo-600 rounded-full font-semibold hover:bg-indigo-50"
          >
            View Cart
          </button>
        </div>
      </div>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading products...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16 py-8">
        <div className="text-center text-gray-600">
          <p className="font-semibold">🇮🇩 Kain & Kasa</p>
          <p className="text-sm mt-2">Premium local pride clothing</p>
          <p className="text-xs mt-4 text-gray-400">© 2026 Kain & Kasa</p>
        </div>
      </footer>

      <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <CartProvider>
      <ShopPage />
    </CartProvider>
  );
}

export default App;