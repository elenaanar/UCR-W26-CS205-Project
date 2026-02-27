// File system operations for saving/loading data files

const FILE_OPTIONS = {
  types: [{
    description: 'JSON files',
    accept: { 'application/json': ['.json'] }
  }]
}

export async function createFile() {
  if (!('showSaveFilePicker' in window)) return null
  
  try {
    return await window.showSaveFilePicker({
      ...FILE_OPTIONS,
      suggestedName: 'health-tracking-data.json'
    })
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error creating file:', error)
    }
    return null
  }
}

export async function openFile() {
  if (!('showOpenFilePicker' in window)) return null
  
  try {
    const [handle] = await window.showOpenFilePicker({
      ...FILE_OPTIONS,
      multiple: false
    })
    return handle
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error opening file:', error)
    }
    return null
  }
}

export async function writeFile(fileHandle, data) {
  if (!fileHandle) return false
  
  try {
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(data, null, 2))
    await writable.close()
    return true
  } catch (error) {
    console.error('Error writing file:', error)
    return false
  }
}

export async function readFile(fileHandle) {
  if (!fileHandle) return null
  
  try {
    const file = await fileHandle.getFile()
    const content = await file.text()
    return JSON.parse(content)
  } catch (error) {
    console.error('Error reading file:', error)
    return null
  }
}
