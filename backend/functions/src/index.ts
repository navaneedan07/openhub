/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

function generateFallback(text: string, mode: string): string {
	switch (mode) {
		case "summary": {
			const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
			const keyPoints = sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 3)));
			return keyPoints.join(" ").trim();
		}
		case "suggestions":
			return [
				"1. Add concrete examples to make your idea actionable.",
				"2. Invite collaboration by asking a clear question.",
				"3. Improve clarity with short sections and headings."
			].join("\n\n");
		case "outline":
			return [
				"- Introduction: Context and goal",
				"- Details: Key points and resources",
				"- Next Steps: Call to action"
			].join("\n");
		case "moderate": {
			const bad = /(spam|hate|abuse|slur|nsfw|explicit)/i;
			return bad.test(text) ? "NO" : "YES";
		}
		case "tags": {
			const words = (text || "").toLowerCase().match(/[a-z]{3,}/g) || [];
			const freq: Record<string, number> = {};
			for (const w of words) freq[w] = (freq[w] || 0) + 1;
			const tags = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 5);
			return tags.join(", ");
		}
		default:
			return text;
	}
}

export const api = onRequest(async (req, res) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");
	res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
	if (req.method === "OPTIONS") {
		res.status(204).end();
		return;
	}

	if (req.method !== "POST") {
		res.status(405).json({ error: "Method Not Allowed" });
		return;
	}

	try {
		const { text = "", mode = "summary" } = req.body || {};
		// If you later set a real Gemini API key, you can replace this fallback
		// call with an actual API request and return its response.
		const result = generateFallback(String(text), String(mode));
		res.status(200).json({ result });
	} catch (err) {
		logger.error("API error", err as any);
		res.status(500).json({ error: "Internal Server Error" });
	}
});
