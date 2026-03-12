import { useMemo, useRef, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { useHealthData } from '../context/HealthDataContext'

const DAY_MS = 86400000
const PX_PER_DAY = 160 // ~3 days visible in a typical half-width card

function DailyGraph() {
  const { moodEntries } = useHealthData()
  const scrollRef = useRef(null)

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
      .map(e => ({ ts: getTs(e), mood: e.mood }))
      .filter(e => e.ts >= domainStart.getTime() && e.ts < windowEnd.getTime())
      .sort((a, b) => a.ts - b.ts)
  }, [moodEntries, domainStart, windowEnd])

  const yesterdayStart = useMemo(() => new Date(todayStart.getTime() - DAY_MS), [todayStart])

  const dayLabel = (ts) => {
    const d = new Date(ts); d.setHours(0,0,0,0)
    if (d.getTime() === todayStart.getTime())     return 'Today'
    if (d.getTime() === yesterdayStart.getTime()) return 'Yesterday'
    return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const tooltipFormatter = (value, _name, props) => {
    const ts = props.payload?.ts
    if (!ts) return [`Mood: ${value}`]
    const time = new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    return [`Mood: ${value}`, `${dayLabel(ts)} at ${time}`]
  }

  // Scroll to most recent (right end) on mount / when data changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [chartWidth])

  const hasData = data.length > 0

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-1">Mood Over Time</h3>
      <p className="text-sm text-gray-400 mb-4">Scroll to explore past days</p>
      {!hasData && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            No moods logged yet. Record how you feel to see it here.
          </p>
        </div>
      )}
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
          <YAxis domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={() => ''} />
          {ticks.map(t => (
            <ReferenceLine key={t} x={t} stroke="#d1d5db" strokeDasharray="4 4" />
          ))}
          <Line
            type="monotone"
            dataKey="mood"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 4, fill: '#6366f1' }}
            activeDot={{ r: 6 }}
            connectNulls
            name="Mood (1–5)"
          />
        </LineChart>
      </div>
    </div>
  )
}

export default DailyGraph
