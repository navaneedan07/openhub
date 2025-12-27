const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage ? firebase.storage() : null;
const commentUnsubscribers = {};
const commentPaging = {};
const ATTACHMENT_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB
const COMMENTS_PAGE_SIZE = 15;
let currentThreadPostId = null;
let replyContext = { parentId: null, parentAuthor: null };
const ADMIN_EMAILS = ["teamscangs@gmail.com"]; // replace with allowed admin emails

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
      checkProfileCompletion(user).then(() => {
        // User is logged in, display user info
        displayUserInfo(user);
        // Set avatar in dashboard header
        setAvatarSafe(user, 'avatarImgDash', 'avatarInitialDash');
        initializeAI();
        loadPosts();
      });
    }
  });
}

// Check if user has completed their profile
async function checkProfileCompletion(user) {
  // Skip check if already on profile page
  if (window.location.pathname.includes('profile.html')) {
    return;
  }

  try {
    const profileDoc = await db.collection("profiles").doc(user.uid).get();
    
    if (!profileDoc.exists) {
      // No profile document - redirect to profile page
      alert("Please complete your profile to continue.");
      window.location.href = "profile.html";
      throw new Error("Profile incomplete");
    }

    const data = profileDoc.data();
    const hasName = data.name && data.name.trim();
    const hasDept = data.department && data.department.trim();
    const hasYear = data.year && data.year.trim();

    if (!hasName || !hasDept || !hasYear) {
      // Profile incomplete - redirect to profile page
      alert("Please complete your profile with Name, Department, and Year to continue.");
      window.location.href = "profile.html";
      throw new Error("Profile incomplete");
    }
  } catch (err) {
    if (err.message !== "Profile incomplete") {
      console.error("Error checking profile:", err);
    }
    throw err;
  }
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
      checkProfileCompletion(user).then(() => {
        displayUserInfo(user);
        setAvatarSafe(user, 'avatarImg', 'avatarInitial');
        loadPosts();
      });
    }
  });
}

// Events page
if (window.location.pathname.includes('events.html')) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      checkProfileCompletion(user).then(() => {
        setAvatarSafe(user, 'avatarImgEv', 'avatarInitialEv');
        loadEvents();
      });
    }
  });
}

// Clubs page
if (window.location.pathname.includes('clubs.html')) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      checkProfileCompletion(user).then(() => {
        setAvatarSafe(user, 'avatarImgCl', 'avatarInitialCl');
        loadClubs();
        showAdminImportIfAllowed(user);
      });
    }
  });
}

// Resources page
if (window.location.pathname.includes('resources.html')) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      checkProfileCompletion(user).then(() => {
        setAvatarSafe(user, 'avatarImgRes', 'avatarInitialRes');
        loadResources();
      });
    }
  });
}

// Profile page
if (window.location.pathname.includes('profile.html')) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      const viewUserId = getQueryParam("userId");
      const isOwnProfile = !viewUserId || viewUserId === user.uid;
      
      displayUserInfo(user);
      
      if (isOwnProfile) {
        // Show current user's avatar
        setAvatarSafe(user, 'avatarImgProf', 'avatarInitialProf');
        bindProfileForm(user);
        loadProfileDetails(user).then(() => {
          // Check if profile is incomplete and show edit form
          db.collection("profiles").doc(user.uid).get().then(doc => {
            if (!doc.exists || !doc.data().name || !doc.data().department || !doc.data().year) {
              showProfileEditForm();
              const msg = document.getElementById("profileSaveStatus");
              if (msg) {
                msg.textContent = "⚠️ Please complete your profile";
                msg.style.color = "#d32f2f";
              }
            }
          });
        });
        loadUserProfile(user);
      } else {
        // Show other user's avatar
        loadOtherUserProfile(viewUserId);
      }
    }
  });
}

// Thread (per-post forum) page
if (window.location.pathname.includes('thread.html')) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
    } else {
      setAvatarSafe(user, 'avatarImgThread', 'avatarInitialThread');
      loadThread();
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

function clearAttachmentInputs() {
  const linkInput = document.getElementById("attachmentLink");
  const fileInput = document.getElementById("attachmentFile");
  if (linkInput) linkInput.value = "";
  if (fileInput) fileInput.value = "";
}

async function uploadAttachment(file) {
  if (!storage) {
    throw new Error("File uploads are not enabled in this build.");
  }

  if (file.size > ATTACHMENT_SIZE_LIMIT) {
    throw new Error("File too large. Max 5 MB.");
  }

  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be logged in to upload files.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `attachments/${user.uid}/${Date.now()}_${safeName}`;
  const ref = storage.ref().child(path);

  const snapshot = await ref.put(file);
  const url = await snapshot.ref.getDownloadURL();

  return {
    url,
    name: file.name,
    size: file.size,
    type: file.type || "file",
    storagePath: path,
    attachmentType: "file"
  };
}

function buildLinkAttachment(link) {
  return {
    url: link,
    name: link,
    type: "link",
    attachmentType: "link"
  };
}

function addPost() {
  const text = document.getElementById("postText").value.trim();
  const attachmentLink = (document.getElementById("attachmentLink")?.value || "").trim();
  const attachmentFile = document.getElementById("attachmentFile")?.files?.[0];
  
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

    let attachment = null;

    const processPost = async () => {
      if (attachmentFile) {
        attachment = await uploadAttachment(attachmentFile);
      } else if (attachmentLink) {
        attachment = buildLinkAttachment(attachmentLink);
      }

      // Auto-tag the post using AI
      const tags = await aiDiscovery.autoTagContent(text, "post");
      tags.forEach(tag => aiDiscovery.trackUserInterest(user.uid, tag, 1));

      await db.collection("posts").add({
        text: text,
        authorName: user.displayName || "Anonymous",
        authorEmail: user.email,
        authorId: user.uid,
        tags: tags,
        attachment: attachment,
        commentCount: 0,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: new Date()
      });

      document.getElementById("postText").value = "";
      clearAttachmentInputs();
      const aiOutput = document.getElementById("aiOutput");
      if (aiOutput) {
        aiOutput.style.display = "none";
      }
    };

    processPost().catch((error) => {
      alert("Error posting: " + error.message);
      console.error(error);
    });
  });
}

