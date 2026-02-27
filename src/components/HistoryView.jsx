import { useMemo } from 'react'
import { useHealthData } from '../context/HealthDataContext'

function HistoryView() {
  const { moodEntries, deleteMoodEntry } = useHealthData()

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
                    <div
                      key={entry.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <span className="font-medium text-gray-800">
                          Mood: {entry.mood}
                        </span>
                        <span className="text-gray-500 text-sm ml-2">
                          • {entry.time}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this mood entry?')) {
                            deleteMoodEntry(entry.id)
                          }
                        }}
                        className="text-red-500 hover:text-red-700 font-medium text-sm ml-4 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        title="Delete this entry"
                      >
                        Delete
                      </button>
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
