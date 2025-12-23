const auth = firebase.auth();
const db = firebase.firestore();

// Check if user is on dashboard - verify authentication
if (window.location.pathname.includes('dashboard.html')) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      // User not logged in, redirect to login
      window.location.href = "index.html";
    } else {
      // User is logged in, display user info
      displayUserInfo(user);
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

  db.collection("posts").add({
    text: text,
    authorName: user.displayName || "Anonymous",
    authorEmail: user.email,
    authorId: user.uid,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    createdAt: new Date()
  })
  .then(() => {
    // Clear the input field
    document.getElementById("postText").value = "";
  })
  .catch((error) => {
    alert("Error posting: " + error.message);
    console.error(error);
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

