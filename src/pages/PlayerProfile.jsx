import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PhotoUpload } from '../components/player/PhotoUpload'
import { PlayerSpotlight } from '../components/player/PlayerSpotlight'
import { TeamSearch } from '../components/player/TeamSearch'
import { calcOverall, getArchetype, getRatingColor, combineStats, calcSkills } from '../lib/ratings'

const SOCIAL_ICONS = {
  instagram: '📸',
  twitter:   '𝕏',
  tiktok:    '🎵',
  youtube:   '▶️',
  maxpreps:  '📊',
}

const STAT_ROWS = [
  ['Points',    'ppg',    null],
  ['Rebounds',  'rpg',    null],
  ['Assists',   'apg',    null],
  ['Steals',    'spg',    null],
  ['Blocks',    'bpg',    null],
  ['FG%',       'fg_pct', v => v != null ? `${Math.round(v * 100)}%` : '—'],
  ['FT%',       'ft_pct', v => v != null ? `${Math.round(v * 100)}%` : '—'],
  ['3P%',       'fg3_pct',v => v != null ? `${Math.round(v * 100)}%` : '—'],
  ['Turnovers', 'tpg',    null],
  ['Games',     'gp',     null],
]

const BLANK_HS = { ppg: '', rpg: '', apg: '', spg: '', bpg: '', fg_pct: '', ft_pct: '', fg3_pct: '', tpg: '', gp: '' }

