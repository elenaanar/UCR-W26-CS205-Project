import { useState, useRef, useMemo } from 'react'
import { useHealthData } from '../context/HealthDataContext'
import { getTodayFormatted } from '../utils/helpers'
import { BUILT_IN_ACTIVITY_CATEGORIES } from '../utils/activityCategories'

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

const MOOD_COLORS = {
  1: '#f18a8b',
  2: '#ffc58d',
  3: '#ffffbf',
  4: '#e5f88c',
  5: '#b5f97c',
}

// Find which category an activity name belongs to (for backward-compat normalization)
function findCategory(activityName) {
  for (const [category, activities] of Object.entries(BUILT_IN_ACTIVITY_CATEGORIES)) {
    if (activities.includes(activityName)) return category
  }
  return 'Other'
}

function MoodTracker() {
  const { moodEntries, addMoodEntry, deleteMoodEntry, updateMoodEntry, customActivities, addCustomActivity, deleteActivity, deleteActivityWithHistory } = useHealthData()
  const [selectedMood, setSelectedMood] = useState(null)
  const [selectedActivities, setSelectedActivities] = useState([])
  const [notes, setNotes] = useState('')
  // pastMode: null | 'menu' | 'yesterday' | 'picker'
  const [pastMode, setPastMode] = useState(null)
  const [pickerDate, setPickerDate] = useState('')
  const [pickerTime, setPickerTime] = useState('12:00')
  const [editingEntry, setEditingEntry] = useState(null)
  const [expandedEntryId, setExpandedEntryId] = useState(null)
  const [editMode, setEditMode] = useState(null) // null | 'add' | 'delete'
  const [newActivityName, setNewActivityName] = useState('')
  const [newActivityCategory, setNewActivityCategory] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null) // activity name pending confirmation
  const [historyChoice, setHistoryChoice] = useState(null) // activity name pending history popup
  const dateInputRef = useRef(null)

  const allCategories = useMemo(() => {
    const merged = {}
    Object.entries(BUILT_IN_ACTIVITY_CATEGORIES).forEach(([cat, acts]) => {
      merged[cat] = [...acts]
    })
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

  const allCategoryNames = useMemo(() => Object.keys(allCategories), [allCategories])
  const trackerRef = useRef(null)

  const handleSelectMood = (mood) => {
    if (selectedMood === mood) {
      setSelectedMood(null)
      setSelectedActivities([])
      setNotes('')
    } else {
      setSelectedMood(mood)
    }
  }

  const handleToggleActivity = (activity, category) => {
    setSelectedActivities((prev) =>
      prev.some((a) => a.name === activity)
        ? prev.filter((a) => a.name !== activity)
        : [...prev, { name: activity, category }]
    )
  }

  const resetForm = () => {
    setEditingEntry(null)
    setSelectedMood(null)
    setSelectedActivities([])
    setNotes('')
    setPastMode(null)
    setPickerDate('')
    setPickerTime('12:00')
  }

  const handleSubmit = () => {
    if (!selectedMood) return

    const now = new Date()
    const entry = {
      id: editingEntry ? editingEntry.id : Date.now(),
      mood: selectedMood,
      activities: selectedActivities,
      notes: notes.trim(),
      timestamp: now.toISOString(),
      date: getTodayFormatted(),
      time: now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    }

    editingEntry ? updateMoodEntry(editingEntry.id, entry) : addMoodEntry(entry)
    resetForm()
  }

  const handleSubmitForDate = (dateObj) => {
    if (!selectedMood) return

    const [hours, minutes] = pickerTime.split(':').map(Number)
    const d = new Date(dateObj)
    d.setHours(hours, minutes, 0, 0)

    const ampm = hours >= 12 ? 'PM' : 'AM'
    const h12 = hours % 12 || 12
    const timeStr = `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`

    const entry = {
      id: editingEntry ? editingEntry.id : Date.now(),
      mood: selectedMood,
      activities: selectedActivities,
      notes: notes.trim(),
      timestamp: d.toISOString(),
      date: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
      time: timeStr,
    }

    editingEntry ? updateMoodEntry(editingEntry.id, entry) : addMoodEntry(entry)
    resetForm()
  }

  const resetPastMode = () => {
    setPastMode(null)
    setPickerDate('')
    setPickerTime('12:00')
  }

  const startEditing = (entry) => {
    setEditingEntry(entry)
    setSelectedMood(entry.mood)
    setNotes(entry.notes || '')
    // Normalize activities (handle old string-array format)
    setSelectedActivities(
      (entry.activities || []).map(a =>
        typeof a === 'string' ? { name: a, category: findCategory(a) } : a
      )
    )
    // Parse stored date "M/D/YYYY" → "YYYY-MM-DD" for the date input
    const [month, day, year] = entry.date.split('/').map(Number)
    setPickerDate(
      `${year.toString().padStart(4,'0')}-${month.toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`
    )
    // Parse stored time "H:MM AM/PM" → "HH:MM" for the time input
    const timeMatch = entry.time.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (timeMatch) {
      let h = parseInt(timeMatch[1])
      const m = parseInt(timeMatch[2])
      const ampm = timeMatch[3].toUpperCase()
      if (ampm === 'PM' && h !== 12) h += 12
      if (ampm === 'AM' && h === 12) h = 0
      setPickerTime(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`)
    }
    setPastMode('picker')
    trackerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const cancelEditing = () => {
    setEditingEntry(null)
    setSelectedMood(null)
    setSelectedActivities([])
    setNotes('')
    setPastMode(null)
    setPickerDate('')
    setPickerTime('12:00')
  }

  const todayStr = new Date().toISOString().split('T')[0]

  const yesterdayObj = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d
  })()

  const pickerDateFormatted = (() => {
    if (!pickerDate) return null
    const [year, month, day] = pickerDate.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
  })()


  return (
    <div ref={trackerRef} className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Mood Tracker
      </h2>

      {/* Edit mode banner */}
      {editingEntry && (
        <div className="flex items-center justify-between mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-sm text-amber-700 font-medium">
            Editing entry from {formatDate(editingEntry.date)}
          </span>
          <button
            onClick={cancelEditing}
            className="text-sm text-amber-600 hover:text-amber-800 font-medium underline"
          >
            Cancel
          </button>
        </div>
      )}
      <p className="text-gray-600 mb-4">
        Select how you&apos;re feeling and then submit. Date and time are recorded automatically.
      </p>

      <div className="flex justify-between mb-6 space-x-2">
        {[1, 2, 3, 4, 5].map((mood) => (
          <button
            key={mood}
            onClick={() => handleSelectMood(mood)}
            className="flex-1 py-3 rounded-lg font-semibold border transition-colors"
            style={
              selectedMood === mood
                ? {
                  backgroundColor: MOOD_COLORS[mood],
                  borderColor: MOOD_COLORS[mood],
                  color: '#1a1a1a',
                }
                : {
                  backgroundColor: '#f3f4f6',
                  borderColor: '#d1d5db',
                  color: '#1f2937',
                }
            }
          >
            <div className="text-lg">{mood}</div>
            <div className="text-xs mt-1">
              {MOOD_LABELS[mood]}
            </div>
          </button>
        ))}
      </div>

      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          selectedMood
            ? 'max-h-[1600px] opacity-100 mb-6'
            : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            What did you do today?
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Select any activities, conditions, or contexts connected to this mood.
          </p>

          <div className="space-y-4">
            {Object.entries(allCategories).map(([category, activities]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{category}</h4>
                <div className="flex flex-wrap gap-2">
                  {activities.map((activity) => {
                    const isSelected = selectedActivities.some((a) => a.name === activity)
                    return (
                      <button
                        key={activity}
                        type="button"
                        onClick={() => handleToggleActivity(activity, category)}
                        className={`px-3 py-2 rounded-full text-sm font-medium border transition-colors ${isSelected
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

          {/* Edit activities panel */}
          <div className="mt-4">
            <div className={`overflow-hidden transition-all duration-300 ${editMode ? 'max-h-96 opacity-100 mb-3' : 'max-h-0 opacity-0'}`}>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                {/* Tabs */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => { setEditMode('add'); setDeleteConfirm(null) }}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${editMode === 'add' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}
                  >
                    Add activity
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditMode('delete'); setNewActivityName(''); setNewActivityCategory(''); setNewCategoryName('') }}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${editMode === 'delete' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}
                  >
                    Remove activity
                  </button>
                </div>

                {/* Add form */}
                {editMode === 'add' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newActivityName}
                      onChange={(e) => setNewActivityName(e.target.value)}
                      placeholder="Activity name"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                    />
                    <div className="flex gap-2">
                      <select
                        value={newActivityCategory}
                        onChange={(e) => { setNewActivityCategory(e.target.value); setNewCategoryName('') }}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-white"
                      >
                        <option value="">Select category…</option>
                        {allCategoryNames.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="__new__">New category…</option>
                      </select>
                      {newActivityCategory === '__new__' && (
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Category name"
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const name = newActivityName.trim()
                        const category = newActivityCategory === '__new__' ? newCategoryName.trim() : newActivityCategory
                        if (!name || !category) return
                        addCustomActivity(name, category)
                        setNewActivityName('')
                        setNewActivityCategory('')
                        setNewCategoryName('')
                        setEditMode(null)
                      }}
                      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                )}

                {/* Delete list */}
                {editMode === 'delete' && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {deleteConfirm ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700 mb-2">
                          Remove <span className="font-semibold">"{deleteConfirm}"</span> from the activity picker?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setHistoryChoice(deleteConfirm); setDeleteConfirm(null) }}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Yes, remove it
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      Object.entries(allCategories).map(([category, activities]) => (
                        <div key={category}>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{category}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {activities.map(activity => (
                              <button
                                key={activity}
                                type="button"
                                onClick={() => setDeleteConfirm(activity)}
                                className="px-2.5 py-1 text-sm bg-white border border-gray-300 rounded-full text-gray-700 hover:border-red-400 hover:text-red-600 transition-colors"
                              >
                                {activity}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setEditMode(v => v ? null : 'add'); setDeleteConfirm(null); setNewActivityName(''); setNewActivityCategory(''); setNewCategoryName('') }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              {editMode ? '− Close' : '✎ Edit activities'}
            </button>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add a note (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write a journal entry or note about how you're feeling..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 focus:border-transparent resize-none"
              rows="3"
            />
          </div>
        </div>
      </div>


      {/* Past-date panel — always in DOM so transitions work in both directions */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          pastMode !== null
            ? 'max-h-16 opacity-100 mb-2'
            : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
          {/* All three states share the same space; inactive ones are absolute so no layout shift */}
          <div className="relative h-8">
            <div className={`absolute inset-0 flex items-center transition-opacity duration-200 ${pastMode === 'menu' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setPastMode('yesterday')}
                  className="flex-1 py-1 px-3 text-sm font-medium rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  Yesterday
                </button>
                <button
                  onClick={() => {
                    setPastMode('picker')
                    setTimeout(() => dateInputRef.current?.showPicker(), 50)
                  }}
                  className="flex-1 py-1 px-3 text-sm font-medium rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  Another day…
                </button>
              </div>
            </div>
            <div className={`absolute inset-0 flex items-center gap-2 transition-opacity duration-200 ${pastMode === 'yesterday' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <span className="text-sm text-indigo-700 font-medium whitespace-nowrap">
                Yesterday ({yesterdayObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}) at
              </span>
              <input
                type="time"
                value={pickerTime}
                onChange={(e) => setPickerTime(e.target.value)}
                className="text-sm border border-indigo-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className={`absolute inset-0 flex items-center gap-2 transition-opacity duration-200 ${pastMode === 'picker' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <input
                type="date"
                ref={dateInputRef}
                max={todayStr}
                value={pickerDate}
                onChange={(e) => setPickerDate(e.target.value)}
                className="flex-1 text-sm border border-indigo-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <span className="text-sm text-indigo-700 whitespace-nowrap">at</span>
              <input
                type="time"
                value={pickerTime}
                onChange={(e) => setPickerTime(e.target.value)}
                className="text-sm border border-indigo-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex mb-6 gap-0">
        <button
          onClick={() => pastMode !== null ? resetPastMode() : setPastMode('menu')}
          disabled={!selectedMood}
          title={pastMode !== null ? 'Cancel' : 'Save for a past day instead'}
          className={`flex items-center justify-center w-9 rounded-l-lg font-medium transition-colors border-r border-white/20 ${
            selectedMood
              ? pastMode !== null
                ? 'bg-indigo-400 text-white hover:bg-indigo-500'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {pastMode !== null ? '✕' : '◀'}
        </button>
        <button
          onClick={() => {
            if (pastMode === 'yesterday') handleSubmitForDate(yesterdayObj)
            else if (pastMode === 'picker' && pickerDate) {
              const [y, m, d] = pickerDate.split('-').map(Number)
              handleSubmitForDate(new Date(y, m - 1, d))
            } else if (pastMode === null) handleSubmit()
          }}
          disabled={
            !selectedMood ||
            (pastMode === 'picker' && !pickerDate) ||
            pastMode === 'menu'
          }
          className={`flex-1 py-2 px-4 rounded-r-lg font-medium transition-colors ${
            selectedMood && pastMode !== 'menu' && !(pastMode === 'picker' && !pickerDate)
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {editingEntry
            ? pastMode === 'picker' && pickerDateFormatted
              ? `Update entry for ${pickerDateFormatted}`
              : pastMode === 'menu'
              ? 'Select a day above'
              : 'Update entry'
            : pastMode === 'yesterday'
            ? 'Confirm for yesterday'
            : pastMode === 'picker' && pickerDateFormatted
            ? `Confirm for ${pickerDateFormatted}`
            : pastMode === 'menu'
            ? 'Select a day above'
            : 'Save how I feel'}
        </button>
      </div>

      {/* History choice modal */}
      {historyChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 mx-4 max-w-sm w-full space-y-4">
            <h3 className="text-base font-semibold text-gray-800">
              Keep history for "{historyChoice}"?
            </h3>
            <p className="text-sm text-gray-500">
              Past entries that included this activity will still show it in your history.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => { deleteActivity(historyChoice); setHistoryChoice(null); setEditMode(null) }}
                className="w-full py-2 px-4 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Keep history (recommended)
              </button>
              <button
                type="button"
                onClick={() => setHistoryChoice(null)}
                className="w-full py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="border-t border-gray-200 pt-3 space-y-2">
              <p className="text-xs text-gray-400">
                ⚠️ <span className="font-semibold text-gray-600">This cannot be undone.</span> Erasing history will permanently remove this activity from all past entries.
              </p>
              <button
                type="button"
                onClick={() => { deleteActivityWithHistory(historyChoice); setHistoryChoice(null); setEditMode(null) }}
                className="w-full py-1.5 px-4 text-xs text-gray-400 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
              >
                Erase from history too
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {moodEntries.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No moods logged yet. Choose how you feel to get started.
          </p>
        ) : (
          [...moodEntries]
            .sort((a, b) => b.id - a.id)
            .map((entry, index) => {
              const isExpanded = expandedEntryId !== null ? expandedEntryId === entry.id : index === 0
              return (
              <div
                key={entry.id}
                className={`rounded-lg overflow-hidden transition-colors ${isExpanded ? 'bg-indigo-50' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <div
                  onClick={() => setExpandedEntryId(prev => (prev === entry.id || (prev === null && index === 0)) ? -1 : entry.id)}
                  className="flex justify-between items-center p-3 cursor-pointer"
                >
                  <div>
                    <span className="font-medium text-gray-800">
                      {entry.mood} – {MOOD_LABELS[entry.mood] || 'Mood'}
                    </span>
                    <span className="text-gray-500 text-sm ml-2">
                      • {formatDate(entry.date)} at {entry.time}
                    </span>
                  </div>
                  <div className="flex gap-1 items-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEditing(entry) }}
                    className="text-indigo-500 hover:text-indigo-700 p-1.5 rounded hover:bg-indigo-100 transition-colors"
                    title="Edit this entry"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this mood entry?')) {
                        deleteMoodEntry(entry.id)
                      }
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
                        Activities: {entry.activities.map((a) => typeof a === 'string' ? a : a.name).join(', ')}
                      </p>
                    )}
                    {entry.notes && (
                      <p className="text-xs text-gray-600 italic">
                        Note: {entry.notes.length > 100 ? entry.notes.substring(0, 100) + '...' : entry.notes}
                      </p>
                    )}
                    {!entry.activities?.length && !entry.notes && (
                      <p className="text-xs text-gray-400 italic">No activities or notes logged.</p>
                    )}
                  </div>
                )}
              </div>
            )})
        )}
      </div>
    </div>
  )
}

export default MoodTracker

