import { useMemo } from 'react'
import { useHealthData } from '../context/HealthDataContext'
import { getTodayFormatted } from '../utils/helpers'

function toMidnightUTC(dateStr) {
  const d = new Date(dateStr)
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
}

function computeStreaks(moodEntries) {
  if (moodEntries.length === 0) return { current: 0, longest: 0, hasEntryToday: false }

  const uniqueDaysMs = [...new Set(moodEntries.map(e => toMidnightUTC(e.date)))]
  uniqueDaysMs.sort((a, b) => a - b)

  const DAY_MS = 86400000

  // Longest streak
  let longest = 1
  let run = 1
  for (let i = 1; i < uniqueDaysMs.length; i++) {
    if (uniqueDaysMs[i] - uniqueDaysMs[i - 1] === DAY_MS) {
      run++
      if (run > longest) longest = run
    } else {
      run = 1
    }
  }

  // Current streak — walk backwards from today
  const todayMs = toMidnightUTC(getTodayFormatted())
  const daySet = new Set(uniqueDaysMs)

  const hasEntryToday = daySet.has(todayMs)
  // Start from today if logged, otherwise from yesterday
  let cursor = hasEntryToday ? todayMs : todayMs - DAY_MS
  let current = 0

  while (daySet.has(cursor)) {
    current++
    cursor -= DAY_MS
  }

  return { current, longest, hasEntryToday }
}

function StreakCard() {
  const { moodEntries } = useHealthData()

  const { current, longest, hasEntryToday } = useMemo(
    () => computeStreaks(moodEntries),
    [moodEntries]
  )

  const streakColor = current >= 7
    ? 'text-orange-500'
    : current >= 3
      ? 'text-yellow-500'
      : 'text-indigo-500'

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-2">Entry Streak</h3>
      <p className="text-sm text-gray-500 mb-6">Consecutive days with at least one entry</p>

      <div className="flex items-end gap-2 mb-1">
        <span className={`text-7xl font-bold leading-none ${streakColor}`}>{current}</span>
        <span className="text-2xl text-gray-500 mb-2">{current === 1 ? 'day' : 'days'}</span>
      </div>

      <p className="text-sm text-gray-400 mb-6">current streak</p>

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Best</p>
          <p className="text-2xl font-semibold text-gray-700">{longest} {longest === 1 ? 'day' : 'days'}</p>
        </div>
        <div className="text-right">
          {current > 0 && !hasEntryToday && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Log today to keep your streak!
            </p>
          )}
          {hasEntryToday && current > 0 && (
            <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Logged today — keep it up!
            </p>
          )}
          {current === 0 && (
            <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              Start logging to build a streak!
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default StreakCard
