import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDohdBJ0bqGbdaVx86D9vMBLDXh4wrp0iE",
  authDomain: "yt-clone-b7e17.firebaseapp.com",
  projectId: "yt-clone-b7e17",
  appId: "1:728148282964:web:b005b9c726a07554b4a7c1",
  measurementId: "G-MCM9R72520"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ FIX 1: initialize auth
export const auth = getAuth(app);

// ✅ FIX 2: safely initialize analytics (browser only)
isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
});

/**
 * Signs the user in with a Google popup.
 */
export function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

/**
 * Signs the user out.
 */
export function signOut() {
  return auth.signOut();
}

/**
 * Trigger a callback when user auth state changes.
 */
export function onAuthStateChangedHelper(
  callback: (user: User | null) => void
) {
  return onAuthStateChanged(auth, callback);
}
 