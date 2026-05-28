import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const API = import.meta.env.VITE_API_URL || ''

function StatCard({ label, value, unit, highlight }) {
  return (
    <div style={{
      background: highlight ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${highlight ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 12, padding: '16px 20px', minWidth: 140
    }}>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: highlight ? '#818cf8' : '#f1f5f9' }}>
        {value}<span style={{ fontSize: 14, color: '#64748b', marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  )
}

export default function App() {
  const [form, setForm] = useState({
    sqft: 2000, bedrooms: 3, bathrooms: 2,
    age_years: 10, garage: 1, neighborhood: 3
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [liveLog, setLiveLog] = useState([])
  const wsRef = useRef(null)

  // WebSocket for live stats
  useEffect(() => {
    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/live`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setStats(data)
      setHistory(h => [...h.slice(-30), {
        time: new Date().toLocaleTimeString(),
        p95: data.latency?.p95 || 0,
        p99: data.latency?.p99 || 0,
        p50: data.latency?.p50 || 0,
      }])
    }
    return () => ws.close()
  }, [])

  const handlePredict = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      setResult(data)
      setLiveLog(l => [{
        time: new Date().toLocaleTimeString(),
        price: `$${data.predicted_price.toLocaleString('en-US', {maximumFractionDigits: 0})}`,
        latency: `${data.latency_ms}ms`,
        cache: data.cache_hit ? '✓ HIT' : '✗ MISS'
      }, ...l.slice(0, 9)])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, background: 'linear-gradient(90deg,#818cf8,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ML Inference API
        </h1>
        <p style={{ color: '#64748b', marginTop: 6 }}>FastAPI + Redis + scikit-learn — Live Dashboard</p>
      </div>

      {/* Live stats bar */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
        <StatCard label="P50 Latency" value={stats?.latency?.p50 ?? '—'} unit="ms" />
        <StatCard label="P95 Latency" value={stats?.latency?.p95 ?? '—'} unit="ms" highlight />
        <StatCard label="P99 Latency" value={stats?.latency?.p99 ?? '—'} unit="ms" />
        <StatCard label="Cache Hit Rate" value={stats?.cache?.hit_rate ?? '—'} unit="%" />
        <StatCard label="Total Requests" value={stats?.latency?.count ?? '—'} unit="" />
      </div>

      {/* Latency Chart */}
      {history.length > 2 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>Live Latency (ms)</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="p50" stroke="#34d399" dot={false} strokeWidth={1.5} name="P50" />
              <Line type="monotone" dataKey="p95" stroke="#818cf8" dot={false} strokeWidth={2} name="P95" />
              <Line type="monotone" dataKey="p99" stroke="#f87171" dot={false} strokeWidth={1.5} name="P99" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Prediction Form */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>House Price Predictor</div>
          {Object.entries(form).map(([key, val]) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                {key.replace('_', ' ').toUpperCase()}
              </label>
              <input
                type="number"
                value={val}
                onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#f1f5f9', fontSize: 14, outline: 'none'
                }}
              />
            </div>
          ))}
          <button
            onClick={handlePredict}
            disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: loading ? '#334155' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
              color: '#fff', fontSize: 15, fontWeight: 600, marginTop: 8
            }}
          >
            {loading ? 'Predicting...' : 'Get Prediction'}
          </button>

          {result && (
            <div style={{ marginTop: 20, padding: 16, borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#818cf8' }}>
                ${result.predicted_price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>⚡ {result.latency_ms}ms</span>
                <span style={{ fontSize: 12, color: result.cache_hit ? '#34d399' : '#f59e0b' }}>
                  {result.cache_hit ? '✓ Cache HIT' : '✗ Cache MISS'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Live Request Log */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Live Request Log</div>
          {liveLog.length === 0 && (
            <p style={{ color: '#475569', fontSize: 14 }}>No requests yet. Make a prediction to see it here.</p>
          )}
          {liveLog.map((entry, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13
            }}>
              <span style={{ color: '#818cf8', fontWeight: 600 }}>{entry.price}</span>
              <span style={{ color: '#64748b' }}>{entry.latency}</span>
              <span style={{ color: entry.cache.includes('HIT') ? '#34d399' : '#f59e0b', fontSize: 11 }}>
                {entry.cache}
              </span>
              <span style={{ color: '#475569', fontSize: 11 }}>{entry.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}