/**
 * Cart Icon with Badge
 * Shows real-time cart item count and total
 */

import React from 'react';
import { useCart } from '../context/CartContext.jsx';

function CartIcon({ onClick }) {
  const { itemCount, total, isEmpty } = useCart();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <button
      onClick={onClick}
      className="relative p-3 hover:bg-gray-100 rounded-full transition-all duration-300 group"
      aria-label={`Cart with ${itemCount} items`}
    >
      {/* Cart Icon */}
      <svg
        className={`w-6 h-6 transition-colors ${
          itemCount > 0 ? 'text-indigo-600' : 'text-gray-700'
        } group-hover:text-indigo-600`}
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

      {/* Badge - Item Count */}
      {itemCount > 0 && (
        <>
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pulse">
            {itemCount > 99 ? '99+' : itemCount}
          </span>

          {/* Tooltip - Total Amount */}
          <div className="absolute -bottom-10 right-0 bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            {formatPrice(total)}
            <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
          </div>
        </>
      )}

      {/* Empty State Pulse */}
      {isEmpty && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-gray-300 rounded-full"></span>
      )}
    </button>
  );
}

export default CartIcon;