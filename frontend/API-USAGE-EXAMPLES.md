# 📚 API USAGE EXAMPLES

Complete examples untuk connect frontend dengan API Kain & Kasa.

---

## 📁 **SETUP**

### **Install Dependencies:**

```bash
# Untuk Axios version
npm install axios

# Untuk React
npm install react
```

### **Environment Variables:**

```bash
# .env
VITE_API_BASE_URL=http://localhost:3000/api
# atau production
# VITE_API_BASE_URL=https://yourdomain.com/api
```

---

## 🔧 **OPTION 1: VANILLA JAVASCRIPT (Fetch API)**

### **Basic Usage:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Shop - Kain & Kasa</title>
</head>
<body>
  <div id="products"></div>
  
  <script type="module">
    import { getProducts, addToCart } from './api/fetch-api.js';

    // Fetch products
    async function loadProducts() {
      const result = await getProducts({ category: 'clothing', limit: 10 });
      
      if (result.success) {
        const products = result.data.products;
        console.log('Products:', products);
        
        // Render
        document.getElementById('products').innerHTML = products.map(product => `
          <div>
            <h3>${product.name}</h3>
            <p>${formatPrice(product.basePrice)}</p>
            <button onclick="addToCart('${product.id}', 1)">Add to Cart</button>
          </div>
        `).join('');
      } else {
        console.error('Error:', result.error);
      }
    }

    // Format price
    function formatPrice(price) {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(price);
    }

    // Add to cart
    async function handleAddToCart(productId) {
      const result = await addToCart(productId, 1);
      
      if (result.success) {
        alert('✅ Added to cart!');
        console.log('Cart updated:', result.data);
      } else {
        alert('❌ Error: ' + result.error);
      }
    }

    loadProducts();
  </script>
</body>
</html>
```

---

## ⚡ **OPTION 2: AXIOS VERSION**

### **Basic Usage:**

```javascript
// api-client.js
import api from './api/axios-api.js';

// Fetch all products
const result = await api.getProducts();

if (result.success) {
  console.log('Products:', result.data.products);
  console.log('Pagination:', result.data.pagination);
} else {
  console.error('Error:', result.error);
}
```

### **With Filters:**

```javascript
// Filter products
const result = await api.getProducts({
  category: 'clothing',
  minPrice: 100000,
  maxPrice: 300000,
  sort: 'price',
  order: 'ASC',
  limit: 20,
  offset: 0
});

console.log('Filtered products:', result.data.products);
```

### **Add to Cart:**

```javascript
// Add product to cart
const result = await api.addToCart(
  '550e8400-e29b-41d4-a716-446655440001', // product_id
  2,                                         // quantity
  '550e8400-e29b-41d4-a716-446655440010'    // variant_id (optional)
);

if (result.success) {
  console.log('✅ Added to cart!');
  console.log('Cart:', result.data.cart);
  
  // Show warning if lock expires soon
  if (result.warning) {
    console.warn('⚠️', result.warning);
  }
} else {
  console.error('❌ Failed:', result.error);
  
  // Handle specific errors
  if (result.errorCode === 'INSUFFICIENT_STOCK') {
    alert('Stok tidak mencukupi!');
  }
}
```

---

## ⚛️ **OPTION 3: REACT HOOKS (RECOMMENDED)**

### **Products Page:**

```jsx
// pages/ProductsPage.jsx
import React from 'react';
import { useProducts } from '../hooks/useProducts.js';
import ProductCard from '../components/ProductCard.jsx';

