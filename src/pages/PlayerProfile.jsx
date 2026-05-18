import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PhotoUpload } from '../components/player/PhotoUpload'
import { PlayerCard3D } from '../components/avatar/PlayerCard3D'
import { TeamSearch } from '../components/player/TeamSearch'
import { calcOverall, getArchetype, getRatingColor } from '../lib/ratings'

const SOCIAL_ICONS = {
  instagram: '📸',
  twitter:   '𝕏',
  tiktok:    '🎵',
  youtube:   '▶️',
  maxpreps:  '📊',
}

export function PlayerProfile() {
  const { id } = useParams()
  const [player, setPlayer]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [editingPhoto, setEditingPhoto]   = useState(false)
  const [linkingTeam, setLinkingTeam]     = useState(false)
  const [activeTab, setActiveTab]         = useState('card3d')

  useEffect(() => {
    supabase
      .from('players')
      .select('*, stats(*), player_links(*), player_media(*), team_players(id, np_team_id)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setPlayer({ ...data, stats: data.stats?.[0] ?? {} })
        }
        setLoading(false)
      })
  }, [id])

  async function linkTeam(team) {
    // Upsert into team_players (player self-linking)
    await supabase
      .from('team_players')
      .upsert({ np_team_id: team.id, player_id: id, linked_by: 'player' }, { onConflict: 'np_team_id,player_id' })
    // Also update the player row with the primary team name for display
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
    // Show preview immediately; persist once path is confirmed (not a blob URL)
    setPlayer(p => ({ ...p, photo_url: url }))
    if (path && !url.startsWith('blob:')) {
      await supabase.from('players').update({ photo_url: url }).eq('id', id)
      setEditingPhoto(false)
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

  const stats    = player.stats
  const ovr      = calcOverall(stats)
  const arch     = getArchetype(stats)
  const color    = getRatingColor(ovr)
  const links      = player.player_links ?? []
  const media      = player.player_media ?? []
  const socials    = links.filter(l => !['maxpreps', 'aau_passport'].includes(l.type))
  const maxpreps   = links.find(l => l.type === 'maxpreps')
  const aauPassport = links.find(l => l.type === 'aau_passport')

  const STAT_ROWS = [
    ['Points',    'ppg',    null],
    ['Rebounds',  'rpg',    null],
    ['Assists',   'apg',    null],
    ['Steals',    'spg',    null],
    ['Blocks',    'bpg',    null],
    ['FG%',       'fg_pct', v => v ? `${Math.round(v*100)}%` : '—'],
    ['FT%',       'ft_pct', v => v ? `${Math.round(v*100)}%` : '—'],
    ['Turnovers', 'tpg',    null],
    ['Games',     'gp',     null],
  ]

  return (
    <>
      <div style={{ paddingTop: 72, maxWidth: 1100, margin: '0 auto', padding: '72px clamp(16px,4vw,40px) 60px' }}>
        <Link to="/" style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-m)', letterSpacing: 1, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>
          ← ROSTER
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'start' }}>
          {/* Left: hero + avatar */}
          <div style={{ width: 300, flexShrink: 0 }}>
            {/* Player photo hero */}
            {editingPhoto
              ? (
                <div style={{ marginBottom: 16 }}>
                  <PhotoUpload
                    value={player.photo_url}
                    onChange={handlePhotoChange}
                    playerId={id}
                  />
                  <button
                    onClick={() => setEditingPhoto(false)}
                    style={{
                      marginTop: 8, width: '100%', padding: '8px 0',
                      background: 'none', border: '1px solid var(--border2)',
                      color: 'var(--text3)', borderRadius: 8, fontSize: 12,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{
                  height: 320, borderRadius: 16, overflow: 'hidden', marginBottom: 16,
                  background: `linear-gradient(160deg, ${color}14 0%, #04060a 100%)`,
                  position: 'relative', border: `1px solid ${color}30`,
                  cursor: 'pointer',
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
                  {/* Edit overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(4,6,10,.5)',
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
              )
            }

            {/* Tabs: 3D Card / Stats */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 12, background: 'var(--bg2)', borderRadius: 8, padding: 4 }}>
              {[['card3d', '🎮 3D Card'], ['stats', '📊 Stats']].map(([t, label]) => (
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
              <div>
                <PlayerCard3D player={player} ovr={ovr} stats={stats} height={360} />
              </div>
            )}

            {activeTab === 'stats' && (
              <div style={{ background: 'var(--bg2)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-m)', letterSpacing: 1, color: 'var(--text3)', textTransform: 'uppercase' }}>
                    Season Averages
                  </span>
                  <span style={{ fontSize: 10, color, fontFamily: 'var(--font-m)' }}>{arch}</span>
                </div>
                {STAT_ROWS.map(([label, key, fmt]) => {
                  const raw = stats?.[key]
                  const val = fmt ? fmt(raw) : (raw ?? '—')
                  return (
                    <div key={key} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '9px 14px', borderBottom: '1px solid var(--border)',
                    }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--font-d)', fontSize: 16, color: raw ? 'var(--text)' : 'var(--text3)' }}>
                        {val}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: info */}
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
              {player.grad_year && (
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
                  Class of {player.grad_year} · Delta Dubs Basketball
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
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              {[['PPG', stats.ppg], ['RPG', stats.rpg], ['APG', stats.apg]].map(([label, val]) => (
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

            {/* Profiles & Links */}
            {(socials.length > 0 || maxpreps || aauPassport) && (
              <div style={{ marginBottom: 28 }}>
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
                  <TeamSearch
                    placeholder="Search NextPlay teams…"
                    onSelect={linkTeam}
                  />
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

function linkBtn(color) {
  return {
    padding: '8px 16px', borderRadius: 8,
    background: 'var(--bg2)', border: '1px solid var(--border2)',
    color, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6,
    transition: 'border-color .15s',
  }
}
