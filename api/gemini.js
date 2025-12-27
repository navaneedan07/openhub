export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text, mode } = req.body || {};

    if (!text) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not set in Vercel env');
      return res.status(500).json({ error: 'API key not configured on server' });
    }

    // Build prompt based on mode
    let prompt = '';
    if (mode === 'summary') {
      prompt = `Summarize this idea in 2-3 sentences clearly and concisely:\n\n"${text}"`;
    } else if (mode === 'suggestions') {
      prompt = `For this college project/idea, provide 3 brief improvement suggestions:\n\n"${text}"\n\nFormat: Brief bullet points only.`;
    } else if (mode === 'outline') {
      prompt = `Create a concise outline with 5-7 bullets for the following idea. Use short phrases, no long paragraphs.\n\n"${text}"`;
    } else if (mode === 'moderate') {
      prompt = `Is this text appropriate for a college platform? Check for: offensive language, spam, harassment. Reply with YES or NO only:\n\n"${text}"`;
    } else {
      return res.status(400).json({ error: 'Invalid mode' });
    }

    // Call Google Gemini API
    const maxRetries = 2;
    let attempt = 0;
    let response;
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 500,
      },
    };

    while (attempt <= maxRetries) {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) break;
      // Retry on 429/500/503
      if ([429, 500, 503].includes(response.status) && attempt < maxRetries) {
        const backoff = 300 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, backoff));
        attempt++;
        continue;
      }
      break;
    }

    if (!response.ok) {
      let errorMessage = `Gemini API error: ${response.status}`;
      let errorDetails = '';
      try {
        const errJson = await response.json();
        errorDetails = JSON.stringify(errJson, null, 2);
        if (errJson?.error?.message) errorMessage = errJson.error.message;
      } catch (e) {
        const errorData = await response.text();
        errorDetails = errorData;
        errorMessage = `${errorMessage} ${errorData || ''}`.trim();
      }
      console.error('Gemini API error:', response.status, errorMessage, errorDetails);
      return res.status(response.status).json({ error: errorMessage, details: errorDetails });
    }

    const data = await response.json();
    const result =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .join('\n') || 'No response from AI';

    const respBody = { result, mode, model: 'gemini-2.5-flash' };
    // For moderation, also include a boolean
    if (mode === 'moderate') {
      respBody.approved = /yes/i.test(result);
    }
    return res.status(200).json(respBody);
  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({ error: error.message });
  }
}