// Delete a post
async function deletePost(postId) {
  if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in to delete posts.");
    return;
  }

  try {
    const postRef = db.collection("posts").doc(postId);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      alert("Post not found.");
      return;
    }

    if (postDoc.data().authorId !== user.uid) {
      alert("You can only delete your own posts.");
      return;
    }

    // Delete all comments first
    const commentsSnap = await postRef.collection("comments").get();
    const batch = db.batch();
    commentsSnap.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the post itself
    batch.delete(postRef);
    await batch.commit();

    alert("Post deleted successfully.");
    
    // Redirect if on thread page
    if (window.location.pathname.includes('thread.html')) {
      window.location.href = 'home.html';
    } else {
      window.location.reload();
    }
  } catch (err) {
    console.error("Error deleting post:", err);
    alert("Could not delete post. Please try again.");
  }
}

function isAdminUser(user) {
  const email = (user?.email || "").toLowerCase();
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === email);
}

async function showAdminImportIfAllowed(user) {
  const section = document.getElementById('bulkClubImport');
  if (!section || !user) return;
  section.style.display = 'none';
  let allowed = isAdminUser(user);
  if (!allowed && user.getIdTokenResult) {
    try {
      const token = await user.getIdTokenResult();
      allowed = !!token.claims?.admin;
    } catch (err) {
      console.warn('Admin claim check failed', err);
    }
  }
  if (allowed) section.style.display = 'block';
}

function renderAttachment(attachment) {
  if (!attachment || !attachment.url) return "";
  const label = attachment.name || (attachment.attachmentType === "link" ? "Attachment link" : "Attachment");
  const sizeLabel = attachment.size ? ` · ${Math.round(attachment.size / 1024)} KB` : "";
  return `
    <div class="attachment-chip">
      <span class="attachment-icon">📎</span>
      <a href="${attachment.url}" target="_blank" rel="noopener">${escapeHtml(label)}</a>
      <span class="attachment-meta">${attachment.attachmentType === "link" ? "Link" : "File"}${sizeLabel}</span>
    </div>
  `;
}

