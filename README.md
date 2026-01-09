# OpenHub

A lightweight campus community web app for sharing posts, events, clubs, resources, and profiles. It includes basic social features (follow, similar people suggestions) and optional AI helpers for summaries, suggestions, outlines, and search.

## Features
- Posts with optional attachments (link or upload with base64 fallback when storage is disabled).
- Events, clubs, and resources listing pages.
- Profiles with avatar upload/resize, follower/following counts, and interests-based similar people suggestions.
- Manual search across posts; optional AI-powered search/summarize/suggest/outline via Gemini models.
- Auth + Firestore persistence (using Firebase compat SDK v9.23.0).

## Tech Stack
- Frontend: HTML/CSS/vanilla JS.
- Backend/data: Firebase Auth + Firestore (compat SDK). Optional Firebase Storage uploads can be disabled via `window.DISABLE_STORAGE_UPLOADS`.
- AI: Gemini proxy endpoint `/api/gemini` with model preferences (flash-lite, flash, 3-flash, flash-tts, gemma fallbacks).
- Functions: `backend/functions/` (TypeScript) for backend proxies (e.g., `gemini.js`).
- Deployment targets present: Netlify (`backend/netlify/functions/gemini.js`), Vercel (`vercel.json`), Firebase Hosting/Functions (`firebase.json`, `backend/functions/`).

## Project Structure
```
openhub/
├── frontend/              # All client-side files
│   ├── *.html            # Main pages (index, home, dashboard, events, clubs, resources, profile, thread)
│   ├── app.js            # Core client logic (auth, CRUD, AI helpers, search, profile, follow, interests)
│   ├── style.css         # Global styles
│   ├── ai-discovery.js   # AI UX helpers
│   ├── firebase-config.js # Firebase configuration
│   └── ...               # Other frontend JS files
├── backend/              # All server-side code
│   ├── api/              # API endpoints
│   │   └── gemini.js     # Serverless proxy for Gemini
│   ├── functions/        # Firebase Functions (TypeScript)
│   ├── dataconnect/      # Firebase Data Connect configuration
│   └── netlify/          # Netlify Functions
│       └── functions/
│           └── gemini.js # Netlify Function proxy for Gemini
├── firebase.json         # Firebase configuration
├── netlify.toml          # Netlify configuration
├── vercel.json           # Vercel configuration
└── ...                   # Other config files
```

## Setup
1) Prereqs: Node 18+, npm. Optional: Firebase CLI (`npm i -g firebase-tools`) for hosting/functions; Netlify CLI or Vercel CLI if you deploy there.
2) Install deps for functions (if you plan to run the proxy via Firebase Functions):
   - `cd backend/functions`
   - `npm install`
3) Configure Firebase:
   - Update the `firebaseConfig` block in the HTML pages (in `frontend/`) with your project keys.
   - Ensure Firestore and Auth are enabled in your Firebase project.
4) Gemini proxy configuration:
   - Set the Gemini API key in your serverless environment (e.g., `process.env.GEMINI_API_KEY`) for `backend/api/gemini.js` or the corresponding Netlify/Vercel/Firebase Function.
   - The client calls `/api/gemini`; ensure your chosen hosting maps that route to the proxy function.
5) Storage uploads:
   - By default `window.DISABLE_STORAGE_UPLOADS = true` (embeds images base64; non-images should be links). Set to `false` to use Firebase Storage and configure CORS/billing accordingly.

## Local Development
- Simple static serve (for front-end only):
  - From repo root, use any static server (e.g., `npx serve frontend` or a VS Code live server extension pointing to the frontend directory). Ensure `/api/gemini` is proxied to your local function if testing AI.
- Firebase Functions emulator (AI proxy via Firebase):
  - `cd backend/functions && npm run build` (or `npm run serve` if defined) then `firebase emulators:start --only functions,hosting` (ensure your `firebase.json` routes `/api/gemini` to the function).
- Netlify dev (if using Netlify Functions):
  - `netlify dev` from repo root (requires Netlify CLI). This should expose the function at `/api/gemini`.

## Usage Notes
- Manual search: `performAISearch()` searches posts/events/clubs locally; wired to the search UI on the dashboard.
- AI actions on posts: `generateSummary`, `getSuggestions`, `getOutline` call the Gemini proxy using the model preference list.
- AI search (LLM): `searchWithAI` uses the proxy; wire your button to this if you want LLM-driven results instead of local filtering (AI credits are over for this, so switched to manual search).
- Similar people demo: uses Jaccard similarity over tags and club memberships; best-effort, capped for performance.

## Deployment
- Firebase Hosting: configure `firebase.json`, run `firebase deploy` (or `firebase deploy --only hosting,functions`). Ensure `/api/gemini` rewrites to the Gemini function.
- Netlify: uses `netlify/functions/gemini.js`; ensure the build command/output match your Netlify settings.
- Vercel: `vercel.json` present; map `/api/gemini` to `api/gemini.js` as a serverless function.

## Testing & Validation
- Run manual checks: create posts, events, clubs; test profile save/upload; run manual search; try AI summary/suggestions/outline; verify follow/unfollow.
- If using AI: confirm the proxy responds and rate limits are respected (model preference order handles fallbacks).

## Security & Data
- Do not commit API keys. Use environment variables for Gemini and Firebase service credentials.
- Firestore/Storage rules should be reviewed (`firestore.rules`, `storage.rules`).

## Contributing
- Keep code in ASCII where possible and add concise comments only when necessary.
- Prefer small, focused changes and test UI flows after edits.
