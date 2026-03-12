import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { loadData, saveData, saveFileHandleInfo, getFileHandleInfo, loadCustomActivities, saveCustomActivities } from '../utils/storage'
import { createFile, openFile, writeFile, readFile } from '../utils/fileOperations'
import { useAuth } from './AuthContext'
import {
  fetchUserMoodEntries, saveUserMoodEntry, deleteUserMoodEntry,
  fetchUserCustomActivities, saveUserCustomActivities, batchSaveUserMoodEntries,
} from '../firebase/firestoreHelpers'

const HealthDataContext = createContext()

export function HealthDataProvider({ children }) {
  const { user, firebaseUser } = useAuth()
  const [moodEntries, setMoodEntries] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [fileHandle, setFileHandle] = useState(null)
  const [fileStatus, setFileStatus] = useState('none') // 'none', 'saving', 'saved', 'error'
  const [customActivities, setCustomActivities] = useState({ custom: [], deleted: [] })
  const fileHandleRef = useRef(null)
  const firebaseUserRef = useRef(firebaseUser)
  useEffect(() => { firebaseUserRef.current = firebaseUser }, [firebaseUser])

  // Load from localStorage on startup (fast, synchronous)
  useEffect(() => {
    async function initialize() {
      const loaded = loadData()
      setMoodEntries(loaded.moodEntries)
      setCustomActivities(loadCustomActivities())
      setIsLoaded(true)

      // Try to set up file auto-save
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

  // When auth state changes after load: switch data source.
  // Uses firebaseUser (JS Firebase SDK authed) for Firestore so auth.currentUser is guaranteed set.
  useEffect(() => {
    if (!isLoaded) return
    if (firebaseUser) {
      console.log('[Data] firebaseUser signed in, uid:', firebaseUser.uid, 'fetching from Firestore...')
      Promise.all([
        fetchUserMoodEntries(firebaseUser.uid),
        fetchUserCustomActivities(firebaseUser.uid),
      ]).then(([entries, activities]) => {
        console.log('[Data] Firestore fetch succeeded, entries:', entries.length)
        setMoodEntries(entries)
        setCustomActivities(activities)
      }).catch(err => {
        console.error('[Data] Firestore fetch failed:', err?.code, err?.message)
      })
    } else if (!user) {
      // Fully logged out — fall back to localStorage
      const loaded = loadData()
      setMoodEntries(loaded.moodEntries)
      setCustomActivities(loadCustomActivities())
    }
    // If user is set (plugin fallback) but firebaseUser is null, wait — onAuthStateChanged will fire
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

  const addMoodEntry = (entry) => {
    setMoodEntries(prev => [...prev, entry])
    if (firebaseUser) saveUserMoodEntry(firebaseUser.uid, entry).catch(console.error)
  }

  const deleteMoodEntry = (id) => {
    setMoodEntries(prev => prev.filter(e => e.id !== id))
    if (firebaseUser) deleteUserMoodEntry(firebaseUser.uid, id).catch(console.error)
  }

  const updateMoodEntry = (id, updatedEntry) => {
    const entry = { ...updatedEntry, id }
    setMoodEntries(prev => prev.map(e => e.id === id ? entry : e))
    if (firebaseUser) saveUserMoodEntry(firebaseUser.uid, entry).catch(console.error)
  }

  // Auto-save custom activities to localStorage (and Firestore when logged in).
  // Intentionally NOT depending on firebaseUser — using a ref instead so that
  // auth state changes (login/logout) don't trigger a save with stale activity data.
  useEffect(() => {
    if (!isLoaded) return
    saveCustomActivities(customActivities)
    const fbUser = firebaseUserRef.current
    if (fbUser) saveUserCustomActivities(fbUser.uid, customActivities).catch(console.error)
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
      if (firebaseUser) {
        updated.forEach((entry, i) => {
          const hadActivity = (prev[i].activities || []).some(
            a => (typeof a === 'string' ? a : a.name) === name
          )
          if (hadActivity) saveUserMoodEntry(firebaseUser.uid, entry).catch(console.error)
        })
      }
      return updated
    })
  }

  const setAllData = (entries) => {
    setMoodEntries(entries)
  }

  const exportData = () => {
    return JSON.stringify({ moodEntries, customActivities, exportedAt: new Date().toISOString() }, null, 2)
  }

  const importData = (jsonString) => {
    try {
      const data = JSON.parse(jsonString)
      if (data.moodEntries && Array.isArray(data.moodEntries)) {
        setAllData(data.moodEntries)
        if (data.customActivities) {
          setCustomActivities(data.customActivities)
          saveCustomActivities(data.customActivities)
        }
        if (firebaseUser) {
          batchSaveUserMoodEntries(firebaseUser.uid, data.moodEntries).catch(console.error)
          if (data.customActivities) {
            saveUserCustomActivities(firebaseUser.uid, data.customActivities).catch(console.error)
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