function loadPosts() {
  for (const id in commentUnsubscribers) {
    try {
      commentUnsubscribers[id]();
    } catch (e) {
      console.warn("Error cleaning comment listener", e);
    }
    delete commentUnsubscribers[id];
  }

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
        const tags = data.tags || [];
        const commentCount = data.commentCount || 0;
        const authorId = data.authorId;
        const attachmentHTML = renderAttachment(data.attachment);
        const commentsContainerId = `comments-${doc.id}`;
        const commentInputId = `comment-input-${doc.id}`;
        
        const postElement = document.createElement("div");
        postElement.className = "post";
        let tagsHTML = '';
        if (tags.length > 0) {
          tagsHTML = `<div style="margin: 10px 0; display: flex; flex-wrap: wrap; gap: 6px;">
            ${tags.map(tag => `<span style="display: inline-block; background: #e4e7fb; color: #667eea; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; font-weight: 500;">#${tag}</span>`).join('')}
          </div>`;
        }
        const isOwnPost = auth.currentUser && authorId === auth.currentUser.uid;
        const deleteBtn = isOwnPost ? `<button class="ghost-btn" onclick="deletePost('${doc.id}')" style="color:#d32f2f;">🗑️ Delete</button>` : '';
        const authorLink = authorId ? `<span class="post-author" style="cursor:pointer; color:#667eea;" onclick="window.location.href='profile.html?userId=${authorId}'">👤 ${escapeHtml(data.authorName || "Anonymous")}</span>` : `<span class="post-author">👤 ${escapeHtml(data.authorName || "Anonymous")}</span>`;
        
        postElement.innerHTML = `
          <div class="post-text">${escapeHtml(data.text)}</div>
          ${tagsHTML}
          ${attachmentHTML}
          <div class="post-meta">
            ${authorLink}
            <span>⏰ ${timeString}</span>
          </div>
          <div class="post-actions">
            <button class="ghost-btn" onclick="window.location.href='thread.html?id=${doc.id}'">💬 Open forum</button>
            <span class="comment-count">💬 ${commentCount} repl${commentCount === 1 ? 'y' : 'ies'}</span>
            ${deleteBtn}
          </div>
          <div class="comments-block">
            <div id="${commentsContainerId}" class="comments-list"></div>
            <div class="comment-form">
              <input id="${commentInputId}" type="text" placeholder="Reply to this idea..." aria-label="Add a reply" />
              <button onclick="addComment('${doc.id}', '${commentInputId}')">Reply</button>
            </div>
          </div>
        `;
        postsDiv.appendChild(postElement);


        // Show follow/unfollow for the author when applicable
        setupFollowAuthorButton(authorId, data.authorName || "this user");
        subscribeToComments(doc.id, commentsContainerId);
      });
    }, (error) => {
      console.error("Error loading posts: ", error);
      document.getElementById("posts").innerHTML = '<div class="no-posts">Error loading posts. Please refresh.</div>';
    });
}

function subscribeToComments(postId, containerId, allowReply = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (commentUnsubscribers[postId]) {
    commentUnsubscribers[postId]();
  }

  commentUnsubscribers[postId] = db.collection("posts")
    .doc(postId)
    .collection("comments")
    .orderBy("timestamp", "asc")
    .limit(20)
    .onSnapshot((snap) => renderComments(snap, container, allowReply, postId));
}

function renderComments(snapshot, container, allowReply = false, postId = null, append = false) {
  const fragments = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    const timestamp = data.timestamp ? data.timestamp.toDate() : new Date();
    const replyLabel = data.parentCommentId ? '<div class="comment-reply-label">↳ Replying to a comment</div>' : '';
    const safeAuthor = escapeForAttr(data.authorName || "Member");
    const replyBtn = allowReply && postId ? `<button class="ghost-btn" onclick="startReply('${doc.id}', '${safeAuthor}')">Reply</button>` : '';
    fragments.push(`
      <div class="comment${data.parentCommentId ? ' comment-nested' : ''}">
        ${replyLabel}
        <div class="comment-text">${highlightMentions(data.text || "")}</div>
        <div class="comment-meta">
          <span class="comment-author">${escapeHtml(data.authorName || "Member")}</span>
          <span>${formatTime(timestamp)}</span>
        </div>
        ${replyBtn ? `<div class="comment-actions">${replyBtn}</div>` : ''}
      </div>
    `);
  });

  if (append && container.innerHTML) {
    container.innerHTML = container.innerHTML + fragments.join("");
  } else {
    container.innerHTML = fragments.join("") || '<div class="no-comments">No replies yet. Start the conversation!</div>';
  }
}

function focusCommentInput(inputId) {
  const el = document.getElementById(inputId);
  if (el) el.focus();
}

async function addComment(postId, inputId, parentCommentId = null) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const text = input.value.trim();

  if (!text) return;

  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in to reply.");
    return;
  }

  const isClean = await moderateContent(text);
  if (!isClean) {
    alert("Your reply contains inappropriate content. Please revise.");
    return;
  }

  const mentions = extractMentions(text);
  const postRef = db.collection("posts").doc(postId);
  const commentsRef = postRef.collection("comments");
  const commentRef = commentsRef.doc();

  try {
    await db.runTransaction(async (tx) => {
      const postSnap = await tx.get(postRef);
      const currentCount = (postSnap.exists && postSnap.data().commentCount) ? postSnap.data().commentCount : 0;

      tx.set(commentRef, {
        text,
        mentions,
        parentCommentId: parentCommentId || null,
        authorName: user.displayName || "Anonymous",
        authorEmail: user.email,
        authorId: user.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: new Date()
      });

      tx.update(postRef, { commentCount: currentCount + 1 });
    });

    input.value = "";
    clearReplyTarget();
  } catch (error) {
    console.error("Error adding comment", error);
    alert("Could not add reply. Please try again.");
  }
}

function clearReplyTarget() {
  replyContext = { parentId: null, parentAuthor: null };
  const pill = document.getElementById("replyTarget");
  const label = document.getElementById("replyTargetName");
  if (pill) pill.style.display = "none";
  if (label) label.textContent = "";
}

function startReply(parentId, authorName) {
  replyContext = { parentId, parentAuthor: authorName || "member" };
  const pill = document.getElementById("replyTarget");
  const label = document.getElementById("replyTargetName");
  if (label) label.textContent = authorName ? `Replying to ${authorName}` : "Replying to a comment";
  if (pill) pill.style.display = "inline-flex";
  const input = document.getElementById("threadCommentInput");
  if (input) {
    input.focus();
    input.placeholder = `@${(authorName || "member").replace(/\s+/g, '')} ...`;
  }
}

async function loadCommentsPage(postId, append = false, allowReply = false) {
  const container = document.getElementById(`comments-${postId}`) || document.getElementById("threadComments");
  const loadMoreBtn = document.getElementById(`loadMore-${postId}`);
  if (!container) return;

  commentPaging[postId] = commentPaging[postId] || { last: null, done: false };
  const state = commentPaging[postId];
  if (state.done) return;

  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Loading replies...";
  }

  try {
    let query = db.collection("posts")
      .doc(postId)
      .collection("comments")
      .orderBy("timestamp", "asc")
      .limit(COMMENTS_PAGE_SIZE);

    if (state.last) {
      query = query.startAfter(state.last);
    }

    const snap = await query.get();

    if (snap.empty && !append) {
      container.innerHTML = '<div class="no-comments">No replies yet. Start the conversation!</div>';
      state.done = true;
    } else {
      renderComments(snap, container, allowReply, postId, append);
      if (snap.docs.length > 0) {
        state.last = snap.docs[snap.docs.length - 1];
      }
      if (snap.size < COMMENTS_PAGE_SIZE) {
        state.done = true;
      }
    }
  } catch (error) {
    console.error("Error loading comments page", error);
  } finally {
    if (loadMoreBtn) {
      loadMoreBtn.disabled = commentPaging[postId].done;
      loadMoreBtn.textContent = commentPaging[postId].done ? "No more replies" : "Load more replies";
    }
  }
}

function loadMoreComments(postId) {
  loadCommentsPage(postId, true, true);
}

async function loadThread() {
  const postId = getQueryParam("id");
  const postContainer = document.getElementById("threadPost");
  const commentsContainerId = "threadComments";
  const commentInputId = "threadCommentInput";

  if (!postId) {
    if (postContainer) {
      postContainer.innerHTML = '<div class="no-posts">Missing post id.</div>';
    }
    return;
  }

  try {
    const doc = await db.collection("posts").doc(postId).get();
    if (!doc.exists) {
      postContainer.innerHTML = '<div class="no-posts">Post not found.</div>';
      return;
    }

    const data = doc.data();
    // Ensure commentCount exists for legacy posts
    if (data.commentCount === undefined) {
      await db.collection("posts").doc(postId).set({ commentCount: 0 }, { merge: true });
      data.commentCount = 0;
    }
    const timestamp = data.timestamp ? data.timestamp.toDate() : new Date(data.createdAt);
    const authorId = data.authorId;
    const tags = data.tags || [];
    const attachmentHTML = renderAttachment(data.attachment);

    const tagsHTML = tags.length
      ? `<div style="margin: 10px 0; display: flex; flex-wrap: wrap; gap: 6px;">${tags.map(tag => `<span style="display: inline-block; background: #e4e7fb; color: #667eea; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; font-weight: 500;">#${tag}</span>`).join('')}</div>`
      : "";

    currentThreadPostId = doc.id;
    commentPaging[doc.id] = { last: null, done: false };

    const isOwnPost = auth.currentUser && authorId === auth.currentUser.uid;
    const deleteBtn = isOwnPost ? `<button class="ghost-btn" onclick="deletePost('${doc.id}')" style="color:#d32f2f; margin-top:10px;">🗑️ Delete this post</button>` : '';
    const authorLink = authorId ? `<span class="post-author" style="cursor:pointer; color:#667eea;" onclick="window.location.href='profile.html?userId=${authorId}'">👤 ${escapeHtml(data.authorName || "Anonymous")}</span>` : `<span class="post-author">👤 ${escapeHtml(data.authorName || "Anonymous")}</span>`;

    postContainer.innerHTML = `
      <div class="post">
        <div class="post-text">${escapeHtml(data.text)}</div>
        ${tagsHTML}
        ${attachmentHTML}
        <div class="post-meta">
          ${authorLink}
          <span>⏰ ${formatTime(timestamp)}</span>
          <span id="followAuthorContainer" style="margin-left:10px;"></span>
        </div>
        ${deleteBtn}
      </div>
      <div class="comments-block">
        <div id="${commentsContainerId}" class="comments-list"></div>
        <div id="replyTarget" class="reply-target" style="display:none;">
          <span id="replyTargetName"></span>
          <button class="ghost-btn" onclick="clearReplyTarget()">Cancel</button>
        </div>
        <div class="comment-form">
          <input id="${commentInputId}" type="text" placeholder="Share your reply or suggestion..." aria-label="Add a reply" />
          <button onclick="addComment('${doc.id}', '${commentInputId}', replyContext.parentId)">Reply</button>
        </div>
        <button id="loadMore-${doc.id}" class="ghost-btn load-more-btn" onclick="loadMoreComments('${doc.id}')">Load more replies</button>
      </div>
    `;

    await loadCommentsPage(doc.id, false, true);
  } catch (error) {
    console.error("Error loading thread", error);
    if (postContainer) {
      postContainer.innerHTML = '<div class="no-posts">Could not load this forum thread.</div>';
    }
  }
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
          { title: "MITAFEST", when: "TBA", where: "MIT Campus" },
          { title: "Homefest", when: "TBA", where: "MIT Campus" },
          { title: "Prayatna", when: "TBA", where: "MIT Campus" },
        ]);
      } else {
        renderEvents(items.map(e => ({ title: e.title, when: e.when || e.dateText || "", where: e.location || "" })));
      }
    })
    .catch(() => {
      renderEvents([
        { title: "MITAFEST", when: "TBA", where: "Campus" },
        { title: "Homefest", when: "TBA", where: "Campus" },
        { title: "Prayatna", when: "TBA", where: "Campus" },
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
  const defaultClubs = [
    { id: "hostel", name: "Hostel", desc: "Residential community and activities.", icon: "🛏️" },
    { id: "nss", name: "NSS", desc: "National Service Scheme.", icon: "🙌" },
    { id: "nso", name: "NSO", desc: "National Sports Organization.", icon: "🏀" },
    { id: "yrc", name: "YRC", desc: "Youth Red Cross.", icon: "🩹" },
    { id: "athenaeum", name: "Athenaeum", desc: "Literary and library society.", icon: "📚" },
    { id: "pda", name: "PDA", desc: "Personality development association.", icon: "🧠" },
    { id: "tamil-mandram", name: "Tamil Mandram", desc: "Tamil culture and literature.", icon: "🎭" },
    { id: "rotaract-club", name: "Rotaract Club", desc: "Community service and leadership.", icon: "🙂" },
    { id: "computer-society", name: "Computer Society", desc: "Tech talks and projects.", icon: "💻" },
    { id: "tbo", name: "TBO", desc: "Events and coordination.", icon: "🎟️" },
    { id: "mit-quill", name: "MIT Quill", desc: "Writing and editorial club.", icon: "🪶" },
    { id: "variety-team", name: "Variety Team", desc: "Cultural and performances team.", icon: "🎭" },
    { id: "museum", name: "Museum", desc: "Heritage and archives.", icon: "🏛️" },
    { id: "mitra", name: "MITRA", desc: "Robotics and innovation.", icon: "🤖" },
    { id: "tedc", name: "TEDC", desc: "Entrepreneurship and development.", icon: "💡" }
  ];
  db.collection("clubs").orderBy("name", "asc").limit(50).get()
    .then((snap) => {
      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      if (items.length === 0) {
        renderClubs(defaultClubs);
      } else {
        renderClubs(items.map(c => ({ id: c.id, name: c.name, desc: c.description || "", icon: c.icon || "🔰" })));
      }
    })
    .catch(() => {
      renderClubs(defaultClubs);
    });
}

function renderClubs(list) {
  const target = document.getElementById("clubsList");
  target.innerHTML = "";
  list.forEach((c) => {
    const el = document.createElement("div");
    el.className = "card";
    const icon = c.icon || "🔰";
    el.innerHTML = `<div class="club-icon">${icon}</div><h4>${escapeHtml(c.name)}</h4><p>${escapeHtml(c.desc)}</p>`;
    const btn = document.createElement("button");
    btn.textContent = "Join";
    btn.style.marginTop = "8px";
    btn.onclick = () => joinClub(c.id, c.name);
    el.appendChild(btn);
    target.appendChild(el);
  });
}

async function bulkAddClubs() {
  const ta = document.getElementById('clubImportText');
  const status = document.getElementById('clubImportStatus');
  const user = auth.currentUser;
  if (!ta || !user) return;
  const lines = ta.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    if (status) status.textContent = 'Nothing to add.';
    return;
  }
  try {
    let added = 0;
    for (const line of lines) {
      const [name, desc] = line.split(/\s*-\s*/, 2);
      await db.collection('clubs').add({
        name: name || line,
        description: desc || '',
        createdBy: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        tags: []
      });
      added++;
    }
    if (status) status.textContent = `Added ${added} club(s).`;
    ta.value = '';
    loadClubs();
  } catch (e) {
    console.error('Bulk add clubs failed', e);
    if (status) status.textContent = 'Failed to add clubs.';
  }
}

async function seedDefaultClubs() {
  const user = auth.currentUser;
  if (!user) return;
  const status = document.getElementById('clubImportStatus');
  const defaults = [
    { name: "Hostel", description: "Residential community and activities.", icon: "🛏️" },
    { name: "NSS", description: "National Service Scheme.", icon: "🙌" },
    { name: "NSO", description: "National Sports Organization.", icon: "🏀" },
    { name: "YRC", description: "Youth Red Cross.", icon: "🩹" },
    { name: "Athenaeum", description: "Literary and library society.", icon: "📚" },
    { name: "PDA", description: "Personality development association.", icon: "🧠" },
    { name: "Tamil Mandram", description: "Tamil culture and literature.", icon: "🎭" },
    { name: "Rotaract Club", description: "Community service and leadership.", icon: "🙂" },
    { name: "Computer Society", description: "Tech talks and projects.", icon: "💻" },
    { name: "TBO", description: "Events and coordination.", icon: "🎟️" },
    { name: "MIT Quill", description: "Writing and editorial club.", icon: "🪶" },
    { name: "Variety Team", description: "Cultural and performances team.", icon: "🎭" },
    { name: "Museum", description: "Heritage and archives.", icon: "🏛️" },
    { name: "MITRA", description: "Robotics and innovation.", icon: "🤖" },
    { name: "TEDC", description: "Entrepreneurship and development.", icon: "💡" }
  ];
  try {
    let added = 0;
    for (const c of defaults) {
      await db.collection('clubs').add({
        name: c.name,
        description: c.description,
        icon: c.icon,
        createdBy: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        tags: []
      });
      added++;
    }
    if (status) status.textContent = `Seeded ${added} default clubs.`;
    loadClubs();
  } catch (e) {
    console.error('Seeding default clubs failed', e);
    if (status) status.textContent = 'Failed to seed default clubs.';
  }
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

function bindProfileForm(user) {
  const saveBtn = document.getElementById("profileSaveBtn");
  const editBtn = document.getElementById("profileEditBtn");
  const cancelBtn = document.getElementById("profileCancelBtn");
  if (saveBtn) saveBtn.onclick = () => saveProfileDetails();
  if (editBtn) editBtn.onclick = () => showProfileEditForm();
  if (cancelBtn) cancelBtn.onclick = () => hideProfileEditForm();
}

function showProfileEditForm() {
  document.getElementById("profileDisplayCard").style.display = "none";
  document.getElementById("profileEditCard").style.display = "block";
}

function hideProfileEditForm() {
  document.getElementById("profileDisplayCard").style.display = "block";
  document.getElementById("profileEditCard").style.display = "none";
  setProfileStatus("");
}

function setProfileStatus(text, color = "#4a5bdc") {
  const status = document.getElementById("profileSaveStatus");
  if (status) {
    status.textContent = text || "";
    status.style.color = color;
  }
}

function loadProfileDetails(user) {
  const nameInput = document.getElementById("profileName");
  const deptInput = document.getElementById("profileDept");
  const yearInput = document.getElementById("profileYear");
  const regInput = document.getElementById("profileReg");
  if (!nameInput || !deptInput || !yearInput || !regInput || !user) return Promise.resolve();

  return db.collection("profiles").doc(user.uid).get()
    .then((doc) => {
      const data = doc.exists ? doc.data() : {};
      const name = data.name || user.displayName || "";
      const dept = data.department || "";
      const year = data.year || "";
      const reg = data.registrationNumber || "";
      
      // Update form inputs
      nameInput.value = name;
      deptInput.value = dept;
      yearInput.value = year;
      regInput.value = reg;
      
      // Update display spans
      updateProfileDisplay(name, dept, year, reg);

      // Update follower/following counts in header (defaults to 0)
      const followerCountEl = document.getElementById("followerCount");
      const followingCountEl = document.getElementById("followingCount");
      if (followerCountEl) followerCountEl.textContent = String(data.followerCount || 0);
      if (followingCountEl) followingCountEl.textContent = String(data.followingCount || 0);
      
      // Update avatar with saved photo from Firestore
      if (data.photoURL) {
        const userWithPhoto = { ...user, photoURL: data.photoURL };
        setProfileAvatar(userWithPhoto);
      }
    })
    .catch((err) => {
      console.error("Error loading profile details", err);
    });
}

function updateProfileDisplay(name, dept, year, reg) {
  const displayName = document.getElementById("displayName");
  const displayDept = document.getElementById("displayDept");
  const displayYear = document.getElementById("displayYear");
  const displayReg = document.getElementById("displayReg");
  
  if (displayName) displayName.textContent = name || "Not set";
  if (displayDept) displayDept.textContent = dept || "Not set";
  if (displayYear) displayYear.textContent = year || "Not set";
  if (displayReg) displayReg.textContent = reg || "Not set";
  
  // Update header display
  const headerName = document.getElementById("profileDisplayName");
  const headerTitle = document.getElementById("profileDisplayTitle");
  if (headerName) headerName.textContent = name || "User";
  if (headerTitle && dept && year) {
    headerTitle.textContent = `${year}${year ? getSuffix(year) : ''} Year ${dept || ''} Student at MIT`;
  } else if (dept) {
    headerTitle.textContent = `${dept} Student at MIT`;
  }
}

function getSuffix(year) {
  const y = parseInt(year);
  if (isNaN(y)) return '';
  if (y === 1) return 'st';
  if (y === 2) return 'nd';
  if (y === 3) return 'rd';
  return 'th';
}

// --- Followers / Following ---
async function followUser(targetUserId) {
  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in to follow someone.");
    return;
  }
  if (targetUserId === user.uid) return;

  const followingDoc = db.collection("following").doc(user.uid).collection("users").doc(targetUserId);
  const followerDoc = db.collection("followers").doc(targetUserId).collection("users").doc(user.uid);
  const myProfile = db.collection("profiles").doc(user.uid);
  const targetProfile = db.collection("profiles").doc(targetUserId);

  try {
    await db.runTransaction(async (tx) => {
      const alreadyFollowing = await tx.get(followingDoc);
      if (alreadyFollowing.exists) {
        return; // no-op if already following
      }
      tx.set(followingDoc, {
        userId: targetUserId,
        followedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      tx.set(followerDoc, {
        userId: user.uid,
        followedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      tx.update(myProfile, { followingCount: firebase.firestore.FieldValue.increment(1) });
      tx.update(targetProfile, { followerCount: firebase.firestore.FieldValue.increment(1) });
    });
  } catch (err) {
    console.error("Error following user", err);
    alert("Could not follow. Please try again.");
  }
}

async function unfollowUser(targetUserId) {
  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in to unfollow.");
    return;
  }
  if (targetUserId === user.uid) return;

  const followingDoc = db.collection("following").doc(user.uid).collection("users").doc(targetUserId);
  const followerDoc = db.collection("followers").doc(targetUserId).collection("users").doc(user.uid);
  const myProfile = db.collection("profiles").doc(user.uid);
  const targetProfile = db.collection("profiles").doc(targetUserId);

  try {
    await db.runTransaction(async (tx) => {
      const rel = await tx.get(followingDoc);
      if (!rel.exists) return; // no-op if not following

      tx.delete(followingDoc);
      tx.delete(followerDoc);
      tx.update(myProfile, { followingCount: firebase.firestore.FieldValue.increment(-1) });
      tx.update(targetProfile, { followerCount: firebase.firestore.FieldValue.increment(-1) });
    });
  } catch (err) {
    console.error("Error unfollowing user", err);
    alert("Could not unfollow. Please try again.");
  }
}

// Wire follow/unfollow UI for a target user (e.g., thread author)
async function setupFollowAuthorButton(targetUserId, targetName = "user") {
  const container = document.getElementById("followAuthorContainer");
  const current = auth.currentUser;
  if (!container) return;

  // Do not show if missing target or self
  if (!targetUserId || !current || targetUserId === current.uid) {
    container.innerHTML = "";
    return;
  }

  // Base button element
  container.innerHTML = `<button id="followAuthorBtn" style="margin-left:10px; padding:6px 12px; border:1px solid #667eea; background:#fff; color:#667eea; border-radius:6px; font-weight:600; cursor:pointer; font-size:12px;">Follow</button>`;
  const btn = document.getElementById("followAuthorBtn");
  if (!btn) return;

  const setState = (isFollowing, loading = false) => {
    btn.textContent = loading ? "..." : isFollowing ? "Following" : "Follow";
    btn.style.opacity = loading ? "0.6" : "1";
    btn.disabled = loading;
  };

  // Check current follow state
  try {
    const doc = await db.collection("following").doc(current.uid).collection("users").doc(targetUserId).get();
    let isFollowing = doc.exists;
    setState(isFollowing);

    btn.onclick = async () => {
      setState(isFollowing, true);
      try {
        if (isFollowing) {
          await unfollowUser(targetUserId);
        } else {
          await followUser(targetUserId);
        }
        isFollowing = !isFollowing;
        setState(isFollowing);
      } catch (err) {
        console.error("Follow toggle failed", err);
        setState(isFollowing);
        alert(`Could not update follow for ${targetName}. Please try again.`);
      }
    };
  } catch (err) {
    console.error("Error checking follow state", err);
    container.innerHTML = "";
  }
}

function saveProfileDetails() {
  const user = auth.currentUser;
  if (!user) {
    alert("You must be logged in to save your profile.");
    return;
  }

  const nameInput = document.getElementById("profileName");
  const deptInput = document.getElementById("profileDept");
  const yearInput = document.getElementById("profileYear");
  const regInput = document.getElementById("profileReg");
  const photoInput = document.getElementById("profilePhoto");
  if (!nameInput || !deptInput || !yearInput || !regInput) return;

  const name = nameInput.value.trim();
  const department = deptInput.value.trim();
  const year = yearInput.value.trim();
  const registrationNumber = regInput.value.trim();

  if (!name) {
    setProfileStatus("Name is required", "#d32f2f");
    return;
  }

  setProfileStatus("Saving...");

  // If a photo is selected, resize and encode it first
  if (photoInput && photoInput.files.length > 0) {
    resizeAndEncodeImage(photoInput.files[0], (base64Data) => {
      saveProfileData(user, name, department, year, registrationNumber, base64Data);
    });
  } else {
    // No photo selected, just save existing data
    saveProfileData(user, name, department, year, registrationNumber, user.photoURL || "");
  }
}

async function resizeAndEncodeImage(file, callback) {
  // Resize to 200x200 and convert to base64
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 200;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      // Draw image centered and cropped
      const scale = Math.max(size / img.width, size / img.height);
      const x = (size - img.width * scale) / 2;
      const y = (size - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      
      // Convert to base64 (JPEG with 0.8 quality to keep size down)
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      
      // Check size (Firestore limit is 1MB per document)
      if (base64.length > 500000) {
        setProfileStatus("Photo too large after compression", "#d32f2f");
        return;
      }
      
      callback(base64);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function saveProfileData(user, name, department, year, registrationNumber, photoURL) {
  db.collection("profiles").doc(user.uid).set({
    name,
    department,
    year,
    registrationNumber,
    photoURL: photoURL || "",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })
    .then(() => {
      setProfileStatus("Saved!", "#2e7d32");
      updateProfileDisplay(name, department, year, registrationNumber);
      document.getElementById("profilePhoto").value = "";
      setTimeout(() => hideProfileEditForm(), 800);
    })
    .catch((err) => {
      console.error("Error saving profile", err);
      setProfileStatus("Could not save", "#d32f2f");
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
      })
      .catch((err) => {
        console.error("Error loading user posts", err);
        postsTarget.innerHTML = '<div class="no-posts">Could not load your posts.</div>';
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
      })
      .catch((err) => {
        console.error("Error loading user clubs", err);
        clubsTarget.innerHTML = '<div class="no-posts">Could not load your clubs.</div>';
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

function escapeForAttr(text) {
  return String(text || '').replace(/['"\\]/g, '_');
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

function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

// Load another user's profile
async function loadOtherUserProfile(userId) {
  if (!userId) return;

  try {
    // Hide edit button and form for other users
    const editBtn = document.getElementById("profileEditBtn");
    const editCard = document.getElementById("profileEditCard");
    if (editBtn) editBtn.style.display = "none";
    if (editCard) editCard.style.display = "none";

    // Load target user's profile data
    const profileDoc = await db.collection("profiles").doc(userId).get();
    
    let name = "User";
    let dept = "";
    let year = "";
    let reg = "";
    let followerCount = 0;
    let followingCount = 0;
    let photoURL = null;
    let displayName = null;

    if (profileDoc.exists) {
      const data = profileDoc.data();
      name = data.name || "User";
      dept = data.department || "";
      year = data.year || "";
      reg = data.registrationNumber || "";
      followerCount = data.followerCount || 0;
      followingCount = data.followingCount || 0;
      photoURL = data.photoURL || null;
      displayName = name;
    } else {
      // Profile doesn't exist - try to get basic info from posts
      const postsSnap = await db.collection("posts").where("authorId", "==", userId).limit(1).get();
      if (!postsSnap.empty) {
        const postData = postsSnap.docs[0].data();
        name = postData.authorName || "User";
        displayName = postData.authorName;
      }
      
      // Create a basic profile document
      await db.collection("profiles").doc(userId).set({
        name: name,
        department: "",
        year: "",
        registrationNumber: "",
        photoURL: null,
        followerCount: 0,
        followingCount: 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // Set other user's avatar with their photoURL
    setProfileAvatar({
      displayName: displayName || name,
      email: "",
      photoURL: photoURL,
      _avatarImgId: 'avatarImgProf',
      _avatarInitialId: 'avatarInitialProf'
    });

    // Update display
    updateProfileDisplay(name, dept, year, reg);

    // Update follower/following counts
    const followerCountEl = document.getElementById("followerCount");
    const followingCountEl = document.getElementById("followingCount");
    if (followerCountEl) followerCountEl.textContent = String(followerCount);
    if (followingCountEl) followingCountEl.textContent = String(followingCount);

    // Add follow button in header
    const headerActionsContainer = document.getElementById("profileEditBtn").parentElement;
    const followBtnContainer = document.createElement("div");
    followBtnContainer.id = "profileFollowContainer";
    followBtnContainer.style.cssText = "margin-left:12px;";
    headerActionsContainer.appendChild(followBtnContainer);
    
    await setupProfileFollowButton(userId, name);

    // Load their posts and clubs
    loadOtherUserPosts(userId);
    loadOtherUserClubs(userId);
  } catch (err) {
    console.error("Error loading other user profile", err);
  }
}

// Setup follow button on profile page
async function setupProfileFollowButton(targetUserId, targetName = "user") {
  const container = document.getElementById("profileFollowContainer");
  const current = auth.currentUser;
  if (!container || !targetUserId || !current || targetUserId === current.uid) {
    if (container) container.innerHTML = "";
    return;
  }

  container.innerHTML = `<button id="profileFollowBtn" style="padding:10px 24px; border:1px solid #667eea; background:#fff; color:#667eea; border-radius:8px; font-weight:600; cursor:pointer; font-size:14px;">Follow</button>`;
  const btn = document.getElementById("profileFollowBtn");
  if (!btn) return;

  const setState = (isFollowing, loading = false) => {
    btn.textContent = loading ? "..." : isFollowing ? "✓ Following" : "Follow";
    btn.style.opacity = loading ? "0.6" : "1";
    btn.disabled = loading;
    if (isFollowing) {
      btn.style.background = "#667eea";
      btn.style.color = "#fff";
    } else {
      btn.style.background = "#fff";
      btn.style.color = "#667eea";
    }
  };

  try {
    const doc = await db.collection("following").doc(current.uid).collection("users").doc(targetUserId).get();
    let isFollowing = doc.exists;
    setState(isFollowing);

    btn.onclick = async () => {
      setState(isFollowing, true);
      try {
        if (isFollowing) {
          await unfollowUser(targetUserId);
        } else {
          await followUser(targetUserId);
        }
        isFollowing = !isFollowing;
        setState(isFollowing);
        
        // Update count display
        const followerCountEl = document.getElementById("followerCount");
        if (followerCountEl) {
          const currentCount = parseInt(followerCountEl.textContent) || 0;
          followerCountEl.textContent = String(currentCount + (isFollowing ? 1 : -1));
        }
      } catch (err) {
        console.error("Follow toggle failed", err);
        setState(isFollowing);
        alert(`Could not update follow for ${targetName}.`);
      }
    };
  } catch (err) {
    console.error("Error checking follow state", err);
    container.innerHTML = "";
  }
}

function loadOtherUserPosts(userId) {
  const postsTarget = document.getElementById("userPosts");
  if (!postsTarget) return;

  db.collection("posts").where("authorId", "==", userId).orderBy("timestamp", "desc").limit(50).get()
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
          <div class="post-meta"><span class="post-author">👤 ${escapeHtml(data.authorName || "User")}</span><span>⏰ ${timeString}</span></div>
        `;
        postsTarget.appendChild(el);
      });
    })
    .catch((err) => {
      console.error("Error loading user posts", err);
      postsTarget.innerHTML = '<div class="no-posts">Could not load posts.</div>';
    });
}

