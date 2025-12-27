const auth = firebase.auth();
const db = firebase.firestore();

// Google AI Setup
let genAI = null;
let model = null;

function initializeAI() {
  // AI is now handled by serverless function - always show as ready
  showAISection(true);
}

function showAISection(enabled = true) {
  const aiSection = document.getElementById("aiSection");
  if (!aiSection) return;
  aiSection.style.display = "block";
  const statusEl = document.getElementById("aiStatus");
  if (statusEl) {
    statusEl.textContent = "AI ready (server-side)";
    statusEl.style.color = "#4caf50";
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
      // Set avatar in dashboard header
      setAvatarSafe(user, 'avatarImgDash', 'avatarInitialDash');
      initializeAI();
      loadPosts();
    }
  });
}

// Helper function to set avatar with DOM ready check
function setAvatarSafe(user, avatarImgId, avatarInitialId) {
  // Wait a bit for DOM to be ready, then set avatar
  setTimeout(() => {
    setProfileAvatar({
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      _avatarImgId: avatarImgId,
      _avatarInitialId: avatarInitialId
    });
  }, 100);
}

// Home page: show user info and recent announcements
if (window.location.pathname.includes('home.html')) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      displayUserInfo(user);
      setAvatarSafe(user, 'avatarImg', 'avatarInitial');
      loadPosts();
    }
  });
}

// Events page
if (window.location.pathname.includes('events.html')) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      setAvatarSafe(user, 'avatarImgEv', 'avatarInitialEv');
      loadEvents();
    }
  });
}

// Clubs page
if (window.location.pathname.includes('clubs.html')) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      setAvatarSafe(user, 'avatarImgCl', 'avatarInitialCl');
      loadClubs();
    }
  });
}

// Resources page
if (window.location.pathname.includes('resources.html')) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      setAvatarSafe(user, 'avatarImgRes', 'avatarInitialRes');
      loadResources();
    }
  });
}

// Profile page
if (window.location.pathname.includes('profile.html')) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      displayUserInfo(user);
      setAvatarSafe(user, 'avatarImgProf', 'avatarInitialProf');
      loadUserProfile(user);
    }
  });
}

function login() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      // Successful login
      window.location.href = "home.html";
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

// ----- Additional loaders -----
function loadEvents() {
  const target = document.getElementById("eventsList");
  if (!target) return;
  db.collection("events").orderBy("date", "asc").limit(20).get()
    .then((snap) => {
      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      if (items.length === 0) {
        renderEvents([
          { title: "Tech Talk: AI Trends", when: "Friday, 4 PM", where: "Seminar Hall" },
          { title: "Hackathon Prep Meetup", when: "Saturday, 11 AM", where: "Lab 2" },
          { title: "Robotics Club Demo", when: "Tuesday, 1 PM", where: "Makerspace" },
        ]);
      } else {
        renderEvents(items.map(e => ({ title: e.title, when: e.when || e.dateText || "", where: e.location || "" })));
      }
    })
    .catch(() => {
      renderEvents([
        { title: "Tech Talk: AI Trends", when: "Friday, 4 PM", where: "Seminar Hall" },
        { title: "Hackathon Prep Meetup", when: "Saturday, 11 AM", where: "Lab 2" },
        { title: "Robotics Club Demo", when: "Tuesday, 1 PM", where: "Makerspace" },
      ]);
    });
}

function renderEvents(list) {
  const target = document.getElementById("eventsList");
  target.innerHTML = "";
  list.forEach((e) => {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `<h4>${escapeHtml(e.title)}</h4><p>${escapeHtml(e.when)} · ${escapeHtml(e.where)}</p>`;
    target.appendChild(el);
  });
}

function loadClubs() {
  const target = document.getElementById("clubsList");
  if (!target) return;
  db.collection("clubs").orderBy("name", "asc").limit(50).get()
    .then((snap) => {
      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      if (items.length === 0) {
        renderClubs([
          { id: "dsc", name: "Developer Student Club", desc: "Build and learn together." },
          { id: "ecell", name: "Entrepreneurship Cell", desc: "Startups, pitches, networking." },
          { id: "cultural", name: "Cultural Committee", desc: "Events, festivals, performances." },
        ]);
      } else {
        renderClubs(items.map(c => ({ id: c.id, name: c.name, desc: c.description || "" })));
      }
    })
    .catch(() => {
      renderClubs([
        { id: "dsc", name: "Developer Student Club", desc: "Build and learn together." },
        { id: "ecell", name: "Entrepreneurship Cell", desc: "Startups, pitches, networking." },
        { id: "cultural", name: "Cultural Committee", desc: "Events, festivals, performances." },
      ]);
    });
}

