import { useState, useRef, useEffect } from 'react'
import { useHealthData } from '../context/HealthDataContext'

function FileManager() {
  const { exportData, importData, setupFileHandle, loadFromFile, fileHandle, fileStatus } = useHealthData()
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (fileStatus === 'saved') {
      setTimeout(() => setImportSuccess(false), 2000)
    }
  }, [fileStatus])

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `health-tracking-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target.result
        setImportText(content)
        handleImport(content)
      }
      reader.readAsText(file)
    }
  }

  const handleImport = (jsonString = importText) => {
    setImportError('')
    setImportSuccess(false)
    
    if (!jsonString.trim()) {
      setImportError('Please provide JSON data')
      return
    }

    const success = importData(jsonString)
    if (success) {
      setImportSuccess(true)
      setImportText('')
      setTimeout(() => setImportSuccess(false), 3000)
    } else {
      setImportError('Invalid data format. Please check your JSON structure.')
    }
  }

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      importData(JSON.stringify({ moodEntries: [] }))
      setImportText('')
      setImportSuccess(true)
      setTimeout(() => setImportSuccess(false), 3000)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Data Management
      </h2>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Auto-Save Status</h3>
          <p className="text-sm text-gray-600 mb-3">
            Data is automatically saved to a file whenever you make changes.
          </p>
          {fileHandle ? (
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                <strong>Auto-save enabled:</strong> {fileHandle.name || 'File selected'}
              </p>
              {fileStatus === 'saving' && (
                <p className="text-xs text-green-600 mt-1">Saving...</p>
              )}
              {fileStatus === 'saved' && (
                <p className="text-xs text-green-600 mt-1">Saved successfully!</p>
              )}
              {fileStatus === 'error' && (
                <p className="text-xs text-red-600 mt-1">Error saving to file</p>
              )}
            </div>
          ) : (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                File will be set up automatically on first use. Your data is saved to browser storage.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const success = await setupFileHandle()
                if (success) {
                  setImportSuccess(true)
                  setTimeout(() => setImportSuccess(false), 3000)
                }
              }}
              className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              {fileHandle ? 'Change File Location' : 'Set Up File Now'}
            </button>
            <button
              onClick={async () => {
                const success = await loadFromFile()
                if (success) {
                  setImportSuccess(true)
                  setTimeout(() => setImportSuccess(false), 3000)
                }
              }}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Load from File
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Manual Export</h3>
          <p className="text-sm text-gray-600 mb-3">
            Download your data as a JSON file that you can edit directly
          </p>
          <button
            onClick={handleExport}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Export to JSON File
          </button>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Import Data</h3>
          <p className="text-sm text-gray-600 mb-3">
            Load data from a JSON file or paste JSON directly
          </p>
          
          <div className="mb-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium mb-2"
            >
              Select JSON File
            </button>
          </div>

          <div className="mb-3">
            <label htmlFor="importText" className="block text-sm font-medium text-gray-700 mb-1">
              Or paste JSON data here:
            </label>
            <textarea
              id="importText"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='{"moodEntries": [...] }'
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
              rows="8"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleImport()}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Import Data
            </button>
            <button
              onClick={handleClear}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Clear All Data
            </button>
          </div>

          {importError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{importError}</p>
            </div>
          )}

          {importSuccess && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">Data imported successfully!</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Data Format</h3>
          <p className="text-xs text-gray-600 mb-2">
            Your JSON file should follow this structure:
          </p>
          <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
{`{
  "moodEntries": [
    {
      "id": 1234567890,
      "mood": 4,
      "timestamp": "2024-01-15T12:00:00.000Z",
      "time": "12:00 PM",
      "date": "1/15/2024"
    }
  ]
}`}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default FileManager
