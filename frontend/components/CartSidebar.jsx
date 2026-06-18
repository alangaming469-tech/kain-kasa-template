/**
 * Cart Sidebar / Modal
 * Full cart view with quantity controls and checkout
 */

import React from 'react';
import { useCart } from '../context/CartContext.jsx';

function CartSidebar({ isOpen, onClose }) {
  const {
    items,
    itemCount,
    subtotal,
    discount,
    tax,
    total,
    loading,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkout,
  } = useCart();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleQuantityChange = async (productId, variantId, newQuantity) => {
    const result = await updateQuantity(productId, newQuantity, variantId);
    
    if (!result.success && result.error) {
      alert('❌ ' + result.error);
    }
  };

  const handleRemove = async (productId, variantId) => {
    if (confirm('Remove this item from cart?')) {
      const result = await removeFromCart(productId, variantId);
      
      if (!result.success && result.error) {
        alert('❌ ' + result.error);
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
        postalCode: '12345',
      },
      paymentMethod: 'midtrans',
    };

    const result = await checkout(checkoutData);
    
    if (result.success) {
      alert('✅ Checkout successful!\nOrder ID: ' + result.data.orderId);
      onClose();
    } else {
      alert('❌ Checkout failed: ' + result.error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Shopping Cart</h2>
              <p className="text-sm text-indigo-100">{itemCount} items</p>
            </div>
            <button
              onClick={onClose}
              className="text-2xl hover:text-indigo-100 transition-colors"
              aria-label="Close cart"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-gray-600">Loading cart...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🛒</div>
              <p className="text-gray-500 text-lg font-medium">Your cart is empty</p>
              <p className="text-gray-400 text-sm mt-2">Start shopping to add items</p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.productId}_${item.variantId}`}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex gap-4"
                >
                  {/* Image */}
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    loading="lazy"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {item.productName}
                    </h3>
                    
                    {item.variantName && (
                      <p className="text-sm text-gray-600 mt-1">
                        {item.variantType}: <strong>{item.variantName}</strong>
                      </p>
                    )}

                    <p className="text-indigo-600 font-bold mt-1">
                      {formatPrice(item.price)}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleQuantityChange(
                          item.productId,
                          item.variantId,
                          Math.max(0, item.quantity - 1)
                        )}
                        className="w-7 h-7 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-semibold text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(
                          item.productId,
                          item.variantId,
                          item.quantity + 1
                        )}
                        className="w-7 h-7 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Subtotal & Remove */}
                  <div className="text-right flex flex-col items-end justify-between">
                    <button
                      onClick={() => handleRemove(item.productId, item.variantId)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                      aria-label="Remove item"
                    >
                      🗑️
                    </button>
                    <p className="font-bold text-gray-900">
                      {formatPrice(item.subtotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Totals & Actions */}
        {items.length > 0 && (
          <div className="border-t bg-white p-4 space-y-4">
            {/* Price Breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-medium">-{formatPrice(discount)}</span>
                </div>
              )}
              
              {tax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span className="font-medium">{formatPrice(tax)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                <span>Total</span>
                <span className="text-indigo-600">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={clearCart}
                className="flex-1 py-3 border-2 border-red-600 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : `Checkout (${itemCount})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CartSidebar;