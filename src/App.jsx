import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { HealthDataProvider } from './context/HealthDataContext'
import MoodTracker from './modules/MoodTracker'
import DailyGraph from './components/DailyGraph'
import WeeklyGraph from './components/WeeklyGraph'
import HistoryView from './components/HistoryView'
import FileManager from './components/FileManager'
import StreakCard from './components/StreakCard'
import AnalyticsView from './components/AnalyticsView'

function AuthWidget() {
  const { user, loading, signInWithGoogle, logout } = useAuth()

  if (loading) return null

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {user.photoURL ? (
        <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
          {user.displayName?.[0] ?? user.email?.[0] ?? '?'}
        </div>
      )}
      <span className="text-sm text-gray-700 font-medium hidden sm:block">{user.displayName ?? user.email}</span>
      <button
        onClick={logout}
        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <HealthDataProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <header className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Mood Tracking App
              </h1>
              <p className="text-gray-600">
                Track how you feel over time with a simple 1–5 mood scale
              </p>
            </div>
            <div className="pt-1">
              <AuthWidget />
            </div>
          </header>

          <div className="mb-6 border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'dashboard'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                History
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'data'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Data Management
              </button>
            </nav>
          </div>

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex flex-col gap-6 lg:w-1/2">
                  <MoodTracker />
                  <WeeklyGraph />
                </div>
                <div className="flex flex-col gap-6 lg:w-1/2">
                  <StreakCard />
                  <DailyGraph />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && <HistoryView />}
          {activeTab === 'data' && <FileManager />}
          {activeTab === 'analytics' && <AnalyticsView />}
        </div>
      </div>
    </HealthDataProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
