import { useMemo, useRef, useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { useHealthData } from '../context/HealthDataContext'
import { BUILT_IN_ACTIVITY_CATEGORIES } from '../utils/activityCategories'


const DAY_MS = 86400000
const PX_PER_DAY = 200

const getActivityName = (a) => typeof a === 'string' ? a : a.name

function CustomDot({ cx, cy, payload, selectedActivity }) {
  if (cx == null || cy == null) return null
  if (selectedActivity && payload?.hasActivity) {
    return <circle cx={cx} cy={cy} r={8} fill="#f59e0b" stroke="#fff" strokeWidth={2} />
  }
  return <circle cx={cx} cy={cy} r={4} fill="#6366f1" />
}

function AnalyticsView() {
  const { moodEntries, customActivities, addCustomActivity, deleteActivity, deleteActivityWithHistory } = useHealthData()

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
  const scrollRef = useRef(null)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [editMode, setEditMode] = useState(null)
  const [newActivityName, setNewActivityName] = useState('')
  const [newActivityCategory, setNewActivityCategory] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [historyChoice, setHistoryChoice] = useState(null)

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

  const allCategoryNames = useMemo(() => Object.keys(allCategories), [allCategories])

  const monthMoodCounts = useMemo(() => {
    const now = new Date()
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    moodEntries.forEach(e => {
      const d = e.timestamp ? new Date(e.timestamp) : (() => {
        const [month, day, year] = e.date.split('/').map(Number)
        return new Date(year, month - 1, day)
      })()
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        counts[e.mood] = (counts[e.mood] || 0) + 1
      }
    })
    return counts
  }, [moodEntries])

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

      {/* Monthly mood breakdown */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">This Month's Moods</h3>
        <p className="text-sm text-gray-400 mb-4">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
        {Object.values(monthMoodCounts).every(c => c === 0) ? (
          <p className="text-sm text-gray-400 italic">No entries this month yet.</p>
        ) : (
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(mood => {
              const count = monthMoodCounts[mood]
              const total = Object.values(monthMoodCounts).reduce((s, c) => s + c, 0)
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              const labels = { 1: 'Very Low', 2: 'Low', 3: 'Neutral', 4: 'Good', 5: 'Excellent' }
              const colors = { 1: '#f18a8b', 2: '#ffc58d', 3: '#efe376', 4: '#b8d44a', 5: '#7ec84a' }
              return (
                <div key={mood} className="flex items-center gap-3">
                  <span className="w-16 text-sm text-gray-600 shrink-0">{labels[mood]}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-4 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: colors[mood] }}
                    />
                  </div>
                  <span className="w-6 text-sm text-gray-500 text-right shrink-0">{count}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Activity picker */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Select an Activity</h3>
        <div className="space-y-4">
          {Object.entries(allCategories).map(([category, activities]) => {
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

        {/* Edit activities panel */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className={`overflow-hidden transition-all duration-300 ${editMode ? 'max-h-96 opacity-100 mb-3' : 'max-h-0 opacity-0'}`}>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => { setEditMode('add'); setDeleteConfirm(null) }}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${editMode === 'add' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}
                >
                  Add activity
                </button>
                <button
                  onClick={() => { setEditMode('delete'); setNewActivityName(''); setNewActivityCategory(''); setNewCategoryName('') }}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${editMode === 'delete' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}
                >
                  Remove activity
                </button>
              </div>

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

              {editMode === 'delete' && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {deleteConfirm ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 mb-2">
                        Remove <span className="font-semibold">"{deleteConfirm}"</span> from the activity picker?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setHistoryChoice(deleteConfirm); setDeleteConfirm(null) }}
                          className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Yes, remove it
                        </button>
                        <button
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
            onClick={() => { setEditMode(v => v ? null : 'add'); setDeleteConfirm(null); setNewActivityName(''); setNewActivityCategory(''); setNewCategoryName('') }}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            {editMode ? '− Close' : '✎ Edit activities'}
          </button>
        </div>
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
                onClick={() => { deleteActivity(historyChoice); setHistoryChoice(null); setEditMode(null) }}
                className="w-full py-2 px-4 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Keep history (recommended)
              </button>
              <button
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
                onClick={() => { deleteActivityWithHistory(historyChoice); setHistoryChoice(null); setEditMode(null) }}
                className="w-full py-1.5 px-4 text-xs text-gray-400 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
              >
                Erase from history too
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalyticsView
