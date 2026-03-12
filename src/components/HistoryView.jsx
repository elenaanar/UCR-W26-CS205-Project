import { useMemo, useState } from 'react'
import { useHealthData } from '../context/HealthDataContext'
import EditEntryModal from './EditEntryModal'

const formatDate = (dateStr) => {
  const [month, day, year] = dateStr.split('/').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

const MOOD_LABELS = {
  1: 'Very Low',
  2: 'Low',
  3: 'Neutral',
  4: 'Good',
  5: 'Excellent',
}

function HistoryView() {
  const { moodEntries, deleteMoodEntry } = useHealthData()
  const [expandedEntryId, setExpandedEntryId] = useState(null)
  const [editingEntry, setEditingEntry] = useState(null)

  const toggleExpanded = (id) => {
    setExpandedEntryId(prev => prev === id ? null : id)
  }

  const sortedEntries = useMemo(() => {
    return [...moodEntries].sort((a, b) => b.id - a.id)
  }, [moodEntries])

  const groupedByDate = useMemo(() => {
    const grouped = {}
    sortedEntries.forEach(entry => {
      if (!grouped[entry.date]) grouped[entry.date] = []
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
                <h3 className="text-lg font-semibold text-gray-700 mb-3">{formatDate(date)}</h3>
                <div className="space-y-2">
                  {entries.map((entry) => {
                    const isExpanded = expandedEntryId === entry.id
                    return (
                      <div
                        key={entry.id}
                        className={`rounded-lg overflow-hidden transition-colors ${isExpanded ? 'bg-indigo-50' : 'bg-gray-50 hover:bg-gray-100'}`}
                      >
                        <div
                          onClick={() => toggleExpanded(entry.id)}
                          className="flex justify-between items-center p-3 cursor-pointer"
                        >
                          <div>
                            <span className="font-medium text-gray-800">
                              {entry.mood} – {MOOD_LABELS[entry.mood] || 'Mood'}
                            </span>
                            <span className="text-gray-500 text-sm ml-2">
                              • {entry.time}
                            </span>
                          </div>
                          <div className="flex gap-1 items-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingEntry(entry) }}
                              className="text-indigo-500 hover:text-indigo-700 p-1.5 rounded hover:bg-indigo-100 transition-colors"
                              title="Edit this entry"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (window.confirm('Delete this mood entry?')) deleteMoodEntry(entry.id)
                              }}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                              title="Delete this entry"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6"/>
                                <path d="M14 11v6"/>
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-1 bg-indigo-50 space-y-1">
                            {entry.activities && entry.activities.length > 0 && (
                              <p className="text-xs text-gray-500">
                                Activities: {entry.activities.map(a => typeof a === 'string' ? a : a.name).join(', ')}
                              </p>
                            )}
                            {entry.notes && (
                              <p className="text-xs text-gray-600 italic">
                                Note: {entry.notes.length > 100 ? entry.notes.substring(0, 100) + '…' : entry.notes}
                              </p>
                            )}
                            {!entry.activities?.length && !entry.notes && (
                              <p className="text-xs text-gray-400 italic">No activities or notes logged.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      {editingEntry && (
        <EditEntryModal entry={editingEntry} onClose={() => setEditingEntry(null)} />
      )}
    </div>
  )
}

export default HistoryView
