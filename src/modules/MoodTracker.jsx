import { useState, useRef } from 'react'
import { useHealthData } from '../context/HealthDataContext'
import { getTodayFormatted } from '../utils/helpers'

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

const ACTIVITY_CATEGORIES = {
  Social: [
    'Friends',
    'Family',
    'Partner',
    'Me Time',
    'Classmates',
    'Social Event',
  ],
  Hobbies: [
    'Reading',
    'Music',
    'Writing',
    'Gaming',
    'Movies & TV',
    'Art / Creative',
    'Outdoors',
    'Walking',
    'Exercise / Gym',
    'Sports',
  ],
  Responsibilities: [
    'Work',
    'Studying',
    'Homework',
    'Class',
    'Shopping',
    'Errands',
    'Cleaning',
    'Laundry',
    'Cooking',
    'Appointment',
  ],
  Wellness: [
    'Good Sleep',
    'Poor Sleep',
    'Tired',
    'Sick',
    'Self Care',
    'Stressed',
    'Hydrated',
    'Caffeine',
  ],
  Weather: [
    'Sunny',
    'Cloudy',
    'Rainy',
    'Windy',
    'Stormy',
    'Foggy',
    'Hot',
    'Cold',
  ],
}

function MoodTracker() {
  const { moodEntries, addMoodEntry, deleteMoodEntry } = useHealthData()
  const [selectedMood, setSelectedMood] = useState(null)
  const [selectedActivities, setSelectedActivities] = useState([])
  const [notes, setNotes] = useState('')
  // pastMode: null | 'menu' | 'yesterday' | 'picker'
  const [pastMode, setPastMode] = useState(null)
  const [pickerDate, setPickerDate] = useState('')
  const [pickerTime, setPickerTime] = useState('12:00')
  const dateInputRef = useRef(null)

  const handleSelectMood = (mood) => {
    if (selectedMood === mood) {
      setSelectedMood(null)
      setSelectedActivities([])
      setNotes('')
    } else {
      setSelectedMood(mood)
    }
  }

  const handleToggleActivity = (activity) => {
    setSelectedActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((item) => item !== activity)
        : [...prev, activity]
    )
  }

  const handleSubmit = () => {
    if (!selectedMood) return

    const now = new Date()

    const newEntry = {
      id: Date.now(),
      mood: selectedMood,
      activities: selectedActivities,
      notes: notes.trim(),
      timestamp: now.toISOString(),
      date: getTodayFormatted(),
      time: now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    }

    addMoodEntry(newEntry)
    setSelectedMood(null)
    setSelectedActivities([])
    setNotes('')
    setPastMode(null)
    setPickerDate('')
  }

  const handleSubmitForDate = (dateObj) => {
    if (!selectedMood) return

    const [hours, minutes] = pickerTime.split(':').map(Number)
    const d = new Date(dateObj)
    d.setHours(hours, minutes, 0, 0)

    const ampm = hours >= 12 ? 'PM' : 'AM'
    const h12 = hours % 12 || 12
    const timeStr = `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`

    const newEntry = {
      id: Date.now(),
      mood: selectedMood,
      activities: selectedActivities,
      notes: notes.trim(),
      timestamp: d.toISOString(),
      date: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
      time: timeStr,
    }

    addMoodEntry(newEntry)
    setSelectedMood(null)
    setSelectedActivities([])
    setNotes('')
    setPastMode(null)
    setPickerDate('')
    setPickerTime('12:00')
  }

  const resetPastMode = () => {
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

  const latestEntry = moodEntries.length > 0
    ? [...moodEntries].sort((a, b) => b.id - a.id)[0]
    : null

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Mood Tracker
      </h2>
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
            ? 'max-h-[900px] opacity-100 mb-6'
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
            {Object.entries(ACTIVITY_CATEGORIES).map(([category, activities]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  {category}
                </h4>

                <div className="flex flex-wrap gap-2">
                  {activities.map((activity) => {
                    const isSelected = selectedActivities.includes(activity)

                    return (
                      <button
                        key={activity}
                        type="button"
                        onClick={() => handleToggleActivity(activity)}
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

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add a note (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write a journal entry or note about how you're feeling..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
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
          {pastMode === 'yesterday'
            ? 'Confirm for yesterday'
            : pastMode === 'picker' && pickerDateFormatted
            ? `Confirm for ${pickerDateFormatted}`
            : pastMode === 'menu'
            ? 'Select a day above'
            : 'Save how I feel'}
        </button>
      </div>

      {latestEntry && (
        <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Last recorded mood:</p>
          <p className="text-lg font-semibold text-indigo-700">
            {latestEntry.mood} – {MOOD_LABELS[latestEntry.mood] || 'Mood'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {latestEntry.date} at {latestEntry.time}
          </p>
          {latestEntry.activities && latestEntry.activities.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Activities: {latestEntry.activities.join(', ')}
            </p>
          )}
          {latestEntry.notes && (
            <p className="text-xs text-gray-600 mt-2 italic">
              Note: {latestEntry.notes.length > 100 ? latestEntry.notes.substring(0, 100) + '...' : latestEntry.notes}
            </p>
          )}
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
            .map((entry) => (
              <div
                key={entry.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <span className="font-medium text-gray-800">
                    {entry.mood} – {MOOD_LABELS[entry.mood] || 'Mood'}
                  </span>
                  <span className="text-gray-500 text-sm ml-2">
                    • {entry.date} at {entry.time}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this mood entry?')) {
                      deleteMoodEntry(entry.id)
                    }
                  }}
                  className="text-red-500 hover:text-red-700 font-medium text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  title="Delete this entry"
                >
                  Delete
                </button>
              </div>
            ))
        )}
      </div>
    </div>
  )
}

export default MoodTracker

