// Import the Firebase SDKs used in the app
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBYNgUD0aO9MxmEWQeius10aKKdz6Yf7pk",
  authDomain: "mood-tracker-b451f.firebaseapp.com",
  projectId: "mood-tracker-b451f",
  storageBucket: "mood-tracker-b451f.firebasestorage.app",
  messagingSenderId: "834739937212",
  appId: "1:834739937212:web:afe7f95aff4e33ed97d5b9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);  

export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()