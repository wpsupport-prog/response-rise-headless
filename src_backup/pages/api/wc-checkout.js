// pages/api/wc-checkout.js
import Stripe from 'stripe';

// Initialize Stripe with your Secret Key (keep this private on the backend!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51...your_secret_key_here');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const wpDomain = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://responserise.wpenginepowered.com';
  const ck = process.env.WC_CONSUMER_KEY;
  const cs = process.env.WC_CONSUMER_SECRET;

  const { 
    payment_method, 
    stripe_token, 
    order_total_amount, 
    billing, 
    shipping, 
    line_items, 
    shipping_lines, 
    coupon_lines,
    customer_id
  } = req.body;

  let chargeId = '';
  let paymentIntentId = '';

  // === STEP 1: IF STRIPE IS SELECTED, PROCESS THE PAYMENT FIRST ===
  if (payment_method === 'stripe') {
    try {
      // Calculate amount in cents (Stripe requires integers, e.g., $15.00 = 1500)
      const chargeAmountCents = Math.round(parseFloat(order_total_amount) * 100);

      const charge = await stripe.charges.create({
        amount: chargeAmountCents,
        currency: 'usd',
        source: stripe_token, // The tok_... generated on the frontend
        description: `Headless Order Checkout - ${billing.email}`,
        receipt_email: billing.email,
      });

      // Capture the official Transaction IDs from Stripe's success response
      chargeId = charge.id; // ch_xxxxxxxx
      paymentIntentId = charge.payment_intent || ''; // pi_xxxxxxxx
    } catch (paymentError) {
      console.error('Stripe Payment Failed:', paymentError);
      return res.status(400).json({ 
        message: `Payment Authorization Failed: ${paymentError.message}` 
      });
    }
  }

  // === STEP 2: CREATE THE WOOCOMMERCE ORDER PAYLOAD ===
  const orderData = {
    customer_id: customer_id || 0,
    payment_method: payment_method,
    payment_method_title: payment_method === 'stripe' ? 'Credit / Debit Card' : 'Cash on Delivery',
    status: payment_method === 'stripe' ? 'processing' : 'pending',
    transaction_id: chargeId, // Store the Stripe Charge ID natively
    billing,
    shipping,
    line_items,
    shipping_lines,
    coupon_lines,
    meta_data: payment_method === 'stripe' ? [
      { key: '_stripe_charge_captured', value: 'yes' },
      { key: '_stripe_source_id', value: stripe_token },
      { key: '_stripe_intent_id', value: paymentIntentId },
      { key: 'stripe_token', value: stripe_token }
    ] : []
  };

	// === STEP 3: SUBMIT COMPLETED ORDER TO WOOCOMMERCE ===
  try {
    // 1. Submit order to WooCommerce (Only one 'const wcRes' declaration!)
    const wcRes = await fetch(`${wpDomain}/wp-json/wc/v3/orders?consumer_key=${ck}&consumer_secret=${cs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    const wcOrder = await wcRes.json();

    if (!wcRes.ok) {
      throw new Error(wcOrder.message || 'WooCommerce REST API order creation rejected.');
    }

    // 2. Generate Stripe Transaction Note in Sidebar
    if (payment_method === 'stripe' && chargeId) {
      try {
        const notePayload = {
          note: `Stripe charge complete (Charge ID: ${chargeId}). Status is processing.`,
          customer_note: false // Admin-only private note
        };

        // Call WooCommerce Order Notes API
        await fetch(`${wpDomain}/wp-json/wc/v3/orders/${wcOrder.id}/notes?consumer_key=${ck}&consumer_secret=${cs}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notePayload),
        });
      } catch (noteError) {
        console.warn('Order was completed, but Next.js failed to write the sidebar transaction note:', noteError);
      }
    }

    return res.status(200).json(wcOrder);
  } catch (apiError) {
    console.error('WooCommerce Order Sync Error:', apiError);
    return res.status(500).json({ 
      message: 'Payment was authorized, but we encountered an issue syncing your order details.' 
    });
  }
}