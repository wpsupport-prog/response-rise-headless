import Stripe from 'stripe';

// Initialize the Stripe Node SDK using your secure secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Ensures use of stable API payload parsing
});

export default async function handler(req, res) {
  // 1. Explicitly allow and process incoming POST payloads
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { amount, orderId } = req.body;

  // Validate that we received an order amount to process
  if (!amount) {
    return res.status(400).json({ message: "Order amount is required to generate payment details." });
  }

  try {
    // 2. Convert standard decimal price ($5.00) to smallest currency unit (cents/cents -> 500)
    // Stripe strictly requires integers representing the smallest unit (e.g. cents for NZD/USD)
    const orderTotalInCents = Math.round(parseFloat(amount) * 100);

    // 3. Request a Payment Intent from Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: orderTotalInCents,
      currency: 'nzd', // Matching your New Zealand checkout settings
      payment_method_types: ['card'],
      metadata: {
        order_id: String(orderId || ''), // Link this charge to your WooCommerce order ID
      },
    });

    // 4. Return the client_secret back to the browser
    return res.status(200).json({ 
      clientSecret: paymentIntent.client_secret 
    });

  } catch (error) {
    console.error("❌ Failed to register Stripe payment intent session:", error.message);
    return res.status(500).json({ message: error.message || "Failed to initialize Stripe transaction." });
  }
}