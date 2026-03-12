import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signInWithCredential, GoogleAuthProvider, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase/firebaseConfig'

const AuthContext = createContext()

export const isNative = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()

async function signInNative() {
  // Uses @capacitor-firebase/authentication for native Google Sign-In (iOS/Android)
  // Falls back gracefully if plugin is not installed
  try {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
    const result = await FirebaseAuthentication.signInWithGoogle()
    const credential = GoogleAuthProvider.credential(
      result.credential?.idToken,
      result.credential?.accessToken
    )
    return signInWithCredential(auth, credential)
  } catch (e) {
    console.error('Native Google Sign-In failed:', e)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Force loading=false after 3s in case Firebase doesn't resolve (e.g. Capacitor WKWebView)
    const timeout = setTimeout(() => setLoading(false), 3000)
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      clearTimeout(timeout)
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => { clearTimeout(timeout); unsubscribe() }
  }, [])

  const signInWithGoogle = () => {
    if (isNative) return signInNative()
    return signInWithPopup(auth, googleProvider)
  }

  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
