# OpenHub - AI-Powered Campus Community Platform

## 🎯 Overview
OpenHub is a next-generation campus community platform powered by Google's Gemini AI. It provides intelligent discovery, personalized recommendations, smart matching, and content moderation.

## ✨ Key Features

### 1. **AI-Powered Smart Search**
- Search posts, events, and clubs by keywords
- Intelligent relevance ranking
- Tag-based filtering
- Real-time results with match confidence

**How to use:**
- Go to Home page
- Type in the "AI Search" box
- Click "🤖 AI Search"
- View results with relevance scores

### 2. **Automatic AI Tagging**
- Posts are automatically tagged with AI-extracted topics
- Tags used for discovery and recommendations
- Visible on all posts for easy browsing

**How it works:**
- When you create a post, Gemini AI extracts 3-5 relevant tags
- Tags are stored in Firestore
- Used for personalization and search

### 3. **Personalized Recommendations**
- AI learns your interests from posts you interact with
- Shows "AI-Powered Recommendations" section on home
- Recommends posts, events, and clubs matched to your interests
- Displays relevance percentage for each recommendation

**How it works:**
- System tracks tags you interact with
- Calculates match scores with all content
- Ranks by relevance and shows top 6

### 4. **Smart User Matching**
- Find students with similar interests
- View match percentage
- See common interests at a glance
- "People With Similar Interests" section on home page

**How it works:**
- Compares your interest profile with other users
- Calculates match score based on common interests
- Suggests connections for study groups, projects, etc.

### 5. **AI Content Moderation**
- Automatic detection of inappropriate content
- Checks for offensive language, spam, harassment
- Blocks posts that violate community standards
- Keeps platform safe and inclusive

**How it works:**
- Every post is scanned by Gemini AI before being published
- Returns APPROVED or FLAGGED status
- Flagged posts are rejected with explanation

### 6. **Dashboard AI Tools**
- **Summarize**: Condense your ideas into impactful 2-3 sentences
- **Get Suggestions**: 3 actionable tips to improve engagement
- **Create Outline**: Structure your thoughts clearly
- Real-time AI feedback before posting

**How to use:**
- Go to Dashboard
- Write your post/idea
- Use buttons to:
  - Get a summary
  - See improvement suggestions
  - Create a structured outline
- Copy/paste improved version back

## 🏗️ Tech Stack

### Frontend
- HTML5, CSS3, JavaScript
- Firebase Authentication (Google Sign-in)
- Firestore (Real-time database)
- Google Gemini AI API

### Backend
- Vercel Serverless Functions
- Node.js with Express
- Gemini 2.5 Flash API
- Firestore for data persistence

### Infrastructure
- GitHub for version control
- Vercel for deployment
- Firebase for backend services

## 📊 Data Structure

### Firestore Collections

```
posts/
├── text (string)
├── tags (array) - AI-generated
├── authorName (string)
├── authorId (string)
├── timestamp (date)

events/
├── title (string)
├── description (string)
├── tags (array) - AI-generated
├── date (date)
├── location (string)

clubs/
├── name (string)
├── description (string)
├── tags (array) - AI-generated
├── leader (string)
├── members (number)

users/
├── email (string)
├── displayName (string)
├── interests (object) - tracked interests with weights
├── photoURL (string)
```

## 🤖 AI Integration

### Gemini API Endpoints
- `/api/gemini` - Main API handler for all AI operations

### Supported Modes
- **summary**: Condense text to 2-3 sentences
- **suggestions**: Get 3 improvement recommendations
- **outline**: Create a structured outline
- **moderate**: Check content appropriateness
- **tags**: Extract 3-5 relevant topics
- **search**: Find related search topics

### Environment Variables
```
GEMINI_API_KEY = "Your Google AI API Key"
```

## 🚀 Getting Started

### 1. Setup
```bash
# Clone the repo
git clone https://github.com/yourusername/openhub.git
cd openhub

# No installation needed - pure frontend + serverless
```

### 2. Firebase Setup
- Create Firebase project
- Enable Firestore Database
- Enable Google Authentication
- Add credentials to HTML files

### 3. Vercel Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add GEMINI_API_KEY to environment variables
```

### 4. Testing with Demo Data
- Run `seedDemoData()` in browser console
- Loads sample posts, events, clubs with tags
- Shows recommendations system in action

## 💡 Usage Examples

### Create a Post
1. Go to Dashboard
2. Type your idea
3. Use AI tools to improve it
4. System auto-tags with AI
5. Your interests are tracked
6. Others get recommendations

### Search for Topics
1. Go to Home
2. Type in AI Search box (e.g., "AI", "hackathon", "coding")
3. See all matching posts/events/clubs
4. Relevance scores show how well they match

### Get Recommendations
1. Go to Home
2. Scroll to "AI-Powered Recommendations"
3. System shows posts/events/clubs matched to YOUR interests
4. Click to view in detail

### Find Study Partners
1. Go to Home
2. Scroll to "People With Similar Interests"
3. See match percentage and common interests
4. Click "Connect" to reach out

## 🔒 Privacy & Security
- All data encrypted at rest
- Firebase authentication required
- Posts linked to user identity
- Moderation prevents abuse
- Interest data is private

## 📈 Future Enhancements
- Direct messaging between matched users
- Study group formation system
- Event RSVP and attendance tracking
- Skill-based recommendations
- Community moderation panel
- Analytics dashboard for admins
- Mobile app version

## 🐛 Troubleshooting

### "400 Error on Gemini API"
- Check GEMINI_API_KEY is set in Vercel
- Verify API key is valid on Google AI console
- Check Vercel logs for details

### "No recommendations showing"
- Need to interact with posts/events first
- Wait for tags to be generated
- Refresh page
- Try `seedDemoData()` for test data

### "Search returns no results"
- Verify posts have been created
- Check post tags match search query
- Search is case-insensitive

## 📞 Support
For issues or features, open an issue on GitHub or contact the development team.

## 📄 License
MIT License - See LICENSE file for details

---

**Built with ❤️ for the OpenHub community**
