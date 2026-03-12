const STORAGE_KEY = 'healthTrackingData'
const FILE_HANDLE_KEY = 'healthTrackingFileHandle'
const CUSTOM_ACTIVITIES_KEY = 'customActivities'

export function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      return {
        moodEntries: data.moodEntries || [],
      }
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error)
  }
  return {
    moodEntries: [],
  }
}

export function saveData(moodEntries) {
  try {
    const data = { moodEntries }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

export function saveFileHandleInfo(fileHandle) {
  const info = { name: fileHandle.name, kind: fileHandle.kind }
  localStorage.setItem(FILE_HANDLE_KEY, JSON.stringify(info))
}

export function getFileHandleInfo() {
  try {
    const stored = localStorage.getItem(FILE_HANDLE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    return null
  }
}

export function loadCustomActivities() {
  try {
    const stored = localStorage.getItem(CUSTOM_ACTIVITIES_KEY)
    if (stored) return JSON.parse(stored)
  } catch (error) {
    console.error('Error loading custom activities:', error)
  }
  return { custom: [], deleted: [] }
}

export function saveCustomActivities(data) {
  try {
    localStorage.setItem(CUSTOM_ACTIVITIES_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Error saving custom activities:', error)
  }
}

export function clearAllLocalData() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(CUSTOM_ACTIVITIES_KEY)
  localStorage.removeItem(FILE_HANDLE_KEY)
}
