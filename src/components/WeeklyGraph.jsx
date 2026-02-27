import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useHealthData } from '../context/HealthDataContext'

function WeeklyGraph() {
  const { moodEntries } = useHealthData()

  const weeklyData = useMemo(() => {
    const days = []
    const today = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })

      const dayMoods = moodEntries.filter(entry => entry.date === dateStr)
      const avgMood =
        dayMoods.length === 0
          ? 0
          : dayMoods.reduce((sum, entry) => sum + entry.mood, 0) / dayMoods.length

      days.push({
        day: dayName,
        averageMood: Number(avgMood.toFixed(2)),
      })
    }

    return days
  }, [moodEntries])

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Last 7 Days – Average Mood</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={weeklyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
          <Tooltip />
          <Bar dataKey="averageMood" fill="#6366f1" name="Average Mood (1–5)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default WeeklyGraph
