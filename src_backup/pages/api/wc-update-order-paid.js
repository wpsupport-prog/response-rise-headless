import https from 'https';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://responserise.wpenginepowered.com';
  const ck = process.env.WC_CONSUMER_KEY;
  const cs = process.env.WC_CONSUMER_SECRET;

  const { orderId, transactionId, status } = req.body;

  if (!orderId || !transactionId) {
    return res.status(400).json({ message: "Order ID and Transaction ID are required." });
  }

  try {
    const isLocalDev = wpUrl.includes('localhost') || wpUrl.includes('127.0.0.1') || wpUrl.includes('.local');
    const agent = new https.Agent({ rejectUnauthorized: !isLocalDev });
    const authString = Buffer.from(`${ck}:${cs}`).toString('base64');
    const authHeader = {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json'
    };

    // 1. Update order status to Processing and assign transaction_id
    const response = await fetch(`${wpUrl}/wp-json/wc/v3/orders/${orderId}`, {
      method: 'PUT',
      headers: authHeader,
      body: JSON.stringify({
        status: status || 'processing',
        transaction_id: transactionId,
        set_paid: true
      }),
      agent
    });

    const updatedOrder = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ message: updatedOrder.message || "Failed to update order status." });
    }

    // 2. NEW: Programmatically write the Stripe transaction log to the Order Notes sidebar
    try {
      const noteText = `Stripe charge complete. (Transaction ID: ${transactionId})`;
      
      await fetch(`${wpUrl}/wp-json/wc/v3/orders/${orderId}/notes`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          note: noteText,
          customer_note: false // Keeps this note as a private system log in the sidebar
        }),
        agent
      });
      console.log("📝 Stripe transaction logged to WooCommerce Order Notes sidebar successfully!");
    } catch (noteErr) {
      console.warn("⚠️ Order status updated, but adding the sidebar note failed:", noteErr.message);
    }

    return res.status(200).json(updatedOrder);

  } catch (error) {
    console.error("❌ Failed to update WooCommerce order payload:", error);
    return res.status(500).json({ message: "Internal server error occurred while updating order status." });
  }
}