// pages/api/wc-gateways.js
export default async function handler(req, res) {
  const wpDomain = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://responserise.wpenginepowered.com';
  // Use your WooCommerce REST API Read credentials
  const ck = process.env.WC_CONSUMER_KEY; 
  const cs = process.env.WC_CONSUMER_SECRET;

  try {
    const url = `${wpDomain}/wp-json/wc/v3/payment_gateways?consumer_key=${ck}&consumer_secret=${cs}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`WooCommerce API responded with status ${response.status}`);
    }

    const gateways = await response.json();
    
    // Filter only those payment methods that are active/enabled in WooCommerce settings
    const activeGateways = gateways
      .filter(gateway => gateway.enabled === true)
      .map(gateway => ({
        id: gateway.id,
        title: gateway.title,
        description: gateway.description || gateway.method_description || '',
      }));

    return res.status(200).json(activeGateways);
  } catch (error) {
    console.error('Failed to fetch dynamic WooCommerce gateways:', error);
    // Fallback to offline defaults if connection breaks
    return res.status(200).json([
      { id: 'cod', title: 'Cash on Delivery', description: 'Pay with cash upon delivery.' }
    ]);
  }
}