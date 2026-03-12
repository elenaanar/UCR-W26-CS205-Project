import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signInWithCredential, GoogleAuthProvider, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase/firebaseConfig'

const AuthContext = createContext()

export const isNative = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()

async function signInNative() {
  console.log('[Auth] signInNative called')
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
  const result = await FirebaseAuthentication.signInWithGoogle()
  console.log('[Auth] signInWithGoogle result user:', result.user?.email)

  const idToken = result.credential?.idToken
  const accessToken = result.credential?.accessToken
  console.log('[Auth] idToken present:', !!idToken)

  if (idToken) {
    try {
      console.log('[Auth] calling signInWithCredential...')
      const credential = GoogleAuthProvider.credential(idToken, accessToken)
      const userCred = await signInWithCredential(auth, credential)
      console.log('[Auth] signInWithCredential succeeded:', userCred.user?.email)
    } catch (e) {
      console.error('[Auth] signInWithCredential failed:', e?.code, e?.message)
    }
  } else {
    console.warn('[Auth] no idToken in result — signInWithCredential skipped')
  }

  return result.user
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)          // UI user (Firebase or plugin fallback)
  const [firebaseUser, setFirebaseUser] = useState(null) // Only set when JS Firebase SDK is authed
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 3000)

    // Primary: JS Firebase SDK auth state. When this fires, auth.currentUser is guaranteed set.
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      console.log('[Auth] onAuthStateChanged:', fbUser?.email ?? 'null')
      clearTimeout(timeout)
      setFirebaseUser(fbUser)
      setUser(fbUser)
      setLoading(false)
    })

    // Fallback: plugin auth state for when JS SDK doesn't fire (e.g. signInWithCredential slow/failed)
    let pluginHandle = null
    if (isNative) {
      import('@capacitor-firebase/authentication').then(({ FirebaseAuthentication }) => {
        FirebaseAuthentication.addListener('authStateChange', (result) => {
          console.log('[Auth] plugin authStateChange:', result.user?.email ?? 'null')
          if (!result.user) {
            clearTimeout(timeout)
            setUser(null)
            setFirebaseUser(null)
            setLoading(false)
            return
          }
          // Wait 3s for onAuthStateChanged to fire first (it sets both user + firebaseUser)
          // If it hasn't by then, set UI user from plugin (but firebaseUser stays null)
          setTimeout(() => {
            setUser(prev => {
              if (prev === null) {
                console.log('[Auth] plugin fallback: using plugin user for UI')
                return result.user
              }
              return prev
            })
            setLoading(false)
          }, 3000)
        }).then(handle => { pluginHandle = handle })
      })
    }

    return () => {
      clearTimeout(timeout)
      unsubscribe()
      pluginHandle?.remove()
    }
  }, [])

  const signInWithGoogle = () => {
    if (isNative) return signInNative()
    return signInWithPopup(auth, googleProvider)
  }

  const logout = async () => {
    if (isNative) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
      await FirebaseAuthentication.signOut()
    }
    return signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
