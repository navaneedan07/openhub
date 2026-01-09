// Sample data for testing and demo
// This file contains functions to seed the database with test data

async function seedDemoData() {
  const auth = firebase.auth();
  const db = firebase.firestore();
  
  // Sample posts with AI tags
  const samplePosts = [
    {
      text: "Just finished my AI project! Built a chatbot using neural networks. Really excited about machine learning.",
      authorName: "Alice Johnson",
      authorEmail: "alice@example.com",
      tags: ["AI", "machine-learning", "chatbot", "project"],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    },
    {
      text: "Anyone interested in starting a coding club? Let's meet every Friday to discuss web development, algorithms, and best practices.",
      authorName: "Bob Smith",
      authorEmail: "bob@example.com",
      tags: ["coding", "web-development", "club", "community"],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    },
    {
      text: "New hackathon next month! Looking for team members interested in building mobile apps. First prize is $1000!",
      authorName: "Carol Davis",
      authorEmail: "carol@example.com",
      tags: ["hackathon", "mobile-development", "competition", "event"],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    },
    {
      text: "Robotics club is organizing a demo day this Saturday. Come see our autonomous robots in action!",
      authorName: "David Lee",
      authorEmail: "david@example.com",
      tags: ["robotics", "engineering", "event", "demo"],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    },
    {
      text: "Research paper on blockchain technology available in the library. Great resource for anyone studying cryptography.",
      authorName: "Emily Wilson",
      authorEmail: "emily@example.com",
      tags: ["blockchain", "cryptography", "research", "resources"],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }
  ];

  // Sample events
  const sampleEvents = [
    {
      title: "Tech Talk: AI Trends in 2025",
      description: "Expert discussion on latest developments in artificial intelligence",
      date: "2025-01-10",
      time: "4:00 PM",
      location: "Seminar Hall A",
      organizer: "Tech Club",
      tags: ["AI", "technology", "talk", "event"],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    },
    {
      title: "Hackathon Prep Meetup",
      description: "Learn tips and tricks for the upcoming hackathon. Network with other developers!",
      date: "2025-01-11",
      time: "11:00 AM",
      location: "Lab 2",
      organizer: "Developer Club",
      tags: ["hackathon", "coding", "workshop", "community"],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    },
    {
      title: "Robotics Club Demo",
      description: "Watch our autonomous robots in action. See the future of robotics!",
      date: "2025-01-14",
      time: "1:00 PM",
      location: "Makerspace",
      organizer: "Robotics Club",
      tags: ["robotics", "engineering", "demo", "event"],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }
  ];

  // Sample clubs
  const sampleClubs = [
    {
      name: "Developer Student Club",
      description: "Build and learn together. We focus on web development, mobile apps, and software engineering.",
      leader: "Bob Smith",
      members: 150,
      tags: ["coding", "development", "community", "learning"],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Entrepreneurship Cell",
      description: "For aspiring entrepreneurs. We discuss startups, pitch ideas, and network.",
      leader: "Sarah Johnson",
      members: 80,
      tags: ["business", "startups", "networking", "entrepreneurship"],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "Robotics Club",
      description: "Build robots, compete, and explore automation. All levels welcome!",
      leader: "David Lee",
      members: 60,
      tags: ["robotics", "engineering", "automation", "competition"],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    },
    {
      name: "AI & Machine Learning Group",
      description: "Discuss AI, deep learning, neural networks, and their applications.",
      leader: "Alice Johnson",
      members: 120,
      tags: ["AI", "machine-learning", "neural-networks", "data-science"],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }
  ];

  try {
    // Add posts
    console.log("Adding sample posts...");
    for (const post of samplePosts) {
      await db.collection("posts").add(post);
    }

    // Add events
    console.log("Adding sample events...");
    for (const event of sampleEvents) {
      await db.collection("events").add(event);
    }

    // Add clubs
    console.log("Adding sample clubs...");
    for (const club of sampleClubs) {
      await db.collection("clubs").add(club);
    }

    console.log("✅ Demo data seeded successfully!");
    alert("Demo data loaded! Refresh the page to see recommendations.");
  } catch (error) {
    console.error("Error seeding data:", error);
    alert("Error loading demo data: " + error.message);
  }
}

// Auto-seed data on first load (optional)
// Uncomment if you want to automatically load demo data
// window.addEventListener('load', () => {
//   if (!localStorage.getItem('demoDataseeded')) {
//     seedDemoData();
//     localStorage.setItem('demoDataSeeded', 'true');
//   }
// });
