import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import useAuthStore from '../store/authStore'

export default function Register() {
  const [form, setForm]   = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate    = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data } = await authApi.register(form)
      setAuth(data.token, { username: data.username, userId: data.userId })
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data
      if (detail?.details) {
        const msgs = Object.values(detail.details).join(', ')
        setError(msgs)
      } else {
        setError(detail?.message || 'Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="doom-panel w-full max-w-md">
        <h1 className="text-3xl font-bold text-doom-red glow-red text-center mb-2">
          💀 JOIN THE ARENA
        </h1>
        <p className="text-gray-500 text-center text-xs uppercase tracking-widest mb-8">
          Create Your Soldier
        </p>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="doom-label">Username (3–30 chars)</label>
            <input className="doom-input" placeholder="soldier_x"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="doom-label">Email</label>
            <input className="doom-input" type="email" placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="doom-label">Password (6+ chars)</label>
            <input className="doom-input" type="password" placeholder="••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="doom-btn w-full mt-2" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Soldier'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-doom-orange hover:underline">Login</Link>
        </p>
      </div>
    </div>
  )
}
