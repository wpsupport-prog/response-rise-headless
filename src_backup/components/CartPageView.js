import React, { useState } from 'react';
import Head from 'next/head';

export default function CartPageView({
  parsedHeader,
  parsedFooter,
  cartItems,
  cartSubtotal,
  handleUpdateQty,
  handleRemoveItem,
  router
}) {
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  // Fixed flat rate for shipping to match the mockup profile
  const flatRateShipping = 5.00;
  const estimatedTotal = cartSubtotal > 0 ? cartSubtotal + flatRateShipping : 0;

  return (
    <div className="woocommerce-cart-page-wrapper">
      <Head>
        <style dangerouslySetInnerHTML={{ __html: `
          /* Clean design variables matching the response.rise theme */
          .cart-title {
            font-family: 'Manrope', sans-serif;
            font-size: 3.2rem;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 2rem;
          }

          .cart-header-row {
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 0.75rem;
            margin-bottom: 1.5rem;
          }

          .cart-table-header {
            font-size: 0.8rem;
            font-weight: 700;
            letter-spacing: 0.05em;
            color: #2d3748;
          }

          .cart-item-row {
            border-bottom: 1px solid #edf2f7;
            padding-bottom: 1.5rem;
            margin-bottom: 1.5rem;
          }

          /* Product Title Red/Orange Link */
          .cart-item-title {
            color: #ff6f00; /* Custom brand red-orange color */
            font-weight: 600;
            font-size: 1rem;
            transition: color 0.15s ease;
            text-decoration: none;
          }
          .cart-item-title:hover {
            color: #e65c00;
            text-decoration: underline;
          }

          .cart-item-description {
            font-size: 0.85rem;
            color: #718096;
            line-height: 1.4;
          }

          /* Quantity selector styling */
          .cart-qty-wrapper {
            display: inline-flex;
            align-items: center;
            border: 1px solid #cbd5e0;
            border-radius: 4px;
            overflow: hidden;
            background: #ffffff;
            height: 34px;
          }
          .cart-qty-btn {
            background: #f7fafc;
            border: none;
            width: 32px;
            height: 100%;
            font-size: 1rem;
            color: #4a5568;
            cursor: pointer;
            transition: background 0.15s ease;
          }
          .cart-qty-btn:hover {
            background: #edf2f7;
          }
          .cart-qty-value {
            width: 38px;
            text-align: center;
            font-size: 0.9rem;
            font-weight: 600;
            color: #2d3748;
          }

          /* Checkout Button styling */
          .checkout-btn {
            width: 100%;
            background-color: #2d3748; /* Dark Slate Charcoal black color */
            color: #ffffff !important;
            font-weight: 700;
            font-size: 1rem;
            padding: 1rem;
            border-radius: 0px; /* Square flat style as displayed */
            border: none;
            cursor: pointer;
            text-transform: none;
            transition: background-color 0.15s ease;
            display: block;
            text-align: center;
          }
          .checkout-btn:hover {
            background-color: #1a202c;
          }
          .checkout-btn span {
            text-decoration: underline;
          }
        `}} />
      </Head>

      {/* Render the WordPress Elementor Global Header */}
      {parsedHeader && (
        <div 
          className="elementor-rendered-html-header-wrapper" 
          dangerouslySetInnerHTML={{ __html: parsedHeader }} 
        />
      )}

      {/* Main Container Wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-sans">
        <h1 className="cart-title">Cart</h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-200 rounded-lg">
            <i className="fas fa-shopping-basket text-5xl text-gray-300 mb-4 block"></i>
            <p className="text-gray-500 mb-6">Your shopping cart is currently empty.</p>
            <button 
              onClick={() => router.push('/')}
              className="inline-flex items-center px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded transition"
            >
              Return to training hub
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* LEFT COLUMN: PRODUCT LISTING SECTION (8 COLS) */}
            <div className="lg:col-span-7">
              {/* Header Titles */}
              <div className="grid grid-cols-12 cart-header-row">
                <div className="col-span-10">
                  <span className="cart-table-header uppercase">Product</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="cart-table-header uppercase">Total</span>
                </div>
              </div>

              {/* Loop and Display Cart Items */}
              {cartItems.map((item) => (
                <div key={item.id} className="grid grid-cols-12 cart-item-row items-start gap-4">
                  
                  {/* Left Side: Product Image & Details */}
                  <div className="col-span-10 flex gap-4">
                    {/* Square Image Block */}
                    <div className="w-20 h-20 bg-gray-100 flex items-center justify-center border border-gray-200 rounded flex-shrink-0">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <i className="far fa-image text-2xl text-gray-300"></i>
                      )}
                    </div>

                    {/* Meta details */}
                    <div className="space-y-1.5 flex-1">
                      <a href={`/product/${item.name.toLowerCase().replace(/\\s+/g, '-')}`} className="cart-item-title">
                        {item.name}
                      </a>
                      <p className="text-sm font-semibold text-gray-800">
                        ${parseFloat(item.price).toFixed(2)}
                      </p>
                      <p className="cart-item-description">
                        Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has...
                      </p>

                      {/* Quantity Modifier Box and Bin button */}
                      <div className="flex items-center gap-4 pt-2">
                        <div className="cart-qty-wrapper">
                          <button 
                            type="button" 
                            onClick={() => handleUpdateQty(item.id, Math.max(1, item.qty - 1))}
                            className="cart-qty-btn"
                          >
                            -
                          </button>
                          <span className="cart-qty-value">{item.qty}</span>
                          <button 
                            type="button" 
                            onClick={() => handleUpdateQty(item.id, item.qty + 1)}
                            className="cart-qty-btn"
                          >
                            +
                          </button>
                        </div>

                        {/* Trash Can Delete Control */}
                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          title="Remove item"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Total Price column */}
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      ${(parseFloat(item.price) * item.qty).toFixed(2)}
                    </span>
                  </div>

                </div>
              ))}
            </div>

            {/* RIGHT COLUMN: CART TOTALS PANEL SECTION (5 COLS) */}
            <div className="lg:col-span-5 bg-white p-6 border border-gray-100 shadow-sm rounded-lg">
              <h2 className="text-sm font-bold tracking-wider text-gray-800 uppercase mb-4">
                Cart Totals
              </h2>

              {/* Coupon Accordion Module */}
              <div className="border-t border-b border-gray-100 py-3 mb-4">
                <button 
                  onClick={() => setShowCoupon(!showCoupon)}
                  className="w-full flex justify-between items-center text-sm font-semibold text-gray-600 hover:text-gray-800 focus:outline-none"
                >
                  <span>Add coupons</span>
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${showCoupon ? 'transform rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showCoupon && (
                  <div className="mt-3 flex gap-2 animate-fadeIn">
                    <input 
                      type="text" 
                      placeholder="Coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="border border-gray-300 px-3 py-1.5 text-xs rounded focus:outline-none focus:border-orange-500 flex-1"
                    />
                    <button 
                      type="button" 
                      className="px-4 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-semibold rounded transition"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {/* Subtotal Row */}
              <div className="flex justify-between items-center text-sm mb-4">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-800">
                  ${cartSubtotal.toFixed(2)}
                </span>
              </div>

              {/* Shipping Method Cost */}
              <div className="flex justify-between items-center text-sm mb-6 pb-6 border-b border-gray-100">
                <span className="text-gray-500">Flat rate</span>
                <span className="font-semibold text-gray-800">
                  ${flatRateShipping.toFixed(2)}
                </span>
              </div>

              {/* Estimated Total */}
              <div className="flex justify-between items-end mb-8">
                <span className="text-xl font-semibold text-gray-800">Estimated total</span>
                <span className="text-3xl font-bold text-gray-900">
                  ${estimatedTotal.toFixed(2)}
                </span>
              </div>

              {/* Proceed to checkout Action */}
              <button 
                onClick={() => router.push('/checkout')}
                className="checkout-btn"
              >
                <span>Proceed to Checkout</span>
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Render the WordPress Elementor Global Footer */}
      {parsedFooter && (
        <div 
          className="elementor-rendered-html-footer-wrapper mt-16" 
          dangerouslySetInnerHTML={{ __html: parsedFooter }} 
        />
      )}
    </div>
  );
}