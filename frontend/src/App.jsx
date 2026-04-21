import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Login       from './pages/Login'
import Register    from './pages/Register'
import Dashboard   from './pages/Dashboard'
import GameRoom    from './pages/GameRoom'
import Leaderboard from './pages/Leaderboard'
import Layout      from './components/Layout'

function Protected({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login    />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index                  element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"       element={<Dashboard   />} />
          <Route path="game/:code"      element={<GameRoom    />} />
          <Route path="leaderboard"     element={<Leaderboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
