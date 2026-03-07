import { useState } from 'react'
import { useHealthData } from '../context/HealthDataContext'
import { getTodayFormatted } from '../utils/helpers'

const MOOD_LABELS = {
  1: 'Very Low',
  2: 'Low',
  3: 'Neutral',
  4: 'Good',
  5: 'Excellent',
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

  const handleSelectMood = (mood) => {
    if (selectedMood === mood) {
      setSelectedMood(null)
      setSelectedActivities([])
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
      timestamp: now.toISOString(),
      date: getTodayFormatted(),
      time: now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    }

    addMoodEntry(newEntry)
    setSelectedMood(null)
    setSelectedActivities([])
  }

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
            className={`flex-1 py-3 rounded-lg font-semibold border transition-colors ${selectedMood === mood
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-gray-50 text-gray-800 border-gray-300 hover:bg-gray-100'
              }`}
          >
            <div className="text-lg">{mood}</div>
            <div
              className={`text-xs mt-1 ${selectedMood === mood ? 'text-white' : 'text-gray-600'
                }`}
            >
              {MOOD_LABELS[mood]}
            </div>
          </button>
        ))}
      </div>

      {selectedMood && (
        <div className="mb-6">
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
        </div>
      )}


      <button
        onClick={handleSubmit}
        disabled={!selectedMood}
        className={`w-full mb-6 py-2 px-4 rounded-lg font-medium transition-colors ${selectedMood
          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
      >
        Save how I feel
      </button>

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

