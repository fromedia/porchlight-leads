// Serverless function to handle form submissions and send to Global Control CRM

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      businessName,
      websiteUrl,
      businessType,
      helpNeeded,
      serviceInterest,
      bestContactMethod,
      message,
      sourcePage,
      leadSource
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Global Control API endpoint
    const GC_API_URL = 'https://api.globalcontrol.io/api/ai/contacts';
    const GC_API_KEY = process.env.GLOBALCONTROL_API_KEY;

    if (!GC_API_KEY) {
      console.error('Global Control API key not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Prepare contact data for Global Control
    const contactData = {
      firstName,
      lastName,
      email,
      phone: phone || '',
      customFields: {
        business_name: businessName || '',
        website_url: websiteUrl || '',
        business_type: businessType || '',
        help_needed: helpNeeded || message || '',
        service_interest: serviceInterest || '',
        best_contact_method: bestContactMethod || '',
        source_page: sourcePage || req.headers.referer || '',
        lead_source: leadSource || 'Porch Light Leads Website'
      }
    };

    // Create contact in Global Control
    const response = await fetch(GC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': GC_API_KEY
      },
      body: JSON.stringify(contactData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Global Control API error:', errorData);
      return res.status(500).json({ error: 'Failed to create contact' });
    }

    const data = await response.json();
    const contactId = data.data?._id;

    // Apply tags to the contact
    const tags = ['Porch Light Leads', 'Website Lead', 'Lead Capture Review'];
    
    for (const tagName of tags) {
      try {
        await fetch(`${GC_API_URL}/${contactId}/tags`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': GC_API_KEY
          },
          body: JSON.stringify({ tags: [tagName] })
        });
      } catch (tagError) {
        console.error(`Failed to apply tag ${tagName}:`, tagError);
        // Continue even if tag application fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Lead submitted successfully',
      contactId: contactId
    });

  } catch (error) {
    console.error('Form submission error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
