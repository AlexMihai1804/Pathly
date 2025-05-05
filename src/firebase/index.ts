'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// IMPORTANT: CODE GENERATED - DO NOT MODIFY THIS FUNCTION
export function getFirebase() {
  let firebaseApp;

  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }

  const firestore = getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);

  // Connect to emulators if environment variables are set (typically in development)
  const firestoreHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
  const authHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;

  if (firestoreHost) {
    const [host, portString] = firestoreHost.split(':');
    const port = parseInt(portString, 10);
    if (host && !isNaN(port)) {
       // Use try-catch to avoid crashing if emulator is not running
       try {
          connectFirestoreEmulator(firestore, host, port);
          console.log(`Connecting to Firestore emulator at ${host}:${port}`);
       } catch (e) {
          console.warn(`Failed to connect to Firestore emulator at ${host}:${port}`, e);
       }
    } else {
       console.warn(`Invalid Firestore emulator host configuration: ${firestoreHost}. Using production Firestore.`);
    }
  } else {
     console.log('Using production Firestore.');
  }


  if (authHost) {
     // Use http for localhost emulator connection
     const authEmulatorUrl = `http://${authHost}`;
     try {
       connectAuthEmulator(auth, authEmulatorUrl, { disableCors: true });
       console.log(`Connecting to Auth emulator at ${authEmulatorUrl}`);
     } catch(e) {
         console.warn(`Failed to connect to Auth emulator at ${authEmulatorUrl}`, e);
     }
  } else {
      console.log('Using production Firebase Auth.');
  }


  return { firebaseApp, auth, firestore };
}
