import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { initializeAuth, browserLocalPersistence, browserPopupRedirectResolver, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

// Use localStorage persistence — IndexedDB is unreliable in Capacitor WKWebView
// and causes onAuthStateChanged to never fire on session restore.
export const auth = initializeAuth(app, {
  persistence: [browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
})
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
