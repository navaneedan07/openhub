const auth = firebase.auth();
const db = firebase.firestore();

// Google AI Setup
let genAI = null;
let model = null;

function initializeAI() {
  const apiKey = GEMINI_API_KEY || localStorage.getItem("gemini_api_key");
  if (!apiKey) {
    console.log("Gemini API key missing. Add via localStorage.setItem('gemini_api_key', '<key>')");
    showAISection(false);
    return;
  }

  try {
    if (!window.GoogleGenerativeAI) {
      console.log("GoogleGenerativeAI not loaded yet. Check network/ad-blockers.");
      showAISection(false);
      return;
    }

    genAI = new window.GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-pro" });
    showAISection(true);
  } catch (error) {
    console.error("AI init failed:", error);
    showAISection(false);
  }
}

function showAISection(enabled = true) {
  const aiSection = document.getElementById("aiSection");
  if (!aiSection) return;
  aiSection.style.display = "block";
  const statusEl = document.getElementById("aiStatus");
  if (statusEl) {
    statusEl.textContent = enabled ? "AI ready" : "Add API key to enable AI";
    statusEl.style.color = enabled ? "#4caf50" : "#d9534f";
  }
}

// Check if user is on dashboard - verify authentication
if (window.location.pathname.includes('dashboard.html')) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      // User not logged in, redirect to login
      window.location.href = "index.html";
    } else {
      // User is logged in, display user info
      displayUserInfo(user);
      initializeAI();
      loadPosts();
    }
  });
}

function login() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      // Successful login
      window.location.href = "dashboard.html";
    })
    .catch((error) => {
      alert("Login failed: " + error.message);
      console.error(error);
    });
}

function logout() {
  auth.signOut()
    .then(() => {
      window.location.href = "index.html";
    })
    .catch((error) => {
      alert("Logout failed: " + error.message);
      console.error(error);
    });
}

function displayUserInfo(user) {
  const userInfoDiv = document.getElementById("userInfo");
  const userNameSpan = document.getElementById("userName");
  const userEmailParagraph = document.getElementById("userEmail");

  if (userInfoDiv && userNameSpan && userEmailParagraph) {
    const displayName = user.displayName || "Student";
    userNameSpan.textContent = displayName;
    userEmailParagraph.textContent = "📧 " + user.email;
    userInfoDiv.style.display = "block";
  }
}

async function generateSummary() {
  const text = document.getElementById("postText").value.trim();
  
  if (!text) {
    alert("Please write something to summarize!");
    return;
  }

  if (!model) {
    alert("AI features not enabled. Add your Gemini API key.");
    return;
  }

  const aiOutput = document.getElementById("aiOutput");
  aiOutput.innerHTML = '<div class="ai-output-header">⏳ Generating Summary...</div>';
  aiOutput.style.display = "block";

  try {
    const result = await model.generateContent(
      `Summarize this idea in 2-3 sentences clearly and concisely:\n\n"${text}"`
    );
    const summary = await result.response.text();
    
    aiOutput.innerHTML = `
      <div class="ai-output-header">✨ AI Summary</div>
      <p>${escapeHtml(summary)}</p>
    `;
  } catch (error) {
    console.error("Summary error:", error);
    aiOutput.innerHTML = '<div class="ai-output-header">❌ Error</div><p>Could not generate summary. Check API key.</p>';
  }
}

async function getSuggestions() {
  const text = document.getElementById("postText").value.trim();
  
  if (!text) {
    alert("Please write something to get suggestions!");
    return;
  }

  if (!model) {
    alert("AI features not enabled. Add your Gemini API key.");
    return;
  }

  const aiOutput = document.getElementById("aiOutput");
  aiOutput.innerHTML = '<div class="ai-output-header">⏳ Generating Suggestions...</div>';
  aiOutput.style.display = "block";

  try {
    const result = await model.generateContent(
      `For this college project/idea, provide 3 brief improvement suggestions:\n\n"${text}"\n\nFormat: Brief bullet points only.`
    );
    const suggestions = await result.response.text();
    
    aiOutput.innerHTML = `
      <div class="ai-output-header">💡 AI Suggestions</div>
      <p>${escapeHtml(suggestions)}</p>
    `;
  } catch (error) {
    console.error("Suggestions error:", error);
    aiOutput.innerHTML = '<div class="ai-output-header">❌ Error</div><p>Could not generate suggestions. Check API key.</p>';
  }
}

async function moderateContent(text) {
  if (!model) {
    return true; // Allow content if AI not available
  }

  try {
    const result = await model.generateContent(
      `Is this text appropriate for a college platform? Check for: offensive language, spam, harassment. Reply with YES or NO only:\n\n"${text}"`
    );
    const response = await result.response.text();
    return response.includes("YES");
  } catch (error) {
    console.error("Moderation error:", error);
    return true; // Allow on error
  }
}

function addPost() {
  const text = document.getElementById("postText").value.trim();
  
  if (!text) {
    alert("Please write something before posting!");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in to post");
    return;
  }

  // Check content before posting
  moderateContent(text).then((isClean) => {
    if (!isClean) {
      alert("Your post contains inappropriate content. Please revise.");
      return;
    }

    db.collection("posts").add({
      text: text,
      authorName: user.displayName || "Anonymous",
      authorEmail: user.email,
      authorId: user.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date()
    })
    .then(() => {
      // Clear the input field and AI output
      document.getElementById("postText").value = "";
      const aiOutput = document.getElementById("aiOutput");
      if (aiOutput) {
        aiOutput.style.display = "none";
      }
    })
    .catch((error) => {
      alert("Error posting: " + error.message);
      console.error(error);
    });
  });
}

function loadPosts() {
  db.collection("posts")
    .orderBy("timestamp", "desc")
    .onSnapshot((snapshot) => {
      const postsDiv = document.getElementById("posts");
      postsDiv.innerHTML = "";
      
      if (snapshot.empty) {
        postsDiv.innerHTML = '<div class="no-posts">No posts yet. Be the first to share an idea! 💡</div>';
        return;
      }

      snapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp ? data.timestamp.toDate() : new Date(data.createdAt);
        const timeString = formatTime(timestamp);
        
        const postElement = document.createElement("div");
        postElement.className = "post";
        postElement.innerHTML = `
          <div class="post-text">${escapeHtml(data.text)}</div>
          <div class="post-meta">
            <span class="post-author">👤 ${escapeHtml(data.authorName || "Anonymous")}</span>
            <span>⏰ ${timeString}</span>
          </div>
        `;
        postsDiv.appendChild(postElement);
      });
    }, (error) => {
      console.error("Error loading posts: ", error);
      document.getElementById("posts").innerHTML = '<div class="no-posts">Error loading posts. Please refresh.</div>';
    });
}

function formatTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