export function PlayerProfile() {
  const { id } = useParams()
  const [player, setPlayer]           = useState(null)
  const [allStats, setAllStats]       = useState([])
  const [gameLogs, setGameLogs]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [editingPhoto, setEditingPhoto]   = useState(false)
  const [linkingTeam, setLinkingTeam]     = useState(false)
  const [activeTab, setActiveTab]         = useState('card3d')
  const [statSource, setStatSource]       = useState('aau')   // 'aau' | 'highschool' | 'combined'
  const [addingHS, setAddingHS]           = useState(false)
  const [hsDraft, setHsDraft]             = useState(BLANK_HS)
  const [savingHS, setSavingHS]           = useState(false)
  const [syncingMP, setSyncingMP]         = useState(false)
  const [syncMsg, setSyncMsg]             = useState(null)

  async function loadPlayer() {
    const { data } = await supabase
      .from('players')
      .select('*, stats(*), player_links(*), player_media(*), team_players(id, np_team_id)')
      .eq('id', id)
      .single()
    if (data) {
      setPlayer(data)
      setAllStats(data.stats ?? [])
    }
    const { data: logs } = await supabase
      .from('player_game_logs')
      .select('*')
      .eq('player_id', id)
      .order('game_date', { ascending: false })
      .limit(15)
    setGameLogs(logs ?? [])
    setLoading(false)
  }

  useEffect(() => { loadPlayer() }, [id])

  // Derive per-source stats rows
  const aauStats = allStats.find(s => s.source === 'aau' || !s.source) ?? null
  const hsStats  = allStats.find(s => s.source === 'highschool') ?? null
  const combined = combineStats(aauStats, hsStats)

  const hasBoth = aauStats && hsStats

  // Active stats based on selected source
  const activeStats = statSource === 'combined' ? (combined ?? aauStats ?? {})
    : statSource === 'highschool' ? (hsStats ?? {})
    : (aauStats ?? {})

  const ovr    = calcOverall(activeStats)
  const arch   = getArchetype(activeStats)
  const color  = getRatingColor(ovr)
  const skills = calcSkills(activeStats)

  async function linkTeam(team) {
    await supabase
      .from('team_players')
      .upsert({ np_team_id: team.id, player_id: id, linked_by: 'player' }, { onConflict: 'np_team_id,player_id' })
    await supabase
      .from('players')
      .update({ np_team_id: team.id, np_team_name: team.display_name })
      .eq('id', id)
    setPlayer(p => ({ ...p, np_team_id: team.id, np_team_name: team.display_name }))
    setLinkingTeam(false)
  }

  async function unlinkTeam() {
    await supabase.from('team_players').delete().eq('player_id', id).eq('np_team_id', player.np_team_id)
    await supabase.from('players').update({ np_team_id: null, np_team_name: null }).eq('id', id)
    setPlayer(p => ({ ...p, np_team_id: null, np_team_name: null }))
  }

  async function handlePhotoChange(url, path) {
    setPlayer(p => ({ ...p, photo_url: url }))
    if (path && !url.startsWith('blob:')) {
      await supabase.from('players').update({ photo_url: url }).eq('id', id)
      setEditingPhoto(false)
    }
  }

  async function saveHSStats() {
    setSavingHS(true)
    const payload = Object.fromEntries(
      Object.entries(hsDraft)
        .filter(([, v]) => v !== '')
        .map(([k, v]) => [k, parseFloat(v)])
    )
    if (!Object.keys(payload).length) { setSavingHS(false); return }

    if (hsStats) {
      await supabase.from('stats').update({ ...payload, source: 'highschool' }).eq('id', hsStats.id)
    } else {
      await supabase.from('stats').insert({ player_id: id, source: 'highschool', ...payload })
    }
    await loadPlayer()
    setStatSource('highschool')
    setAddingHS(false)
    setHsDraft(BLANK_HS)
    setSavingHS(false)
  }

  async function syncMaxpreps() {
    const mp = (player?.player_links ?? []).find(l => l.type === 'maxpreps')
    if (!mp) return
    setSyncingMP(true)
    setSyncMsg(null)
    try {
      const { data, error } = await supabase.functions.invoke('sync-maxpreps', {
        body: { player_id: id, url: mp.url },
      })
      if (error) throw error
      setSyncMsg(data?.message ?? 'Synced!')
      await loadPlayer()
      setStatSource('highschool')
    } catch (e) {
      setSyncMsg(e.message ?? 'Sync failed')
    } finally {
      setSyncingMP(false)
    }
  }

  if (loading) {
    return (
      <div style={{ paddingTop: 120, textAlign: 'center', color: 'var(--text3)', fontFamily: 'var(--font-m)', letterSpacing: 2 }}>
        LOADING…
      </div>
    )
  }

  if (!player) {
    return (
      <div style={{ paddingTop: 120, textAlign: 'center' }}>
        <div style={{ color: 'var(--text3)' }}>Player not found.</div>
        <Link to="/" style={{ color: 'var(--green2)', marginTop: 12, display: 'block' }}>← Back to Roster</Link>
      </div>
    )
  }

  const links       = player.player_links ?? []
  const media       = player.player_media ?? []
  const socials     = links.filter(l => !['maxpreps', 'aau_passport'].includes(l.type))
  const maxpreps    = links.find(l => l.type === 'maxpreps')
  const aauPassport = links.find(l => l.type === 'aau_passport')

  // Sub-header line: "Class of 2026 · Lincoln High · Delta Dubs Power"
  const subParts = [
    player.grad_year ? `Class of ${player.grad_year}` : null,
    player.school_name || null,
    player.np_team_name || null,
  ].filter(Boolean)

  return (
    <>
      <div style={{ paddingTop: 72, maxWidth: 1100, margin: '0 auto', padding: '72px clamp(16px,4vw,40px) 60px' }}>
        <Link to="/" style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-m)', letterSpacing: 1, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>
          ← ROSTER
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'start' }}>

          {/* ── Left column ── */}
          <div style={{ width: 300, flexShrink: 0 }}>

            {/* Player photo hero */}
            {editingPhoto ? (
              <div style={{ marginBottom: 16 }}>
                <PhotoUpload value={player.photo_url} onChange={handlePhotoChange} playerId={id} />
                <button onClick={() => setEditingPhoto(false)} style={{
                  marginTop: 8, width: '100%', padding: '8px 0',
                  background: 'none', border: '1px solid var(--border2)',
                  color: 'var(--text3)', borderRadius: 8, fontSize: 12,
                }}>
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{
                height: 320, borderRadius: 16, overflow: 'hidden', marginBottom: 16,
                background: `linear-gradient(160deg, ${color}14 0%, #04060a 100%)`,
                position: 'relative', border: `1px solid ${color}30`, cursor: 'pointer',
              }}
                onClick={() => setEditingPhoto(true)}
              >
                {player.photo_url
                  ? <img src={player.photo_url} alt={player.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                  : <div style={{
                      width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexDirection: 'column', gap: 8,
                    }}>
                      <span style={{ fontSize: 40 }}>📸</span>
                      <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-m)', letterSpacing: 1 }}>
                        ADD PHOTO
                      </span>
                    </div>
                }
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(4,6,10,.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity .2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}
                >
                  <span style={{ color: '#fff', fontFamily: 'var(--font-m)', fontSize: 11, letterSpacing: 2 }}>
                    {player.photo_url ? '📸 CHANGE PHOTO' : '📸 UPLOAD PHOTO'}
                  </span>
                </div>
                {/* OVR chip */}
                <div style={{
                  position: 'absolute', bottom: 12, left: 12,
                  background: 'rgba(4,6,10,.88)', backdropFilter: 'blur(10px)',
                  borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'baseline', gap: 6,
                  border: `1px solid ${color}40`,
                }}>
                  <span style={{ fontSize: 36, fontFamily: 'var(--font-d)', color, lineHeight: 1 }}>{ovr}</span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-m)', color: 'var(--text3)', letterSpacing: 1 }}>OVR</span>
                </div>
              </div>
            )}

            {/* View tabs: 3D Card / Stats */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 12, background: 'var(--bg2)', borderRadius: 8, padding: 4 }}>
              {[['card3d', '🎮 Card'], ['stats', '📊 Stats'], ['games', '🏀 Games']].map(([t, label]) => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  flex: 1, padding: '8px 0', border: 'none', borderRadius: 6,
                  background: activeTab === t ? 'var(--green)' : 'transparent',
                  color: activeTab === t ? '#000' : 'var(--text2)',
                  fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                  fontFamily: 'var(--font-m)',
                }}>
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'card3d' && (
              <PlayerSpotlight player={player} ovr={ovr} stats={activeStats} height={460} />
            )}

            {activeTab === 'stats' && (
              <div style={{ background: 'var(--bg2)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>

                {/* Source toggle tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                  {[
                    aauStats ? ['aau',        'AAU']      : null,
                    hsStats  ? ['highschool', 'HS']       : null,
                    hasBoth  ? ['combined',   'Combined'] : null,
                  ].filter(Boolean).map(([src, label]) => (
                    <button key={src} onClick={() => setStatSource(src)} style={{
                      flex: 1, padding: '8px 0', border: 'none',
                      borderBottom: statSource === src ? `2px solid ${color}` : '2px solid transparent',
                      background: 'transparent',
                      color: statSource === src ? color : 'var(--text3)',
                      fontSize: 10, fontFamily: 'var(--font-m)', letterSpacing: 1, fontWeight: 700,
                    }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Stat header row */}
                <div style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-m)', letterSpacing: 1, color: 'var(--text3)', textTransform: 'uppercase' }}>
                    {statSource === 'highschool' ? 'HS Averages' : statSource === 'combined' ? 'Combined Avg' : 'AAU Averages'}
                  </span>
                  <span style={{ fontSize: 10, color, fontFamily: 'var(--font-m)' }}>{arch}</span>
                </div>

                {/* Stat rows */}
                {STAT_ROWS.map(([label, key, fmt]) => {
                  const raw = activeStats?.[key]
                  const val = fmt ? fmt(raw) : (raw != null ? (+raw).toFixed(1) : '—')
                  return (
                    <div key={key} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '9px 14px', borderBottom: '1px solid var(--border)',
                    }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--font-d)', fontSize: 16, color: raw != null ? 'var(--text)' : 'var(--text3)' }}>
                        {val}
                      </span>
                    </div>
                  )
                })}

                {/* Add / Edit HS stats */}
                <div style={{ padding: '10px 14px' }}>
                  {!addingHS ? (
                    <button onClick={() => {
                      if (hsStats) {
                        setHsDraft({
                          ppg: hsStats.ppg ?? '', rpg: hsStats.rpg ?? '',
                          apg: hsStats.apg ?? '', spg: hsStats.spg ?? '',
                          bpg: hsStats.bpg ?? '', fg_pct: hsStats.fg_pct ?? '',
                          ft_pct: hsStats.ft_pct ?? '', fg3_pct: hsStats.fg3_pct ?? '',
                          tpg: hsStats.tpg ?? '', gp: hsStats.gp ?? '',
                        })
                      }
                      setAddingHS(true)
                    }} style={{
                      width: '100%', padding: '7px 0', border: '1px dashed var(--border2)',
                      borderRadius: 7, background: 'none', color: 'var(--text3)',
                      fontSize: 11, fontFamily: 'var(--font-m)', letterSpacing: 1,
                    }}>
                      {hsStats ? '✏️ EDIT HS STATS' : '+ ADD HS STATS'}
                    </button>
                  ) : (
                    <div>
                      <div style={{ fontSize: 10, fontFamily: 'var(--font-m)', letterSpacing: 1, color: 'var(--text3)', marginBottom: 8 }}>
                        HIGH SCHOOL AVERAGES
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                        {[
                          ['ppg', 'PPG'], ['rpg', 'RPG'], ['apg', 'APG'], ['spg', 'SPG'],
                          ['bpg', 'BPG'], ['tpg', 'TO/G'], ['fg_pct', 'FG% (0-1)'],
                          ['ft_pct', 'FT% (0-1)'], ['fg3_pct', '3P% (0-1)'], ['gp', 'Games'],
                        ].map(([key, label]) => (
                          <div key={key}>
                            <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 3, fontFamily: 'var(--font-m)' }}>{label}</div>
                            <input
                              type="number" step="0.01" min="0"
                              value={hsDraft[key]}
                              onChange={e => setHsDraft(d => ({ ...d, [key]: e.target.value }))}
                              style={{
                                width: '100%', padding: '5px 8px',
                                background: 'var(--bg)', border: '1px solid var(--border2)',
                                borderRadius: 6, color: 'var(--text)', fontSize: 12,
                                fontFamily: 'var(--font-b)',
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={saveHSStats} disabled={savingHS} style={{
                          flex: 1, padding: '7px 0', background: 'var(--green)', border: 'none',
                          borderRadius: 7, color: '#000', fontWeight: 800, fontSize: 11,
                          opacity: savingHS ? 0.6 : 1,
                        }}>
                          {savingHS ? 'Saving…' : 'Save HS Stats'}
                        </button>
                        <button onClick={() => { setAddingHS(false); setHsDraft(BLANK_HS) }} style={{
                          padding: '7px 12px', background: 'none', border: '1px solid var(--border2)',
                          borderRadius: 7, color: 'var(--text3)', fontSize: 11,
                        }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MaxPreps sync */}
                  {maxpreps && !addingHS && (
                    <div style={{ marginTop: 8 }}>
                      <button onClick={syncMaxpreps} disabled={syncingMP} style={{
                        width: '100%', padding: '7px 0', background: 'none',
                        border: '1px solid var(--border2)', borderRadius: 7,
                        color: '#f59e0b', fontSize: 11, fontFamily: 'var(--font-m)', letterSpacing: 1,
                        opacity: syncingMP ? 0.6 : 1,
                      }}>
                        {syncingMP ? '⏳ SYNCING…' : '🔄 SYNC HS STATS FROM MAXPREPS'}
                      </button>
                      {syncMsg && (
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, textAlign: 'center' }}>
                          {syncMsg}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'games' && (
              <div style={{ background: 'var(--bg2)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {gameLogs.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text3)', fontFamily: 'var(--font-m)', fontSize: 11, letterSpacing: 1 }}>
                    NO GAME LOGS YET
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border2)' }}>
                          {['DATE', 'OPP', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO', 'FG', '3P', 'FT'].map(h => (
                            <th key={h} style={glTh}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gameLogs.map((g, i) => {
                          const fgStr  = g.fg_made  != null ? `${g.fg_made}-${g.fg_att}`  : '—'
                          const fg3Str = g.fg3_made != null ? `${g.fg3_made}-${g.fg3_att}` : '—'
                          const ftStr  = g.ft_made  != null ? `${g.ft_made}-${g.ft_att}`  : '—'
                          const hiPts  = g.pts >= 20
                          return (
                            <tr key={g.id} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg2)' }}>
                              <td style={glTd}>{g.game_date ? new Date(g.game_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                              <td style={{ ...glTd, textAlign: 'left', fontWeight: 600, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {g.opponent ?? '—'}
                              </td>
                              <td style={{ ...glTd, color: hiPts ? color : 'var(--text)', fontWeight: hiPts ? 800 : 400, fontFamily: hiPts ? 'var(--font-d)' : undefined }}>
                                {g.pts ?? '—'}
                              </td>
                              <td style={glTd}>{g.reb ?? '—'}</td>
                              <td style={glTd}>{g.ast ?? '—'}</td>
                              <td style={glTd}>{g.stl ?? '—'}</td>
                              <td style={glTd}>{g.blk ?? '—'}</td>
                              <td style={{ ...glTd, color: g.turnovers >= 4 ? '#f87171' : 'var(--text2)' }}>{g.turnovers ?? '—'}</td>
                              <td style={{ ...glTd, color: 'var(--text3)' }}>{fgStr}</td>
                              <td style={{ ...glTd, color: 'var(--text3)' }}>{fg3Str}</td>
                              <td style={{ ...glTd, color: 'var(--text3)' }}>{ftStr}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right column ── */}
          <div>

            {/* Name / header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                {player.jersey_number != null && (
                  <span style={{
                    fontFamily: 'var(--font-d)', fontSize: 20, color: `${color}80`,
                    border: `1px solid ${color}30`, borderRadius: 8, padding: '2px 10px',
                  }}>
                    #{player.jersey_number}
                  </span>
                )}
                <span style={{ fontSize: 10, fontFamily: 'var(--font-m)', letterSpacing: 2, color: 'var(--text3)' }}>
                  {player.position ?? ''}
                </span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(36px,5vw,60px)', lineHeight: .95, letterSpacing: 1 }}>
                {player.name}
              </h1>
              {subParts.length > 0 && (
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
                  {subParts.join(' · ')}
                </div>
              )}
            </div>

            {/* Bio */}
            {player.bio && (
              <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 24, maxWidth: 520 }}>
                {player.bio}
              </p>
            )}

            {/* Quick stat highlights */}
            <div style={{ marginBottom: 8 }}>
              {/* Source pills */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {[
                  aauStats ? ['aau',        'AAU']      : null,
                  hsStats  ? ['highschool', 'HS']       : null,
                  hasBoth  ? ['combined',   'Combined'] : null,
                ].filter(Boolean).map(([src, label]) => (
                  <button key={src} onClick={() => setStatSource(src)} style={{
                    padding: '3px 10px', borderRadius: 20, border: 'none', fontSize: 10,
                    fontFamily: 'var(--font-m)', letterSpacing: 1, fontWeight: 700,
                    background: statSource === src ? color : 'var(--bg2)',
                    color: statSource === src ? '#000' : 'var(--text3)',
                  }}>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[['PPG', activeStats?.ppg], ['RPG', activeStats?.rpg], ['APG', activeStats?.apg]].map(([label, val]) => (
                  <div key={label} style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '14px 20px', textAlign: 'center', minWidth: 80,
                  }}>
                    <div style={{ fontFamily: 'var(--font-d)', fontSize: 32, color, lineHeight: 1 }}>
                      {val != null ? (+val).toFixed(1) : '—'}
                    </div>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-m)', letterSpacing: 2, color: 'var(--text3)', marginTop: 4 }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2K Skill Ratings */}
            <div style={{ marginBottom: 28, marginTop: 20 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-m)', letterSpacing: 2, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase' }}>
                Skill Ratings
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  ['Scoring',    skills.scoring],
                  ['3-Point',    skills.threePoint],
                  ['Playmaking', skills.playmaking],
                  ['Defense',    skills.defense],
                  ['Rebounding', skills.rebounding],
                  ['Free Throw', skills.freeThrow],
                ].map(([label, val]) => {
                  const barColor = val >= 80 ? '#fcd34d' : val >= 70 ? '#7de000' : val >= 60 ? '#38bdf8' : '#9ca3af'
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 80, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-m)', letterSpacing: 0.5, flexShrink: 0 }}>
                        {label}
                      </div>
                      <div style={{ flex: 1, height: 8, background: 'var(--bg2)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          width: `${((val - 40) / 59) * 100}%`,
                          background: barColor, transition: 'width .4s ease',
                        }} />
                      </div>
                      <div style={{ width: 28, fontFamily: 'var(--font-d)', fontSize: 16, color: barColor, textAlign: 'right', flexShrink: 0 }}>
                        {val}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Profiles & Links */}
            {(socials.length > 0 || maxpreps || aauPassport) && (
              <div style={{ marginBottom: 28, marginTop: 28 }}>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-m)', letterSpacing: 2, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase' }}>
                  Profiles & Links
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {aauPassport && (
                    <a href={aauPassport.url} target="_blank" rel="noopener noreferrer" style={linkBtn('#f97316')}>
                      🪪 AAU Passport
                    </a>
                  )}
                  {maxpreps && (
                    <a href={maxpreps.url} target="_blank" rel="noopener noreferrer" style={linkBtn('#f59e0b')}>
                      📊 MaxPreps
                    </a>
                  )}
                  {socials.map(link => (
                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" style={linkBtn('var(--green2)')}>
                      {SOCIAL_ICONS[link.type] ?? '🔗'} {link.label ?? link.type}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* NextPlay team link */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-m)', letterSpacing: 2, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase' }}>
                NextPlay Tournament Team
              </div>
              {player.np_team_id && !linkingTeam ? (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(92,184,0,.06), rgba(59,130,246,.06))',
                  border: '1px solid rgba(92,184,0,.2)',
                  borderRadius: 12, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <span style={{ fontSize: 24 }}>🏆</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green2)' }}>{player.np_team_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--font-m)' }}>NextPlay Sports</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setLinkingTeam(true)} style={{
                      background: 'none', border: '1px solid var(--border2)',
                      color: 'var(--text3)', borderRadius: 7, padding: '5px 10px', fontSize: 11,
                    }}>
                      Change
                    </button>
                    <button onClick={unlinkTeam} style={{
                      background: 'none', border: '1px solid #ef444430',
                      color: '#ef4444', borderRadius: 7, padding: '5px 10px', fontSize: 11,
                    }}>
                      Unlink
                    </button>
                  </div>
                </div>
              ) : linkingTeam || !player.np_team_id ? (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
                    Search for your NextPlay team to link your profile:
                  </div>
                  <TeamSearch placeholder="Search NextPlay teams…" onSelect={linkTeam} />
                  {linkingTeam && (
                    <button onClick={() => setLinkingTeam(false)} style={{
                      marginTop: 8, background: 'none', border: 'none',
                      color: 'var(--text3)', fontSize: 11, padding: 0,
                    }}>
                      Cancel
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            {/* Photo / Video gallery */}
            {media.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-m)', letterSpacing: 2, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase' }}>
                  Gallery
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {media.filter(m => m.type === 'photo').map(m => (
                    <img key={m.id} src={m.url} alt=""
                      style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
                  ))}
                  {media.filter(m => m.type === 'video').map(m => (
                    <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" style={{
                      height: 120, background: 'var(--bg2)', borderRadius: 10,
                      border: '1px solid var(--border)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 32,
                    }}>▶️</a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

const glTh = {
  padding: '9px 10px', fontFamily: 'var(--font-m)', fontSize: 9,
  letterSpacing: 1.5, color: 'var(--text3)', textTransform: 'uppercase',
  textAlign: 'center', whiteSpace: 'nowrap',
}

const glTd = {
  padding: '10px 10px', textAlign: 'center',
  verticalAlign: 'middle', color: 'var(--text2)',
}

function linkBtn(color) {
  return {
    padding: '8px 16px', borderRadius: 8,
    background: 'var(--bg2)', border: '1px solid var(--border2)',
    color, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6,
    transition: 'border-color .15s',
  }
}
