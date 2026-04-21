import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { gameApi } from '../api'
import useAuthStore from '../store/authStore'

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate  = useNavigate()

  const [sessions, setSessions]   = useState([])
  const [history,  setHistory]    = useState([])
  const [loading,  setLoading]    = useState(true)
  const [joinCode, setJoinCode]   = useState('')
  const [newName,  setNewName]    = useState('')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [error,    setError]      = useState('')
  const [tab,      setTab]        = useState('lobby') // lobby | history

  const load = async () => {
    setLoading(true)
    try {
      const [s, h] = await Promise.all([gameApi.getOpenSessions(), gameApi.getHistory()])
      setSessions(s.data)
      setHistory(h.data)
    } catch (e) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createSession = async () => {
    if (!newName.trim()) return
    try {
      const { data } = await gameApi.createSession({ name: newName.trim(), maxPlayers })
      navigate(`/game/${data.code}`)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create session')
    }
  }

  const joinByCode = async () => {
    if (!joinCode.trim()) return
    try {
      await gameApi.joinSession({ code: joinCode.toUpperCase() })
      navigate(`/game/${joinCode.toUpperCase()}`)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to join session')
    }
  }

  const joinSession = async (code) => {
    try {
      await gameApi.joinSession({ code })
      navigate(`/game/${code}`)
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to join session')
    }
  }

  const statusBadge = (status) => {
    const map = { WAITING: 'text-green-400', IN_PROGRESS: 'text-yellow-400', FINISHED: 'text-gray-500' }
    return <span className={`text-xs uppercase ${map[status] || ''}`}>{status}</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-doom-red glow-red">
            Welcome, {user?.username}
          </h1>
          <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">
            Choose your battle
          </p>
        </div>
        <button onClick={() => navigate('/leaderboard')} className="doom-btn-outline">
          🏆 Leaderboard
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-4 py-2 rounded">
          {error}
          <button className="ml-3 underline text-xs" onClick={() => setError('')}>dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Create + Join */}
        <div className="space-y-4">
          {/* Create */}
          <div className="doom-panel">
            <h2 className="text-doom-orange text-sm uppercase tracking-widest mb-4">
              ⚔️ Create Session
            </h2>
            <div className="space-y-3">
              <div>
                <label className="doom-label">Session Name</label>
                <input className="doom-input" placeholder="Hell on Earth"
                  value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createSession()} />
              </div>
              <div>
                <label className="doom-label">Max Players</label>
                <select className="doom-input" value={maxPlayers}
                  onChange={e => setMaxPlayers(Number(e.target.value))}>
                  {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} players</option>)}
                </select>
              </div>
              <button className="doom-btn w-full" onClick={createSession}>
                Create &amp; Enter
              </button>
            </div>
          </div>

          {/* Join by code */}
          <div className="doom-panel">
            <h2 className="text-doom-orange text-sm uppercase tracking-widest mb-4">
              🔑 Join by Code
            </h2>
            <input className="doom-input mb-3" placeholder="ABC12345"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
              onKeyDown={e => e.key === 'Enter' && joinByCode()} />
            <button className="doom-btn w-full" onClick={joinByCode}>
              Join Session
            </button>
          </div>
        </div>

        {/* Right: Lobby / History */}
        <div className="lg:col-span-2 doom-panel">
          <div className="flex gap-4 mb-4 border-b border-doom-border pb-3">
            <button onClick={() => setTab('lobby')}
              className={`text-sm uppercase tracking-widest pb-1 ${tab === 'lobby'
                ? 'text-doom-orange border-b border-doom-orange'
                : 'text-gray-500 hover:text-gray-300'}`}>
              🎮 Open Sessions
            </button>
            <button onClick={() => setTab('history')}
              className={`text-sm uppercase tracking-widest pb-1 ${tab === 'history'
                ? 'text-doom-orange border-b border-doom-orange'
                : 'text-gray-500 hover:text-gray-300'}`}>
              📜 Match History
            </button>
            <button onClick={load} className="ml-auto text-gray-500 hover:text-white text-xs">
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm text-center py-8">Loading...</p>
          ) : tab === 'lobby' ? (
            sessions.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">
                No open sessions. Create one above!
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map(s => (
                  <div key={s.id}
                    className="flex items-center justify-between bg-black/30 rounded px-4 py-3
                               border border-doom-border hover:border-doom-red transition-colors">
                    <div>
                      <span className="font-bold text-sm">{s.name}</span>
                      <div className="flex items-center gap-3 mt-1">
                        {statusBadge(s.status)}
                        <span className="text-gray-500 text-xs">
                          {s.currentPlayers}/{s.maxPlayers} players
                        </span>
                        <span className="text-gray-600 text-xs">by {s.creatorUsername}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => joinSession(s.code)}
                      disabled={s.currentPlayers >= s.maxPlayers}
                      className="doom-btn text-xs py-1 px-3">
                      Join
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            history.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-8">No matches played yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map(m => (
                  <div key={m.id}
                    className="flex items-center justify-between bg-black/30 rounded px-4 py-3
                               border border-doom-border">
                    <div>
                      <span className="font-bold text-sm">{m.sessionName}</span>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs ${m.winner ? 'text-green-400' : 'text-red-400'}`}>
                          {m.winner ? '🏆 WIN' : '💀 LOSS'}
                        </span>
                        <span className="text-gray-400 text-xs">
                          K: {m.kills} / D: {m.deaths}
                        </span>
                        <span className="text-doom-orange text-xs">
                          +{m.score} pts
                        </span>
                      </div>
                    </div>
                    <span className="text-gray-600 text-xs">
                      {new Date(m.playedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
