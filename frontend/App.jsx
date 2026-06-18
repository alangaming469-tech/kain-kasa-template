/**
 * Kain & Kasa - Redesign (Ladang Lima Style)
 * 
 * Features:
 * - Clean header dengan logo & navigation
 * - Hero section dengan lifestyle image
 * - Product grid dengan card design modern
 * - Earth-tone color palette
 * - Minimalist & spacious layout
 */

import React, { useState, useEffect, createContext, useContext } from 'react';

// ==========================================
// CONSTANTS
// ==========================================

const STORAGE_KEY = 'kain_kasa_cart';

// ==========================================
// CART CONTEXT
// ==========================================

const CartContext = createContext(null);

function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored).items : [];
    } catch { return []; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, subtotal }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [items]);

  const addItem = (product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => 
          i.productId === product.id 
            ? { ...i, quantity: i.quantity + quantity, subtotal: i.price * (i.quantity + quantity) }
            : i
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        productImage: product.mainImage,
        price: product.discountPrice || product.basePrice,
        quantity,
        subtotal: (product.discountPrice || product.basePrice) * quantity
      }];
    });
    setSidebarOpen(true);
  };

  const removeItem = (productId) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(prev => prev.map(i => 
      i.productId === productId
        ? { ...i, quantity, subtotal: i.price * quantity }
        : i
    ));
  };

  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider value={{
      items, itemCount, subtotal, sidebarOpen, setSidebarOpen, addItem, removeItem, updateQuantity, clearCart
    }}>
      {children}
    </CartContext.Provider>
  );
}

const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

// ==========================================
// HEADER COMPONENT
// ==========================================

