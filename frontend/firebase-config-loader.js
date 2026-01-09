// Firebase Configuration Loader
// NOTE: Firebase client API keys are PUBLIC by design and safe to expose in client-side code.
// Security is enforced through Firestore Security Rules and authorized domains in Firebase Console.
// See: https://firebase.google.com/docs/projects/api-keys

(function() {
  // Try to load from local firebase-config.js first (gitignored, for development)
  if (typeof firebaseConfig !== 'undefined') {
    window.firebaseConfig = firebaseConfig;
  } else {
    // Fallback config for deployed environments
    // This is PUBLIC and safe - Firebase security relies on:
    // 1. Firestore Security Rules (already configured)
    // 2. Authorized domains in Firebase Console
    // 3. API restrictions in Google Cloud Console
    window.firebaseConfig = {
      apiKey: "AIzaSyAGRkVamjyg5kzN9e7rpeIFx9ZfP1OxxZ4",
      authDomain: "openhub-d6fe7.firebaseapp.com",
      projectId: "openhub-d6fe7",
      storageBucket: "openhub-d6fe7.firebasestorage.app",
      messagingSenderId: "542864747246",
      appId: "1:542864747246:web:dd21353654f6bdffb4a1ff"
    };
  }
})();
