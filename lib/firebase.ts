import { initializeApp, getApps } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyBYhZBwD_trV73XnGuvf_KAKrLan0tI0Xw",
  authDomain: "placementprep-e01d8.firebaseapp.com",
  projectId: "placementprep-e01d8",
  storageBucket: "placementprep-e01d8.firebasestorage.app",
  messagingSenderId: "794207675629",
  appId: "1:794207675629:web:2b35be029ac677cb3d98e4",
}

console.log("[v0] Firebase config loaded:", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasApiKey: !!firebaseConfig.apiKey,
})

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
console.log("[v0] Firebase app initialized:", app.name)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: "select_account",
})

console.log("[v0] Firebase services initialized successfully")

export default app
