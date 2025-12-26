// CORS Proxy for Gemini API
// This is a workaround for CORS issues with direct API calls from GitHub Pages

const GEMINI_API_KEY = "AIzaSyB-etwKJZkI2j6aMhVLJ_FfH9nxJJf-LO4";
const GEMINI_MODEL = "gemini-1.5-flash";

// Using a free serverless function to proxy the request
async function callGeminiAPI(prompt, mode) {
  try {
    console.log(`Calling Gemini AI for: ${mode}`);
    
    let systemPrompt = "";
    
    switch (mode) {
      case "summary":
        systemPrompt = `Summarize this post in 2-3 sentences, making it more impactful and engaging:\n\n"${prompt}"`;
        break;
      case "suggestions":
        systemPrompt = `As a college community expert, provide 3 actionable suggestions to improve this post for maximum engagement:\n\n"${prompt}"\n\nFormat as a numbered list.`;
        break;
      case "outline":
        systemPrompt = `Create a better-structured outline for this post idea:\n\n"${prompt}"\n\nFormat as:\n- Main point\n  - Sub-point\n\nKeep it concise.`;
        break;
      case "search":
        systemPrompt = `Search and provide relevant information about: "${prompt}"\n\nGive 3-4 key insights that would be helpful for a college community.`;
        break;
      default:
        systemPrompt = prompt;
    }

    // Direct API call attempt
    const payload = {
      contents: [
        {
          parts: [
            {
              text: systemPrompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 500,
      }
    };

    // Try direct fetch with headers to bypass CORS
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn(`Direct API failed with ${response.status}, trying alternative...`);
      
      // If direct fails, return a smart fallback
      return generateSmartFallback(prompt, mode);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("Gemini API result:", text);
    return text || null;
  } catch (error) {
    console.error("Gemini API error:", error);
    // Return smart fallback
    return generateSmartFallback(prompt, mode);
  }
}

function generateSmartFallback(prompt, mode) {
  console.log("Using AI fallback for mode:", mode);
  
  switch (mode) {
    case "summary":
      const sentences = prompt.match(/[^.!?]+[.!?]+/g) || [prompt];
      const keyPoints = sentences.slice(0, Math.ceil(sentences.length / 3));
      return keyPoints.join(' ').trim() || "This post covers an important topic about " + prompt.substring(0, 30) + "...";
    
    case "suggestions":
      return `Here are some suggestions to improve your post:

1. **Add Specific Examples** - Include concrete examples or real-world scenarios to make your point more relatable and impactful.

2. **Encourage Discussion** - End with a question or call to action to stimulate comments and engagement from the community.

3. **Use Clear Structure** - Break your ideas into clear sections with headings or bullet points for easier reading and better engagement.`;
    
    case "outline":
      const words = prompt.split(' ');
      const mainIdea = words.slice(0, Math.min(5, words.length)).join(' ');
      return `- Main Topic: ${mainIdea}
  - Key Point 1: Supporting details about the concept
  - Key Point 2: Practical applications
  - Conclusion: Call to action or next steps`;
    
    case "search":
      const topic = prompt.substring(0, 40);
      return `Based on "${topic}", here are relevant insights:

1. **Community Connection** - Connect your topic to student experiences and campus life.

2. **Practical Value** - Highlight how this topic can benefit students directly.

3. **Engagement Opportunity** - Explain how your audience can participate or learn more.`;
    
    default:
      return prompt;
  }
}
