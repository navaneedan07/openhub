## 🚀 OpenHub Quick Start Guide

### First Time Setup

1. **Sign In**
   - Go to https://openhub-kappa.vercel.app (or your deployed URL)
   - Click "Sign In with Google"
   - Use your Google account

2. **Explore Home Page**
   - See "AI-Powered Recommendations" section
   - See "People With Similar Interests" section
   - Use "AI Search" to find content

3. **Try AI Search**
   - Type any topic: "coding", "AI", "hackathon", "robotics", etc.
   - Click "🤖 AI Search"
   - See results with relevance scores

4. **Create Your First Post**
   - Go to Dashboard
   - Write your post/idea
   - Click "Summarize", "Get Suggestions", or "Create Outline"
   - Click "📤 Post Idea"
   - System auto-tags with AI

5. **Load Demo Data** (for testing)
   - Open browser console (F12)
   - Type: `seedDemoData()`
   - Wait for confirmation
   - Refresh page
   - Now you'll see recommendations!

### Key Features at a Glance

| Feature | Where | How |
|---------|-------|-----|
| AI Search | Home | Type query + click "AI Search" |
| Recommendations | Home | Scroll to "AI-Powered Recommendations" |
| User Matching | Home | Scroll to "People With Similar Interests" |
| AI Tools | Dashboard | Write post + use Summarize/Suggestions buttons |
| Post Tagging | Dashboard | Auto-tagged when you post |
| Events | Events page | See upcoming events with AI tags |
| Clubs | Clubs page | Find clubs by interest |
| Resources | Resources page | Access study materials |

### Troubleshooting

**Problem: "No recommendations"**
- Solution: Create a post first, then refresh. Or run `seedDemoData()`

**Problem: "500 error on API"**
- Solution: Check Vercel env var GEMINI_API_KEY is set

**Problem: "Search shows no results"**
- Solution: Make sure posts exist. Run `seedDemoData()` for test data.

**Problem: "Posts not saving"**
- Solution: Check Firebase is connected. Check browser console for errors.

### Console Commands (Open DevTools - F12)

```javascript
// Load demo data with sample posts, events, clubs
seedDemoData()

// Check feature status
printFeatureStatus()

// Get user recommendations
aiDiscovery.getRecommendations(auth.currentUser.uid, 5)

// Find similar users
aiDiscovery.findSimilarUsers(auth.currentUser.uid, 5)

// Track an interest
aiDiscovery.trackUserInterest(auth.currentUser.uid, "web-development", 2)
```

### File Structure

```
openhub/
├── index.html              # Login page
├── home.html               # Home with recommendations
├── dashboard.html          # Post creation & AI tools
├── events.html            # Events listing
├── clubs.html             # Clubs listing
├── profile.html           # User profile
├── resources.html         # Study resources
│
├── app.js                 # Core app logic
├── ai-discovery.js        # AI recommendation system
├── demo-data.js           # Sample data for testing
├── feature-status.js      # Feature documentation
│
├── style.css              # Styling
├── vercel.json            # Vercel config
├── FEATURES.md            # Feature documentation
│
├── api/
│   └── gemini.js          # Gemini AI API handler
│
├── functions/             # Firebase functions
│   └── src/index.ts
│
└── dataconnect/           # Firebase DataConnect
```

### Deployment Steps

1. **Code is already on GitHub**
   ```bash
   git status
   git add -A
   git commit -m "message"
   git push
   ```

2. **Vercel auto-deploys on push**
   - Check vercel.com dashboard
   - View deployment logs

3. **Add Environment Variable**
   - Go to vercel.com → Project Settings → Environment Variables
   - Add: `GEMINI_API_KEY = "your-api-key"`
   - Redeploy

### Next Steps

- [ ] Test all features on staging
- [ ] Get feedback from beta users
- [ ] Add more AI features (smart groups, study matching)
- [ ] Build mobile app
- [ ] Scale to other campuses

---

**Questions?** Check FEATURES.md for detailed documentation!
