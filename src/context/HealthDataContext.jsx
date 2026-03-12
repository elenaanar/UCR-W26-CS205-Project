import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { loadData, saveData, saveFileHandleInfo, getFileHandleInfo, loadCustomActivities, saveCustomActivities } from '../utils/storage'
import { createFile, openFile, writeFile, readFile } from '../utils/fileOperations'

const HealthDataContext = createContext()

export function HealthDataProvider({ children }) {
  const [moodEntries, setMoodEntries] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [fileHandle, setFileHandle] = useState(null)
  const [fileStatus, setFileStatus] = useState('none') // 'none', 'saving', 'saved', 'error'
  const [customActivities, setCustomActivities] = useState({ custom: [], deleted: [] })
  const fileHandleRef = useRef(null)

  // Load data on startup
  useEffect(() => {
    async function initialize() {
      // Load from localStorage first
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
          
          // Load data from file if it's newer
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
        // Auto-setup file on first use
        const handle = await createFile()
        if (handle) {
          fileHandleRef.current = handle
          setFileHandle(handle)
          saveFileHandleInfo(handle)
          await writeFile(handle, {
            moodEntries: loaded.moodEntries,
            lastSaved: new Date().toISOString()
          })
        }
      }
    }
    
    initialize()
  }, [])

  // Auto-save to localStorage and file when data changes
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
        return true
      }
    }
    return false
  }

  const addMoodEntry = (entry) => {
    setMoodEntries([...moodEntries, entry])
  }

  const deleteMoodEntry = (id) => {
    setMoodEntries(moodEntries.filter(entry => entry.id !== id))
  }

  const updateMoodEntry = (id, updatedEntry) => {
    setMoodEntries(moodEntries.map(e => e.id === id ? { ...updatedEntry, id } : e))
  }

  // Auto-save custom activities whenever they change
  useEffect(() => {
    saveCustomActivities(customActivities)
  }, [customActivities])

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

  const setAllData = (moodEntries) => {
    setMoodEntries(moodEntries)
  }

  const exportData = () => {
    const data = {
      moodEntries,
      exportedAt: new Date().toISOString(),
    }
    return JSON.stringify(data, null, 2)
  }

  const importData = (jsonString) => {
    try {
      const data = JSON.parse(jsonString)
      if (data.moodEntries && Array.isArray(data.moodEntries)) {
        setAllData(data.moodEntries)
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
