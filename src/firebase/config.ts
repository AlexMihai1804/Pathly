
// IMPORTANT: Ensure your Firebase project configuration is set in .env
// These variables are read during the build process and automatically available client-side.
export const firebaseConfig = {
  apiKey: "AIzaSyD5r9XnnQtwKNj9Mi9doUGoPaXd_njrni4", // User provided API key
  authDomain: "pathly-b50d6.firebaseapp.com", // User provided Auth Domain
  projectId: "pathly-b50d6", // User provided Project ID
  storageBucket: "pathly-b50d6.appspot.com", // Default convention
  messagingSenderId: "46465501", // User provided Sender ID
  appId: "1:46465501:web:730cbec923544c0d8db634", // User provided App ID
  measurementId: "G-CCDTP8N1H3" // User provided Measurement ID
};

// Basic validation to ensure essential environment variables are loaded
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error(
    'Essential Firebase configuration (apiKey, authDomain, projectId) is missing or incomplete. Please check your configuration.'
  );
  // Optionally, throw an error or provide default values for development
  // throw new Error('Essential Firebase configuration is missing or incomplete.');
}
