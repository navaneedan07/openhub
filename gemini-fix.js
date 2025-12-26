// Smart fallback for when API fails
function generateSmartFallback(prompt, mode) {
  switch (mode) {
    case "summary":
      const sentences = prompt.match(/[^.!?]+[.!?]+/g) || [prompt];
      const keyPoints = sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 3)));
      return keyPoints.join(' ').trim() || "Key topic: " + prompt.substring(0, 50) + "...";
    
    case "suggestions":
      return `1. **Add Specific Details** - Include concrete examples to strengthen your point.\n\n2. **Encourage Engagement** - Ask a question to spark discussion.\n\n3. **Improve Clarity** - Use clear sections to make your idea easy to follow.`;
    
    case "outline":
      const words = prompt.split(' ');
      const mainIdea = words.slice(0, Math.min(6, words.length)).join(' ');
      return `- Main Topic: ${mainIdea}\n  - Supporting Point 1: Key details\n  - Supporting Point 2: Additional context\n  - Conclusion: Call to action`;
    
    case "search":
      return `Based on your query, here are helpful insights:\n\n1. **Relevance** - Find community members interested in this topic.\n\n2. **Resources** - Check library and online resources related to this.\n\n3. **Events** - Look for upcoming events and discussions about this subject.`;
    
    default:
      return prompt;
  }
}

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

    // Use Gemini REST API with fallback handling
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      if (!response.ok) {
        console.warn(`API returned ${response.status}, using smart fallback...`);
        return generateSmartFallback(prompt, mode);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log("Gemini API result:", text);
      return text || generateSmartFallback(prompt, mode);
    } catch (fetchError) {
      console.warn("Fetch failed, using smart fallback...", fetchError);
      return generateSmartFallback(prompt, mode);
    }
  } catch (error) {
    console.error("Gemini API error:", error);
    return generateSmartFallback(prompt, mode);
  }
}
