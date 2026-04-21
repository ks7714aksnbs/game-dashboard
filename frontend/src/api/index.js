import api from './client'

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/api/auth/register', data),
  login:    (data) => api.post('/api/auth/login',    data),
}

// ── Game Sessions ───────────────────────────────────────────────────────────
export const gameApi = {
  createSession: (data) => api.post('/api/game/sessions',            data),
  joinSession:   (data) => api.post('/api/game/sessions/join',       data),
  startSession:  (code) => api.post(`/api/game/sessions/${code}/start`),
  getOpenSessions:()   => api.get('/api/game/sessions'),
  getSession:  (code)  => api.get(`/api/game/sessions/${code}`),
  submitResult:(data)  => api.post('/api/game/result',               data),
  getHistory:  ()      => api.get('/api/game/history'),
}

// ── Leaderboard ─────────────────────────────────────────────────────────────
export const leaderboardApi = {
  get: () => api.get('/api/leaderboard'),
}
