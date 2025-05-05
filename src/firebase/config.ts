
// IMPORTANT: Ensure your Firebase project configuration is set in .env
// These variables are read during the build process and automatically available client-side.
export const firebaseConfig = {
  apiKey: "AIzaSyBsmfiOhzebAdjho3-5AJj2pmaZY2LxwBw", // Hardcoded based on user input
  authDomain: "pathly-b50d6.firebaseapp.com",
  projectId: "pathly-b50d6", // Hardcoded based on user input
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Basic validation to ensure essential environment variables are loaded
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error(
    'Essential Firebase configuration (apiKey, authDomain, projectId) is missing or incomplete. Please check your configuration.'
  );
  // Optionally, throw an error or provide default values for development
  // throw new Error('Essential Firebase configuration is missing or incomplete.');
}