function Header() {
  const { itemCount, setSidebarOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white shadow-lg py-3' : 'bg-white/95 backdrop-blur py-5'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">🇮🇩</span>
            <div>
              <h1 className="text-2xl font-bold font-heading text-brand-800">
                Kain & Kasa
              </h1>
              <p className="text-xs text-gray-500">Local Pride Indonesia</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-gray-700 hover:text-brand-600 font-medium transition-colors">New Arrivals</a>
            <a href="#products" className="text-gray-700 hover:text-brand-600 font-medium transition-colors">Products</a>
            <a href="#categories" className="text-gray-700 hover:text-brand-600 font-medium transition-colors">Categories</a>
            <a href="#about" className="text-gray-700 hover:text-brand-600 font-medium transition-colors">About</a>
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-4">
            {/* Cart */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center badge-enter">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// ==========================================
// HERO SECTION
// ==========================================

function Hero() {
  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-accent-50"></div>
      
      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          
          {/* Text */}
          <div className="text-center md:text-left">
            <span className="inline-block px-4 py-2 bg-brand-100 text-brand-700 rounded-full text-sm font-semibold mb-6">
              🇮🇩 100% Local Brand
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-heading text-brand-800 leading-tight mb-6">
              Premium Local Pride
              <br />
              <span className="text-brand-600">Fashion Indonesia</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto md:mx-0">
              Clothing brand untuk UMKM Indonesia. Kualitas premium, desain modern, dan semangat lokal pride.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <a 
                href="#products"
                className="btn-primary px-8 py-4 rounded-full text-white font-semibold text-center shadow-lg"
              >
                Shop Now →
              </a>
              <a 
                href="#about"
                className="btn-accent px-8 py-4 rounded-full text-white font-semibold text-center shadow-lg"
              >
                Learn More
              </a>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-gray-200">
              <div>
                <p className="text-3xl font-bold text-brand-600">500+</p>
                <p className="text-sm text-gray-600">Happy Customers</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-brand-600">50+</p>
                <p className="text-sm text-gray-600">Products</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-brand-600">100%</p>
                <p className="text-sm text-gray-600">Local Made</p>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-brand-200 to-accent-200 rounded-3xl opacity-30 blur-2xl"></div>
            <img
              src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&h=600&fit=crop"
              alt="Local Pride Fashion"
              className="relative rounded-3xl shadow-2xl w-full h-[400px] md:h-[500px] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// PRODUCT CARD
// ==========================================

function ProductCard({ product }) {
  const { addItem } = useCart();
  const [isHovered, setIsHovered] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleAddToCart = () => {
    addItem(product, 1);
  };

  const hasDiscount = product.discountPrice && product.discountPrice < product.basePrice;
  const isOutOfStock = product.stockStatus === 'out_of_stock';
  const isLowStock = product.stockStatus === 'low_stock';

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm card-hover group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-w-3 aspect-h-4 overflow-hidden bg-gray-100">
        <img
          src={product.mainImage}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => e.target.src = 'https://via.placeholder.com/400x533?text=No+Image'}
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.isFeatured && (
            <span className="px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-full">
              ⭐ Featured
            </span>
          )}
          {hasDiscount && (
            <span className="px-3 py-1.5 bg-accent-500 text-white text-xs font-semibold rounded-full">
              -{product.discountPercentage}% OFF
            </span>
          )}
          {isLowStock && (
            <span className="px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-full animate-pulse">
              🔥 Low Stock
            </span>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <span className="px-4 py-2 bg-white text-gray-900 font-semibold rounded-full text-sm">
              Out of Stock
            </span>
          </div>
        )}

        {/* Quick Add Button (on hover) */}
        <div className={`absolute bottom-4 left-4 right-4 transition-opacity duration-300 ${
          isHovered && !isOutOfStock ? 'opacity-100' : 'opacity-0'
        }`}>
          <button
            onClick={handleAddToCart}
            className="w-full btn-primary px-4 py-3 rounded-full text-white font-semibold shadow-lg text-sm"
          >
            Quick Add +
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        {/* Category */}
        <p className="text-xs text-brand-600 font-semibold uppercase tracking-wider mb-2">
          {product.categoryName}
        </p>

        {/* Name */}
        <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-1">
          {product.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {product.shortDescription}
        </p>

        {/* Price & Stock */}
        <div className="flex items-center justify-between mb-4">
          {/* Price */}
          <div>
            {hasDiscount ? (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-brand-600">
                  {formatPrice(product.discountPrice)}
                </span>
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(product.basePrice)}
                </span>
              </div>
            ) : (
              <span className="text-lg font-bold text-brand-600">
                {formatPrice(product.basePrice)}
              </span>
            )}
          </div>
        </div>

        {/* Stock Status */}
        <div className={`text-xs font-medium px-3 py-1.5 rounded-full inline-block ${
          isOutOfStock 
            ? 'bg-gray-100 text-gray-500'
            : isLowStock
            ? 'bg-orange-100 text-orange-700'
            : 'bg-brand-100 text-brand-700'
        }`}>
          {isOutOfStock 
            ? '❌ Out of Stock' 
            : isLowStock 
            ? `⚠️ Only ${product.availableStock} left`
            : `✅ ${product.availableStock} in stock`
          }
        </div>
      </div>
    </div>
  );
}

// ==========================================
// PRODUCTS SECTION
// ==========================================

function ProductsSection({ products }) {
  return (
    <section id="products" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-2 bg-brand-100 text-brand-700 rounded-full text-sm font-semibold mb-4">
            Our Collection
          </span>
          <h2 className="text-3xl md:text-4xl font-bold font-heading text-brand-800 mb-4">
            Featured Products
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Premium quality clothing dengan desain modern dan sentuhan lokal pride
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ==========================================
// CART SIDEBAR
// ==========================================

function CartSidebar() {
  const { sidebarOpen, setSidebarOpen, items, subtotal, updateQuantity, removeItem, clearCart } = useCart();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (!sidebarOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold font-heading text-brand-800">Shopping Cart</h2>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-600 mb-6">Your cart is empty</p>
              <button
                onClick={() => setSidebarOpen(false)}
                className="btn-primary px-6 py-3 rounded-full text-white font-semibold"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                  <img 
                    src={item.productImage} 
                    alt={item.productName}
                    className="w-20 h-20 object-cover rounded-xl"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.productName}</h3>
                    <p className="text-brand-600 font-bold">{formatPrice(item.price)}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded-full border border-gray-300 hover:border-brand-600 flex items-center justify-center text-sm"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 rounded-full border border-gray-300 hover:border-brand-600 flex items-center justify-center text-sm"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="ml-auto text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatPrice(item.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-semibold text-gray-700">Subtotal</span>
              <span className="text-2xl font-bold text-brand-600">{formatPrice(subtotal)}</span>
            </div>
            
            <button className="w-full btn-primary py-4 rounded-full text-white font-bold text-lg shadow-lg mb-3">
              Checkout
            </button>
            <button 
              onClick={clearCart}
              className="w-full py-3 border-2 border-red-500 text-red-500 rounded-full font-semibold hover:bg-red-50 transition-colors"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// FOOTER
// ==========================================

function Footer() {
  return (
    <footer className="bg-brand-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🇮🇩</span>
              <div>
                <h3 className="text-2xl font-bold">Kain & Kasa</h3>
                <p className="text-brand-300 text-sm">Local Pride Indonesia</p>
              </div>
            </div>
            <p className="text-brand-200 text-sm leading-relaxed max-w-md">
              Premium local pride clothing untuk UMKM Indonesia. Kualitas terbaik dengan desain modern dan semangat lokal.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-brand-200 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">New Arrivals</a></li>
              <li><a href="#products" className="hover:text-white transition-colors">Products</a></li>
              <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-bold mb-4">Follow Us</h4>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-brand-800 hover:bg-brand-700 flex items-center justify-center transition-colors">
                <span className="text-lg">📷</span>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-brand-800 hover:bg-brand-700 flex items-center justify-center transition-colors">
                <span className="text-lg">📘</span>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-brand-800 hover:bg-brand-700 flex items-center justify-center transition-colors">
                <span className="text-lg">🐦</span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-brand-800 pt-8 text-center text-brand-300 text-sm">
          <p>&copy; 2026 Kain & Kasa. All rights reserved.</p>
          <p className="mt-2">Made with ❤️ in Indonesia</p>
        </div>
      </div>
    </footer>
  );
}

// ==========================================
// MAIN APP
// ==========================================

function ShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Demo products with better images
    const demoProducts = [
      {
        id: '1',
        name: 'Kaos Oversized Street',
        slug: 'kaos-oversized-street',
        shortDescription: 'Kaos oversized dengan desain streetwear modern. Premium cotton 24s.',
        basePrice: 149000,
        discountPrice: null,
        discountPercentage: null,
        availableStock: 50,
        stockStatus: 'in_stock',
        mainImage: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&h=533&fit=crop',
        isFeatured: true,
        categoryName: 'T-Shirts'
      },
      {
        id: '2',
        name: 'Hoodie Local Pride',
        slug: 'hoodie-local-pride',
        shortDescription: 'Hoodie hangat dengan desain local pride. Perfect untuk weather Indonesia.',
        basePrice: 249000,
        discountPrice: 229000,
        discountPercentage: 8,
        availableStock: 28,
        stockStatus: 'in_stock',
        mainImage: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=533&fit=crop',
        isFeatured: true,
        categoryName: 'Hoodies'
      },
      {
        id: '3',
        name: 'Jacket Bomber Indonesia',
        slug: 'jacket-bomber',
        shortDescription: 'Jacket bomber stylish dengan sentuhan lokal. Tahan air & angin.',
        basePrice: 299000,
        discountPrice: null,
        discountPercentage: null,
        availableStock: 5,
        stockStatus: 'low_stock',
        mainImage: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=533&fit=crop',
        isFeatured: false,
        categoryName: 'Jackets'
      },
      {
        id: '4',
        name: 'Celana Chino Slim Fit',
        slug: 'celana-chino',
        shortDescription: 'Celana chino slim fit, nyaman dan stylish untuk daily wear.',
        basePrice: 199000,
        discountPrice: null,
        discountPercentage: null,
        availableStock: 0,
        stockStatus: 'out_of_stock',
        mainImage: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=533&fit=crop',
        isFeatured: false,
        categoryName: 'Pants'
      },
      {
        id: '5',
        name: 'Polo Shirt Classic',
        slug: 'polo-classic',
        shortDescription: 'Polo shirt classic dengan potongan modern. Cocok untuk casual & semi-formal.',
        basePrice: 179000,
        discountPrice: 159000,
        discountPercentage: 11,
        availableStock: 35,
        stockStatus: 'in_stock',
        mainImage: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=533&fit=crop',
        isFeatured: true,
        categoryName: 'Polo Shirts'
      },
      {
        id: '6',
        name: 'Jacket Denim Vintage',
        slug: 'jacket-denim',
        shortDescription: 'Jacket denim vintage wash dengan fit relaxed. Timeless style.',
        basePrice: 329000,
        discountPrice: null,
        discountPercentage: null,
        availableStock: 15,
        stockStatus: 'in_stock',
        mainImage: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400&h=533&fit=crop',
        isFeatured: false,
        categoryName: 'Jackets'
      },
      {
        id: '7',
        name: 'Cargo Pants Utility',
        slug: 'cargo-pants',
        shortDescription: 'Cargo pants dengan multiple pockets. Perfect untuk outdoor activities.',
        basePrice: 219000,
        discountPrice: null,
        discountPercentage: null,
        availableStock: 22,
        stockStatus: 'in_stock',
        mainImage: 'https://images.unsplash.com/photo-1517455175132-e8dad1abf50c?w=400&h=533&fit=crop',
        isFeatured: false,
        categoryName: 'Pants'
      },
      {
        id: '8',
        name: 'Sweater Knit Warm',
        slug: 'sweater-knit',
        shortDescription: 'Sweater knit tebal dan hangat. Cocok untuk musim hujan.',
        basePrice: 189000,
        discountPrice: 169000,
        discountPercentage: 11,
        availableStock: 18,
        stockStatus: 'in_stock',
        mainImage: 'https://images.unsplash.com/photo-1620799140408-ed5341cd2431?w=400&h=533&fit=crop',
        isFeatured: false,
        categoryName: 'Sweaters'
      }
    ];

    setProducts(demoProducts);
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <ProductsSection products={products} />
      <Footer />
      <CartSidebar />
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