import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { calcOverall, getArchetype, getRatingColor, combineStats } from '../lib/ratings'

const COLS     = ['PPG', 'RPG', 'APG', 'SPG', 'BPG', 'FG%']
const STAT_KEY = { PPG: 'ppg', RPG: 'rpg', APG: 'apg', SPG: 'spg', BPG: 'bpg', 'FG%': 'fg_pct' }

function fmt(val, col) {
  if (val == null || val === 0) return '—'
  if (col === 'FG%') return `${Math.round(val * 100)}%`
  return (+val).toFixed(1)
}

function pickStats(allStats, source) {
  const aau = allStats.find(s => s.source === 'aau' || !s.source) ?? null
  const hs  = allStats.find(s => s.source === 'highschool') ?? null
  if (source === 'combined') return combineStats(aau, hs) ?? aau ?? {}
  if (source === 'highschool') return hs ?? {}
  return aau ?? {}
}

export function Rankings() {
  const [players, setPlayers]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [statSource, setStatSource] = useState('aau')  // 'aau' | 'highschool' | 'combined'
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('players')
      .select('id, name, position, jersey_number, photo_url, grad_year, school_name, np_team_name, stats(*)')
      .not('name', 'is', null)
      .then(({ data }) => {
        setPlayers(data ?? [])
        setLoading(false)
      })
  }, [])

  const ranked = players
    .map(p => {
      const stats = pickStats(p.stats ?? [], statSource)
      return { ...p, activeStats: stats, ovr: calcOverall(stats) }
    })
    .filter(p => p.ovr > 55)   // hide players with zero data under selected source
    .sort((a, b) => b.ovr - a.ovr)

  const hasHS      = players.some(p => (p.stats ?? []).some(s => s.source === 'highschool'))
  const hasAny     = players.some(p => (p.stats ?? []).some(s => s.source === 'aau' || !s.source))
  const hasBoth    = hasAny && hasHS

  return (
    <div style={{ paddingTop: 80, padding: '80px clamp(16px,4vw,48px) 60px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-m)', fontSize: 9, letterSpacing: 3, color: 'var(--green2)', marginBottom: 8, textTransform: 'uppercase' }}>
          // 2025–26 Season Rankings
        </div>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(36px,6vw,64px)', lineHeight: .9, letterSpacing: 1 }}>
          PLAYER RANKINGS
        </h1>
      </div>

      {/* Source toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-m)', color: 'var(--text3)', letterSpacing: 1, marginRight: 4 }}>STATS:</span>
        {[
          hasAny   ? ['aau',        'AAU']      : null,
          hasHS    ? ['highschool', 'HS']       : null,
          hasBoth  ? ['combined',   'Combined'] : null,
        ].filter(Boolean).map(([src, label]) => (
          <button key={src} onClick={() => setStatSource(src)} style={{
            padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            border: 'none',
            background: statSource === src ? 'var(--green)' : 'var(--bg2)',
            color: statSource === src ? '#000' : 'var(--text2)',
          }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontFamily: 'var(--font-m)', letterSpacing: 2 }}>COMPUTING…</div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg2)' }}>
                <th style={th}>#</th>
                <th style={{ ...th, textAlign: 'left', width: 200 }}>Player</th>
                <th style={th}>OVR</th>
                <th style={th}>TYPE</th>
                {COLS.map(c => <th key={c} style={th}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {ranked.map((player, i) => {
                const color = getRatingColor(player.ovr)
                const arch  = getArchetype(player.activeStats)
                return (
                  <tr
                    key={player.id}
                    onClick={() => navigate(`/player/${player.id}`)}
                    style={{
                      background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg2)',
                      cursor: 'pointer', transition: 'background .1s',
                      borderTop: '1px solid var(--border)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(92,184,0,.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--bg)' : 'var(--bg2)'}
                  >
                    <td style={{ ...td, color: 'var(--text3)', fontFamily: 'var(--font-m)', width: 48 }}>
                      {i === 0 ? '👑' : i + 1}
                    </td>
                    <td style={{ ...td, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {player.photo_url
                          ? <img src={player.photo_url} alt={player.name}
                              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}40` }} />
                          : <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: `${color}20`, display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 12, fontWeight: 700, color,
                            }}>
                              {player.jersey_number ?? player.name?.[0]}
                            </div>
                        }
                        <div>
                          <div style={{ fontWeight: 700 }}>{player.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-m)' }}>
                            {[player.position, player.school_name].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={td}>
                      <span style={{ fontFamily: 'var(--font-d)', fontSize: 22, color, display: 'block', textAlign: 'center' }}>
                        {player.ovr}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{
                        fontSize: 10, color, fontFamily: 'var(--font-m)',
                        background: `${color}12`, border: `1px solid ${color}30`,
                        borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap',
                      }}>
                        {arch}
                      </span>
                    </td>
                    {COLS.map(c => (
                      <td key={c} style={{ ...td, color: 'var(--text2)' }}>
                        {fmt(player.activeStats?.[STAT_KEY[c]], c)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const th = {
  padding: '11px 14px',
  fontFamily: 'var(--font-m)',
  fontSize: 9,
  letterSpacing: 1.5,
  color: 'var(--text3)',
  textTransform: 'uppercase',
  textAlign: 'center',
  borderBottom: '1px solid var(--border2)',
  whiteSpace: 'nowrap',
}

const td = {
  padding: '12px 14px',
  textAlign: 'center',
  verticalAlign: 'middle',
}
