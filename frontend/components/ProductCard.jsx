/**
 * Product Card Component - Integrated with Cart State
 * Features:
 * - Display product from API data
 * - Add to cart with real-time updates
 * - Show if product already in cart
 * - Display stock status
 * - Handle variants (if any)
 */

import React, { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';

function ProductCard({ product }) {
  const { addItem, isInCart, getItemQuantity, loading: cartLoading } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Check if product is in cart
  const inCart = isInCart(product.id, selectedVariant?.id);
  const quantityInCart = getItemQuantity(product.id, selectedVariant?.id);

  // Determine display price
  const hasDiscount = product.discountPrice && product.discountPrice < product.basePrice;
  const displayPrice = hasDiscount ? product.discountPrice : product.basePrice;

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Stock status configuration
  const stockConfig = {
    in_stock: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: `✅ ${product.availableStock} left`,
    },
    low_stock: {
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      label: `⚠️ Only ${product.availableStock} left!`,
    },
    out_of_stock: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: '❌ Out of stock',
    },
  };

  const currentStock = stockConfig[product.stockStatus] || stockConfig.out_of_stock;
  const isOutOfStock = product.stockStatus === 'out_of_stock';

  // Handle add to cart
  const handleAddToCart = async () => {
    if (isOutOfStock) return;

    setIsAdding(true);

    const result = await addItem(product, quantity, selectedVariant?.id);

    if (result.success) {
      // Show success feedback
      showToast('success', result.message || 'Added to cart!');
      
      // Show warning if lock expires soon
      if (result.warning) {
        showToast('warning', result.warning);
      }
      
      // Reset quantity
      setQuantity(1);
    } else {
      // Show error
      showToast('error', result.error || 'Failed to add to cart');
      
      // Handle specific error codes
      if (result.errorCode === 'INSUFFICIENT_STOCK') {
        showToast('error', 'Stok tidak mencukupi!');
      }
    }

    setIsAdding(false);
  };

  // Toast notification helper
  const showToast = (type, message) => {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 z-50 px-6 py-4 rounded-lg shadow-lg text-white font-semibold transform transition-all duration-300 translate-y-20 opacity-0 ${
      type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
      type === 'warning' ? 'bg-gradient-to-r from-orange-500 to-red-500' :
      'bg-gradient-to-r from-red-500 to-pink-500'
    }`;
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <span>${
          type === 'success' ? '✅' :
          type === 'warning' ? '⚠️' :
          '❌'
        }</span>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-20', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-20', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  return (
    <div className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
      {/* Image Container */}
      <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        <img
          src={product.mainImage}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {/* Featured Badge */}
          {product.isFeatured && (
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              ⭐ Featured
            </span>
          )}

          {/* Discount Badge */}
          {hasDiscount && (
            <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              -{product.discountPercentage}% OFF
            </span>
          )}

          {/* Low Stock Badge */}
          {product.stockStatus === 'low_stock' && (
            <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-pulse">
              🔥 Low Stock!
            </span>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="bg-gray-800 text-white text-sm font-bold px-6 py-2 rounded-full">
              ❌ Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-5">
        {/* Category */}
        <span className={`text-xs font-medium uppercase tracking-wider ${
          isOutOfStock ? 'text-gray-400' : 'text-indigo-600'
        }`}>
          {product.categoryName}
        </span>

        {/* Product Name */}
        <h3 className={`text-lg font-bold mt-1 mb-2 line-clamp-1 ${
          isOutOfStock ? 'text-gray-400' : 'text-gray-900'
        }`}>
          {product.name}
        </h3>

        {/* Description */}
        <p className={`text-sm mb-3 line-clamp-2 ${
          isOutOfStock ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {product.shortDescription}
        </p>

        {/* Variants (if any) */}
        {product.variants && product.variants.length > 0 && (
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-600 mb-2 block">
              Select Variant:
            </label>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    selectedVariant?.id === variant.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600 font-semibold'
                      : 'border-gray-300 hover:border-indigo-600'
                  }`}
                >
                  {variant.variantValue}
                  {variant.priceAdjustment > 0 && ` (+${formatPrice(variant.priceAdjustment)})`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price and Stock */}
        <div className="flex items-center justify-between mb-4">
          {/* Price */}
          <div>
            {hasDiscount ? (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {formatPrice(displayPrice)}
                </span>
                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(product.basePrice)}
                </span>
              </div>
            ) : (
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {formatPrice(displayPrice)}
              </span>
            )}
          </div>

          {/* Stock Indicator */}
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${currentStock.bgColor} ${currentStock.color} border ${currentStock.borderColor}`}>
            {currentStock.label}
          </div>
        </div>

        {/* Add to Cart / In Cart Status */}
        {inCart ? (
          <div className={`${currentStock.bgColor} border ${currentStock.borderColor} rounded-xl p-3 text-center`}>
            <p className={`${currentStock.color} font-semibold mb-2`}>
              ✅ In Cart ({quantityInCart})
            </p>
            <div className="flex items-center justify-center gap-2 mb-2">
              <button
                onClick={() => {
                  const newQty = Math.max(1, quantityInCart - 1);
                  // Update quantity logic here
                }}
                className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-indigo-50 transition-colors"
              >
                -
              </button>
              <span className="w-8 text-center font-bold">{quantityInCart}</span>
              <button
                onClick={() => {
                  const newQty = Math.min(product.availableStock, quantityInCart + 1);
                  // Update quantity logic here
                }}
                className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-indigo-50 transition-colors"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              className="text-indigo-600 text-sm font-semibold hover:underline"
            >
              Add more
            </button>
          </div>
        ) : (
          <>
            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="flex items-center gap-2 mb-3">
                <label className="text-sm text-gray-600">Qty:</label>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  -
                </button>
                <span className="w-8 text-center font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.availableStock, quantity + 1))}
                  className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  +
                </button>
                <span className="text-xs text-gray-500 ml-2">
                  (Max: {product.availableStock})
                </span>
              </div>
            )}

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock || isAdding}
              className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
                isOutOfStock
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : isAdding
                  ? 'bg-indigo-400 text-white cursor-wait'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg active:scale-95'
              }`}
            >
              {isAdding ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
          </>
        )}
      </div>
    </div>
  );
}

export default ProductCard;