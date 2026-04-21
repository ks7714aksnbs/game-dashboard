import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import useAuthStore from '../store/authStore'

export default function Login() {
  const [form, setForm]   = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate    = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data } = await authApi.login(form)
      setAuth(data.token, { username: data.username, userId: data.userId })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="doom-panel w-full max-w-md">
        <h1 className="text-3xl font-bold text-doom-red glow-red text-center mb-2">
          💀 DOOM PLATFORM
        </h1>
        <p className="text-gray-500 text-center text-xs uppercase tracking-widest mb-8">
          Multiplayer Game Arena
        </p>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="doom-label">Username</label>
            <input className="doom-input" placeholder="soldier_x"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="doom-label">Password</label>
            <input className="doom-input" type="password" placeholder="••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="doom-btn w-full mt-2" disabled={loading}>
            {loading ? 'Authenticating...' : 'Enter Arena'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          No account?{' '}
          <Link to="/register" className="text-doom-orange hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
