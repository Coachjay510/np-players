import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { Nav } from './components/Nav'
import { Roster } from './pages/Roster'
import { Rankings } from './pages/Rankings'
import { AddPlayer } from './pages/AddPlayer'
import { CoachRoster } from './pages/CoachRoster'
import { TeamRoster } from './pages/TeamRoster'

const PlayerProfile = lazy(() => import('./pages/PlayerProfile').then(m => ({ default: m.PlayerProfile })))

function PageLoader() {
  return (
    <div style={{ paddingTop: 120, textAlign: 'center', color: 'var(--text3)', fontFamily: 'var(--font-m)', letterSpacing: 2 }}>
      LOADING…
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"               element={<Roster />} />
            <Route path="/rankings"       element={<Rankings />} />
            <Route path="/player/:id"     element={<PlayerProfile />} />
            <Route path="/admin/add"      element={<AddPlayer />} />
            <Route path="/coach"          element={<CoachRoster />} />
            <Route path="/team/:teamId"   element={<TeamRoster />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
