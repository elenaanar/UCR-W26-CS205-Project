import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useHealthData } from '../context/HealthDataContext'
import { getTodayFormatted } from '../utils/helpers'

function DailyGraph() {
  const { moodEntries } = useHealthData()

  const dailyData = useMemo(() => {
    const todayStr = getTodayFormatted()

    const todayMoods = moodEntries
      .filter(entry => entry.date === todayStr)
      .map(entry => ({
        time: entry.time,
        mood: entry.mood,
      }))

    if (todayMoods.length === 0) {
      return []
    }

    const parseTime = (timeStr) => {
      const [time, period] = timeStr.split(' ')
      const [hours, minutes] = time.split(':')
      let hour = parseInt(hours, 10)
      if (period === 'PM' && hour !== 12) hour += 12
      if (period === 'AM' && hour === 12) hour = 0
      return hour * 60 + parseInt(minutes || 0, 10)
    }

    return [...todayMoods].sort((a, b) => parseTime(a.time) - parseTime(b.time))
  }, [moodEntries])

  const todayStr = getTodayFormatted()
  const hasTodayData = dailyData.length > 0

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-2">Today&apos;s Mood</h3>
      <p className="text-sm text-gray-500 mb-4">{todayStr}</p>
      {!hasTodayData && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            No moods logged for today yet. Record how you feel to see it here.
          </p>
        </div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={dailyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
          <Tooltip />
          <Line type="monotone" dataKey="mood" stroke="#6366f1" strokeWidth={2} name="Mood (1–5)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default DailyGraph
