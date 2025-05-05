// IMPORTANT: Ensure your Firebase project configuration is set in .env
// These variables are read during the build process and automatically available client-side.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Basic validation to ensure essential environment variables are loaded
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error(
    'Essential Firebase configuration (apiKey, authDomain, projectId) is missing or incomplete. Please check your .env file.'
  );
  // Optionally, throw an error or provide default values for development
  // throw new Error('Essential Firebase configuration is missing or incomplete.');
}
