import { useMemo, useRef, useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { useHealthData } from '../context/HealthDataContext'

const DAY_MS = 86400000
const PX_PER_DAY = 200

const ACTIVITY_CATEGORIES = {
  Social:           ['Friends', 'Family', 'Partner', 'Me Time', 'Classmates', 'Social Event'],
  Hobbies:          ['Reading', 'Music', 'Writing', 'Gaming', 'Movies & TV', 'Art / Creative', 'Outdoors', 'Walking', 'Exercise / Gym', 'Sports'],
  Responsibilities: ['Work', 'Studying', 'Homework', 'Class', 'Shopping', 'Errands', 'Cleaning', 'Laundry', 'Cooking', 'Appointment'],
  Wellness:         ['Good Sleep', 'Poor Sleep', 'Tired', 'Sick', 'Self Care', 'Stressed', 'Hydrated', 'Caffeine'],
  Weather:          ['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Stormy', 'Foggy', 'Hot', 'Cold'],
}

const getActivityName = (a) => typeof a === 'string' ? a : a.name

function CustomDot({ cx, cy, payload, selectedActivity }) {
  if (cx == null || cy == null) return null
  if (selectedActivity && payload?.hasActivity) {
    return <circle cx={cx} cy={cy} r={8} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
  }
  return <circle cx={cx} cy={cy} r={4} fill="#6366f1" />
}

function AnalyticsView() {
  const { moodEntries } = useHealthData()
  const scrollRef = useRef(null)
  const [selectedActivity, setSelectedActivity] = useState(null)

  const todayStart = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const windowEnd  = useMemo(() => new Date(todayStart.getTime() + DAY_MS), [todayStart])

  const domainStart = useMemo(() => {
    if (moodEntries.length === 0) return new Date(todayStart.getTime() - 2 * DAY_MS)
    const earliest = Math.min(...moodEntries.map(e => {
      if (e.timestamp) return new Date(e.timestamp).getTime()
      const [month, day, year] = e.date.split('/').map(Number)
      return new Date(year, month - 1, day).getTime()
    }))
    const d = new Date(earliest); d.setHours(0,0,0,0); return d
  }, [moodEntries, todayStart])

  const totalDays = Math.max(3, Math.ceil((windowEnd.getTime() - domainStart.getTime()) / DAY_MS))
  const chartWidth = totalDays * PX_PER_DAY

  const ticks = useMemo(() => {
    const t = []
    const d = new Date(domainStart)
    while (d.getTime() <= windowEnd.getTime()) {
      t.push(d.getTime())
      d.setDate(d.getDate() + 1)
    }
    return t
  }, [domainStart, windowEnd])

  const yesterdayStart = useMemo(() => new Date(todayStart.getTime() - DAY_MS), [todayStart])

  const dayLabel = (ts) => {
    const d = new Date(ts); d.setHours(0,0,0,0)
    if (d.getTime() === todayStart.getTime())     return 'Today'
    if (d.getTime() === yesterdayStart.getTime()) return 'Yesterday'
    return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const data = useMemo(() => {
    const getTs = (entry) => {
      if (entry.timestamp) return new Date(entry.timestamp).getTime()
      const [month, day, year] = entry.date.split('/').map(Number)
      const m = entry.time.match(/(\d+):(\d+)\s*(AM|PM)/i)
      if (m) {
        let h = parseInt(m[1])
        if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12
        if (m[3].toUpperCase() === 'AM' && h === 12) h = 0
        return new Date(year, month - 1, day, h, parseInt(m[2])).getTime()
      }
      return new Date(year, month - 1, day, 12, 0).getTime()
    }
    return moodEntries
      .map(e => ({
        ts: getTs(e),
        mood: e.mood,
        hasActivity: selectedActivity
          ? (e.activities || []).some(a => getActivityName(a) === selectedActivity)
          : false,
      }))
      .filter(e => e.ts >= domainStart.getTime() && e.ts < windowEnd.getTime())
      .sort((a, b) => a.ts - b.ts)
  }, [moodEntries, domainStart, windowEnd, selectedActivity])

  const stats = useMemo(() => {
    if (!selectedActivity) return null
    const withAct    = moodEntries.filter(e => (e.activities || []).some(a => getActivityName(a) === selectedActivity))
    const withoutAct = moodEntries.filter(e => !(e.activities || []).some(a => getActivityName(a) === selectedActivity))
    const avg = (arr) => arr.length === 0 ? null : (arr.reduce((s, e) => s + e.mood, 0) / arr.length).toFixed(1)
    return { count: withAct.length, avgWith: avg(withAct), avgWithout: avg(withoutAct) }
  }, [selectedActivity, moodEntries])

  const tooltipFormatter = (value, _name, props) => {
    const ts = props.payload?.ts
    if (!ts) return [`Mood: ${value}`]
    const time = new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return [`Mood: ${value}`, `${dayLabel(ts)} at ${time}`]
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [chartWidth])

  const activityCounts = useMemo(() => {
    const counts = {}
    moodEntries.forEach(e => {
      (e.activities || []).forEach(a => {
        const name = getActivityName(a)
        counts[name] = (counts[name] || 0) + 1
      })
    })
    return counts
  }, [moodEntries])

  const toggleActivity = (name) => setSelectedActivity(prev => prev === name ? null : name)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-1">Mood History</h3>
        <p className="text-sm text-gray-400 mb-4">
          {selectedActivity
            ? <>Showing <span className="font-medium text-amber-600">{selectedActivity}</span> entries — scroll to explore</>
            : 'Select an activity below to see its impact on your mood'}
        </p>

        {/* Graph */}
        <div ref={scrollRef} className="overflow-x-auto">
          <LineChart width={chartWidth} height={300} data={data} margin={{ left: -10, top: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={[domainStart.getTime(), windowEnd.getTime()]}
              ticks={ticks}
              tickFormatter={ts => dayLabel(ts)}
            />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
            <Tooltip formatter={tooltipFormatter} labelFormatter={() => ''} />
            {ticks.map(t => (
              <ReferenceLine key={t} x={t} stroke="#d1d5db" strokeDasharray="4 4" />
            ))}
            <Line
              type="monotone"
              dataKey="mood"
              stroke="#6366f1"
              strokeWidth={2}
              dot={<CustomDot selectedActivity={selectedActivity} />}
              activeDot={{ r: 6 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <span className="font-semibold text-amber-700">"{selectedActivity}"</span>
            <span className="text-gray-600">{stats.count} {stats.count === 1 ? 'entry' : 'entries'}</span>
            {stats.avgWith    && <span className="text-gray-600">Avg mood with: <span className="font-medium text-gray-800">{stats.avgWith}</span></span>}
            {stats.avgWithout && <span className="text-gray-600">Avg mood without: <span className="font-medium text-gray-800">{stats.avgWithout}</span></span>}
          </div>
        )}
      </div>

      {/* Activity picker */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Select an Activity</h3>
        <div className="space-y-4">
          {Object.entries(ACTIVITY_CATEGORIES).map(([category, activities]) => {
            const sorted = [...activities].sort((a, b) => (activityCounts[b] || 0) - (activityCounts[a] || 0))
            return (
              <div key={category}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {sorted.map(activity => {
                    const isSelected = selectedActivity === activity
                    const count = activityCounts[activity] || 0
                    return (
                      <button
                        key={activity}
                        onClick={() => toggleActivity(activity)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-gray-50 text-gray-700 border-gray-300 hover:border-amber-400 hover:text-amber-600'
                        }`}
                      >
                        {activity}{count > 0 && <span className={`ml-1.5 text-xs ${isSelected ? 'text-amber-100' : 'text-gray-400'}`}>{count}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AnalyticsView
