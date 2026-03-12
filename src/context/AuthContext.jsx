import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signInWithCredential, GoogleAuthProvider, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase/firebaseConfig'

const AuthContext = createContext()

export const isNative = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 3000)

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      console.log('[Auth] onAuthStateChanged:', fbUser?.email ?? 'null')
      clearTimeout(timeout)
      setFirebaseUser(fbUser)
      setUser(fbUser)
      setLoading(false)
    })

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
          // Give onAuthStateChanged 1.5s to fire. If auth.currentUser is set by then,
          // onAuthStateChanged already handled everything. Otherwise use plugin fallback.
          setTimeout(() => {
            const current = auth.currentUser
            console.log('[Auth] plugin fallback check — auth.currentUser:', current?.email ?? 'null')
            if (current) {
              setFirebaseUser(current)
              setUser(current)
            } else {
              const pluginUser = result.user
              setUser(prev => prev === null
                ? { ...pluginUser, photoURL: pluginUser.photoUrl ?? null }
                : prev
              )
            }
            setLoading(false)
          }, 1500)
        }).then(handle => { pluginHandle = handle })
      })
    }

    return () => {
      clearTimeout(timeout)
      unsubscribe()
      pluginHandle?.remove()
    }
  }, [])

  const getNativeToken = async () => {
    if (!isNative) return null
    try {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
      const { token } = await FirebaseAuthentication.getIdToken({ forceRefresh: false })
      return token
    } catch (e) {
      console.warn('[Auth] getNativeToken failed:', e?.message)
      return null
    }
  }

  const signInWithGoogle = async () => {
    if (!isNative) return signInWithPopup(auth, googleProvider)

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
        // Directly set state — don't wait for onAuthStateChanged which may not fire in WKWebView
        setFirebaseUser(userCred.user)
        setUser(userCred.user)
      } catch (e) {
        console.error('[Auth] signInWithCredential failed:', e?.code, e?.message)
        // Fall back to plugin user — Firestore will use REST API
        const pluginUser = result.user
        setUser({ ...pluginUser, photoURL: pluginUser.photoUrl ?? null })
      }
    } else {
      console.warn('[Auth] no idToken — using plugin user only')
      const pluginUser = result.user
      setUser({ ...pluginUser, photoURL: pluginUser.photoUrl ?? null })
    }

    return result.user
  }

  const logout = async () => {
    if (isNative) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
      await FirebaseAuthentication.signOut()
    }
    return signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, signInWithGoogle, logout, getNativeToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
