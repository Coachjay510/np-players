import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { calcOverall, getArchetype, getRatingColor, combineStats } from '../lib/ratings'

const COLS = [
  { key: 'ovr',    label: 'OVR',   stat: null,       fmt: v => v },
  { key: 'ppg',    label: 'PPG',   stat: 'ppg',      fmt: v => v != null && v > 0 ? (+v).toFixed(1) : '—' },
  { key: 'rpg',    label: 'RPG',   stat: 'rpg',      fmt: v => v != null && v > 0 ? (+v).toFixed(1) : '—' },
  { key: 'apg',    label: 'APG',   stat: 'apg',      fmt: v => v != null && v > 0 ? (+v).toFixed(1) : '—' },
  { key: 'spg',    label: 'SPG',   stat: 'spg',      fmt: v => v != null && v > 0 ? (+v).toFixed(1) : '—' },
  { key: 'bpg',    label: 'BPG',   stat: 'bpg',      fmt: v => v != null && v > 0 ? (+v).toFixed(1) : '—' },
  { key: 'fg_pct', label: 'FG%',   stat: 'fg_pct',   fmt: v => v != null && v > 0 ? `${Math.round(v * 100)}%` : '—' },
  { key: 'ft_pct', label: 'FT%',   stat: 'ft_pct',   fmt: v => v != null && v > 0 ? `${Math.round(v * 100)}%` : '—' },
  { key: 'fg3_pct',label: '3P%',   stat: 'fg3_pct',  fmt: v => v != null && v > 0 ? `${Math.round(v * 100)}%` : '—' },
  { key: 'tpg',    label: 'TO',    stat: 'tpg',      fmt: v => v != null && v > 0 ? (+v).toFixed(1) : '—' },
  { key: 'gp',     label: 'GP',    stat: 'gp',       fmt: v => v != null && v > 0 ? v : '—' },
]

function pickStats(allStats, source) {
  const aau = allStats.find(s => s.source === 'aau' || !s.source) ?? null
  const hs  = allStats.find(s => s.source === 'highschool') ?? null
  if (source === 'combined') return combineStats(aau, hs) ?? aau ?? {}
  if (source === 'highschool') return hs ?? {}
  return aau ?? {}
}

export function Rankings() {
  const [players, setPlayers]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [statSource, setStatSource] = useState('aau')
  const [sortKey, setSortKey]       = useState('ovr')
  const [sortDir, setSortDir]       = useState('desc')
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('players')
      .select('id, name, position, jersey_number, photo_url, grad_year, school_name, np_team_name, stats(*)')
      .not('name', 'is', null)
      .then(({ data }) => { setPlayers(data ?? []); setLoading(false) })
  }, [])

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const ranked = players
    .map(p => {
      const stats = pickStats(p.stats ?? [], statSource)
      return { ...p, activeStats: stats, ovr: calcOverall(stats) }
    })
    .filter(p => p.ovr > 60)
    .sort((a, b) => {
      const col = COLS.find(c => c.key === sortKey)
      const av = col?.stat ? (a.activeStats?.[col.stat] ?? 0) : a.ovr
      const bv = col?.stat ? (b.activeStats?.[col.stat] ?? 0) : b.ovr
      return sortDir === 'desc' ? bv - av : av - bv
    })

  const hasHS   = players.some(p => (p.stats ?? []).some(s => s.source === 'highschool'))
  const hasAny  = players.some(p => (p.stats ?? []).some(s => s.source === 'aau' || !s.source))
  const hasBoth = hasAny && hasHS

  return (
    <div style={{ paddingTop: 80, padding: '80px clamp(16px,4vw,48px) 60px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-m)', fontSize: 9, letterSpacing: 3, color: 'var(--green2)', marginBottom: 8, textTransform: 'uppercase' }}>
          // 2025–26 Season Rankings
        </div>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(36px,6vw,64px)', lineHeight: .9, letterSpacing: 1 }}>
          PLAYER RANKINGS
        </h1>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-m)', color: 'var(--text3)', letterSpacing: 1 }}>STATS:</span>
          {[
            hasAny  ? ['aau',        'AAU']      : null,
            hasHS   ? ['highschool', 'HS']       : null,
            hasBoth ? ['combined',   'Combined'] : null,
          ].filter(Boolean).map(([src, label]) => (
            <button key={src} onClick={() => setStatSource(src)} style={{
              padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: statSource === src ? 'var(--green)' : 'var(--bg2)',
              color: statSource === src ? '#000' : 'var(--text2)',
            }}>{label}</button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-m)', color: 'var(--text3)', letterSpacing: 1 }}>
          {ranked.length} PLAYERS · CLICK ROW TO VIEW PROFILE · CLICK COLUMN TO SORT
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontFamily: 'var(--font-m)', letterSpacing: 2 }}>COMPUTING…</div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr style={{ background: 'var(--bg2)' }}>
                <th style={th}>#</th>
                <th style={{ ...th, textAlign: 'left', minWidth: 200 }}>Player</th>
                <th style={{ ...th, textAlign: 'left', minWidth: 140 }}>Team</th>
                {COLS.map(c => (
                  <th key={c.key} style={{ ...th, cursor: 'pointer', userSelect: 'none',
                    color: sortKey === c.key ? 'var(--green2)' : 'var(--text3)',
                    background: sortKey === c.key ? 'rgba(92,184,0,.06)' : undefined,
                  }} onClick={() => handleSort(c.key)}>
                    {c.label}
                    {sortKey === c.key && (
                      <span style={{ marginLeft: 3, fontSize: 8 }}>{sortDir === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </th>
                ))}
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
                    {/* Rank */}
                    <td style={{ ...td, color: 'var(--text3)', fontFamily: 'var(--font-m)', width: 44 }}>
                      {i === 0 ? '👑' : i + 1}
                    </td>

                    {/* Player */}
                    <td style={{ ...td, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {player.photo_url
                          ? <img src={player.photo_url} alt={player.name}
                              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: `2px solid ${color}50`, flexShrink: 0 }} />
                          : <div style={{
                              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                              background: `${color}20`, display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 12, fontWeight: 700, color,
                            }}>{player.jersey_number ?? player.name?.[0]}</div>
                        }
                        <div>
                          <div style={{ fontWeight: 700 }}>{player.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-m)', marginTop: 1 }}>
                            {[player.position, player.grad_year ? `'${String(player.grad_year).slice(-2)}` : null].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Team */}
                    <td style={{ ...td, textAlign: 'left' }}>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {player.np_team_name ?? '—'}
                      </span>
                    </td>

                    {/* Stat columns */}
                    {COLS.map(c => {
                      const raw = c.stat ? player.activeStats?.[c.stat] : player.ovr
                      const isSort = sortKey === c.key
                      return (
                        <td key={c.key} style={{
                          ...td,
                          color: c.key === 'ovr' ? color : isSort ? 'var(--text)' : 'var(--text2)',
                          background: isSort ? 'rgba(92,184,0,.04)' : undefined,
                          fontFamily: c.key === 'ovr' ? 'var(--font-d)' : undefined,
                          fontSize: c.key === 'ovr' ? 20 : 13,
                          fontWeight: c.key === 'ovr' ? 900 : undefined,
                        }}>
                          {c.fmt(raw)}
                        </td>
                      )
                    })}
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
  padding: '11px 12px',
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
  padding: '11px 12px',
  textAlign: 'center',
  verticalAlign: 'middle',
}
