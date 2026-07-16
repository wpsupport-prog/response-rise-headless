import React, { useEffect, useState } from 'react';
import Head from 'next/head';

export default function ProductPageView({
  cleanProductHtml,
  domReady,
  productData
}) {
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (!domReady || !productData) return;

    // 1. Locate the native WooCommerce form injected in the WordPress HTML
    const nativeForm = document.querySelector('.elementor-rendered-html-wrapper form.cart');
    if (!nativeForm) return;

    const handleSubmit = (e) => {
      e.preventDefault();
      if (addingToCart) return;

      setAddingToCart(true);

      // 2. Read selected quantity directly from the native DOM input
      const nativeQtyInput = nativeForm.querySelector('input.qty');
      const selectedQty = nativeQtyInput ? parseInt(nativeQtyInput.value, 10) : 1;

      // 3. Process Cart calculations locally
      setTimeout(() => {
        const cart = JSON.parse(localStorage.getItem('headless_cart') || '[]');
        const existingItem = cart.find(item => item.id === productData.id);

        if (existingItem) {
          existingItem.qty += selectedQty;
        } else {
          cart.push({
            id: productData.id,
            name: productData.name,
            price: productData.price,
            qty: selectedQty,
            image: productData.images?.[0]?.src || ''
          });
        }

        // Save updated cart state
        localStorage.setItem('headless_cart', JSON.stringify(cart));

        // 4. Fire storage event to instantly update Next.js parent and headers
        window.dispatchEvent(new Event('storage'));

        // 5. Inject notice directly above the product title
        const alertMessage = `Successfully added ${selectedQty} × "${productData.name}" to your cart!`;
        
        // Target the main product title
        const productTitle = document.querySelector('h1.product_title') || document.querySelector('.summary.entry-summary');
        
        if (productTitle) {
          // Remove existing notice if any to prevent duplicates
          const oldNotice = document.getElementById('headless-wc-notice');
          if (oldNotice) oldNotice.remove();

          const noticeHtml = `
            <div id="headless-wc-notice" class="woocommerce-message" role="alert" style="margin-bottom: 20px; width: 100%; display: block; clear: both;">
              <a href="/cart" class="button wc-forward" style="float: right; margin-left: 15px;">View cart</a> 
              <span>${alertMessage}</span>
            </div>
          `;
          
          // Insert right above "Simple Product 1"
          productTitle.insertAdjacentHTML('beforebegin', noticeHtml);
          
          // Scroll smoothly to the notice itself
          const newlyInsertedNotice = document.getElementById('headless-wc-notice');
          if (newlyInsertedNotice) {
            newlyInsertedNotice.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }

        setAddingToCart(false);
      }, 200);
    };

    // Intercept native form submit
    nativeForm.addEventListener('submit', handleSubmit);

    return () => {
      nativeForm.removeEventListener('submit', handleSubmit);
    };
  }, [domReady, productData, addingToCart]);

  return (
    <div className="woocommerce-product-page-wrapper woocommerce single-product woocommerce-page">
      <Head>
        <style dangerouslySetInnerHTML={{ __html: `
          /* 1. PRODUCT TITLE STYLING MATCH */
          .woocommerce div.product h1.product_title,
          .elementor-rendered-html-wrapper h1.product_title,
          h1.product_title {
            font-size: 36px !important;
            font-weight: 700 !important;
            color: #2c3e50 !important;
            font-family: 'Manrope', sans-serif !important;
            margin-bottom: 8px !important;
            line-height: 1.2 !important;
          }

          /* 2. PRODUCT PRICE STYLING MATCH */
          .woocommerce div.product p.price,
          .woocommerce div.product span.price,
          .elementor-rendered-html-wrapper .price,
          p.price,
          .price .amount {
            font-size: 24px !important;
            font-weight: 600 !important;
            color: #77a464 !important; /* Matches olive green */
            font-family: 'Inter', sans-serif !important;
            margin-bottom: 20px !important;
          }

          /* 3. CONVERT VIOLET NATIVE BUTTON TO BRAND ORANGE */
          .woocommerce div.product form.cart .button.single_add_to_cart_button,
          .elementor-rendered-html-wrapper .single_add_to_cart_button,
          button.single_add_to_cart_button.button.alt,
          .single_add_to_cart_button {
            background-color: #ff6f00 !important; /* Set to Brand Orange */
            color: #ffffff !important;
            font-family: 'Inter', sans-serif !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            border-radius: 4px !important;
            border: none !important;
            padding: 10px 32px !important;
            height: 40px !important;
            font-size: 14px !important;
            letter-spacing: 0.5px !important;
            transition: background-color 0.15s ease, transform 0.1s ease !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          /* Hover State Override */
          .woocommerce div.product form.cart .button.single_add_to_cart_button:hover,
          .elementor-rendered-html-wrapper .single_add_to_cart_button:hover,
          .single_add_to_cart_button:hover {
            background-color: #e65c00 !important; /* Slightly darker orange on hover */
            color: #ffffff !important;
          }

          /* Active/Click State */
          .single_add_to_cart_button:active {
            transform: scale(0.98) !important;
          }
        `}} />
      </Head>

      {/* Renders native layout directly */}
      <div 
        className="elementor-rendered-html-wrapper" 
        dangerouslySetInnerHTML={{ __html: cleanProductHtml }} 
      />
    </div>
  );
}