function loadOtherUserClubs(userId) {
  const clubsTarget = document.getElementById("userClubs");
  if (!clubsTarget) return;

  db.collection("club_members").where("userId", "==", userId).limit(50).get()
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
        el.innerHTML = `<h4>${escapeHtml(d.clubName)}</h4><p>Member</p>`;
        clubsTarget.appendChild(el);
      });
    })
    .catch((err) => {
      console.error("Error loading user clubs", err);
      clubsTarget.innerHTML = '<div class="no-posts">Could not load clubs.</div>';
    });
}

function extractMentions(text) {
  const matches = text.match(/@([A-Za-z0-9._-]{2,30})/g) || [];
  return Array.from(new Set(matches.map(m => m.replace('@', ''))));
}

function highlightMentions(text) {
  return escapeHtml(text).replace(/@([A-Za-z0-9._-]{2,30})/g, '<span class="mention">@$1</span>');
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

async function moderateContent(text) {
  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `Is this text appropriate for a college community platform? Check for: offensive language, spam, harassment. Reply with YES or NO only:\n\n"${text}"`,
        mode: "moderate"
      })
    });

    if (response.ok) {
      const data = await response.json();
      return /yes/i.test(data.result);
    }
    return true; // Default to approve if API fails
  } catch (error) {
    console.error("Error moderating content:", error);
    return true; // Default to approve if API fails
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
  const query = searchBox.value.trim().toLowerCase();
  
  if (!query) {
    alert("Please enter a search query!");
    return;
  }

  const resultsDiv = document.getElementById("aiSearchResults");
  resultsDiv.innerHTML = "<div class='ai-output-header'>⏳ Searching with AI...</div>";
  resultsDiv.style.display = "block";

  try {
    // Search posts, events, and clubs that match the query
    const postsSnapshot = await db.collection("posts").limit(50).get();
    const eventsSnapshot = await db.collection("events").limit(50).get();
    const clubsSnapshot = await db.collection("clubs").limit(50).get();

    let allResults = [];

    // Check posts
    postsSnapshot.forEach(doc => {
      const data = doc.data();
      const text = data.text?.toLowerCase() || "";
      const tags = (data.tags || []).map(t => t.toLowerCase());
      
      if (text.includes(query) || tags.some(t => t.includes(query))) {
        allResults.push({
          type: "📝 Post",
          title: text.substring(0, 60) + "...",
          author: data.authorName,
          tags: data.tags || [],
          relevance: text.includes(query) ? "High" : "Medium"
        });
      }
    });

    // Check events
    eventsSnapshot.forEach(doc => {
      const data = doc.data();
      const name = data.name?.toLowerCase() || "";
      const description = data.description?.toLowerCase() || "";
      const tags = (data.tags || []).map(t => t.toLowerCase());
      
      if (name.includes(query) || description.includes(query) || tags.some(t => t.includes(query))) {
        allResults.push({
          type: "📅 Event",
          title: data.name,
          author: data.organizer || "OpenHub",
          tags: data.tags || [],
          relevance: name.includes(query) ? "High" : "Medium"
        });
      }
    });

    // Check clubs
    clubsSnapshot.forEach(doc => {
      const data = doc.data();
      const name = data.name?.toLowerCase() || "";
      const description = data.description?.toLowerCase() || "";
      const tags = (data.tags || []).map(t => t.toLowerCase());
      
      if (name.includes(query) || description.includes(query) || tags.some(t => t.includes(query))) {
        allResults.push({
          type: "🤝 Club",
          title: data.name,
          author: data.leader || "OpenHub",
          tags: data.tags || [],
          relevance: name.includes(query) ? "High" : "Medium"
        });
      }
    });

    if (allResults.length === 0) {
      resultsDiv.innerHTML = `<div class='ai-output-header'>😔 No results found for "${query}"</div>
        <p>Try searching for topics like: "coding", "event", "club", "project"</p>`;
      return;
    }

    // Display results
    let resultsHTML = `<div class='ai-output-header'>🎯 Found ${allResults.length} result${allResults.length !== 1 ? 's' : ''} for "${query}"</div>`;
    
    allResults.slice(0, 10).forEach(result => {
      resultsHTML += `
        <div style="padding: 12px; margin-bottom: 10px; background: #f8f9ff; border-left: 4px solid #667eea; border-radius: 4px;">
          <div style="font-weight: 600; color: #667eea; margin-bottom: 5px;">${result.type}</div>
          <div style="color: #333; margin-bottom: 5px; font-weight: 500;">${result.title}</div>
          <div style="font-size: 0.85em; color: #666; margin-bottom: 5px;">By ${result.author}</div>
          ${result.tags.length > 0 ? `<div style="font-size: 0.8em;">${result.tags.slice(0, 3).map(t => `<span style="display: inline-block; background: #e4e7fb; padding: 2px 6px; border-radius: 3px; margin-right: 5px; margin-bottom: 4px;">${t}</span>`).join('')}</div>` : ''}
          <div style="font-size: 0.8em; color: #667eea; margin-top: 5px;">Relevance: ${result.relevance}</div>
        </div>
      `;
    });

    resultsDiv.innerHTML = resultsHTML;
  } catch (error) {
    console.error("Search error:", error);
    resultsDiv.innerHTML = "<p style='color: #d9534f;'>Search failed. Please try again.</p>";
  }
}
// Add this to app.js after getSuffix function
function switchTab(tabName) {
  // Hide all tab contents
  const contents = document.querySelectorAll('.tab-content');
  contents.forEach(c => c.style.display = 'none');
  
  // Remove active state from all tabs
  const tabs = document.querySelectorAll('.profile-tab');
  tabs.forEach(t => {
    t.style.borderBottomColor = 'transparent';
    t.style.color = '#666';
    t.style.fontWeight = '400';
  });
  
  // Show selected content and activate tab
  if (tabName === 'overview') {
    document.getElementById('contentOverview').style.display = 'block';
    const tab = document.getElementById('tabOverview');
    tab.style.borderBottomColor = '#667eea';
    tab.style.color = '#667eea';
    tab.style.fontWeight = '600';
  } else if (tabName === 'posts') {
    document.getElementById('contentPosts').style.display = 'block';
    const tab = document.getElementById('tabPosts');
    tab.style.borderBottomColor = '#667eea';
    tab.style.color = '#667eea';
    tab.style.fontWeight = '600';
  } else if (tabName === 'clubs') {
    document.getElementById('contentClubs').style.display = 'block';
    const tab = document.getElementById('tabClubs');
    tab.style.borderBottomColor = '#667eea';
    tab.style.color = '#667eea';
    tab.style.fontWeight = '600';
  }
}
