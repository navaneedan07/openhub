import * as functions from "firebase-functions";
import axios from "axios";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyB-etwKJZkI2j6aMhVLJ_FfH9nxJJf-LO4";

interface GeminiRequest {
  prompt: string;
  mode: "summary" | "suggestions" | "outline" | "search";
}

export const generateAIContent = functions.https.onCall(
  async (data: GeminiRequest, context) => {
    try {
      if (!data.prompt || !data.prompt.trim()) {
        throw new Error("Prompt is required");
      }

      let systemPrompt = "";
      
      switch (data.mode) {
        case "summary":
          systemPrompt = `Summarize this post in 2-3 sentences, making it more impactful and engaging:\n\n"${data.prompt}"`;
          break;
        case "suggestions":
          systemPrompt = `As a college community expert, provide 3 actionable suggestions to improve this post for maximum engagement:\n\n"${data.prompt}"\n\nFormat as a numbered list.`;
          break;
        case "outline":
          systemPrompt = `Create a better-structured outline for this post idea:\n\n"${data.prompt}"\n\nFormat as:\n- Main point\n  - Sub-point\n\nKeep it concise.`;
          break;
        case "search":
          systemPrompt = `You are a smart search assistant for a college community platform. Given the search query: "${data.prompt}"\n\nSuggest the most relevant clubs, events, resources, or discussion topics. Provide 3-5 suggestions with brief descriptions.`;
          break;
        default:
          throw new Error("Invalid mode");
      }

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [
                {
                  text: systemPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 500,
          },
        }
      );

      const result = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!result) {
        throw new Error("No response from Gemini API");
      }

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error("Gemini API error:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate content: ${error.message}`
      );
    }
  }
);
