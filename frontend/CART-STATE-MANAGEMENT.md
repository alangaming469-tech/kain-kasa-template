# 🛒 Cart State Management - Usage Guide

Complete guide untuk menggunakan cart state management dengan logic:
- ✅ Add item baru
- ✅ Auto-merge quantity untuk produk sama
- ✅ Calculate total otomatis
- ✅ Persistent storage
- ✅ Backend sync

---

## 📦 **VERSION 1: Vanilla JS Store**

### **Setup:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Cart Demo</title>
</head>
<body>
  <div id="cart-count">Items: 0</div>
  <div id="cart-total">Total: Rp 0</div>
  
  <script type="module">
    import cartStore from './store/cart-store.js';

    // Subscribe to cart updates
    cartStore.subscribe((state) => {
      document.getElementById('cart-count').textContent = `Items: ${state.itemCount}`;
      document.getElementById('cart-total').textContent = `Total: ${formatPrice(state.total)}`;
      console.log('Cart updated:', state);
    });

    // Format helper
    function formatPrice(price) {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(price);
    }

    // Add to cart
    async function addToCart(product, quantity, variantId = null) {
      const result = await cartStore.addItemAndSync(product, quantity, variantId);
      
      if (result.success) {
        console.log('✅', result.message);
        if (result.warning) {
          console.warn('⚠️', result.warning);
        }
      } else {
        console.error('❌', result.error);
      }
    }

    // Example usage
    const product = {
      id: 'uuid-1',
      name: 'Kaos Oversized',
      slug: 'kaos-oversized',
      mainImage: '/img/kaos.jpg',
      basePrice: 149000,
      variants: [
        { id: 'uuid-v1', variantType: 'size', variantValue: 'L' }
      ]
    };

    // Add product
    addToCart(product, 2);

    // Add same product again (quantity will merge)
    setTimeout(() => {
      addToCart(product, 1); // Total will be 3, not separate item
    }, 2000);
  </script>
