// AI Discovery & Smart Recommendations System
// This module powers personalized recommendations, smart matching, and intelligent content discovery

class AIDiscoverySystem {
  constructor() {
    this.userInterests = [];
    this.userTags = [];
    this.allPosts = [];
    this.allEvents = [];
    this.allClubs = [];
  }

  // Learn user interests from their interactions
  async trackUserInterest(userId, interest, weight = 1) {
    try {
      const userRef = db.collection("users").doc(userId);
      const docSnap = await userRef.get();
      
      let interests = docSnap.data()?.interests || {};
      interests[interest] = (interests[interest] || 0) + weight;
      
      await userRef.update({ interests });
      this.userInterests = interests;
    } catch (error) {
      console.error("Error tracking interest:", error);
    }
  }

  // Auto-tag content using Gemini AI
  async autoTagContent(text, contentType = "post") {
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Extract 3-5 main topics/tags from this ${contentType}. Return as comma-separated list only:\n\n"${text}"`,
          mode: "tags"
        })
      });

      if (response.ok) {
        const data = await response.json();
        const tags = data.result.split(",").map(t => t.trim().toLowerCase());
        return tags;
      }
      return [];
    } catch (error) {
      console.error("Error auto-tagging:", error);
      return [];
    }
  }

  // Get personalized recommendations
  async getRecommendations(userId, limit = 5) {
    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data();
      const userInterests = userData?.interests || {};
      
      // Get user's profile tags (major, year, interests from profile)
      const profileTags = [
        userData?.major?.toLowerCase(),
        userData?.year,
        ...(userData?.profileInterests || [])
      ].filter(Boolean);

      // Get user's interaction history (posts they've liked, commented on, created)
      const userPosts = await db.collection("posts")
        .where("authorId", "==", userId)
        .limit(10)
        .get();
      
      const userActivityTags = new Set();
      userPosts.forEach(doc => {
        const tags = doc.data().tags || [];
        tags.forEach(tag => userActivityTags.add(tag.toLowerCase()));
        
        // Extract keywords from user's own posts
        const text = doc.data().text || "";
        const keywords = text.toLowerCase().match(/\b(ai|ml|web|app|robotics|data|blockchain|cloud|mobile|design|ux|ui|backend|frontend|database|api|security|iot|vr|ar|game|startup|entrepreneurship|research|project|hackathon)\b/g) || [];
        keywords.forEach(kw => userActivityTags.add(kw));
      });

      // Fetch all content
      const posts = await db.collection("posts").orderBy("createdAt", "desc").limit(50).get();
      const events = await db.collection("events").limit(20).get();
      const clubs = await db.collection("clubs").limit(20).get();

      let allItems = [];

      // Score posts based on multiple factors
      posts.forEach(doc => {
        if (doc.data().authorId === userId) return; // Don't recommend user's own posts
        
        const data = doc.data();
        const tags = (data.tags || []).map(t => t.toLowerCase());
        const text = (data.text || "").toLowerCase();
        
        let score = 0;
        
        // 1. Match with user interests (highest weight)
        tags.forEach(tag => {
          score += (userInterests[tag] || 0) * 3;
        });
        
        // 2. Match with profile tags
        profileTags.forEach(profileTag => {
          if (tags.includes(profileTag) || text.includes(profileTag)) {
            score += 5;
          }
        });
        
        // 3. Match with user activity patterns
        userActivityTags.forEach(activityTag => {
          if (tags.includes(activityTag) || text.includes(activityTag)) {
            score += 4;
          }
        });
        
        // 4. Engagement score (popular content bonus)
        score += (data.likeCount || 0) * 0.5;
        score += (data.commentCount || 0) * 1;
        
        // 5. Recency bonus (newer posts get slight boost)
        const ageInDays = (Date.now() - data.createdAt.toMillis()) / (1000 * 60 * 60 * 24);
        if (ageInDays < 7) score += 2;
        
        if (score > 0 || tags.length === 0) {
          allItems.push({
            type: "post",
            id: doc.id,
            title: data.text?.substring(0, 60) + "...",
            score: score + (Math.random() * 0.5), // Small random factor for variety
            tags: tags.slice(0, 3),
            data
          });
        }
      });

      // Score events
      events.forEach(doc => {
        const data = doc.data();
        const tags = (data.tags || []).map(t => t.toLowerCase());
        const title = (data.title || "").toLowerCase();
        
        let score = 0;
        
        tags.forEach(tag => {
          score += (userInterests[tag] || 0) * 3;
        });
        
        profileTags.forEach(profileTag => {
          if (tags.includes(profileTag) || title.includes(profileTag)) {
            score += 5;
          }
        });
        
        userActivityTags.forEach(activityTag => {
          if (tags.includes(activityTag) || title.includes(activityTag)) {
            score += 4;
          }
        });
        
        // Events get a base score to ensure they appear
        score += 3;
        
        allItems.push({
          type: "event",
          id: doc.id,
          title: data.title,
          score: score + (Math.random() * 0.5),
          tags: tags.slice(0, 3),
          data
        });
      });

      // Score clubs
      clubs.forEach(doc => {
        const data = doc.data();
        const tags = (data.tags || []).map(t => t.toLowerCase());
        const name = (data.name || "").toLowerCase();
        
        let score = 0;
        
        tags.forEach(tag => {
          score += (userInterests[tag] || 0) * 3;
        });
        
        profileTags.forEach(profileTag => {
          if (tags.includes(profileTag) || name.includes(profileTag)) {
            score += 5;
          }
        });
        
        userActivityTags.forEach(activityTag => {
          if (tags.includes(activityTag) || name.includes(activityTag)) {
            score += 4;
          }
        });
        
        // Clubs get a base score
        score += 2;
        
        allItems.push({
          type: "club",
          id: doc.id,
          title: data.name,
          score: score + (Math.random() * 0.5),
          tags: tags.slice(0, 3),
          data
        });
      });

      // Sort by relevance score and return top items
      allItems.sort((a, b) => b.score - a.score);
      return allItems.slice(0, limit);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      return [];
    }
  }

  // Find similar users for matching
  async findSimilarUsers(userId, limit = 5) {
    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      const userInterests = userDoc.data()?.interests || {};

      const allUsers = await db.collection("users").limit(100).get();
      let similarUsers = [];

      allUsers.forEach(doc => {
        if (doc.id === userId) return;
        
        const otherInterests = doc.data().interests || {};
        let matchScore = 0;
        
        Object.keys(userInterests).forEach(interest => {
          if (otherInterests[interest]) {
            matchScore += Math.min(userInterests[interest], otherInterests[interest]);
          }
        });

        if (matchScore > 0) {
          similarUsers.push({
            id: doc.id,
            name: doc.data().displayName,
            email: doc.data().email,
            matchScore,
            commonInterests: Object.keys(userInterests).filter(i => otherInterests[i])
          });
        }
      });

      similarUsers.sort((a, b) => b.matchScore - a.matchScore);
      return similarUsers.slice(0, limit);
    } catch (error) {
      console.error("Error finding similar users:", error);
      return [];
    }
  }

  // AI-powered content moderation
  async moderateContent(text) {
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Is this text appropriate for a college community platform? Check for offensive language, spam, harassment. Reply with APPROVED or FLAGGED only:\n\n"${text}"`,
          mode: "moderate"
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.approved === true;
      }
      return true; // Default to approve if API fails
    } catch (error) {
      console.error("Error moderating content:", error);
      return true;
    }
  }

  // Generate smart summaries for feed
  async generateSummary(text, maxLength = 100) {
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Summarize this in one short sentence (max ${maxLength} characters):\n\n"${text}"`,
          mode: "summary"
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.result;
      }
      return text.substring(0, maxLength);
    } catch (error) {
      return text.substring(0, maxLength);
    }
  }

  // Search with AI understanding
  async smartSearch(query) {
    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Find topics related to: "${query}". Return 3-5 search topics as comma-separated list:`,
          mode: "search"
        })
      });

      if (response.ok) {
        const data = await response.json();
        const searchTopics = data.result.split(",").map(t => t.trim().toLowerCase());
        
        // Search across all content
        const posts = await db.collection("posts")
          .where("tags", "array-contains-any", searchTopics)
          .limit(10)
          .get();
        
        return posts.docs.map(doc => ({
          type: "post",
          ...doc.data(),
          id: doc.id
        }));
      }
      return [];
    } catch (error) {
      console.error("Error in smart search:", error);
      return [];
    }
  }
}

// Initialize the AI Discovery System
const aiDiscovery = new AIDiscoverySystem();
