export default async function handler(req, res) {
  const wpDomain = process.env.NEXT_PUBLIC_WORDPRESS_URL;
  const consumerKey = process.env.WC_CONSUMER_KEY;
  const consumerSecret = process.env.WC_CONSUMER_SECRET;
  
  const authHeader = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  // --- GET REQUEST (FETCH DATA) ---
  if (req.method === 'GET') {
    const { userId, type } = req.query;
    if (!userId) {
      return res.status(400).json({ message: 'Missing required parameter: userId' });
    }

    try {
      let endpointUrl = '';
      if (type === 'orders') {
        endpointUrl = `${wpDomain}/wp-json/wc/v3/orders?customer=${userId}`;
      } else if (type === 'downloads') {
        endpointUrl = `${wpDomain}/wp-json/wc/v3/customers/${userId}/downloads`;
      } else {
        endpointUrl = `${wpDomain}/wp-json/wc/v3/customers/${userId}`;
      }

      const wcRes = await fetch(endpointUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      const data = await wcRes.json();
      if (!wcRes.ok) return res.status(wcRes.status).json({ message: data.message });
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ message: 'Error retrieving profile data' });
    }
  }

  // --- PUT REQUEST (UPDATE DATA) ---
  if (req.method === 'PUT') {
    const { userId, updateType } = req.query;
    if (!userId) {
      return res.status(400).json({ message: 'Missing required parameter: userId' });
    }

    try {
      const payload = req.body;

      // ROUTE TO PASSWORD ENDPOINT IF SPECIFIED
      if (updateType === 'password') {
        const passRes = await fetch(`${wpDomain}/wp-json/custom-auth/v1/update-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            current_password: payload.current_password,
            new_password: payload.new_password,
          }),
        });

        const passData = await passRes.json();
        if (!passRes.ok) return res.status(passRes.status).json({ message: passData.message });
        return res.status(200).json(passData);
      }

      // OTHERWISE: DEFAULT TO WOOCOMMERCE CUSTOMER UPDATE (NAME/EMAIL)
      const wcRes = await fetch(`${wpDomain}/wp-json/wc/v3/customers/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await wcRes.json();
      if (!wcRes.ok) return res.status(wcRes.status).json({ message: data.message });
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ message: 'Error writing profile data' });
    }
  }

  // Handle unsupported HTTP verbs
  return res.status(405).json({ message: 'Method not allowed' });
}