</body>
</html>
```

---

## ⚛️ **VERSION 2: React Context (RECOMMENDED)**

### **1. Wrap App with CartProvider:**

```jsx
// main.jsx or App.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { CartProvider } from './context/CartContext.jsx';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <CartProvider>
    <App />
  </CartProvider>
);
```

---

### **2. Use Cart Anywhere in App:**

#### **A. Add to Cart Button:**

```jsx
// components/AddToCartButton.jsx
import React, { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';

function AddToCartButton({ product, variantId = null }) {
  const { addItem, loading, error } = useCart();
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = async () => {
    const result = await addItem(product, quantity, variantId);

    if (result.success) {
      alert('✅ ' + result.message);
      
      // Show lock expiry warning if exists
      if (result.warning) {
        alert('⏰ ' + result.warning);
      }
    } else {
      alert('❌ ' + result.error);
      
      // Handle specific errors
      if (result.errorCode === 'INSUFFICIENT_STOCK') {
        alert('Stok tidak cukup!');
      }
    }
  };

  return (
    <div>
      {/* Quantity Selector */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="px-3 py-1 border rounded"
        >
          -
        </button>
        <span className="w-8 text-center">{quantity}</span>
        <button
          onClick={() => setQuantity(Math.min(product.availableStock, quantity + 1))}
          className="px-3 py-1 border rounded"
        >
          +
        </button>
      </div>

      {/* Add Button */}
      <button
        onClick={handleAddToCart}
        disabled={loading || product.stockStatus === 'out_of_stock'}
        className={`w-full py-3 rounded font-bold text-white ${
          loading ? 'bg-indigo-400' : 'bg-gradient-to-r from-indigo-600 to-purple-600'
        }`}
      >
        {loading ? 'Adding...' : 'Add to Cart'}
      </button>

      {/* Error Display */}
      {error && (
        <p className="mt-2 text-red-600 text-sm">{error}</p>
      )}
    </div>
  );
}

export default AddToCartButton;
```

---

#### **B. Cart Sidebar/Modal:**

```jsx
// components/CartSidebar.jsx
import React from 'react';
import { useCart } from '../context/CartContext.jsx';

function CartSidebar({ isOpen, onClose }) {
  const {
    items,
    itemCount,
    total,
    loading,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkout,
  } = useCart();

  if (!isOpen) return null;

  const handleQuantityChange = async (productId, variantId, newQuantity) => {
    const result = await updateQuantity(productId, newQuantity, variantId);
    
    if (!result.success) {
      alert('Failed: ' + result.error);
    }
  };

  const handleRemove = async (productId, variantId) => {
    if (confirm('Remove this item?')) {
      const result = await removeFromCart(productId, variantId);
      
      if (!result.success) {
        alert('Failed: ' + result.error);
      }
    }
  };

  const handleCheckout = async () => {
    const checkoutData = {
      shippingAddress: {
        name: 'Alan',
        phone: '+62***7890',
        address: 'Jl. Example No. 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        postalCode: '12345'
      },
      paymentMethod: 'midtrans'
    };

    const result = await checkout(checkoutData);
    
    if (result.success) {
      alert('✅ Checkout success! Order: ' + result.data.orderId);
      onClose();
    } else {
      alert('❌ Checkout failed: ' + result.error);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Shopping Cart ({itemCount} items)</h2>
          <button onClick={onClose} className="text-2xl">&times;</button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Cart is empty</p>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={`${item.productId}_${item.variantId}`} className="flex gap-4 border-b pb-4">
                  {/* Image */}
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-20 h-20 object-cover rounded"
                  />

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.productName}</h3>
                    {item.variantName && (
                      <p className="text-sm text-gray-600">
                        {item.variantType}: {item.variantName}
                      </p>
                    )}
                    <p className="text-indigo-600 font-bold">
                      {formatPrice(item.price)}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleQuantityChange(
                          item.productId,
                          item.variantId,
                          item.quantity - 1
                        )}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(
                          item.productId,
                          item.variantId,
                          item.quantity + 1
                        )}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleRemove(item.productId, item.variantId)}
                        className="ml-auto text-red-600 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right">
                    <p className="font-bold">{formatPrice(item.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          {/* Totals */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-2xl font-bold text-indigo-600">
              {formatPrice(total)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={clearCart}
              disabled={items.length === 0}
              className="flex-1 py-3 border border-red-600 text-red-600 rounded font-semibold hover:bg-red-50"
            >
              Clear
            </button>
            <button
              onClick={handleCheckout}
              disabled={items.length === 0 || loading}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded font-bold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartSidebar;
```

---

#### **C. Cart Icon with Badge:**

```jsx
// components/CartIcon.jsx
import React from 'react';
import { useCart } from '../context/CartContext.jsx';

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
      className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
    >
      {/* Cart Icon */}
      <svg
        className="w-6 h-6 text-gray-700"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>

      {/* Badge */}
      {itemCount > 0 && (
        <>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {itemCount}
          </span>
          {/* Total tooltip */}
          <div className="absolute -bottom-8 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {formatPrice(total)}
          </div>
        </>
      )}
    </button>
  );
}

export default CartIcon;
```

---

#### **D. Product Card Integration:**

```jsx
// components/ProductCard.jsx
import React from 'react';
import { useCart } from '../context/CartContext.jsx';

function ProductCard({ product }) {
  const { addItem, isInCart, getItemQuantity } = useCart();

  const inCart = isInCart(product.id);
  const quantityInCart = getItemQuantity(product.id);

  const handleAddToCart = async () => {
    const result = await addItem(product, 1);

    if (result.success) {
      // Show success toast
      showToast('✅ Added!', 'success');
    } else {
      showToast('❌ ' + result.error, 'error');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      {/* Image */}
      <img
        src={product.mainImage}
        alt={product.name}
        className="w-full h-48 object-cover rounded mb-4"
      />

      {/* Info */}
      <h3 className="text-lg font-bold">{product.name}</h3>
      <p className="text-indigo-600 font-bold text-xl mb-2">
        {formatPrice(product.discountPrice || product.basePrice)}
      </p>

      {/* Stock Status */}
      <p className={`text-sm mb-4 ${
        product.stockStatus === 'in_stock' ? 'text-green-600' :
        product.stockStatus === 'low_stock' ? 'text-orange-600' :
        'text-red-600'
      }`}>
        {product.stockStatus === 'in_stock' && `✅ ${product.availableStock} left`}
        {product.stockStatus === 'low_stock' && `⚠️ Only ${product.availableStock} left!`}
        {product.stockStatus === 'out_of_stock' && '❌ Out of stock'}
      </p>

      {/* Add to Cart */}
      {inCart ? (
        <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
          <p className="text-green-600 font-semibold">
            ✅ In Cart ({quantityInCart})
          </p>
          <button
            onClick={handleAddToCart}
            className="mt-2 text-indigo-600 text-sm font-semibold hover:underline"
          >
            Add more
          </button>
        </div>
      ) : (
        <button
          onClick={handleAddToCart}
          disabled={product.stockStatus === 'out_of_stock'}
          className={`w-full py-2 rounded font-semibold ${
            product.stockStatus === 'out_of_stock'
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {product.stockStatus === 'out_of_stock' ? 'Notify Me' : 'Add to Cart'}
        </button>
      )}
    </div>
  );
}

export default ProductCard;
```

---

## 🎯 **COMPLETE APP EXAMPLE:**

```jsx
// App.jsx
import React, { useState } from 'react';
import { CartProvider, useCart } from './context/CartContext.jsx';
import ProductCard from './components/ProductCard.jsx';
import CartSidebar from './components/CartSidebar.jsx';
import CartIcon from './components/CartIcon.jsx';
import { useProducts } from './hooks/useProducts.js';

function ShopApp() {
  const [cartOpen, setCartOpen] = useState(false);
  const { products, loading, error } = useProducts();

  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="text-2xl font-bold text-indigo-600">
                Kain & Kasa
              </div>

              {/* Cart Icon */}
              <CartIcon onClick={() => setCartOpen(true)} />
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-8">All Products</h1>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-600">
              Error: {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>

        {/* Cart Sidebar */}
        <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      </div>
    </CartProvider>
  );
}

export default ShopApp;
```

---

## 🔥 **KEY FEATURES:**

### **1. Smart Quantity Merge:**
```javascript
// Add product A (qty: 2)
await addItem(productA, 2);

// Add product A again (qty: 1)
await addItem(productA, 1);

// Result: Single item with quantity = 3
// NOT two separate items!
```

### **2. Variant Handling:**
```javascript
// Add product with variant L
addItem(product, 1, 'variant-L');

// Add same product with variant XL
addItem(product, 1, 'variant-XL');

// Result: TWO separate items (different variants)
```

### **3. Auto-Calculate:**
```javascript
// Every state change triggers recalculation:
itemCount = sum(quantities)
subtotal = sum(price * quantity)
total = subtotal - discount + tax
```

### **4. Persistent Storage:**
```javascript
// Auto-save to localStorage
localStorage.setItem('kain_kasa_cart', JSON.stringify(cart));

// Auto-load on refresh
// Cart survives page reload!
```

### **5. Backend Sync:**
```javascript
// Add locally first (optimistic)
dispatch({ type: 'ADD_ITEM', payload: newItem });

// Then sync with backend
await api.addToCart(productId, quantity);

// Refresh from backend for consistency
await syncWithBackend();
```

---

## ✅ **SUMMARY:**

| Feature | Vanilla JS | React Context |
|---------|-----------|---------------|
| Add Item | ✅ | ✅ |
| Merge Qty | ✅ | ✅ |
| Calc Total | ✅ | ✅ |
| Persistent | ✅ | ✅ |
| Backend Sync | ✅ | ✅ |
| Optimistic UI | ❌ | ✅ |
| React Integration | ❌ | ✅ |
| Global Access | ❌ | ✅ |

---

**Happy Coding! 🚀**