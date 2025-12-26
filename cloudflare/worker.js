export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: corsHeaders() });
      }

      const { prompt, mode } = await request.json();
      if (!prompt || typeof prompt !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid prompt' }), { status: 400, headers: corsHeaders() });
      }

      let systemPrompt = '';
      switch (mode) {
        case 'summary':
          systemPrompt = `Summarize this post in 2-3 sentences, making it more impactful and engaging:\n\n"${prompt}"`;
          break;
        case 'suggestions':
          systemPrompt = `As a college community expert, provide 3 actionable suggestions to improve this post for maximum engagement:\n\n"${prompt}"\n\nFormat as a numbered list.`;
          break;
        case 'outline':
          systemPrompt = `Create a better-structured outline for this post idea:\n\n"${prompt}"\n\nFormat as:\n- Main point\n  - Sub-point\n\nKeep it concise.`;
          break;
        case 'search':
          systemPrompt = `Search and provide relevant information about: "${prompt}"\n\nGive 3-4 key insights that would be helpful for a college community.`;
          break;
        default:
          systemPrompt = prompt;
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 500,
          }
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return new Response(JSON.stringify({ error: 'Gemini error', status: resp.status, body: errText }), { status: 500, headers: corsHeaders() });
      }

      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return new Response(JSON.stringify({ text }), { headers: corsHeaders() });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message || 'Unknown error' }), { status: 500, headers: corsHeaders() });
    }
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}
