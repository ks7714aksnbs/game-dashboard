import { useState, useEffect } from 'react'
import { leaderboardApi } from '../api'
import useAuthStore from '../store/authStore'

export default function Leaderboard() {
  const { user }  = useAuthStore()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    leaderboardApi.get()
      .then(r => setEntries(r.data))
      .finally(() => setLoading(false))
  }, [])

  const rankIcon = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-doom-red glow-red">🏆 Global Leaderboard</h1>
        <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">Top soldiers worldwide</p>
      </div>

      <div className="doom-panel overflow-x-auto">
        {loading ? (
          <p className="text-gray-500 text-center py-12">Loading rankings...</p>
        ) : entries.length === 0 ? (
          <p className="text-gray-600 text-center py-12">No data yet. Play some matches!</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 uppercase text-xs tracking-widest border-b border-doom-border">
                <th className="text-left py-3 px-2 w-16">Rank</th>
                <th className="text-left py-3 px-2">Player</th>
                <th className="text-right py-3 px-2">Score</th>
                <th className="text-right py-3 px-2">Games</th>
                <th className="text-right py-3 px-2">Wins</th>
                <th className="text-right py-3 px-2">Kills</th>
                <th className="text-right py-3 px-2">Win%</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.userId}
                  className={`border-b border-doom-border/40 transition-colors
                    ${e.username === user?.username
                      ? 'bg-doom-red/10 border-doom-red/30'
                      : 'hover:bg-white/5'}`}>
                  <td className="py-3 px-2 font-bold text-doom-orange">
                    {rankIcon(e.rank)}
                  </td>
                  <td className="py-3 px-2 font-bold">
                    {e.username}
                    {e.username === user?.username && (
                      <span className="ml-2 text-doom-red text-xs">(you)</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right text-doom-orange font-bold">
                    {e.totalScore.toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-right text-gray-400">{e.gamesPlayed}</td>
                  <td className="py-3 px-2 text-right text-green-400">{e.wins}</td>
                  <td className="py-3 px-2 text-right text-red-400">{e.kills}</td>
                  <td className="py-3 px-2 text-right text-gray-300">
                    {e.winRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
