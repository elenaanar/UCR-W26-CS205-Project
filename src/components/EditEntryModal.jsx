import { useState, useEffect, useMemo } from 'react'
import { useHealthData } from '../context/HealthDataContext'
import { BUILT_IN_ACTIVITY_CATEGORIES } from '../utils/activityCategories'

const MOOD_LABELS = { 1: 'Very Low', 2: 'Low', 3: 'Neutral', 4: 'Good', 5: 'Excellent' }
const MOOD_COLORS = { 1: '#f18a8b', 2: '#ffc58d', 3: '#ffffbf', 4: '#e5f88c', 5: '#b5f97c' }

function EditEntryModal({ entry, onClose }) {
  const { updateMoodEntry, customActivities } = useHealthData()

  const [selectedMood, setSelectedMood] = useState(entry.mood)
  const [selectedActivities, setSelectedActivities] = useState(() =>
    (entry.activities || []).map(a => typeof a === 'string' ? { name: a, category: 'Other' } : a)
  )
  const [notes, setNotes] = useState(entry.notes || '')
  const [pickerDate, setPickerDate] = useState(() => {
    const [month, day, year] = entry.date.split('/').map(Number)
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  })
  const [pickerTime, setPickerTime] = useState(() => {
    const m = entry.time.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!m) return '12:00'
    let h = parseInt(m[1])
    const min = m[2]
    const ampm = m[3].toUpperCase()
    if (ampm === 'PM' && h !== 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${min}`
  })

  const allCategories = useMemo(() => {
    const merged = {}
    Object.entries(BUILT_IN_ACTIVITY_CATEGORIES).forEach(([cat, acts]) => { merged[cat] = [...acts] })
    customActivities.custom.forEach(({ name, category }) => {
      if (!merged[category]) merged[category] = []
      if (!merged[category].includes(name)) merged[category].push(name)
    })
    const deletedSet = new Set(customActivities.deleted)
    return Object.fromEntries(
      Object.entries(merged)
        .map(([cat, acts]) => [cat, acts.filter(a => !deletedSet.has(a))])
        .filter(([, acts]) => acts.length > 0)
    )
  }, [customActivities])

  const toggleActivity = (name, category) => {
    setSelectedActivities(prev =>
      prev.some(a => a.name === name)
        ? prev.filter(a => a.name !== name)
        : [...prev, { name, category }]
    )
  }

  const handleSave = () => {
    if (!selectedMood || !pickerDate) return
    const [year, month, day] = pickerDate.split('-').map(Number)
    const [hours, minutes] = pickerTime.split(':').map(Number)
    const d = new Date(year, month - 1, day, hours, minutes, 0, 0)
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const h12 = hours % 12 || 12
    const timeStr = `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`
    updateMoodEntry(entry.id, {
      mood: selectedMood,
      activities: selectedActivities,
      notes: notes.trim(),
      timestamp: d.toISOString(),
      date: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
      time: timeStr,
    })
    onClose()
  }

  const formattedDate = (() => {
    const [month, day, year] = entry.date.split('/').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  })()

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">Edit Entry — {formattedDate}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Mood */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Mood</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(mood => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setSelectedMood(mood)}
                  className="flex-1 py-2 rounded-lg font-semibold border transition-colors text-sm"
                  style={selectedMood === mood
                    ? { backgroundColor: MOOD_COLORS[mood], borderColor: MOOD_COLORS[mood], color: '#1a1a1a' }
                    : { backgroundColor: '#f3f4f6', borderColor: '#d1d5db', color: '#1f2937' }}
                >
                  <div>{mood}</div>
                  <div className="text-xs mt-0.5">{MOOD_LABELS[mood]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Activities */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Activities</p>
            <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
              {Object.entries(allCategories).map(([category, activities]) => (
                <div key={category}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activities.map(activity => {
                      const isSelected = selectedActivities.some(a => a.name === activity)
                      return (
                        <button
                          key={activity}
                          type="button"
                          onClick={() => toggleActivity(activity, category)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {activity}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Journal entry or note…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 resize-none"
              rows="3"
            />
          </div>

          {/* Date & Time */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={pickerDate}
                onChange={e => setPickerDate(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
              <input
                type="time"
                value={pickerTime}
                onChange={e => setPickerTime(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedMood}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              selectedMood ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Update entry
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditEntryModal
