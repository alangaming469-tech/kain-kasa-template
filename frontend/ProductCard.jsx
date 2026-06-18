import React, { useState } from 'react';

/**
 * ProductCard Component
 * 
 * @param {Object} product - Product data from API
 * @param {string} product.id - Product UUID
 * @param {string} product.sku - Stock Keeping Unit
 * @param {string} product.name - Product name
 * @param {string} product.slug - URL-friendly slug
 * @param {string} product.shortDescription - Short description
 * @param {number} product.basePrice - Base price in Rupiah
 * @param {number} product.discountPrice - Discounted price (optional)
 * @param {number} product.discountPercentage - Discount percentage (optional)
 * @param {number} product.totalStock - Total stock
 * @param {number} product.availableStock - Available stock
 * @param {string} product.stockStatus - 'in_stock' | 'low_stock' | 'out_of_stock'
 * @param {string} product.mainImage - Main image URL
 * @param {string[]} product.images - All images
 * @param {boolean} product.isFeatured - Featured flag
 * @param {string} product.categoryName - Category name
 * @param {Function} onAddToCart - Callback when product added to cart
 */
const ProductCard = ({ product, onAddToCart }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Format price to IDR
  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Determine if product has discount
  const hasDiscount = product.discountPrice && product.discountPrice < product.basePrice;
  const displayPrice = hasDiscount ? product.discountPrice : product.basePrice;

  // Stock status configuration
  const stockConfig = {
    in_stock: {
      color: 'bg-green-500',
      textColor: 'text-green-600',
      label: `${product.availableStock} left`,
      pulse: true,
    },
    low_stock: {
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      label: `Only ${product.availableStock} left!`,
      pulse: true,
    },
    out_of_stock: {
      color: 'bg-red-500',
      textColor: 'text-red-600',
      label: 'Sold out',
      pulse: false,
    },
  };

  const currentStock = stockConfig[product.stockStatus] || stockConfig.out_of_stock;
  const isOutOfStock = product.stockStatus === 'out_of_stock';

  // Handle add to cart
  const handleAddToCart = async () => {
    if (isOutOfStock) return;

    setIsAdding(true);
    try {
      await onAddToCart?.(product);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      className="product-card bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="image-container relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        <img
          src={product.mainImage}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            isHovered ? 'scale-110' : 'scale-100'
          } ${isOutOfStock ? 'grayscale' : ''}`}
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

        {/* Quick Actions (Show on Hover) */}
        {!isOutOfStock && (
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 flex items-center justify-center gap-2 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Quick View Button */}
            <button
              className="bg-white text-gray-800 p-3 rounded-full hover:bg-indigo-600 hover:text-white transition-colors duration-300 transform hover:scale-110"
              aria-label="Quick view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </button>

            {/* Wishlist Button */}
            <button
              className="bg-white text-gray-800 p-3 rounded-full hover:bg-indigo-600 hover:text-white transition-colors duration-300 transform hover:scale-110"
              aria-label="Add to wishlist"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          </div>
        )}

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
        <span
          className={`text-xs font-medium uppercase tracking-wider ${
            isOutOfStock ? 'text-gray-400' : 'text-indigo-600'
          }`}
        >
          {product.categoryName}
        </span>

        {/* Product Name */}
        <h3
          className={`text-lg font-bold mt-1 mb-2 line-clamp-1 ${
            isOutOfStock ? 'text-gray-400' : 'text-gray-900'
          }`}
        >
          {product.name}
        </h3>

        {/* Description */}
        <p
          className={`text-sm mb-3 line-clamp-2 ${
            isOutOfStock ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          {product.shortDescription}
        </p>

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
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${currentStock.color} ${
                currentStock.pulse ? 'animate-pulse' : ''
              }`}
            ></span>
            <span className={`text-xs font-medium ${currentStock.textColor}`}>
              {currentStock.label}
            </span>
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAdding}
          className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
            isOutOfStock
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : isAdding
              ? 'bg-indigo-400 text-white cursor-wait'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:scale-105 hover:shadow-lg active:scale-95'
          }`}
        >
          {isAdding ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Adding...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
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
              {isOutOfStock ? 'Notify Me' : 'Add to Cart'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;