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
      setProfileAvatar({
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        _avatarImgId: 'avatarImgDash',
        _avatarInitialId: 'avatarInitialDash'
      });
      initializeAI();
      loadPosts();
    }
  });
}

// Home page: show user info and recent announcements
if (window.location.pathname.includes('home.html')) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      displayUserInfo(user);
      setProfileAvatar({
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        _avatarImgId: 'avatarImg',
        _avatarInitialId: 'avatarInitial'
      });
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
      setProfileAvatar({
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        _avatarImgId: 'avatarImgEv',
        _avatarInitialId: 'avatarInitialEv'
      });
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
      setProfileAvatar({
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        _avatarImgId: 'avatarImgCl',
        _avatarInitialId: 'avatarInitialCl'
      });
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
      setProfileAvatar({
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        _avatarImgId: 'avatarImgRes',
        _avatarInitialId: 'avatarInitialRes'
      });
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
      setProfileAvatar({
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        _avatarImgId: 'avatarImgProf',
        _avatarInitialId: 'avatarInitialProf'
      });
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

async function generateSummary() {
  const text = document.getElementById("postText").value.trim();
  
  if (!text) {
    alert("Please write something to summarize!");
    return;
  }

  const aiOutput = document.getElementById("aiOutput");
  aiOutput.innerHTML = '<div class="ai-output-header">⏳ Generating Summary...</div>';
  aiOutput.style.display = "block";

  try {
    const response = await fetch('/.netlify/functions/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, mode: 'summary' }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    
    aiOutput.innerHTML = `
      <div class="ai-output-header">✨ AI Summary</div>
      <p>${escapeHtml(data.result)}</p>
    `;
  } catch (error) {
    console.error("Summary error:", error);
    aiOutput.innerHTML = '<div class="ai-output-header">❌ Error</div><p>Could not generate summary. Server error or API not configured.</p>';
  }
}

async function getSuggestions() {
  const text = document.getElementById("postText").value.trim();
  
  if (!text) {
    alert("Please write something to get suggestions!");
    return;
  }

  const aiOutput = document.getElementById("aiOutput");
  aiOutput.innerHTML = '<div class="ai-output-header">⏳ Generating Suggestions...</div>';
  aiOutput.style.display = "block";

  try {
    const response = await fetch('/.netlify/functions/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, mode: 'suggestions' }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    
    aiOutput.innerHTML = `
      <div class="ai-output-header">💡 AI Suggestions</div>
      <p>${escapeHtml(data.result)}</p>
    `;
  } catch (error) {
    console.error("Suggestions error:", error);
    aiOutput.innerHTML = '<div class="ai-output-header">❌ Error</div><p>Could not generate suggestions. Server error or API not configured.</p>';
  }
}

async function getOutline() {
  const text = document.getElementById("postText").value.trim();

  if (!text) {
    alert("Please write something to outline!");
    return;
  }

  const aiOutput = document.getElementById("aiOutput");
  aiOutput.innerHTML = '<div class="ai-output-header">⏳ Creating Outline...</div>';
  aiOutput.style.display = "block";

  try {
    const response = await fetch('/.netlify/functions/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, mode: 'outline' }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    const data = await response.json();

    aiOutput.innerHTML = `
      <div class="ai-output-header">📝 AI Outline</div>
      <p>${escapeHtml(data.result)}</p>
    `;
  } catch (error) {
    console.error("Outline error:", error);
    aiOutput.innerHTML = '<div class="ai-output-header">❌ Error</div><p>Could not generate outline. Server error or API not configured.</p>';
  }
}

async function moderateContent(text) {
  if (!model && !text) {
    return true; // Allow content if AI not available
  }

  try {
    const response = await fetch('/.netlify/functions/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, mode: 'moderate' }),
    });

    if (!response.ok) {
      return true; // Allow on server error
    }

    const data = await response.json();
    return data.result.includes("YES");
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
  if (!img || !initial) return;
  const name = user.displayName || user.email || 'U';
  const first = (name || 'U').trim().charAt(0).toUpperCase();
  
  // Always show initial first
  initial.textContent = first || 'U';
  initial.style.display = 'block';
  
  if (user.photoURL) {
    // Create a new image to preload
    const preloadImg = new Image();
    preloadImg.onload = () => {
      // Image loaded successfully, show it
      img.src = user.photoURL;
      img.style.display = 'block';
      initial.style.display = 'none';
    };
    preloadImg.onerror = () => {
      // Image failed to load, keep showing initial
      img.style.display = 'none';
      initial.style.display = 'block';
    };
    preloadImg.src = user.photoURL;
  } else {
    // No photo URL, just show initial
    img.style.display = 'none';
    initial.style.display = 'block';
  }
}

