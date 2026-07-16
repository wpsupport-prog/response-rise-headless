import https from 'https';

export default async function handler(req, res) {
  // 1. Explicitly allow and handle POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://responserise.wpenginepowered.com';
  const ck = process.env.WC_CONSUMER_KEY;
  const cs = process.env.WC_CONSUMER_SECRET;

  if (!ck || !cs) {
    return res.status(500).json({ message: "WooCommerce API credentials are missing from environment variables." });
  }

  try {
    const isLocalDev = wpUrl.includes('localhost') || wpUrl.includes('127.0.0.1') || wpUrl.includes('.local');
    const agent = new https.Agent({
      rejectUnauthorized: !isLocalDev
    });

    const authString = Buffer.from(`${ck}:${cs}`).toString('base64');

    // Ensure req.body is forwarded directly to WooCommerce
    const response = await fetch(`${wpUrl}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body), // 👈 Forward the formatted body containing billing, shipping, and customer_id
      agent
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ message: data.message || "WooCommerce API order creation failed." });
    }

    // 3. Return the successfully created WooCommerce order object back to Next.js
    return res.status(200).json(data);

  } catch (error) {
    console.error("❌ Error inside wc-create-order endpoint handler:", error);
    return res.status(500).json({ message: "Internal server error occurred while creating order." });
  }
}