import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { loadData, saveData, saveFileHandleInfo, getFileHandleInfo, loadCustomActivities, saveCustomActivities } from '../utils/storage'
import { createFile, openFile, writeFile, readFile } from '../utils/fileOperations'
import { useAuth, isNative } from './AuthContext'
import {
  saveUserMoodEntry, deleteUserMoodEntry,
  saveUserCustomActivities, batchSaveUserMoodEntries,
  subscribeToUserMoodEntries, subscribeToUserCustomActivities,
  fetchUserMoodEntriesREST, saveUserMoodEntryREST, deleteUserMoodEntryREST,
  fetchUserCustomActivitiesREST, saveUserCustomActivitiesREST, batchSaveUserMoodEntriesREST,
} from '../firebase/firestoreHelpers'

const HealthDataContext = createContext()

export function HealthDataProvider({ children }) {
  const { user, firebaseUser, getNativeToken } = useAuth()
  const [moodEntries, setMoodEntries] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [fileHandle, setFileHandle] = useState(null)
  const [fileStatus, setFileStatus] = useState('none')
  const [customActivities, setCustomActivities] = useState({ custom: [], deleted: [] })
  const fileHandleRef = useRef(null)
  const firebaseUserRef = useRef(firebaseUser)
  const userRef = useRef(user)
  // When true, the next customActivities change came from Firestore — skip writing back to Firestore
  const remoteActivitiesRef = useRef(false)
  useEffect(() => { firebaseUserRef.current = firebaseUser }, [firebaseUser])
  useEffect(() => { userRef.current = user }, [user])

  // Returns { uid, token } for Firestore ops, or null if no auth.
  // token is null when JS SDK auth is active (JS SDK handles auth internally).
  // token is a Firebase ID string when using REST API fallback (native without JS SDK auth).
  const getFirestoreAuth = async () => {
    if (firebaseUser) return { uid: firebaseUser.uid, token: null }
    if (isNative && user) {
      const token = await getNativeToken()
      if (token) return { uid: user.uid, token }
    }
    return null
  }

  // Load from localStorage on startup (fast, synchronous)
  useEffect(() => {
    async function initialize() {
      const loaded = loadData()
      setMoodEntries(loaded.moodEntries)
      setCustomActivities(loadCustomActivities())
      setIsLoaded(true)

      const handleInfo = getFileHandleInfo()
      if (handleInfo && 'showOpenFilePicker' in window) {
        const handle = await openFile()
        if (handle) {
          fileHandleRef.current = handle
          setFileHandle(handle)
          const fileData = await readFile(handle)
          if (fileData?.moodEntries) {
            const fileDate = fileData.lastSaved ? new Date(fileData.lastSaved) : null
            const storageDate = loaded.moodEntries.length > 0
              ? new Date(Math.max(...loaded.moodEntries.map(e => e.id)))
              : null
            if (!storageDate || (fileDate && fileDate > storageDate)) {
              setMoodEntries(fileData.moodEntries)
              saveData(fileData.moodEntries)
            }
          }
        }
      } else {
        const handle = await createFile()
        if (handle) {
          fileHandleRef.current = handle
          setFileHandle(handle)
          saveFileHandleInfo(handle)
          await writeFile(handle, {
            moodEntries: loaded.moodEntries,
            customActivities: loadCustomActivities(),
            lastSaved: new Date().toISOString()
          })
        }
      }
    }
    initialize()
  }, [])

  // When auth state changes: switch data source and set up real-time sync.
  useEffect(() => {
    if (!isLoaded) return

    if (firebaseUser) {
      // JS SDK auth — real-time Firestore listeners
      console.log('[Data] firebaseUser set, subscribing to Firestore...')
      const unsubEntries = subscribeToUserMoodEntries(firebaseUser.uid, entries => {
        console.log('[Data] onSnapshot entries:', entries.length)
        setMoodEntries(entries)
      })
      const unsubActivities = subscribeToUserCustomActivities(firebaseUser.uid, activities => {
        console.log('[Data] onSnapshot activities')
        remoteActivitiesRef.current = true
        setCustomActivities(activities)
      })
      return () => { unsubEntries(); unsubActivities() }

    } else if (isNative && user) {
      // iOS native auth only — REST fetch + 30s polling (no real-time available)
      console.log('[Data] native user set (no firebaseUser), fetching via REST API...')
      const fetchData = () => {
        getNativeToken().then(token => {
          if (!token) { console.warn('[Data] no native token'); return null }
          return Promise.all([
            fetchUserMoodEntriesREST(user.uid, token),
            fetchUserCustomActivitiesREST(user.uid, token),
          ])
        }).then(result => {
          if (!result) return
          const [entries, activities] = result
          console.log('[Data] REST fetch succeeded, entries:', entries.length)
          remoteActivitiesRef.current = true
          setMoodEntries(entries)
          setCustomActivities(activities)
        }).catch(err => console.error('[Data] REST fetch failed:', err?.message))
      }
      fetchData()
      const interval = setInterval(fetchData, 30000)
      return () => clearInterval(interval)

    } else if (!user) {
      // Logged out
      setMoodEntries(loadData().moodEntries)
      setCustomActivities(loadCustomActivities())
    }
  }, [firebaseUser, user, isLoaded])

  // Auto-save to localStorage and file when entries change
  useEffect(() => {
    if (isLoaded) {
      saveData(moodEntries)
      saveToFile()
    }
  }, [moodEntries, isLoaded])

  async function saveToFile() {
    const handle = fileHandleRef.current
    if (!handle) return
    setFileStatus('saving')
    const success = await writeFile(handle, {
      moodEntries,
      customActivities,
      lastSaved: new Date().toISOString()
    })
    if (success) {
      setFileStatus('saved')
      setTimeout(() => setFileStatus('none'), 2000)
    } else {
      setFileStatus('error')
      setTimeout(() => setFileStatus('none'), 3000)
    }
  }

  async function setupFileHandle() {
    const handle = await createFile()
    if (handle) {
      fileHandleRef.current = handle
      setFileHandle(handle)
      saveFileHandleInfo(handle)
      await saveToFile()
      return true
    }
    return false
  }

  async function loadFromFile() {
    const handle = await openFile()
    if (handle) {
      fileHandleRef.current = handle
      setFileHandle(handle)
      saveFileHandleInfo(handle)
      const data = await readFile(handle)
      if (data?.moodEntries) {
        setMoodEntries(data.moodEntries)
        saveData(data.moodEntries)
        if (data.customActivities) {
          setCustomActivities(data.customActivities)
          saveCustomActivities(data.customActivities)
        }
        return true
      }
    }
    return false
  }

  const addMoodEntry = async (entry) => {
    setMoodEntries(prev => [...prev, entry])
    const fsAuth = await getFirestoreAuth()
    if (!fsAuth) return
    if (fsAuth.token) saveUserMoodEntryREST(fsAuth.uid, entry, fsAuth.token).catch(console.error)
    else saveUserMoodEntry(fsAuth.uid, entry).catch(console.error)
  }

  const deleteMoodEntry = async (id) => {
    setMoodEntries(prev => prev.filter(e => e.id !== id))
    const fsAuth = await getFirestoreAuth()
    if (!fsAuth) return
    if (fsAuth.token) deleteUserMoodEntryREST(fsAuth.uid, id, fsAuth.token).catch(console.error)
    else deleteUserMoodEntry(fsAuth.uid, id).catch(console.error)
  }

  const updateMoodEntry = async (id, updatedEntry) => {
    const entry = { ...updatedEntry, id }
    setMoodEntries(prev => prev.map(e => e.id === id ? entry : e))
    const fsAuth = await getFirestoreAuth()
    if (!fsAuth) return
    if (fsAuth.token) saveUserMoodEntryREST(fsAuth.uid, entry, fsAuth.token).catch(console.error)
    else saveUserMoodEntry(fsAuth.uid, entry).catch(console.error)
  }

  // Auto-save custom activities to localStorage (and Firestore when logged in).
  // Uses refs to avoid stale closures on auth changes and to skip write-back when
  // the update came from a Firestore snapshot (remoteActivitiesRef flag).
  useEffect(() => {
    if (!isLoaded) return
    saveCustomActivities(customActivities)
    if (remoteActivitiesRef.current) {
      remoteActivitiesRef.current = false
      return // came from Firestore — don't write back
    }
    const fbUser = firebaseUserRef.current
    const currentUser = userRef.current
    if (fbUser) {
      saveUserCustomActivities(fbUser.uid, customActivities).catch(console.error)
    } else if (isNative && currentUser) {
      getNativeToken().then(token => {
        if (token) saveUserCustomActivitiesREST(currentUser.uid, customActivities, token).catch(console.error)
      })
    }
  }, [customActivities, isLoaded])

  const addCustomActivity = (name, category) => {
    setCustomActivities(prev => ({
      ...prev,
      custom: [...prev.custom, { name, category }],
    }))
  }

  const deleteActivity = (name) => {
    setCustomActivities(prev => ({
      ...prev,
      deleted: prev.deleted.includes(name) ? prev.deleted : [...prev.deleted, name],
    }))
  }

  const deleteActivityWithHistory = (name) => {
    deleteActivity(name)
    setMoodEntries(prev => {
      const updated = prev.map(entry => ({
        ...entry,
        activities: (entry.activities || []).filter(
          a => (typeof a === 'string' ? a : a.name) !== name
        ),
      }))
      getFirestoreAuth().then(fsAuth => {
        if (!fsAuth) return
        updated.forEach((entry, i) => {
          const hadActivity = (prev[i].activities || []).some(
            a => (typeof a === 'string' ? a : a.name) === name
          )
          if (!hadActivity) return
          if (fsAuth.token) saveUserMoodEntryREST(fsAuth.uid, entry, fsAuth.token).catch(console.error)
          else saveUserMoodEntry(fsAuth.uid, entry).catch(console.error)
        })
      })
      return updated
    })
  }

  const setAllData = (entries) => {
    setMoodEntries(entries)
  }

  const exportData = () => {
    return JSON.stringify({ moodEntries, customActivities, exportedAt: new Date().toISOString() }, null, 2)
  }

  const importData = async (jsonString) => {
    try {
      const data = JSON.parse(jsonString)
      if (data.moodEntries && Array.isArray(data.moodEntries)) {
        setAllData(data.moodEntries)
        if (data.customActivities) {
          setCustomActivities(data.customActivities)
          saveCustomActivities(data.customActivities)
        }
        const fsAuth = await getFirestoreAuth()
        if (fsAuth) {
          if (fsAuth.token) {
            batchSaveUserMoodEntriesREST(fsAuth.uid, data.moodEntries, fsAuth.token).catch(console.error)
            if (data.customActivities) saveUserCustomActivitiesREST(fsAuth.uid, data.customActivities, fsAuth.token).catch(console.error)
          } else {
            batchSaveUserMoodEntries(fsAuth.uid, data.moodEntries).catch(console.error)
            if (data.customActivities) saveUserCustomActivities(fsAuth.uid, data.customActivities).catch(console.error)
          }
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Error importing data:', error)
      return false
    }
  }

  return (
    <HealthDataContext.Provider
      value={{
        moodEntries,
        addMoodEntry,
        deleteMoodEntry,
        updateMoodEntry,
        exportData,
        importData,
        setAllData,
        setupFileHandle,
        loadFromFile,
        fileHandle,
        fileStatus,
        customActivities,
        addCustomActivity,
        deleteActivity,
        deleteActivityWithHistory,
      }}
    >
      {children}
    </HealthDataContext.Provider>
  )
}

export function useHealthData() {
  const context = useContext(HealthDataContext)
  if (!context) {
    throw new Error('useHealthData must be used within HealthDataProvider')
  }
  return context
}
