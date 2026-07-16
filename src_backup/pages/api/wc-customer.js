import https from 'https';

export default async function handler(req, res) {
  const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://responserise.wpenginepowered.com';
  const ck = process.env.WC_CONSUMER_KEY;
  const cs = process.env.WC_CONSUMER_SECRET;

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "Active User ID is required." });
  }

  if (!ck || !cs) {
    return res.status(500).json({ error: "WooCommerce API credentials are missing." });
  }

  try {
    const isLocalDev = wpUrl.includes('localhost') || wpUrl.includes('127.0.0.1') || wpUrl.includes('.local');
    
    // Ignore self-signed SSL policies on localhost/dev
    const agent = new https.Agent({
      rejectUnauthorized: !isLocalDev
    });

    const authString = Buffer.from(`${ck}:${cs}`).toString('base64');

    // Fetch the customer details directly from the WooCommerce REST API
    const response = await fetch(`${wpUrl}/wp-json/wc/v3/customers/${userId}`, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      },
      agent
    });

    if (!response.ok) {
      throw new Error(`WordPress responded with status code: ${response.status}`);
    }

    const customerData = await response.json();
    return res.status(200).json(customerData);

  } catch (error) {
    console.error("❌ Failed to fetch customer details:", error.message);
    return res.status(500).json({ error: "Failed to retrieve saved address information." });
  }
}