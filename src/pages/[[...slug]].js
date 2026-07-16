import Script from 'next/script';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getPageAssetsAndHtml, getAllPagesWithSlugs } from '../lib/api';
import Layout from '../components/Layout';

// Sub-page component imports
import ProductPageView from '../components/ProductPageView';
import CartPageView from '../components/CartPageView';
import CheckoutPageView from '../components/CheckoutPageView';

export default function HeadlessDynamicRender({ pageData }) {
  const router = useRouter();
  const [domReady, setDomReady] = useState(false);

  // Authentication & Session States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  
  // Dynamic Product State
  const [productData, setProductData] = useState(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedMessage, setAddedMessage] = useState('');

  // Dynamic Local Cart States
  const [cartItems, setCartItems] = useState([]);
  const [cartSubtotal, setCartSubtotal] = useState(0);

  // Dynamic Checkout Form States (Billing)
  const [checkoutFirstName, setCheckoutFirstName] = useState('');
  const [checkoutLastName, setCheckoutLastName] = useState('');
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [checkoutCity, setCheckoutCity] = useState('');
  const [checkoutPostcode, setCheckoutPostcode] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');

  // Dynamic Checkout Form States (Shipping)
  const [shipToDifferentAddress, setShipToDifferentAddress] = useState(false);
  const [shippingFirstName, setShippingFirstName] = useState('');
  const [shippingLastName, setShippingLastName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingPostcode, setShippingPostcode] = useState('');
  
  // Lifted Country & State selectors
  const [shippingCountry, setShippingCountry] = useState('NZ');
  const [shippingState, setShippingState] = useState('');
  const [billingCountry, setBillingCountry] = useState('NZ');
  const [billingState, setBillingState] = useState('');
  
  const [useSameAddress, setUseSameAddress] = useState(true);

  // Coupon States
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); 
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Tax States
  const [taxTotal, setTaxTotal] = useState(0);

  // Dynamic Shipping Rates State
  const [shippingMethods, setShippingMethods] = useState([
    { id: 'flat_rate', title: 'Flat Rate', cost: 5.00 },
    { id: 'local_pickup', title: 'Local Pickup', cost: 0.00 }
  ]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState({ id: 'flat_rate', title: 'Flat Rate', cost: 5.00 });

  // Payment Gateways
  const [paymentGateways, setPaymentGateways] = useState([]);
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState('cod');
  const [isLoadingGateways, setIsLoadingGateways] = useState(false);
  
  const [stripeInstance, setStripeInstance] = useState(null);

  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);
  
  // Stripe States
  const [stripeCardElement, setStripeCardElement] = useState(null);
  const [stripeError, setStripeError] = useState('');
  const [isStripeReady, setIsStripeReady] = useState(false);

  // Dashboard Tab Router
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // WooCommerce Store States
  const [customerData, setCustomerData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [isLoadingStoreData, setIsLoadingStoreData] = useState(false);

  // Auth States
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const currentSlug = router.query.slug ? router.query.slug.join('/') : '';
  const isMyAccountPage = currentSlug === 'my-account';
  const isCartPage = currentSlug === 'cart';
  const isCheckoutPage = currentSlug === 'checkout';
  const isProductPage = pageData?.html?.includes('product-type-') || currentSlug.includes('product');

  // 1. Validate Active Sessions on Mount
  useEffect(() => {
    const savedToken = localStorage.getItem('headless_user_token');
    const savedUser = localStorage.getItem('headless_user_data');
    if (savedToken && savedUser) {
      setIsLoggedIn(true);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // 2. Fetch WooCommerce Data if on My Account or Checkout
  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;
    if (!isMyAccountPage && !isCheckoutPage) return;

    const fetchWooCommerceData = async () => {
      setIsLoadingStoreData(true);
      try {
        const res = await fetch(`/api/wc-customer?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setCustomerData(data);
          setEditFirstName(data.first_name || '');
          setEditLastName(data.last_name || '');
          setEditEmail(data.email || '');

          if (isCheckoutPage) {
            setCheckoutFirstName(data.first_name || '');
            setCheckoutLastName(data.last_name || '');
            setCheckoutAddress(data.billing?.address_1 || '');
            setCheckoutCity(data.billing?.city || '');
            setCheckoutPostcode(data.billing?.postcode || '');
            setCheckoutEmail(data.billing?.email || user.email || '');
            setCheckoutPhone(data.billing?.phone || '');

            setShippingFirstName(data.shipping?.first_name || '');
            setShippingLastName(data.shipping?.last_name || '');
            setShippingAddress(data.shipping?.address_1 || '');
            setShippingCity(data.shipping?.city || '');
            setShippingPostcode(data.shipping?.postcode || '');
          }
        }
      } catch (error) {
        console.error('Failed to fetch store metadata:', error);
      } finally {
        setIsLoadingStoreData(false);
      }
    };

    fetchWooCommerceData();
  }, [isLoggedIn, user?.id, isMyAccountPage, isCheckoutPage]);

  // 3. Fetch Product Metadata if on a Product Page
  useEffect(() => {
    if (!isProductPage || !currentSlug) return;

    const fetchProductDetails = async () => {
      setIsLoadingProduct(true);
      try {
        const productSlug = currentSlug.replace('product/', '');
        const res = await fetch(`/api/wc-product?slug=${productSlug}`);
        if (res.ok) {
          const data = await res.json();
          setProductData(data);
        }
      } catch (err) {
        console.error('Failed to load dynamic product data:', err);
      } finally {
        setIsLoadingProduct(false);
      }
    };

    fetchProductDetails();
  }, [isProductPage, currentSlug]);

  // 4. Sync local Cart State on Mount or Selection change
  useEffect(() => {
    if (isCartPage || isCheckoutPage) {
      const savedCart = JSON.parse(localStorage.getItem('headless_cart') || '[]');
      setCartItems(savedCart);
      
      const subtotal = savedCart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
      setCartSubtotal(subtotal);
    }
  }, [isCartPage, isCheckoutPage]);

  // Debounced Hook to Fetch Dynamic Shipping and Taxes on Address Input
  useEffect(() => {
    if (!isCheckoutPage || cartItems.length === 0) return;

    const activePostcode = shipToDifferentAddress ? shippingPostcode : checkoutPostcode;
    const activeCity = shipToDifferentAddress ? shippingCity : checkoutCity;

    const updateRatesAndTax = async () => {
      try {
        const res = await fetch('/api/wc-checkout-totals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postcode: activePostcode || '',
            city: activeCity || '',
            subtotal: cartSubtotal,
            items: cartItems.map(item => ({ id: item.id, qty: item.qty }))
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.shippingMethods && data.shippingMethods.length > 0) {
            setShippingMethods(data.shippingMethods);
            const matchedSelection = data.shippingMethods.find(m => m.id === selectedShippingMethod.id);
            setSelectedShippingMethod(matchedSelection || data.shippingMethods[0]);
          }
          if (typeof data.taxTotal === 'number') {
            setTaxTotal(data.taxTotal);
          }
        }
      } catch (err) {
        console.error('Failed to fetch calculated shipping & tax profiles:', err);
      }
    };

    const debounceTimer = setTimeout(updateRatesAndTax, 800);
    return () => clearTimeout(debounceTimer);
  }, [checkoutPostcode, checkoutCity, shippingPostcode, shippingCity, shipToDifferentAddress, cartSubtotal, cartItems, isCheckoutPage]);

  // 5. Trigger Live WooCommerce Gallery Initialization via jQuery
  useEffect(() => {
    if (isProductPage && domReady) {
      setTimeout(() => {
        if (window.jQuery && window.jQuery.fn.wc_single_product_page) {
          window.jQuery('.woocommerce-product-gallery').each(function() {
            window.jQuery(this).wc_single_product_page();
          });
        }
      }, 500);
    }
  }, [isProductPage, domReady]);
  
  // Fetch Live Payment Gateways on Mount
  useEffect(() => {
    if (!isCheckoutPage) return;

    const fetchPaymentGateways = async () => {
      setIsLoadingGateways(true);
      try {
        const res = await fetch('/api/wc-gateways');
        if (res.ok) {
          const data = await res.json();
          setPaymentGateways(data);
          if (data.length > 0) {
            setSelectedPaymentGateway(data[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching live WooCommerce payment gateways:', err);
      } finally {
        setIsLoadingGateways(false);
      }
    };

    fetchPaymentGateways();
  }, [isCheckoutPage]);

  // Static Header Elementor Cart Sync
  useEffect(() => {
    const syncStaticHeaderCart = () => {
      const totalQty = cartItems.reduce((sum, item) => sum + item.qty, 0);
      const badgeSelectors = [
        '.elementor-button-icon[data-counter]',
        '.cart-contents .count',
        '.woocommerce-active-cart-count',
        '.header-cart-count',
        '.elementor-menu-cart__toggle .elementor-button-icon-wrapper[data-counter]',
        '.elementor-button-icon-wrapper'
      ];
      
      badgeSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element) {
            element.textContent = totalQty;
            element.setAttribute('data-counter', totalQty); 
          }
        });
      });
    };
    
    syncStaticHeaderCart();
  }, [cartItems]);

  // Multi-Tab LocalStorage Syncing
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'headless_cart') {
        const updatedCart = JSON.parse(e.newValue || '[]');
        setCartItems(updatedCart);
        const subtotal = updatedCart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
        setCartSubtotal(subtotal);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Native React Hydration Anchor
  useEffect(() => {
    if (!isProductPage || !domReady || !productData) return;

    const checkAndMount = () => {
      const anchor = document.getElementById('headless-react-add-to-cart-anchor');
      const mountHook = document.getElementById('headless-mount-hook');
      if (anchor && mountHook) {
        anchor.appendChild(mountHook);
        mountHook.style.display = 'block';
      }
    };

    checkAndMount();
    const interval = setInterval(checkAndMount, 100);
    return () => clearInterval(interval);
  }, [isProductPage, domReady, productData]);
  
  // Mutation Observers for Elementor DOM rendering
  useEffect(() => {
    if (!pageData) return;
    const wrapper = document.querySelector('.elementor-rendered-html-wrapper');
    if (!wrapper) return;
    const observer = new MutationObserver(() => { setDomReady(true); observer.disconnect(); });
    observer.observe(wrapper, { childList: true, subtree: true });
    const timeout = setTimeout(() => setDomReady(true), 800);
    return () => { observer.disconnect(); clearTimeout(timeout); };
  }, [pageData]);

  const wpDomain = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://responserise.wpenginepowered.com';

  const handleUpdateQty = (productId, newQty) => {
    if (newQty < 1) return;
    const updated = cartItems.map(item => item.id === productId ? { ...item, qty: newQty } : item);
    setCartItems(updated);
    localStorage.setItem('headless_cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    setCartSubtotal(updated.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0));
  };

  const handleRemoveItem = (productId) => {
    const updated = cartItems.filter(item => item.id !== productId);
    setCartItems(updated);
    localStorage.setItem('headless_cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    setCartSubtotal(updated.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0));
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    setAddingToCart(true);
    setAddedMessage('');

    setTimeout(() => {
      const cart = JSON.parse(localStorage.getItem('headless_cart') || '[]');
      const existingItem = cart.find(item => item.id === productData.id);

      if (existingItem) {
        existingItem.qty += quantity;
      } else {
        cart.push({
          id: productData.id,
          name: productData.name,
          price: productData.price,
          qty: quantity,
          image: productData.images?.[0]?.src || ''
        });
      }

      localStorage.setItem('headless_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('storage'));
      setAddedMessage(`Successfully added ${quantity} × "${productData.name}" to your cart!`);
      setAddingToCart(false);
    }, 600);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError('');

    try {
      const res = await fetch(`/api/wc-coupon?code=${encodeURIComponent(couponCode.trim())}&subtotal=${cartSubtotal}`);
      const data = await res.json();

      if (res.ok && data.valid) {
        setAppliedCoupon(data);
        setCouponCode('');
      } else {
        setCouponError(data.message || 'Invalid or expired discount code.');
      }
    } catch (err) {
      setCouponError('Error parsing coupon configuration.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Coupon calculations
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      discountAmount = cartSubtotal * (parseFloat(appliedCoupon.amount) / 100);
    } else if (appliedCoupon.type === 'fixed_cart') {
      discountAmount = parseFloat(appliedCoupon.amount);
    }
    if (discountAmount > cartSubtotal) {
      discountAmount = cartSubtotal;
    }
  }

  const orderTotalAmount = Math.max(0, cartSubtotal - discountAmount + selectedShippingMethod.cost + taxTotal);

 const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setIsProcessingOrder(true);
    setOrderError(null);

    try {
     // 1. DYNAMIC USER DETECTION
      let activeUserId = 0;
      
      if (typeof window !== 'undefined') {
        // Fetch from your exact localStorage key
        const rawUserData = localStorage.getItem('headless_user_data');
        if (rawUserData) {
          const parsedUser = JSON.parse(rawUserData);
          activeUserId = Number(parsedUser.id || 0);
        }
      }

      console.log("🛒 Submitting order. Detected WooCommerce Customer ID:", activeUserId);

      // 2. Billing Object Mapping
      const billingPayload = {
        first_name: useSameAddress ? (shippingFirstName || '') : (checkoutFirstName || ''),
        last_name: useSameAddress ? (shippingLastName || '') : (checkoutLastName || ''),
        address_1: useSameAddress ? (shippingAddress || '') : (checkoutAddress || ''),
        city: useSameAddress ? (shippingCity || '') : (checkoutCity || ''),
        state: useSameAddress ? (shippingState || '') : (billingState || ''),
        postcode: useSameAddress ? (shippingPostcode || '') : (checkoutPostcode || ''),
        country: 'NZ',
        email: checkoutEmail || '',
        phone: checkoutPhone || ''
      };

      // 3. Shipping Object Mapping
      const shippingPayload = {
        first_name: shippingFirstName || '',
        last_name: shippingLastName || '',
        address_1: shippingAddress || '',
        city: shippingCity || '',
        state: shippingState || '',
        postcode: shippingPostcode || '',
        country: 'NZ'
      };

      // 4. Order Payload
      const orderPayload = {
        payment_method: selectedPaymentGateway || 'stripe',
        payment_method_title: selectedPaymentGateway === 'stripe' ? 'Credit Card (Stripe)' : 'Cash on Delivery',
        set_paid: false, 
        customer_id: activeUserId, // 👈 Sets the registered customer ID
        billing: billingPayload,     
        shipping: shippingPayload,   
        line_items: cartItems.map(item => ({
          product_id: Number(item.id),
          quantity: Number(item.qty)
        })),
        shipping_lines: [
          {
            method_id: selectedShippingMethod?.id || 'flat_rate',
            method_title: selectedShippingMethod?.title || 'Flat rate',
            total: String(selectedShippingMethod?.cost || '5.00')
          }
        ]
      };

      // 5. Send POST to wc-create-order
      const response = await fetch(`/api/wc-create-order`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const responseText = await response.text();
      let orderResult = {};
      
      try {
        orderResult = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error("The checkout server returned an invalid response format.");
      }

      if (!response.ok || !orderResult.id) {
        throw new Error(orderResult.message || "Failed to initialize the order in WooCommerce.");
      }

      const createdOrderId = orderResult.id;

      // 6. Stripe Payment Processing
      if (selectedPaymentGateway === 'stripe') {
        if (!stripeInstance || !stripeCardElement) {
          throw new Error("Stripe is not fully initialized. Please reload the page.");
        }

        const paymentIntentRes = await fetch('/api/stripe-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: orderTotalAmount, orderId: createdOrderId })
        });

        const { clientSecret } = await paymentIntentRes.json();

        if (!clientSecret) {
          throw new Error("Could not retrieve Stripe checkout transaction key.");
        }

        const stripeResult = await stripeInstance.confirmCardPayment(clientSecret, {
          payment_method: {
            card: stripeCardElement,
            billing_details: {
              name: `${billingPayload.first_name} ${billingPayload.last_name}`,
              email: billingPayload.email,
              phone: billingPayload.phone,
              address: {
                line1: billingPayload.address_1,
                city: billingPayload.city,
                postal_code: billingPayload.postcode,
                country: 'NZ'
              }
            }
          }
        });

        if (stripeResult.error) {
          throw new Error(stripeResult.error.message);
        }

        if (stripeResult.paymentIntent && stripeResult.paymentIntent.status === 'succeeded') {
          const stripeTransactionId = stripeResult.paymentIntent.id;

          // 7. Update WooCommerce order status to processing and pass transaction metadata
          const updateResponse = await fetch(`/api/wc-update-order-paid`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: createdOrderId,
              transactionId: stripeTransactionId,
              status: 'processing'
            })
          });

          const updatedOrderResult = await updateResponse.json();

          if (updateResponse.ok) {
            // Background update to copy addresses to user profile
            try {
              if (activeUserId > 0) {
                await fetch('/api/wc-customer', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: activeUserId,
                    billing: billingPayload,
                    shipping: shippingPayload
                  })
                });
              }
            } catch (err) {
              console.warn("Addresses saved, profile update skipped:", err);
            }

            // 1. Set final order success data
            setOrderSuccess(updatedOrderResult);

            // 2. Clear React state
            setCartItems([]); 

            // 3. Clear persistent cart data
            if (typeof window !== 'undefined') {
              // Target your exact cart key
              localStorage.removeItem('storeApiCartData');
              
              // Optional: Keep other common fallbacks wiped just in case
              localStorage.removeItem('cart');
              sessionStorage.removeItem('storeApiCartData');
            }

            console.log("🧹 React state and storeApiCartData cleared successfully!");
			
          } else {
            throw new Error(updatedOrderResult.message || "Payment succeeded, but metadata registration failed.");
          }
        }
      }

    } catch (err) {
      console.error("❌ Checkout order submission failed:", err);
      setOrderError(err.message || "An unexpected error occurred during submission.");
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault(); setLoginError(''); setSuccessMessage(''); setIsLoggingIn(true);
    try {
      const res = await fetch(`${wpDomain}/wp-json/custom-auth/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('headless_user_token', data.token);
        const userData = { id: data.user_id, email: data.user_email, nicename: data.user_nicename, displayName: data.user_display_name };
        localStorage.setItem('headless_user_data', JSON.stringify(userData));
        setUser(userData); setIsLoggedIn(true); setActiveTab('dashboard');
      } else { setLoginError(data.message || 'Invalid login details.'); }
    } catch (err) { setLoginError('Unable to connect to the login portal.'); } finally { setIsLoggingIn(false); }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault(); setRegisterError(''); setSuccessMessage(''); setIsRegistering(true);
    try {
      const res = await fetch(`${wpDomain}/wp-json/wp/v2/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUsername, email: regEmail, password: regPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage('Registration successful! Logging you in automatically...');
        setTimeout(async () => {
          try {
            const loginRes = await fetch(`${wpDomain}/wp-json/custom-auth/v1/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: regUsername, password: regPassword }),
            });
            const loginData = await loginRes.json();
            if (loginRes.ok && loginData.token) {
              localStorage.setItem('headless_user_token', loginData.token);
              const userData = { id: loginData.user_id, email: loginData.user_email, nicename: loginData.user_nicename, displayName: loginData.user_display_name };
              localStorage.setItem('headless_user_data', JSON.stringify(userData));
              setUser(userData); setIsLoggedIn(true); setActiveTab('dashboard');
            } else { setRegisterError('Account created successfully, but auto-login failed.'); }
          } catch (loginErr) { setRegisterError('Account created! Please log in manually.'); } finally { setIsRegistering(false); }
        }, 200);
      } else { setRegisterError(data.message || 'Registration failed.'); setIsRegistering(false); }
    } catch (err) { setRegisterError('Connection error during registration setup.'); setIsRegistering(false); }
  };

  const handleUpdateDetails = async (e) => {
    e.preventDefault(); setUpdateSuccess(''); setUpdateError(''); setIsUpdatingDetails(true);
    try {
      const hasBasicChanges = editFirstName !== (customerData?.first_name || '') || editLastName !== (customerData?.last_name || '') || editEmail !== (customerData?.email || '');
      let updatedData = customerData;
      if (hasBasicChanges) {
        const basicRes = await fetch(`/api/wc-customer?userId=${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ first_name: editFirstName, last_name: editLastName, email: editEmail }),
        });
        const basicResult = await basicRes.json();
        if (!basicRes.ok) { setUpdateError(basicResult.message || 'Failed to update general settings.'); setIsUpdatingDetails(false); return; }
        updatedData = basicResult;
      }
      if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword || !newPassword || !confirmPassword) { setUpdateError('To update your password, please fill out all password fields.'); setIsUpdatingDetails(false); return; }
        if (newPassword !== confirmPassword) { setUpdateError('Your new passwords do not match. Please verify and try again.'); setIsUpdatingDetails(false); return; }
        const passRes = await fetch(`/api/wc-customer?userId=${user.id}&updateType=password`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        });
        const passResult = await passRes.json();
        if (!passRes.ok) { setUpdateError(passResult.message || 'Failed to verify or change password.'); setIsUpdatingDetails(false); return; }
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      }
      setCustomerData(updatedData); setUpdateSuccess('Your profile settings have been updated successfully.');
    } catch (err) { setUpdateError('Network connection error while saving changes.'); } finally { setIsUpdatingDetails(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('headless_user_token'); localStorage.removeItem('headless_user_data');
    setIsLoggedIn(false); setUser(null); setCustomerData(null); setOrders([]); setDownloads([]);
  };

  if (!pageData) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500 animate-pulse">Serving layout...</div>;
  }

  const { html, stylesheets, inlineStyles, headerHtml, footerHtml } = pageData;

  let parsedHeader = headerHtml || "";
  let parsedFooter = footerHtml || "";
  if (html && !parsedHeader) {
    const headerEnd = html.indexOf('</header>');
    if (headerEnd !== -1) parsedHeader = html.substring(0, headerEnd + 9);
  }
  if (html && !parsedFooter) {
    const footerStart = html.indexOf('<footer');
    if (footerStart !== -1) parsedFooter = html.substring(footerStart);
  }

  let modifiedProductHtml = html;

  if (isCartPage && html) {
    const cartSelectorRegEx = /<div[^>]*class=["']woocommerce["'][^>]*>/i;
    const match = html.match(cartSelectorRegEx);
    
    if (match) {
      const cartStartIndex = match.index;
      modifiedProductHtml = 
        html.substring(0, cartStartIndex) + 
        '<div id="headless-react-cart-anchor"></div>' + 
        (html.indexOf('<footer') !== -1 ? html.substring(html.indexOf('<footer')) : '');
    }
  }

  if (isCheckoutPage && html) {
    const checkoutSelectorRegEx = /<div[^>]*class=["']woocommerce["'][^>]*>/i;
    const match = html.match(checkoutSelectorRegEx);
    
    if (match) {
      const checkoutStartIndex = match.index;
      modifiedProductHtml = 
        html.substring(0, checkoutStartIndex) + 
        '<div id="headless-react-checkout-anchor"></div>' + 
        (html.indexOf('<footer') !== -1 ? html.substring(html.indexOf('<footer')) : '');
    }
  }

  const stripWordPressScripts = (rawHtml) => {
    if (!rawHtml) return "";
    
    // 1. Remove all legacy block script tags
    let cleaned = rawHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    
    // 2. Remove WooCommerce or Jetpack remote tracking beacons/pixel images
    cleaned = cleaned.replace(/<img[^>]*src=["'][^"']*pixel\.wp\.com[^"']*["'][^>]*>/gi, "");
    cleaned = cleaned.replace(/<iframe[^>]*src=["'][^"']*pixel\.wp\.com[^"']*["'][^>]*><\/iframe>/gi, "");
    
    return cleaned;
  };

  const cleanProductHtml = stripWordPressScripts(modifiedProductHtml);

  return (
    <Layout>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet" />
		
		{/* USE A CLEAN, STANDARD JQUERY CDN TO PREVENT DOM DISPATCH COLLISIONS */}
		<script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossOrigin="anonymous" />
	  
		{/* 2. REAL SMARTMENUS ENGINE */}
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery.smartmenus/1.2.1/jquery.smartmenus.min.js" integrity="sha512-W6gSceSThz18K9z78g6SeN90XitS8uI4xid5E0WgtpW2TOfO0f0Nka9G79nC7W+R6TOfV8+t9uYOpZfIn84V0w==" crossOrigin="anonymous" />

        {/* ULTRA-DEFENSIVE SELF-HEALING JQUERY INTERCEPTOR & DROPDOWN RESTORATION */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            // Helper function to apply polyfills, stubs, and transfer plugins to ANY jQuery instance
            function applyCompatibilityShield(newJq, oldJq) {
              if (!newJq || !newJq.fn) return;

              // A. TRANSFER PLUGINS: If an old jQuery exists, migrate its custom plugins (like smartmenus) to the new instance
              if (oldJq && oldJq.fn) {
                const pluginsToMigrate = ['smartmenus', 'SmartMenus', 'sticky', 'numerator'];
                pluginsToMigrate.forEach(pluginName => {
                  // Check prototype methods
                  if (oldJq.fn[pluginName] && !newJq.fn[pluginName]) {
                    newJq.fn[pluginName] = oldJq.fn[pluginName];
                  }
                  // Check global constructor class methods (specifically SmartMenus)
                  if (oldJq[pluginName] && !newJq[pluginName]) {
                    newJq[pluginName] = oldJq[pluginName];
                  }
                });
              }

              // B. Ensure the SmartMenus global constructor fallback is present
              if (!newJq.SmartMenus) {
                newJq.SmartMenus = function() {};
                newJq.SmartMenus.prototype = {
                  init: function() {},
                  destroy: function() {},
                  refresh: function() {},
                  themeMenu: function() {}
                };
                newJq.SmartMenus.defaults = {};
              }

              // C. Universal pseudo-selectors polyfill for focus-traps
              const focusablePolyfill = function(el) {
                try {
                  const nodeName = el.nodeName.toLowerCase();
                  const tabIndex = newJq.attr(el, 'tabindex');
                  const hasTabindex = !isNaN(tabIndex);
                  const isFocusableField = /^(input|select|textarea|button|object)$/.test(nodeName) && !el.disabled;
                  const isLink = nodeName === 'a' && (el.href || hasTabindex);
                  return (isFocusableField || isLink || hasTabindex) && newJq(el).is(':visible');
                } catch (e) {
                  return false;
                }
              };

              const tabbablePolyfill = function(el) {
                try {
                  const tabIndex = newJq.attr(el, 'tabindex');
                  const isTabIndexNaN = isNaN(tabIndex);
                  return (isTabIndexNaN || tabIndex >= 0) && newJq.expr.pseudos.focusable(el);
                } catch (e) {
                  return false;
                }
              };

              // Inject polyfills safely across Sizzle/jQuery selector paths
              const paths = [newJq.expr.pseudos, newJq.expr.filters, newJq.expr[':']];
              paths.forEach(path => {
                if (path) {
                  path.focusable = focusablePolyfill;
                  path.tabbable = tabbablePolyfill;
                }
              });

              // D. Defensive fallback stubs if they aren't migrated or loaded
              if (!newJq.fn.sticky) {
                newJq.fn.sticky = function() { return this; };
              }
              if (!newJq.fn.smartmenus) {
                newJq.fn.smartmenus = function() { return this; };
              }
              if (!newJq.fn.numerator) {
                newJq.fn.numerator = function(options) {
                  if (options && options.toValue !== undefined) {
                    this.text(options.toValue);
                  }
                  return this;
                };
              }

              // E. Delegate standard Event Dispatching for jQuery selections
              if (!newJq.fn.dispatchEvent) {
                newJq.fn.dispatchEvent = function(event) {
                  this.each(function() {
                    try {
                      if (this.dispatchEvent) this.dispatchEvent(event);
                    } catch (err) {}
                  });
                  return this;
                };
              }
            }

            // Intercept window.jQuery overwrites and trigger our self-healing transfer process
            let currentjQuery = window.jQuery;
            Object.defineProperty(window, 'jQuery', {
              get: function() {
                return currentjQuery;
              },
              set: function(newVal) {
                if (newVal !== currentjQuery) {
                  applyCompatibilityShield(newVal, currentjQuery);
                  currentjQuery = newVal;
                }
              },
              configurable: true
            });

            Object.defineProperty(window, '$', {
              get: function() {
                return currentjQuery;
              },
              set: function(newVal) {
                if (newVal !== currentjQuery) {
                  applyCompatibilityShield(newVal, currentjQuery);
                  currentjQuery = newVal;
                }
              },
              configurable: true
            });

            // Instantly initialize CDN instance
            if (window.jQuery) {
              applyCompatibilityShield(window.jQuery, null);
            }

            // F. Native EventTarget Dispatch Protection
            const originalDispatch = EventTarget.prototype.dispatchEvent;
            EventTarget.prototype.dispatchEvent = function(event) {
              try {
                return originalDispatch.call(this, event);
              } catch (err) {
                return true;
              }
            };

            // G. Global Window Event Proxy
            const nativeDispatch = window.dispatchEvent;
            window.dispatchEvent = function(event) {
              if (event && !event.target) {
                try {
                  Object.defineProperty(event, 'target', { value: window, writable: true });
                } catch(e){}
              }
              try {
                return nativeDispatch.call(window, event);
              } catch(e) {
                return true;
              }
            };
          })();

          // H. Global fallback to prevent 'stretchElement is null' errors
          window.elementorFrontend = window.elementorFrontend || {};
          window.addEventListener('DOMContentLoaded', () => {
            if (window.elementorFrontend && !window.elementorFrontend.stretchElement) {
              window.elementorFrontend.stretchElement = {
                stretch: function() {},
                deactivate: function() {}
              };
            }
          });
        `}} />
		
        <link rel="stylesheet" href="https://responserise.wpenginepowered.com/wp-content/plugins/woocommerce/assets/css/woocommerce-layout.css" />
        <link rel="stylesheet" href="https://responserise.wpenginepowered.com/wp-content/plugins/woocommerce/assets/css/woocommerce-smallscreen.css" media="only screen and (max-width: 768px)" />
        <link rel="stylesheet" href="https://responserise.wpenginepowered.com/wp-content/plugins/woocommerce/assets/css/woocommerce.css" />

		{stylesheets.map((localUrl, idx) => (
          <link key={`local-wp-css-${idx}`} rel="stylesheet" href={localUrl} />
        ))}
        {inlineStyles.map((styleContent, idx) => (
          <style key={`elementor-inline-css-${idx}`} dangerouslySetInnerHTML={{ __html: styleContent }} />
        ))}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />
	
	    {/* ULTRA-RELIABLE DROPDOWN CSS HOVER, GAP-BRIDGING, & WIDTH FIX */}
        <style dangerouslySetInnerHTML={{ __html: `
          /* 1. Force dropdown visibility on hover */
          .elementor-nav-menu--main .menu-item-has-children {
            position: relative !important;
          }
          .elementor-nav-menu--main .menu-item-has-children:hover > ul.sub-menu,
          .elementor-nav-menu--main .menu-item-has-children:focus-within > ul.sub-menu,
          .elementor-nav-menu--main ul.sub-menu:hover {
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            pointer-events: auto !important;
          }

          /* 2. Set submenu width and styling */
          .elementor-nav-menu--main ul.sub-menu {
            margin-top: 0 !important;
            pointer-events: auto !important;
            min-width: 280px !important;       /* Expands the container box */
            width: max-content !important;     /* Ensures longer text fits without breaking early */
            max-width: 350px !important;       /* Prevents excessively wide menus */
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08) !important; /* Soft premium shadow */
            border-radius: 8px !important;     /* Smooth corners */
            padding: 10px 0 !important;        /* Balanced internal spacing */
          }

          /* Ensure list items inside sub-menus don't clip */
          .elementor-nav-menu--main ul.sub-menu li {
            width: 100% !important;
          }

          /* Add proper spacing to the links inside sub-menus */
          .elementor-nav-menu--main ul.sub-menu li a {
            display: block !important;
            padding: 12px 20px !important;     /* Increases the physical mouse hover target area */
            width: 100% !important;
            box-sizing: border-box !important;
            white-space: normal !important;    /* Allows text wrapping if a title is extremely long */
          }

          /* 3. Create an invisible bridge to keep the hover active across gaps */
          .elementor-nav-menu--main ul.sub-menu::before {
            content: "" !important;
            position: absolute !important;
            top: -25px !important;
            left: 0 !important;
            width: 100% !important;
            height: 25px !important;
            background: transparent !important;
            display: block !important;
            pointer-events: auto !important;
            z-index: 99999 !important;
          }
        `}} />

        <link rel="stylesheet" href="https://responserise.wpenginepowered.com/wp-content/plugins/woocommerce/assets/css/photoswipe/photoswipe.css" />
        <link rel="stylesheet" href="https://responserise.wpenginepowered.com/wp-content/plugins/woocommerce/assets/css/photoswipe/default-skin/default-skin.css" />

        <script dangerouslySetInnerHTML={{ __html: `
          window.wc_single_product_params = {
            "i18n_required_rating_text": "Please select a rating",
            "review_rating_required": "yes",
            "i18n_rating_options": {
              "1": "Very poor",
              "2": "Not that bad",
              "3": "Average",
              "4": "Quite good",
              "5": "Very good"
            },
            "flexslider": {
              "rtl": false,
              "animation": "slide",
              "smoothHeight": true,
              "directionNav": true,
              "controlNav": "thumbnails",
              "slideshow": false,
              "animationSpeed": 500,
              "animationLoop": false,
              "allowOneSlide": false
            },
            "zoom_enabled": "1",
            "zoom_options": [],
            "photoswipe_enabled": "1",
            "photoswipe_options": {
              "shareEl": false,
              "closeOnScroll": false,
              "history": false,
              "hideAnimationDuration": 0,
              "showAnimationDuration": 0
            },
            "flexslider_enabled": "1"
          };
        `}} />
      </Head>

      <Script src="https://responserise.wpenginepowered.com/wp-content/plugins/woocommerce/assets/js/zoom/jquery.zoom.min.js" strategy="afterInteractive" />
      <Script src="https://responserise.wpenginepowered.com/wp-content/plugins/woocommerce/assets/js/flexslider/jquery.flexslider.min.js" strategy="afterInteractive" />
      <Script src="https://responserise.wpenginepowered.com/wp-content/plugins/woocommerce/assets/js/photoswipe/photoswipe.min.js" strategy="afterInteractive" />
      <Script src="https://responserise.wpenginepowered.com/wp-content/plugins/woocommerce/assets/js/photoswipe/photoswipe-ui-default.min.js" strategy="afterInteractive" />
      <Script src="https://responserise.wpenginepowered.com/wp-content/plugins/woocommerce/assets/js/frontend/single-product.min.js" strategy="afterInteractive" />
      <Script src="https://js.stripe.com/v3/" strategy="afterInteractive" onLoad={() => setIsStripeReady(true)} />

      {/* RENDER SWITCH BOARD */}
      {isMyAccountPage ? (
        <div className="woocommerce-account woocommerce page-template-default page container mx-auto px-4">
          {parsedHeader && <div className="elementor-rendered-html-header-wrapper" dangerouslySetInnerHTML={{ __html: parsedHeader }} />}
          
          <div className="min-h-screen bg-white py-12 px-6 font-sans max-w-6xl mx-auto mt-6">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-8 border-b pb-4">My Account</h1>
            {successMessage && <div className="p-4 mb-6 bg-green-50 text-green-700 text-sm font-semibold rounded border border-green-200">{successMessage}</div>}
            
            {isLoggedIn ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-1 flex flex-col items-center md:items-start space-y-6 border-r pr-6">
                  <div className="flex flex-col items-center space-y-2 w-full pb-4 border-b">
                    <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 border shadow-inner text-3xl font-bold">
                      {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="font-bold text-gray-800 text-lg">{user?.displayName || 'User'}</span>
                  </div>
                  <nav className="w-full flex flex-col space-y-1">
                    {[{ id: 'dashboard', label: 'Dashboard' }, { id: 'orders', label: 'Orders' }, { id: 'downloads', label: 'Downloads' }, { id: 'addresses', label: 'Addresses' }, { id: 'details', label: 'Account details' }].map((tab) => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`text-left w-full py-2.5 px-3 rounded-md font-medium text-sm transition-colors ${activeTab === tab.id ? 'bg-orange-600 text-white font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-orange-600'}`}>
                        {tab.label}
                      </button>
                    ))}
                    <button onClick={handleLogout} className="text-left w-full py-2.5 px-3 rounded-md font-medium text-sm text-red-600 hover:bg-red-50 transition-colors">Log out</button>
                  </nav>
                </div>

                <div className="md:col-span-3 min-h-[400px]">
                  {isLoadingStoreData ? (
                    <div className="flex items-center justify-center h-48 text-gray-400 animate-pulse text-sm">Retrieving profile...</div>
                  ) : (
                    <>
                      {activeTab === 'dashboard' && (
                        <div className="space-y-4 text-gray-700 leading-relaxed text-base">
                          <p>Hello <strong className="text-gray-900">{user?.displayName}</strong> (not <span className="text-orange-600">{user?.displayName}?</span> <button onClick={handleLogout} className="text-red-600 underline hover:text-red-700">Log out</button>)</p>
                          <p>From your account dashboard you can view your <button onClick={() => setActiveTab('orders')} className="text-orange-600 underline font-medium">recent orders</button>, manage your <button onClick={() => setActiveTab('addresses')} className="text-orange-600 underline font-medium">shipping and billing addresses</button>, and <button onClick={() => setActiveTab('details')} className="text-orange-600 underline font-medium">edit your password and account details</button>.</p>
                        </div>
                      )}
                      
                      {activeTab === 'orders' && (
                        <div className="space-y-4">
                          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Order History</h2>
                          {orders.length === 0 ? (
                            <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500"><i className="fas fa-shopping-basket text-4xl mb-3 text-gray-300 block"></i>You have not placed any orders with us yet.</div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th></tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                  {orders.map((order) => (
                                    <tr key={order.id}>
                                      <td className="px-6 py-4 font-semibold text-orange-600">#{order.id}</td>
                                      <td className="px-6 py-4 text-gray-500">{new Date(order.date_created).toLocaleDateString()}</td>
                                      <td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">{order.status}</span></td>
                                      <td className="px-6 py-4 font-semibold">${order.total}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'downloads' && (
                        <div className="space-y-4">
                          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Downloads</h2>
                          {downloads.length === 0 ? (
                            <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500"><i className="fas fa-download text-4xl mb-3 text-gray-300 block"></i>No downloadable training manuals assigned to this profile.</div>
                          ) : (
                            <div className="space-y-2">
                              {downloads.map((dl, idx) => (
                                <div key={idx} className="flex justify-between items-center p-4 border rounded-md shadow-sm bg-gray-50">
                                  <div>
                                    <p className="font-bold text-gray-800">{dl.product_name}</p>
                                    <p className="text-xs text-gray-400">Downloads remaining: {dl.downloads_remaining || 'Unlimited'}</p>
                                  </div>
                                  <a href={dl.download_url} className="py-2 px-4 bg-orange-600 text-white rounded text-xs font-semibold hover:bg-orange-700 transition">Download File</a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'addresses' && (
                        <div className="space-y-6">
                          <h2 className="text-2xl font-bold text-gray-800 mb-2">Addresses</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="border p-6 rounded-md shadow-sm bg-gray-50">
                              <h3 className="font-bold text-gray-800 border-b pb-2 mb-3">Billing Address</h3>
                              {customerData?.billing && (customerData.billing.address_1 || customerData.billing.city) ? (
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p>{customerData.billing.first_name} {customerData.billing.last_name}</p>
                                  <p>{customerData.billing.address_1}</p>
                                  <p>{customerData.billing.city}, {customerData.billing.state} {customerData.billing.postcode}</p>
                                </div>
                              ) : ( <p className="text-sm text-gray-400 italic">No billing address configured yet.</p> )}
                            </div>
                            <div className="border p-6 rounded-md shadow-sm bg-gray-50">
                              <h3 className="font-bold text-gray-800 border-b pb-2 mb-3">Shipping Address</h3>
                              {customerData?.shipping && (customerData.shipping.address_1 || customerData.shipping.city) ? (
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p>{customerData.shipping.first_name} {customerData.shipping.last_name}</p>
                                  <p>{customerData.shipping.address_1}</p>
                                  <p>{customerData.shipping.city}, {customerData.shipping.state} {customerData.shipping.postcode}</p>
                                </div>
                              ) : ( <p className="text-sm text-gray-400 italic">No shipping address configured yet.</p> )}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'details' && (
                        <div className="bg-white p-6 rounded-md border border-gray-100 shadow-sm">
                          <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-6">Account Details</h2>
                          {updateSuccess && <div className="p-3 mb-4 bg-green-50 text-green-700 text-sm font-semibold rounded border border-green-200">{updateSuccess}</div>}
                          {updateError && <div className="p-3 mb-4 bg-red-50 text-red-600 text-sm font-semibold rounded border border-red-200">{updateError}</div>}
                          
                          <form onSubmit={handleUpdateDetails} className="space-y-6 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">First name *</label>
                                <input type="text" required value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm" />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Last name *</label>
                                <input type="text" required value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm" />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Display name *</label>
                              <input type="text" disabled value={user?.displayName || ''} className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed sm:text-sm font-semibold" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Email address *</label>
                              <input type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm" />
                            </div>

                            <fieldset className="border-t pt-6 mt-8 space-y-6">
                              <legend className="text-lg font-bold text-gray-800 px-1">Password change</legend>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
                                <div className="relative rounded-md shadow-sm">
                                  <input type={showCurrentPass ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 sm:text-sm" />
                                  <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"><i className={`fas ${showCurrentPass ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                                <div className="relative rounded-md shadow-sm">
                                  <input type={showNewPass ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 sm:text-sm" />
                                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"><i className={`fas ${showNewPass ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
                                <div className="relative rounded-md shadow-sm">
                                  <input type={showConfirmPass ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 sm:text-sm" />
                                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"><i className={`fas ${showConfirmPass ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
                                </div>
                              </div>
                            </fieldset>

                            <div className="pt-4 border-t">
                              <button type="submit" disabled={isUpdatingDetails} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 transition">{isUpdatingDetails ? 'Saving changes...' : 'Save changes'}</button>
                            </div>
                          </form>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white py-8 px-6 shadow sm:rounded-lg border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Login</h2>
                  {loginError && <div className="p-3 mb-4 bg-red-50 text-red-600 text-xs font-semibold rounded border border-red-200">{loginError}</div>}
                  <form className="space-y-6" onSubmit={handleLoginSubmit}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Username or email address *</label>
                      <input type="text" required value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password *</label>
                      <input type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm" />
                    </div>
                    <button type="submit" disabled={isLoggingIn} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 font-semibold transition">{isLoggingIn ? 'Verifying...' : 'Log in'}</button>
                  </form>
                </div>
                <div className="bg-white py-8 px-6 shadow sm:rounded-lg border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Register</h2>
                  {registerError && <div className="p-3 mb-4 bg-red-50 text-red-600 text-xs font-semibold rounded border border-red-200">{registerError}</div>}
                  <form className="space-y-6" onSubmit={handleRegisterSubmit}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Username *</label>
                      <input type="text" required value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email address *</label>
                      <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password *</label>
                      <input type="password" required value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm" />
                    </div>
                    <button type="submit" disabled={isRegistering} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 font-semibold transition">{isRegistering ? 'Creating account...' : 'Register'}</button>
                  </form>
                </div>
              </div>
            )}
          </div>
          {parsedFooter && <div className="elementor-rendered-html-footer-wrapper mt-12" dangerouslySetInnerHTML={{ __html: parsedFooter }} />}
        </div>
      ) : isCartPage ? (
        <CartPageView
          parsedHeader={parsedHeader}
          parsedFooter={parsedFooter}
          cartItems={cartItems}
          cartSubtotal={cartSubtotal}
          handleUpdateQty={handleUpdateQty}
          handleRemoveItem={handleRemoveItem}
          router={router}
        />
      ) : isCheckoutPage ? (
		<CheckoutPageView
          parsedHeader={parsedHeader}
          parsedFooter={parsedFooter}
          orderSuccess={orderSuccess}
          cartItems={cartItems}
          orderError={orderError}
          
          // --- Explicitly passing all Billing State hooks ---
          checkoutFirstName={checkoutFirstName} setCheckoutFirstName={setCheckoutFirstName}
          checkoutLastName={checkoutLastName} setCheckoutLastName={setCheckoutLastName}
          checkoutAddress={checkoutAddress} setCheckoutAddress={setCheckoutAddress}
          checkoutCity={checkoutCity} setCheckoutCity={setCheckoutCity}
          checkoutPostcode={checkoutPostcode} setCheckoutPostcode={setCheckoutPostcode}
          checkoutEmail={checkoutEmail} setCheckoutEmail={setCheckoutEmail}
          checkoutPhone={checkoutPhone} setCheckoutPhone={setCheckoutPhone}
		  
		  // 👇 ADD THE LIFTED BILLING COUNTRY/STATE PROPS 👇
          billingCountry={billingCountry} setBillingCountry={setBillingCountry}
          billingState={billingState} setBillingState={setBillingState}

          // --- Explicitly passing Shipping Toggle State hooks ---
          shipToDifferentAddress={shipToDifferentAddress} setShipToDifferentAddress={setShipToDifferentAddress}

          // --- Explicitly passing all Shipping State hooks ---
          shippingFirstName={shippingFirstName} setShippingFirstName={setShippingFirstName}
          shippingLastName={shippingLastName} setShippingLastName={setShippingLastName}
          shippingAddress={shippingAddress} setShippingAddress={setShippingAddress}
          shippingCity={shippingCity} setShippingCity={setShippingCity}
          shippingPostcode={shippingPostcode} setShippingPostcode={setShippingPostcode}

			// 👇 ADD THE LIFTED SHIPPING COUNTRY/STATE PROPS 👇
          shippingCountry={shippingCountry} setShippingCountry={setShippingCountry}
          shippingState={shippingState} setShippingState={setShippingState}

			useSameAddress={useSameAddress}
          setUseSameAddress={setUseSameAddress}

          // --- Explicitly passing Coupon state hooks ---
          couponCode={couponCode} setCouponCode={setCouponCode}
          couponError={couponError}
          appliedCoupon={appliedCoupon}
          isValidatingCoupon={isValidatingCoupon}
          handleApplyCoupon={handleApplyCoupon}
          handleRemoveCoupon={handleRemoveCoupon}

          // --- Pricing totals ---
          cartSubtotal={cartSubtotal}
          discountAmount={discountAmount}
          shippingMethods={shippingMethods}
          selectedShippingMethod={selectedShippingMethod} setSelectedShippingMethod={setSelectedShippingMethod}
          taxTotal={taxTotal}
          orderTotalAmount={orderTotalAmount}

          // --- Gateway & Process options ---
          isLoadingGateways={isLoadingGateways}
          paymentGateways={paymentGateways}
          selectedPaymentGateway={selectedPaymentGateway} setSelectedPaymentGateway={setSelectedPaymentGateway}
          stripeError={stripeError}
          isProcessingOrder={isProcessingOrder}
          handleCheckoutSubmit={handleCheckoutSubmit}

          // --- Stripe bridge & Router ---
          setStripeCardElement={setStripeCardElement}
			stripeInstance={stripeInstance}        // 👈 PASS THIS
          setStripeInstance={setStripeInstance}  // 👈 PASS THIS		  
          router={router}
        />
		
      ) : isProductPage ? (
        <ProductPageView
          cleanProductHtml={cleanProductHtml}
          domReady={domReady}
          productData={productData}
        />
      ) : (
        <div className="elementor-rendered-html-wrapper localized-static-viewport" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </Layout>
  );
}

export async function getStaticProps({ params }) {
  const slugArray = params?.slug || [];
  const slug = slugArray.join('/');
  try {
    const pageData = await getPageAssetsAndHtml(slug);
    if (!pageData) return { notFound: true };
    return { props: { pageData }, revalidate: 10 };
  } catch (err) {
    return { notFound: true };
  }
}

export async function getStaticPaths() {
  const pages = await getAllPagesWithSlugs();
  const paths = pages.map(page => {
    if (page.uri === '/' || page.uri === '') return { params: { slug: [] } };
    return { params: { slug: page.uri.split('/').filter(Boolean) } };
  });
  return { paths, fallback: 'blocking' };
}