# 🤖 OpenHub AI - Setup Guide

## How to Enable Google AI Features

OpenHub AI integrates **Google Generative AI (Gemini API)** to provide intelligent features like:
- ✨ Idea Summarization
- 💡 Smart Suggestions
- 🛡️ Content Moderation

---

## Step 1: Get Your Gemini API Key

1. Go to **[Google AI Studio](https://makersuite.google.com/app/apikey)**
2. Click **"Create API Key"**
3. Copy your API key (keep it secure!)

---

## Step 2: Add API Key to OpenHub

### Option A: Local Storage (Recommended for Testing)
1. Open your browser's **Developer Console** (F12 or Ctrl+Shift+I)
2. Go to **Console** tab
3. Run this command:
   ```javascript
   localStorage.setItem("gemini_api_key", "YOUR_API_KEY_HERE");
   ```
4. Replace `YOUR_API_KEY_HERE` with your actual API key
5. Refresh the page

### Option B: Hardcode in Code (Not Recommended for Production)
Edit `dashboard.html` and replace:
```javascript
const GEMINI_API_KEY = localStorage.getItem("gemini_api_key") || "";
```
With:
```javascript
const GEMINI_API_KEY = "YOUR_API_KEY_HERE";
```

---

## Step 3: Start Using AI Features

Once the API key is configured:

1. **Log in** to OpenHub
2. Go to **Dashboard**
3. Type your idea in the textarea
4. Two AI buttons will appear:
   - **✨ AI Summary** - Summarize your long ideas
   - **💡 Get Suggestions** - Get improvement suggestions

5. Click any button to get AI assistance
6. Post your idea when ready!

---

## Features Explained

### 1️⃣ AI Summary (✨ AI Summary)
- Converts long ideas into short, clear summaries
- Perfect for condensing project descriptions
- Helps communicate ideas better

**Example:**
```
Input: "I want to build a platform that helps students collaborate on projects, 
share ideas, and get feedback from peers in real-time using cloud technology..."

Output: "A collaborative cloud-based platform for students to work on projects 
together and share feedback in real-time."
```

### 2️⃣ Smart Suggestions (💡 Get Suggestions)
- AI recommends improvements and tips
- Suggests related topics and categories
- Helps refine your ideas
- Provides actionable feedback

**Example:**
```
Input: "Building a study app for college students"

Output:
- Add features for group study sessions
- Include gamification elements (points, leaderboards)
- Support offline mode for note-taking
```

### 3️⃣ Content Moderation (🛡️ Automatic)
- Checks for offensive language
- Detects spam content
- Ensures safe academic environment
- Runs automatically before posting

---

## Pricing & Quotas

- **Free Tier**: Up to 60 requests per minute
- **Generous Limits**: Suitable for college projects
- **No Credit Card**: Required for free tier
- **View Usage**: [Google AI Studio Dashboard](https://makersuite.google.com/app/usage)

---

## Troubleshooting

### ❌ "AI features not enabled"
- Check if API key is correctly set
- Verify the key in localStorage:
  ```javascript
  localStorage.getItem("gemini_api_key");
  ```

### ❌ "Error: Could not generate summary"
- Verify your API key is valid
- Check your API quota on Google AI Studio
- Ensure you're connected to the internet

### ❌ AI buttons not showing
- Reload the page after setting the API key
- Make sure you're logged in
- Check browser console (F12) for errors

### ✅ Clear API Key
```javascript
localStorage.removeItem("gemini_api_key");
```

---

## Architecture

```
User Input (Textarea)
    ↓
AI Section (Hidden until API key added)
    ↓
Google Generative AI (Gemini API)
    ↓
AI Response (Summary/Suggestions)
    ↓
Display Output
```

---

## Future Enhancements

- 🎤 Voice-based AI interaction
- 🤖 AI Chatbot for Q&A
- 📊 AI Resume analyzer
- 👥 AI-based team formation
- 🔍 AI search for ideas

---

## Security Notes

✅ **API Key Best Practices:**
- Keep your API key private
- Use environment variables in production
- Regenerate keys if compromised
- Monitor API usage regularly

---

## Support

For issues with Google AI:
- [Google AI Documentation](https://ai.google.dev/docs)
- [Gemini API Guide](https://ai.google.dev/tutorials/python_quickstart)
- [Google Support](https://support.google.com/)

---

**OpenHub AI** - Making student collaboration smarter! 🚀