function renderClubs(list) {
  const target = document.getElementById("clubsList");
  target.innerHTML = "";
  list.forEach((c) => {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `<h4>${escapeHtml(c.name)}</h4><p>${escapeHtml(c.desc)}</p>`;
    const btn = document.createElement("button");
    btn.textContent = "Join";
    btn.style.marginTop = "8px";
    btn.onclick = () => joinClub(c.id, c.name);
    el.appendChild(btn);
    target.appendChild(el);
  });
}

function joinClub(clubId, clubName) {
  const user = auth.currentUser;
  if (!user) return;
  db.collection("club_members").doc(`${clubId}_${user.uid}`).set({
    clubId,
    clubName,
    userId: user.uid,
    userEmail: user.email,
    joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
  }).then(() => {
    alert(`Joined ${clubName}`);
  }).catch((err) => alert(err.message));
}

function loadResources() {
  const target = document.getElementById("resourcesList");
  if (!target) return;
  db.collection("resources").orderBy("title", "asc").limit(50).get()
    .then((snap) => {
      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      if (items.length === 0) {
        renderResources([
          { title: "Library Portal", url: "#" },
          { title: "Lab Booking", url: "#" },
          { title: "Placement Cell", url: "#" },
          { title: "Exam Timetable", url: "#" },
        ]);
      } else {
        renderResources(items.map(r => ({ title: r.title, url: r.url })));
      }
    })
    .catch(() => {
      renderResources([
        { title: "Library Portal", url: "#" },
        { title: "Lab Booking", url: "#" },
        { title: "Placement Cell", url: "#" },
        { title: "Exam Timetable", url: "#" },
      ]);
    });
}

