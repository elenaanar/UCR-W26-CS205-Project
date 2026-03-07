import { useMemo, useState } from 'react'
import { useHealthData } from '../context/HealthDataContext'

const MOOD_LABELS = {
  1: 'Very Low',
  2: 'Low',
  3: 'Neutral',
  4: 'Good',
  5: 'Excellent',
}

function HistoryView() {
  const { moodEntries, deleteMoodEntry } = useHealthData()
  const [expandedEntries, setExpandedEntries] = useState({})

  const toggleExpanded = (entryId) => {
    setExpandedEntries((prev) => ({
      ...prev,
      [entryId]: !prev[entryId],
    }))
  }

  const sortedEntries = useMemo(() => {
    return [...moodEntries].sort((a, b) => b.id - a.id)
  }, [moodEntries])

  const groupedByDate = useMemo(() => {
    const grouped = {}
    sortedEntries.forEach(entry => {
      if (!grouped[entry.date]) {
        grouped[entry.date] = []
      }
      grouped[entry.date].push(entry)
    })
    return grouped
  }, [sortedEntries])

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Mood History</h2>

      {Object.keys(groupedByDate).length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No history yet. Start logging your mood to see it here.
        </p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate)
            .sort((a, b) => new Date(b[0]) - new Date(a[0]))
            .map(([date, entries]) => (
              <div key={date} className="border-b border-gray-200 pb-4 last:border-b-0">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">{date}</h3>
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div key={entry.id}>
                      <div
                        onClick={() => toggleExpanded(entry.id)}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <div className="flex-1">
                          <span className="font-medium text-gray-800">
                            {MOOD_LABELS[entry.mood] || 'Mood'}
                          </span>
                          <span className="text-gray-500 text-sm ml-2">
                            • {entry.time}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm">
                            {expandedEntries[entry.id] ? '▼' : '▶'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (window.confirm('Delete this mood entry?')) {
                                deleteMoodEntry(entry.id)
                              }
                            }}
                            className="text-red-500 hover:text-red-700 font-medium text-sm ml-2 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete this entry"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {expandedEntries[entry.id] && entry.activities && entry.activities.length > 0 && (
                        <div className="mt-2 p-3 bg-white border-l-2 border-indigo-400 rounded-r-lg">
                          <p className="text-sm text-gray-700 font-medium mb-2">Activities:</p>
                          <div className="flex flex-wrap gap-2">
                            {entry.activities.map((activity) => (
                              <span
                                key={activity}
                                className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full"
                              >
                                {activity}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export default HistoryView
