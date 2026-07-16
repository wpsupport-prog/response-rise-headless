export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { slug, id } = req.query;
  const wpDomain = process.env.NEXT_PUBLIC_WORDPRESS_URL;
  const consumerKey = process.env.WC_CONSUMER_KEY;
  const consumerSecret = process.env.WC_CONSUMER_SECRET;
  const authHeader = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  try {
    let endpointUrl = '';
    
    if (id) {
      endpointUrl = `${wpDomain}/wp-json/wc/v3/products/${id}`;
    } else if (slug) {
      endpointUrl = `${wpDomain}/wp-json/wc/v3/products?slug=${slug}`;
    } else {
      return res.status(400).json({ message: 'Missing product identifier (id or slug)' });
    }

    const wcRes = await fetch(endpointUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await wcRes.json();
    if (!wcRes.ok) return res.status(wcRes.status).json({ message: 'WooCommerce API error' });

    // If fetched by slug, it returns an array, so extract the first item
    const product = slug ? data[0] : data;
    return res.status(200).json(product);
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}