function renderResources(list) {
  const target = document.getElementById("resourcesList");
  target.innerHTML = "";
  list.forEach((r) => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="${r.url}" target="_blank">${escapeHtml(r.title)}</a>`;
    target.appendChild(li);
  });
}

function loadUserProfile(user) {
  const postsTarget = document.getElementById("userPosts");
  const clubsTarget = document.getElementById("userClubs");
  if (postsTarget) {
    db.collection("posts").where("authorId", "==", user.uid).orderBy("timestamp", "desc").limit(50).get()
      .then((snap) => {
        postsTarget.innerHTML = "";
        if (snap.empty) {
          postsTarget.innerHTML = '<div class="no-posts">No posts yet.</div>';
          return;
        }
        snap.forEach((doc) => {
          const data = doc.data();
          const timestamp = data.timestamp ? data.timestamp.toDate() : new Date(data.createdAt);
          const timeString = formatTime(timestamp);
          const el = document.createElement("div");
          el.className = "post";
          el.innerHTML = `
            <div class="post-text">${escapeHtml(data.text)}</div>
            <div class="post-meta"><span class="post-author">👤 You</span><span>⏰ ${timeString}</span></div>
          `;
          postsTarget.appendChild(el);
        });
      });
  }
  if (clubsTarget) {
    db.collection("club_members").where("userId", "==", user.uid).limit(50).get()
      .then((snap) => {
        clubsTarget.innerHTML = "";
        if (snap.empty) {
          clubsTarget.innerHTML = '<div class="no-posts">Not a member of any clubs yet.</div>';
          return;
        }
        snap.forEach((doc) => {
          const d = doc.data();
          const el = document.createElement("div");
          el.className = "card";
          el.innerHTML = `<h4>${escapeHtml(d.clubName)}</h4><p>Joined</p>`;
          clubsTarget.appendChild(el);
        });
      });
  }
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

function setProfileAvatar(user) {
  const imgId = user._avatarImgId || 'avatarImg';
  const initialId = user._avatarInitialId || 'avatarInitial';
  const img = document.getElementById(imgId);
  const initial = document.getElementById(initialId);
  
  console.log(`Setting avatar for ${imgId}:`, { img: !!img, initial: !!initial, photoURL: user.photoURL });
  
  if (!img || !initial) {
    console.error(`Avatar elements not found: ${imgId}, ${initialId}`);
    return;
  }
  
  const name = user.displayName || user.email || 'U';
  const first = (name || 'U').trim().charAt(0).toUpperCase();
  
  // Always show initial first
  initial.textContent = first || 'U';
  initial.style.display = 'block';
  img.parentElement.style.display = 'inline-flex'; // Make sure parent is visible
  
  if (user.photoURL) {
    console.log('Loading photo from:', user.photoURL);
    // Create a new image to preload
    const preloadImg = new Image();
    preloadImg.onload = () => {
      // Image loaded successfully, show it
      console.log('Photo loaded successfully');
      img.src = user.photoURL;
      img.style.display = 'block';
      img.style.visibility = 'visible';
      initial.style.display = 'none';
    };
    preloadImg.onerror = () => {
      // Image failed to load, keep showing initial
      console.log('Photo failed to load');
      img.style.display = 'none';
      initial.style.display = 'block';
    };
    preloadImg.src = user.photoURL;
  } else {
    // No photo URL, just show initial
    console.log('No photoURL provided');
    img.style.display = 'none';
    initial.style.display = 'block';
  }
}

// ==================== AI FEATURES ====================

// Google Generative AI Setup
const GEMINI_PROXY_URL = "/api/gemini";

function generateSmartFallback(prompt, mode) {
  // Fallback when API fails
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
    
    // Call Vercel API function
    const proxyResp = await fetch(GEMINI_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: prompt, mode })
    });

    if (proxyResp.ok) {
      const proxyData = await proxyResp.json();
      const text = proxyData.result || proxyData.text || "";
      if (text) {
        console.log("Gemini API result:", text);
        return text;
      }
    }

    console.warn(`API returned ${proxyResp.status}, using smart fallback...`);
    return generateSmartFallback(prompt, mode);
  } catch (error) {
    console.error("Gemini API error:", error);
    return generateSmartFallback(prompt, mode);
  }
}

async function generateSummary() {
  const postText = document.getElementById("postText").value;
  if (!postText.trim()) {
    alert("Please write something first!");
    return;
  }

  const aiOutput = document.getElementById("aiOutput");
  aiOutput.innerHTML = "<div class='ai-output-header'>⏳ Generating summary...</div>";
  aiOutput.style.display = "block";

  const summary = await callGeminiAPI(postText, "summary");

  if (summary) {
    aiOutput.innerHTML = `<div class='ai-output-header'>📝 AI Summary</div><p>${summary}</p>`;
  } else {
    aiOutput.innerHTML = "<p style='color: #d9534f;'>Failed to generate summary. Please try again.</p>";
  }
}

async function getSuggestions() {
  const postText = document.getElementById("postText").value;
  if (!postText.trim()) {
    alert("Please write something first!");
    return;
  }

  const aiOutput = document.getElementById("aiOutput");
  aiOutput.innerHTML = "<div class='ai-output-header'>⏳ Analyzing...</div>";
  aiOutput.style.display = "block";

  const suggestions = await callGeminiAPI(postText, "suggestions");

  if (suggestions) {
    aiOutput.innerHTML = `<div class='ai-output-header'>💡 Suggestions</div><p>${suggestions.replace(/\n/g, '<br>')}</p>`;
  } else {
    aiOutput.innerHTML = "<p style='color: #d9534f;'>Failed to get suggestions. Please try again.</p>";
  }
}

async function getOutline() {
  const postText = document.getElementById("postText").value;
  if (!postText.trim()) {
    alert("Please write something first!");
    return;
  }

  const aiOutput = document.getElementById("aiOutput");
  aiOutput.innerHTML = "<div class='ai-output-header'>⏳ Creating outline...</div>";
  aiOutput.style.display = "block";

  const outline = await callGeminiAPI(postText, "outline");

  if (outline) {
    aiOutput.innerHTML = `<div class='ai-output-header'>📋 Better Structure</div><p>${outline.replace(/\n/g, '<br>')}</p>`;
  } else {
    aiOutput.innerHTML = "<p style='color: #d9534f;'>Failed to create outline. Please try again.</p>";
  }
}

async function searchWithAI(query) {
  if (!query.trim()) return [];

  const prompt = `Given a search query: "${query}"\n\nFrom this list of posts, clubs, and events in a college community, find the most relevant ones (respond with just a JSON array of matching titles or descriptions)`;
  const results = await callGeminiAPI(prompt);
  
  return results ? results.split("\n").filter(r => r.trim()) : [];
}

async function performAISearch() {
  const searchBox = document.getElementById("aiSearchBox");
  const query = searchBox.value.trim();
  
  if (!query) {
    alert("Please enter a search query!");
    return;
  }

  const resultsDiv = document.getElementById("aiSearchResults");
  resultsDiv.innerHTML = "<div class='ai-output-header'>⏳ Searching...</div>";
  resultsDiv.style.display = "block";

  const results = await callGeminiAPI(query, "search");

  if (results) {
    resultsDiv.innerHTML = `<div class='ai-output-header'>🎯 AI Search Results for "${query}"</div><p>${results.replace(/\n/g, '<br>')}</p>`;
  } else {
    resultsDiv.innerHTML = "<p style='color: #d9534f;'>Search failed. Please try again.</p>";
  }
}
