import React, { useEffect, useState } from 'react';
import Head from 'next/head';

export default function CheckoutPageView({
  parsedHeader,
  parsedFooter,
  orderSuccess,
  cartItems,
  orderError,
  checkoutFirstName, setCheckoutFirstName,
  checkoutLastName, setCheckoutLastName,
  checkoutAddress, setCheckoutAddress,
  checkoutCity, setCheckoutCity,
  checkoutPostcode, setCheckoutPostcode,
  checkoutEmail, setCheckoutEmail,
  checkoutPhone, setCheckoutPhone,
  shipToDifferentAddress, setShipToDifferentAddress,
  shippingFirstName, setShippingFirstName,
  shippingLastName, setShippingLastName,
  shippingAddress, setShippingAddress,
  shippingCity, setShippingCity,
  shippingPostcode, setShippingPostcode,
  // 👇 ADD THESE LIFTED PROPS TO DESTRUCTURE THEM 👇
  shippingCountry, setShippingCountry,
  shippingState, setShippingState,
  billingCountry, setBillingCountry,
  billingState, setBillingState,
  cartSubtotal,
  shippingMethods,
  selectedShippingMethod, setSelectedShippingMethod,
  taxTotal,
  orderTotalAmount,
  paymentGateways,
  selectedPaymentGateway, setSelectedPaymentGateway,
  stripeError,
  isProcessingOrder,
  handleCheckoutSubmit,
  setStripeCardElement,
  stripeInstance,        // 👈 ADD THIS
  setStripeInstance,    // 👈 ADD THIS
  // 👇 ADD THESE TWO VARIABLE NAMES HERE 👇
  useSameAddress,
  setUseSameAddress,
  router
}) {
  const [isStripeReady, setIsStripeReady] = useState(false);

  // Dynamic WooCommerce backend configurations
  const [wcCountries, setWcCountries] = useState({});
  
  
  // Local state to hold shipping phone independently from WooCommerce's billing phone
  const [shippingPhone, setShippingPhone] = useState('');

  // Local validation errors map
  const [validationErrors, setValidationErrors] = useState({});
  
  // Automatically copy shipping phone to billing phone if checked
  useEffect(() => {
    if (useSameAddress) {
      setCheckoutPhone(shippingPhone);
    }
  }, [useSameAddress, shippingPhone, setCheckoutPhone]);
  
  // Fetch and Hydrate Saved Customer Profile Details on Mount
  useEffect(() => {
    const hydrateSavedUserAddresses = async () => {
      // 1. Retrieve the active logged-in user's ID from your auth state/localStorage
      const savedUser = JSON.parse(localStorage.getItem('headless_user') || '{}');
      const activeUserId = savedUser.id || savedUser.userId;

      if (!activeUserId) return; // Exit silently if guest checkout

      try {
        const response = await fetch(`/api/wc-customer?userId=${activeUserId}`);
        if (!response.ok) return;

        const customer = await response.json();

        // 2. Hydrate Shipping Form State Variables
        if (customer.shipping) {
          if (customer.shipping.first_name) setShippingFirstName(customer.shipping.first_name);
          if (customer.shipping.last_name) setShippingLastName(customer.shipping.last_name);
          if (customer.shipping.address_1) setShippingAddress(customer.shipping.address_1);
          if (customer.shipping.city) setShippingCity(customer.shipping.city);
          if (customer.shipping.postcode) setShippingPostcode(customer.shipping.postcode);
          if (customer.shipping.country) setShippingCountry(customer.shipping.country);
          if (customer.shipping.state) setShippingState(customer.shipping.state);
		  if (customer.shipping.phone) setShippingPhone(customer.shipping.phone);
        }

        // 3. Hydrate Billing Form State Variables
        if (customer.billing) {
          if (customer.billing.first_name) setCheckoutFirstName(customer.billing.first_name);
          if (customer.billing.last_name) setCheckoutLastName(customer.billing.last_name);
          if (customer.billing.address_1) setCheckoutAddress(customer.billing.address_1);
          if (customer.billing.city) setCheckoutCity(customer.billing.city);
          if (customer.billing.postcode) setCheckoutPostcode(customer.billing.postcode);
          if (customer.billing.email) setCheckoutEmail(customer.billing.email);
          if (customer.billing.phone) setCheckoutPhone(customer.billing.phone);
          if (customer.billing.country) setBillingCountry(customer.billing.country);
          if (customer.billing.state) setBillingState(customer.billing.state);
        }

        // 4. Intelligently determine if billing matches shipping to sync your toggle
        const isBillingSame = 
          customer.billing?.address_1 === customer.shipping?.address_1 &&
          customer.billing?.postcode === customer.shipping?.postcode;

        setUseSameAddress(isBillingSame);

      } catch (err) {
        console.warn("Could not load user data from backend. Falling back to clean forms.", err);
      }
    };

    hydrateSavedUserAddresses();
  }, [
    setShippingFirstName, setShippingLastName, setShippingAddress, setShippingCity, 
    setShippingPostcode, setShippingCountry, setShippingState, setCheckoutFirstName, 
    setCheckoutLastName, setCheckoutAddress, setCheckoutCity, setCheckoutPostcode, 
    setCheckoutEmail, setCheckoutPhone, setBillingCountry, setBillingState
  ]);

  // Sync toggles with global handler states
  useEffect(() => {
    setShipToDifferentAddress(!useSameAddress);
  }, [useSameAddress, setShipToDifferentAddress]);

 // 1. Fetch WooCommerce countries/states configuration
  useEffect(() => {
    const fetchWcCountries = async () => {
      try {
        const res = await fetch('/api/wc-countries');
        if (res.ok) {
          const data = await res.json();
          setWcCountries(data);
          
          // Dynamically default to the first active WooCommerce country (e.g. "NZ" or "US")
          const firstAllowedCountryCode = Object.keys(data)[0];
          if (firstAllowedCountryCode) {
            setShippingCountry(firstAllowedCountryCode);
            setBillingCountry(firstAllowedCountryCode);
          }
        }
      } catch (err) {
        console.error("Failed to load WooCommerce allowed country properties:", err);
      }
    };
    fetchWcCountries();
  }, []);

  // Stripe lifecycle hook
  useEffect(() => {
    if (selectedPaymentGateway !== 'stripe') return;

    let cardNumberInstance = null;
    let cardExpiryInstance = null;
    let cardCvcInstance = null;
    let active = true;

    const initStripe = () => {
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx';
      if (!window.Stripe || !active) return;

      // Use the parent's shared instance or initialize it if it doesn't exist yet
      let currentStripe = stripeInstance;
      if (!currentStripe) {
        currentStripe = window.Stripe(publishableKey);
        setStripeInstance(currentStripe);
      }

      const numMount = document.getElementById('stripe-card-number-mount');
      const expMount = document.getElementById('stripe-card-expiry-mount');
      const cvcMount = document.getElementById('stripe-card-cvc-mount');

      if (!numMount || !expMount || !cvcMount) return;

      const elements = currentStripe.elements();
      const elementStyles = {
        style: {
          base: {
            color: '#1a202c',
            fontFamily: '"Inter", sans-serif',
            fontSize: '14px',
            '::placeholder': { color: '#a0aec0' },
          },
          invalid: { color: '#e53e3e', iconColor: '#e53e3e' },
        }
      };

      numMount.innerHTML = '';
      expMount.innerHTML = '';
      cvcMount.innerHTML = '';

      try {
        cardNumberInstance = elements.create('cardNumber', elementStyles);
        cardExpiryInstance = elements.create('cardExpiry', elementStyles);
        cardCvcInstance = elements.create('cardCvc', elementStyles);

        cardNumberInstance.mount('#stripe-card-number-mount');
        cardExpiryInstance.mount('#stripe-card-expiry-mount');
        cardCvcInstance.mount('#stripe-card-cvc-mount');

        if (active) {
          setStripeCardElement(cardNumberInstance);
        }
      } catch (err) {
        console.error("Stripe card elements failed to mount:", err);
      }
    };

    if (window.Stripe) {
      initStripe();
    } else {
      setIsStripeReady(true);
    }

    return () => {
      active = false;
      try {
        if (cardNumberInstance) cardNumberInstance.destroy();
        if (cardExpiryInstance) cardExpiryInstance.destroy();
        if (cardCvcInstance) cardCvcInstance.destroy();
      } catch (err) {
        console.warn("Stripe cleaned up.");
      }
      setStripeCardElement(null);
    };
  }, [selectedPaymentGateway, isStripeReady, stripeInstance, setStripeInstance, setStripeCardElement]);

  // 3. DEFAULT WOOCOMMERCE FORM VALIDATORS (FRONTEND PRE-FLIGHT)
  const validateForm = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Contact validation
    if (!checkoutEmail) errors.checkoutEmail = "Email address is required.";
    else if (!emailRegex.test(checkoutEmail)) errors.checkoutEmail = "Please enter a valid email address.";

    // Shipping validation
    if (!shippingFirstName) errors.shippingFirstName = "Shipping first name is required.";
    if (!shippingLastName) errors.shippingLastName = "Shipping last name is required.";
    if (!shippingAddress) errors.shippingAddress = "Shipping street address is required.";
    if (!shippingCity) errors.shippingCity = "Shipping town / city is required.";
    if (!shippingPostcode) errors.shippingPostcode = "Shipping postcode is required.";
    else if (shippingPostcode.length < 3) errors.shippingPostcode = "Please enter a valid postcode format.";
    if (!checkoutPhone) errors.checkoutPhone = "Phone number is required.";

    // Conditional Billing validation
    if (!useSameAddress) {
      if (!checkoutFirstName) errors.checkoutFirstName = "Billing first name is required.";
      if (!checkoutLastName) errors.checkoutLastName = "Billing last name is required.";
      if (!checkoutAddress) errors.checkoutAddress = "Billing street address is required.";
      if (!checkoutCity) errors.checkoutCity = "Billing town / city is required.";
      if (!checkoutPostcode) errors.checkoutPostcode = "Billing postcode is required.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onFormSubmit = (e) => {
    e.preventDefault();
    
    // Execute WooCommerce style validation pass before API submission
    if (validateForm()) {
      handleCheckoutSubmit(e);
    } else {
      // Scroll to the top error notice if form validation fails
      const errorBanner = document.getElementById('checkout-error-banner');
      if (errorBanner) {
        errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const safeSubtotal = typeof cartSubtotal === 'number' ? cartSubtotal : (parseFloat(cartSubtotal) || 0);
  const safeShippingMethods = Array.isArray(shippingMethods) ? shippingMethods : [];

  // Handle Order Success Rendering (Detailed WooCommerce Receipt Style)
  if (orderSuccess) {
    const orderDate = orderSuccess.date_created 
      ? new Date(orderSuccess.date_created).toLocaleDateString('en-NZ', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : new Date().toLocaleDateString('en-NZ', { year: 'numeric', month: 'long', day: 'numeric' });

    const lineItems = Array.isArray(orderSuccess.line_items) ? orderSuccess.line_items : [];

    return (
      <div className="woocommerce-checkout-success bg-gray-50 min-h-screen font-sans">
        {parsedHeader && <div dangerouslySetInnerHTML={{ __html: parsedHeader }} />}
        
        <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          
          {/* Header Success Status */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 text-3xl">
              ✓
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Thank you. Your order has been received.</h1>
            <p className="text-gray-500 mt-2">Your headless order has been placed successfully.</p>
          </div>

          {/* 1. WooCommerce Standard Overview Grid */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm divide-y md:divide-y-0 md:divide-x divide-gray-100">
              <div className="pt-4 md:pt-0">
                <span className="block text-gray-400 uppercase tracking-wider text-xs font-semibold mb-1">Order number:</span>
                <strong className="text-gray-900 text-base">#{orderSuccess.id}</strong>
              </div>
              <div className="pt-4 md:pt-0 md:pl-6">
                <span className="block text-gray-400 uppercase tracking-wider text-xs font-semibold mb-1">Date:</span>
                <strong className="text-gray-900 text-base">{orderDate}</strong>
              </div>
              <div className="pt-4 md:pt-0 md:pl-6">
                <span className="block text-gray-400 uppercase tracking-wider text-xs font-semibold mb-1">Total:</span>
                <strong className="text-orange-600 text-base font-extrabold">${parseFloat(orderSuccess.total).toFixed(2)}</strong>
              </div>
              <div className="pt-4 md:pt-0 md:pl-6">
                <span className="block text-gray-400 uppercase tracking-wider text-xs font-semibold mb-1">Payment method:</span>
                <strong className="text-gray-900 text-base">{orderSuccess.payment_method_title || 'Credit Card (Stripe)'}</strong>
              </div>
            </div>
          </div>

          {/* 2. WooCommerce Style Order Items Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-150">
              <h2 className="text-lg font-bold text-gray-900">Order details</h2>
            </div>
            <div className="p-6">
              <table className="w-full text-sm text-left text-gray-600">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 uppercase text-xs font-bold tracking-wider pb-3">
                    <th className="pb-3 font-semibold">Product</th>
                    <th className="pb-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className="align-middle">
                      <td className="py-4 pr-4">
                        <span className="font-semibold text-gray-800">{item.name}</span>
                        <strong className="text-gray-400 text-xs ml-2">× {item.quantity}</strong>
                      </td>
                      <td className="py-4 text-right font-semibold text-gray-900">
                        ${parseFloat(item.total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50 text-gray-700 divide-y divide-gray-100">
                  <tr>
                    <td className="px-6 py-3 font-semibold">Subtotal:</td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">
                      ${(parseFloat(orderSuccess.total) - parseFloat(orderSuccess.shipping_total || 0) - parseFloat(orderSuccess.total_tax || 0)).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-3 font-semibold">Shipping:</td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">
                      ${parseFloat(orderSuccess.shipping_total || 0).toFixed(2)} <span className="text-xs text-gray-400 font-normal">via {orderSuccess.shipping_lines?.[0]?.method_title || 'Flat rate'}</span>
                    </td>
                  </tr>
                  {parseFloat(orderSuccess.total_tax || 0) > 0 && (
                    <tr>
                      <td className="px-6 py-3 font-semibold">Tax:</td>
                      <td className="px-6 py-3 text-right font-semibold text-gray-900">
                        ${parseFloat(orderSuccess.total_tax).toFixed(2)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="px-6 py-4 font-bold text-base text-gray-900">Payment method:</td>
                    <td className="px-6 py-4 text-right font-bold text-base text-gray-900">
                      {orderSuccess.payment_method_title || 'Credit Card (Stripe)'}
                    </td>
                  </tr>
                  <tr className="bg-orange-50/50">
                    <td className="px-6 py-4 font-extrabold text-lg text-gray-900">Total:</td>
                    <td className="px-6 py-4 text-right font-extrabold text-lg text-orange-600">
                      ${parseFloat(orderSuccess.total).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 3. WooCommerce Customer Billing & Shipping Addresses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            
            {/* Billing Address Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-sm text-gray-600">
              <h3 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">Billing address</h3>
              <p className="font-semibold text-gray-800 mb-2">
                {orderSuccess.billing?.first_name} {orderSuccess.billing?.last_name}
              </p>
              <p>{orderSuccess.billing?.address_1}</p>
              {orderSuccess.billing?.address_2 && <p>{orderSuccess.billing?.address_2}</p>}
              <p>{orderSuccess.billing?.city}, {orderSuccess.billing?.state} {orderSuccess.billing?.postcode}</p>
              <p className="mt-1">{orderSuccess.billing?.country === 'NZ' ? 'New Zealand' : orderSuccess.billing?.country}</p>
              
              {(orderSuccess.billing?.phone || orderSuccess.billing?.email) && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-gray-500">
                  {orderSuccess.billing?.phone && <p><strong>Phone:</strong> {orderSuccess.billing.phone}</p>}
                  {orderSuccess.billing?.email && <p><strong>Email:</strong> {orderSuccess.billing.email}</p>}
                </div>
              )}
            </div>

            {/* Shipping Address Card */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-sm text-gray-600">
              <h3 className="text-base font-bold text-gray-900 mb-4 border-b pb-2">Shipping address</h3>
              <p className="font-semibold text-gray-800 mb-2">
                {orderSuccess.shipping?.first_name} {orderSuccess.shipping?.last_name}
              </p>
              <p>{orderSuccess.shipping?.address_1}</p>
              {orderSuccess.shipping?.address_2 && <p>{orderSuccess.shipping?.address_2}</p>}
              <p>{orderSuccess.shipping?.city}, {orderSuccess.shipping?.state} {orderSuccess.shipping?.postcode}</p>
              <p className="mt-1">{orderSuccess.shipping?.country === 'NZ' ? 'New Zealand' : orderSuccess.shipping?.country}</p>
            </div>

          </div>

          {/* Action Trigger */}
          <div className="text-center">
            <button 
              onClick={() => router.push('/')} 
              className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-extrabold uppercase tracking-wider rounded shadow transition duration-150"
            >
              Return to Training Hub
            </button>
          </div>

        </div>

        {parsedFooter && <div dangerouslySetInnerHTML={{ __html: parsedFooter }} />}
      </div>
    );
  }

  return (
    <div className="woocommerce-checkout-page bg-white min-h-screen font-sans">
      <Head>
        <style dangerouslySetInnerHTML={{ __html: `
          .section-title {
            font-size: 1.35rem;
            font-weight: 600;
            color: #1a202c;
            margin-bottom: 1.25rem;
          }

          .checkout-input-group {
            position: relative;
            background: #ffffff;
            border: 1px solid #dcdcdc;
            border-radius: 5px;
            padding: 8px 12px;
            transition: border-color 0.15s ease;
          }
          .checkout-input-group.input-error {
            border-color: #e53e3e !important;
            box-shadow: 0 0 0 1px #e53e3e !important;
          }
          .checkout-input-group:focus-within {
            border-color: #ff6f00;
            box-shadow: 0 0 0 1px #ff6f00;
          }

          .checkout-input-label {
            display: block;
            font-size: 0.75rem;
            font-weight: 500;
            color: #718096;
            margin-bottom: 2px;
          }

          .checkout-input {
            width: 100%;
            border: none;
            outline: none;
            font-size: 0.95rem;
            color: #1a202c;
            padding: 2px 0;
            background: transparent;
          }

          .checkout-select {
            width: 100%;
            border: none;
            outline: none;
            font-size: 0.95rem;
            color: #1a202c;
            background: transparent;
            cursor: pointer;
            padding: 2px 0;
            -webkit-appearance: none;
            appearance: none;
          }

          .checkout-input-group.select-group::after {
            content: "▼";
            font-size: 0.65rem;
            color: #718096;
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
          }

          .custom-checkbox-label {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.9rem;
            color: #4a5568;
            cursor: pointer;
          }

          .custom-checkbox {
            appearance: none;
            width: 18px;
            height: 18px;
            border: 1px solid #cbd5e0;
            border-radius: 4px;
            outline: none;
            cursor: pointer;
            position: relative;
          }
          .custom-checkbox:checked {
            background-color: #ff6f00;
            border-color: #ff6f00;
          }
          .custom-checkbox:checked::after {
            content: "✓";
            position: absolute;
            color: white;
            font-size: 0.75rem;
            font-weight: bold;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          }

          .sticky-summary-card {
            position: sticky;
            top: 24px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 24px;
          }
        `}} />
      </Head>

      {parsedHeader && <div dangerouslySetInnerHTML={{ __html: parsedHeader }} />}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Form submits via our WooCommerce validation pre-check */}
        <form onSubmit={onFormSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* LEFT COLUMN: CUSTOMER INFORMATION */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Global validation error notification panel */}
            {(Object.keys(validationErrors).length > 0 || orderError) && (
              <div id="checkout-error-banner" className="p-4 bg-red-50 text-red-700 font-semibold rounded border border-red-200 text-xs space-y-1">
                <p className="font-bold text-sm mb-1">Please correct the following errors before submitting:</p>
                {Object.values(validationErrors).map((err, idx) => <p key={idx}>• {err}</p>)}
                {orderError && <p>• {orderError}</p>}
              </div>
            )}

            {/* 1. CONTACT INFO */}
            <div>
              <h2 className="section-title">Contact information</h2>
              <div className={`checkout-input-group ${validationErrors.checkoutEmail ? 'input-error' : ''}`}>
                <label className="checkout-input-label">Email address *</label>
                <input 
                  type="email" 
                  value={checkoutEmail} 
                  onChange={(e) => setCheckoutEmail(e.target.value)} 
                  placeholder="name@example.com"
                  className="checkout-input" 
                />
              </div>
            </div>

            {/* 2. SHIPPING ADDRESS */}
            <div className="space-y-4">
              <h2 className="section-title">Shipping address</h2>

              {/* Dynamic WooCommerce Countries Selection */}
              <div className="checkout-input-group select-group">
                <label className="checkout-input-label">Country/Region</label>
                <select 
                  value={shippingCountry} 
                  onChange={(e) => {
                    setShippingCountry(e.target.value);
                    setShippingState(''); 
                  }} 
                  className="checkout-select"
                >
                  {Object.keys(wcCountries).length > 0 ? (
                    Object.keys(wcCountries).map(code => (
                      <option key={code} value={code}>{wcCountries[code].name}</option>
                    ))
                  ) : (
                    <option value="US">United States</option>
                  )}
                </select>
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`checkout-input-group ${validationErrors.shippingFirstName ? 'input-error' : ''}`}>
                  <label className="checkout-input-label">First name *</label>
                  <input 
                    type="text" 
                    value={shippingFirstName} 
                    onChange={(e) => setShippingFirstName(e.target.value)} 
                    className="checkout-input" 
                  />
                </div>
                <div className={`checkout-input-group ${validationErrors.shippingLastName ? 'input-error' : ''}`}>
                  <label className="checkout-input-label">Last name *</label>
                  <input 
                    type="text" 
                    value={shippingLastName} 
                    onChange={(e) => setShippingLastName(e.target.value)} 
                    className="checkout-input" 
                  />
                </div>
              </div>

              {/* Address */}
              <div className={`checkout-input-group ${validationErrors.shippingAddress ? 'input-error' : ''}`}>
                <label className="checkout-input-label">Address *</label>
                <input 
                  type="text" 
                  value={shippingAddress} 
                  onChange={(e) => setShippingAddress(e.target.value)} 
                  placeholder="Apartment, suite, unit, street address"
                  className="checkout-input" 
                />
              </div>

              {/* City, State, Postcode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`checkout-input-group ${validationErrors.shippingCity ? 'input-error' : ''}`}>
                  <label className="checkout-input-label">Town / City *</label>
                  <input 
                    type="text" 
                    value={shippingCity} 
                    onChange={(e) => setShippingCity(e.target.value)} 
                    className="checkout-input" 
                  />
                </div>

                <div className="checkout-input-group select-group">
                  <label className="checkout-input-label">State / Province</label>
                 
				 <select 
				  value={shippingState} 
				  onChange={(e) => setShippingState(e.target.value)} 
				  className="checkout-select"
				>
				  <option value="">Select state...</option>
				  {Object.entries(wcCountries[shippingCountry]?.states || {}).map(([code, name]) => (
					<option key={code} value={code}>{name}</option>
				  ))}
				</select>

                </div>

                <div className={`checkout-input-group ${validationErrors.shippingPostcode ? 'input-error' : ''}`}>
                  <label className="checkout-input-label">Postcode *</label>
                  <input 
                    type="text" 
                    value={shippingPostcode} 
                    onChange={(e) => setShippingPostcode(e.target.value)} 
                    className="checkout-input" 
                  />
                </div>
              </div>

              {/* Shipping Phone */}
              <div className="checkout-input-group">
                <label className="checkout-input-label">Phone *</label>
                <input 
                  type="tel" 
                  required 
                  value={shippingPhone} 
                  onChange={(e) => setShippingPhone(e.target.value)} 
                  className="checkout-input" 
                />
              </div>

              {/* Same Address Switcher */}
              <div className="pt-2">
                <label className="custom-checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={useSameAddress} 
                    onChange={(e) => setUseSameAddress(e.target.checked)} 
                    className="custom-checkbox" 
                  />
                  <span className="font-medium text-gray-700">Use same address for billing</span>
                </label>
              </div>
            </div>

            {/* 3. CONDITIONAL BILLING ADDRESS */}
            {!useSameAddress && (
              <div className="space-y-4 pt-6 border-t border-dashed animate-fadeIn">
                <h2 className="section-title">Billing address</h2>

                <div className="checkout-input-group select-group">
                  <label className="checkout-input-label">Country/Region</label>
                  <select 
                    value={billingCountry} 
                    onChange={(e) => {
                      setBillingCountry(e.target.value);
                      setBillingState('');
                    }} 
                    className="checkout-select"
                  >
                    {Object.keys(wcCountries).length > 0 ? (
                      Object.keys(wcCountries).map(code => (
                        <option key={code} value={code}>{wcCountries[code].name}</option>
                      ))
                    ) : (
                      <option value="US">United States</option>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={`checkout-input-group ${validationErrors.checkoutFirstName ? 'input-error' : ''}`}>
                    <label className="checkout-input-label">First name *</label>
                    <input 
                      type="text" 
                      value={checkoutFirstName} 
                      onChange={(e) => setCheckoutFirstName(e.target.value)} 
                      className="checkout-input" 
                    />
                  </div>
                  <div className={`checkout-input-group ${validationErrors.checkoutLastName ? 'input-error' : ''}`}>
                    <label className="checkout-input-label">Last name *</label>
                    <input 
                      type="text" 
                      value={checkoutLastName} 
                      onChange={(e) => setCheckoutLastName(e.target.value)} 
                      className="checkout-input" 
                    />
                  </div>
                </div>

                <div className={`checkout-input-group ${validationErrors.checkoutAddress ? 'input-error' : ''}`}>
                  <label className="checkout-input-label">Address *</label>
                  <input 
                    type="text" 
                    value={checkoutAddress} 
                    onChange={(e) => setCheckoutAddress(e.target.value)} 
                    className="checkout-input" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className={`checkout-input-group ${validationErrors.checkoutCity ? 'input-error' : ''}`}>
                    <label className="checkout-input-label">Town / City *</label>
                    <input 
                      type="text" 
                      value={checkoutCity} 
                      onChange={(e) => setCheckoutCity(e.target.value)} 
                      className="checkout-input" 
                    />
                  </div>

                  <div className="checkout-input-group select-group">
                    <label className="checkout-input-label">State / Province</label>
                    
					<select 
					  value={billingState} 
					  onChange={(e) => setBillingState(e.target.value)} 
					  className="checkout-select"
					>
					  <option value="">Select state...</option>
					  {Object.entries(wcCountries[billingCountry]?.states || {}).map(([code, name]) => (
						<option key={code} value={code}>{name}</option>
					  ))}
					</select>

                  </div>

                  <div className={`checkout-input-group ${validationErrors.checkoutPostcode ? 'input-error' : ''}`}>
                    <label className="checkout-input-label">Postcode *</label>
                    <input 
                      type="text" 
                      value={checkoutPostcode} 
                      onChange={(e) => setCheckoutPostcode(e.target.value)} 
                      className="checkout-input" 
                    />
                  </div>
				  
				  {/* 👇 NEW DEDICATED BILLING PHONE FIELD 👇 */}
                <div className={`checkout-input-group mt-4 ${validationErrors.checkoutPhone ? 'input-error' : ''}`}>
                  <label className="checkout-input-label">Billing Phone *</label>
                  <input 
                    type="tel" 
                    required={!useSameAddress} 
                    value={checkoutPhone} 
                    onChange={(e) => setCheckoutPhone(e.target.value)} 
                    className="checkout-input" 
                  />
                </div>
                {/* 👆 NEW DEDICATED BILLING PHONE FIELD 👆 */}
				  
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: STICKY ORDER SUMMARY */}
          <div className="lg:col-span-5">
            <div className="sticky-summary-card space-y-6">
              <h2 className="text-xl font-bold text-gray-800">Order summary</h2>

              {/* Product list with thumbnails */}
              <div className="divide-y divide-gray-150">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded" />
                        ) : (
                          <i className="far fa-image text-xl text-gray-300"></i>
                        )}
                        <span className="absolute -top-2 -right-2 bg-gray-600 text-white font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center">
                          {item.qty}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                          Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-gray-800 text-sm">
                      ${(parseFloat(item.price) * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cost Totals */}
              <div className="space-y-3 pt-4 border-t text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-800">${safeSubtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Flat rate</span>
                  <span className="font-semibold text-gray-800">
                    ${selectedShippingMethod ? selectedShippingMethod.cost.toFixed(2) : '5.00'}
                  </span>
                </div>

                {taxTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Estimated Tax</span>
                    <span className="font-semibold text-gray-800">${taxTotal.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-lg font-bold text-gray-900 pt-4 border-t">
                  <span>Total</span>
                  <span className="text-xl text-gray-900">${orderTotalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Secure Stripe Section */}
              <div className="pt-4 border-t space-y-4">
                <h3 className="font-bold text-gray-800 text-sm">Payment Method</h3>
                <div className="space-y-3">
                  <div className="border rounded-md bg-white p-3.5">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={selectedPaymentGateway === 'stripe'} 
                        onChange={() => setSelectedPaymentGateway('stripe')} 
                        className="text-orange-600 focus:ring-orange-500" 
                      />
                      <span className="font-semibold text-gray-700">Credit Card (Stripe)</span>
                    </label>

                    {selectedPaymentGateway === 'stripe' && (
                      <div className="space-y-3 pt-3 mt-2 border-t border-gray-100">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Card Number</label>
                          <div id="stripe-card-number-mount" className="p-2.5 border rounded bg-gray-50 min-h-[38px]"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Expiration</label>
                            <div id="stripe-card-expiry-mount" className="p-2.5 border rounded bg-gray-50 min-h-[38px]"></div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CVC</label>
                            <div id="stripe-card-cvc-mount" className="p-2.5 border rounded bg-gray-50 min-h-[38px]"></div>
                          </div>
                        </div>
                        {stripeError && <p className="text-red-500 font-semibold text-xs pt-1">{stripeError}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit triggers form execution with pre-flight evaluation checks */}
              <button 
                type="submit" 
                disabled={isProcessingOrder} 
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-extrabold uppercase tracking-wider rounded transition shadow disabled:opacity-40"
              >
                {isProcessingOrder ? 'Securing transaction...' : 'Place Order'}
              </button>
            </div>
          </div>

        </form>
      </div>

      {parsedFooter && <div dangerouslySetInnerHTML={{ __html: parsedFooter }} />}
    </div>
  );
}