function ProductsPage() {
  const { products, loading, error, refetch, loadMore, hasMore } = useProducts({
    category: 'clothing',
    limit: 12
  });

  if (loading) {
    return <div className="text-center py-20">Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600">Error: {error}</p>
        <button 
          onClick={refetch}
          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Products</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={loadMore}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

export default ProductsPage;
```

---

### **Product Detail Page:**

```jsx
// pages/ProductDetailPage.jsx
import React, { useState } from 'react';
import { useProduct, useProductVariants, useCart } from '../hooks/useProducts.js';

function ProductDetailPage({ slug }) {
  const { product, loading, error } = useProduct(slug);
  const { variants } = useProductVariants(product?.id);
  const { addToCart, isAdding } = useCart();
  
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!product) return <div>Product not found</div>;

  const handleAddToCart = async () => {
    const result = await addToCart(
      product.id,
      quantity,
      selectedVariant?.id
    );

    if (result.success) {
      alert('✅ Added to cart!');
      if (result.warning) {
        alert('⚠️ ' + result.warning);
      }
    } else {
      alert('❌ Error: ' + result.error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <div>
          <img 
            src={product.mainImage} 
            alt={product.name}
            className="w-full rounded-lg shadow-lg"
          />
        </div>

        {/* Info */}
        <div>
          <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
          
          {/* Price */}
          <div className="mb-6">
            {product.discountPrice ? (
              <>
                <span className="text-3xl font-bold text-indigo-600">
                  Rp {product.discountPrice.toLocaleString('id-ID')}
                </span>
                <span className="ml-2 text-gray-400 line-through">
                  Rp {product.basePrice.toLocaleString('id-ID')}
                </span>
              </>
            ) : (
              <span className="text-3xl font-bold text-indigo-600">
                Rp {product.basePrice.toLocaleString('id-ID')}
              </span>
            )}
          </div>

          {/* Variants */}
          {variants.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Select Variant:
              </label>
              <div className="flex gap-2">
                {variants.map(variant => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-4 py-2 rounded border ${
                      selectedVariant?.id === variant.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-gray-300 hover:border-indigo-600'
                    }`}
                  >
                    {variant.variantValue}
                    {variant.priceAdjustment > 0 && ` (+Rp ${variant.priceAdjustment})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Quantity:
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                -
              </button>
              <span className="w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.availableStock, quantity + 1))}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                +
              </button>
              <span className="text-sm text-gray-600 ml-2">
                ({product.availableStock} available)
              </span>
            </div>
          </div>

          {/* Stock Status */}
          <div className={`mb-6 p-4 rounded ${
            product.stockStatus === 'in_stock' ? 'bg-green-50' :
            product.stockStatus === 'low_stock' ? 'bg-orange-50' :
            'bg-red-50'
          }`}>
            {product.stockStatus === 'in_stock' && (
              <p className="text-green-600">✅ In Stock ({product.availableStock} left)</p>
            )}
            {product.stockStatus === 'low_stock' && (
              <p className="text-orange-600">⚠️ Low Stock! Only {product.availableStock} left</p>
            )}
            {product.stockStatus === 'out_of_stock' && (
              <p className="text-red-600">❌ Out of Stock</p>
            )}
          </div>

          {/* Add to Cart */}
          <button
            onClick={handleAddToCart}
            disabled={product.stockStatus === 'out_of_stock' || isAdding}
            className={`w-full py-4 rounded-lg font-bold text-white ${
              product.stockStatus === 'out_of_stock'
                ? 'bg-gray-400 cursor-not-allowed'
                : isAdding
                ? 'bg-indigo-400 cursor-wait'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
            }`}
          >
            {isAdding ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
```

---

### **Shopping Cart Component:**

```jsx
// components/ShoppingCart.jsx
import React from 'react';
import { useCart } from '../hooks/useProducts.js';

function ShoppingCart() {
  const { cart, loading, error, updateQuantity, removeFromCart, checkout } = useCart();

  if (loading) return <div>Loading cart...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!cart || cart.items.length === 0) {
    return <div>Your cart is empty</div>;
  }

  const handleQuantityChange = async (itemId, newQuantity) => {
    const result = await updateQuantity(itemId, newQuantity);
    
    if (!result.success) {
      alert('Failed to update: ' + result.error);
    }
  };

  const handleRemove = async (itemId) => {
    if (confirm('Remove this item?')) {
      const result = await removeFromCart(itemId);
      
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
      alert('✅ Checkout successful! Order ID: ' + result.data.orderId);
    } else {
      alert('❌ Checkout failed: ' + result.error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Cart Items */}
        <div className="space-y-4">
          {cart.items.map(item => (
            <div key={item.cartItemId} className="flex gap-4 border-b pb-4">
              {/* Image */}
              <img 
                src={item.productImage} 
                alt={item.productName}
                className="w-24 h-24 object-cover rounded"
              />
              
              {/* Info */}
              <div className="flex-1">
                <h3 className="font-semibold">{item.productName}</h3>
                {item.variantName && (
                  <p className="text-sm text-gray-600">Variant: {item.variantName}</p>
                )}
                <p className="text-indigo-600 font-bold">
                  Rp {item.priceAtAdd.toLocaleString('id-ID')}
                </p>
                
                {/* Quantity Controls */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => handleQuantityChange(item.cartItemId, item.quantity - 1)}
                    className="px-3 py-1 border rounded"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(item.cartItemId, item.quantity + 1)}
                    className="px-3 py-1 border rounded"
                  >
                    +
                  </button>
                  <button
                    onClick={() => handleRemove(item.cartItemId)}
                    className="ml-4 text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
              
              {/* Subtotal */}
              <div className="text-right">
                <p className="font-bold">Rp {item.subtotal.toLocaleString('id-ID')}</p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Total */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xl font-bold">Total:</span>
            <span className="text-2xl font-bold text-indigo-600">
              Rp {cart.total.toLocaleString('id-ID')}
            </span>
          </div>
          
          <button
            onClick={handleCheckout}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold hover:from-indigo-700 hover:to-purple-700"
          >
            Checkout ({cart.itemCount} items)
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShoppingCart;
```

---

## 📊 **COMPLETE REACT APP EXAMPLE:**

```jsx
// App.jsx
import React, { useState } from 'react';
import { useProducts, useCart } from './hooks/useProducts.js';
import ProductCard from './components/ProductCard.jsx';
import ShoppingCart from './components/ShoppingCart.jsx';

function App() {
  const [view, setView] = useState('products'); // 'products' | 'cart'
  const { products, loading, error } = useProducts();
  const { itemCount } = useCart();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="text-2xl font-bold text-indigo-600">
              Kain & Kasa
            </div>
            
            {/* Nav Links */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setView('products')}
                className={`px-4 py-2 rounded ${
                  view === 'products' ? 'bg-indigo-600 text-white' : 'text-gray-600'
                }`}
              >
                Products
              </button>
              
              <button
                onClick={() => setView('cart')}
                className="relative px-4 py-2 text-gray-600"
              >
                Cart
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'products' ? (
          <>
            <h1 className="text-4xl font-bold mb-8">All Products</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <ShoppingCart />
        )}
      </main>
    </div>
  );
}

export default App;
```

---

## 🎯 **ERROR HANDLING EXAMPLE:**

```javascript
// utils/errorHandler.js
export const handleApiError = (error, context = '') => {
  console.error(`[API Error${context ? ` - ${context}` : ''}]`, error);

  // User-friendly messages
  const errorMessages = {
    'INSUFFICIENT_STOCK': 'Maaf, stok produk tidak mencukupi',
    'STOCK_CHANGED': 'Stok produk berubah, silakan refresh keranjang',
    'CART_EXPIRED': 'Keranjang expired, silakan add ulang produk',
    'PRODUCT_NOT_FOUND': 'Produk tidak ditemukan',
  };

  const userMessage = errorMessages[error?.errorCode] || error?.error || 'Terjadi kesalahan';

  // Display to user
  showToast('error', userMessage);

  // Log to monitoring service (e.g., Sentry)
  if (window.Sentry) {
    Sentry.captureException(error, {
      tags: { context, errorCode: error?.errorCode },
    });
  }
};

// Usage
const result = await api.addToCart(productId, quantity);

if (!result.success) {
  handleApiError(result, 'AddToCart');
}
```

---

## ✅ **SUMMARY:**

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **Fetch API** | Native, no deps | More boilerplate | Simple projects |
| **Axios** | Cleaner syntax, interceptors | Extra dependency | Production apps |
| **React Hooks** | Best DX, auto-state | React only | React apps |

---

**Happy Coding! 🚀**