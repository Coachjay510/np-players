import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { TeamSearch } from '../components/player/TeamSearch'
import { calcOverall, getRatingColor } from '../lib/ratings'

export function CoachRoster() {
  const [team, setTeam]         = useState(null)   // selected bt_master_teams row
  const [roster, setRoster]     = useState([])      // team_players rows with player data
  const [allPlayers, setAllPlayers] = useState([])  // all players for search
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [linking, setLinking]   = useState(null)    // player id being linked

  // Load all players once (for the search panel)
  useEffect(() => {
    supabase
      .from('players')
      .select('id, name, position, jersey_number, photo_url, grad_year, stats(*)')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setAllPlayers(
        (data ?? []).map(p => ({ ...p, stats: p.stats?.[0] ?? {} }))
      ))
  }, [])

  // Load roster when team changes
  useEffect(() => {
    if (!team) { setRoster([]); return }
    setLoading(true)
    supabase
      .from('team_players')
      .select('id, player_id, linked_by, players(id, name, position, jersey_number, photo_url, grad_year, stats(*))')
      .eq('np_team_id', team.id)
      .then(({ data }) => {
        setRoster((data ?? []).map(row => ({
          linkId:    row.id,
          linked_by: row.linked_by,
          ...row.players,
          stats: row.players?.stats?.[0] ?? {},
        })))
        setLoading(false)
      })
  }, [team])

  const rosterIds = new Set(roster.map(p => p.id))

  async function addToRoster(player) {
    if (!team || rosterIds.has(player.id)) return
    setLinking(player.id)
    const { data } = await supabase
      .from('team_players')
      .insert({ np_team_id: team.id, player_id: player.id, linked_by: 'coach' })
      .select()
      .single()
    if (data) {
      setRoster(prev => [...prev, { linkId: data.id, linked_by: 'coach', ...player }])
    }
    setLinking(null)
  }

  async function removeFromRoster(linkId, playerId) {
    await supabase.from('team_players').delete().eq('id', linkId)
    setRoster(prev => prev.filter(p => p.id !== playerId))
  }

  const filtered = allPlayers.filter(p =>
    !rosterIds.has(p.id) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px clamp(16px,4vw,40px) 80px' }}>
      <div style={{ fontFamily: 'var(--font-m)', fontSize: 9, letterSpacing: 3, color: 'var(--green2)', marginBottom: 6, textTransform: 'uppercase' }}>
        // Coach Portal
      </div>
      <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 40, marginBottom: 8, letterSpacing: 1 }}>
        ROSTER BUILDER
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 32 }}>
        Select your NextPlay team, then add players to your roster.
      </p>

      {/* Team selector */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '18px 20px', marginBottom: 28,
      }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-m)', letterSpacing: 2, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase' }}>
          Your Team
        </div>
        {team ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {team.logo_url
              ? <img src={team.logo_url} alt="" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8 }} />
              : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏀</div>
            }
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{team.display_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-m)', marginTop: 2 }}>
                {[team.age_group, team.grad_year ? `Class ${team.grad_year}` : null].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button onClick={() => setTeam(null)} style={{
              background: 'none', border: '1px solid var(--border2)',
              color: 'var(--text3)', borderRadius: 8, padding: '6px 12px', fontSize: 12,
            }}>
              Change
            </button>
          </div>
        ) : (
          <TeamSearch
            placeholder="Search for your NextPlay team…"
            onSelect={t => setTeam(t)}
          />
        )}
      </div>

      {team && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

          {/* Current roster */}
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-m)', letterSpacing: 2, color: 'var(--text3)', marginBottom: 12, textTransform: 'uppercase' }}>
              Current Roster ({roster.length})
            </div>
            {loading ? (
              <div style={{ color: 'var(--text3)', fontFamily: 'var(--font-m)', fontSize: 11, letterSpacing: 2 }}>LOADING…</div>
            ) : roster.length === 0 ? (
              <div style={{
                background: 'var(--bg2)', border: '1px dashed var(--border2)',
                borderRadius: 12, padding: '32px 20px', textAlign: 'center',
                color: 'var(--text3)', fontSize: 13,
              }}>
                No players linked yet. Search and add players →
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {roster.map(player => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    action={
                      <button
                        onClick={() => removeFromRoster(player.linkId, player.id)}
                        style={{
                          background: 'none', border: '1px solid #ef444440',
                          color: '#ef4444', borderRadius: 6, padding: '4px 10px', fontSize: 11,
                        }}
                      >
                        Remove
                      </button>
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Player search / add */}
          <div>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-m)', letterSpacing: 2, color: 'var(--text3)', marginBottom: 12, textTransform: 'uppercase' }}>
              Add Players
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search players by name…"
              style={{ width: '100%', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
              {filtered.length === 0 && search && (
                <div style={{ fontSize: 13, color: 'var(--text3)', padding: '16px 0' }}>
                  No players found. <Link to="/admin/add" style={{ color: 'var(--green2)' }}>Add a player →</Link>
                </div>
              )}
              {filtered.map(player => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  action={
                    <button
                      onClick={() => addToRoster(player)}
                      disabled={linking === player.id}
                      style={{
                        background: linking === player.id ? 'transparent' : 'var(--green)',
                        border: 'none', borderRadius: 6, padding: '4px 12px',
                        color: linking === player.id ? 'var(--text3)' : '#000',
                        fontSize: 11, fontWeight: 700,
                      }}
                    >
                      {linking === player.id ? '…' : '+ Add'}
                    </button>
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerRow({ player, action }) {
  const ovr   = calcOverall(player.stats)
  const color = getRatingColor(ovr)
  const pos   = { 'Point Guard': 'PG', 'Shooting Guard': 'SG', 'Small Forward': 'SF', 'Power Forward': 'PF', 'Center': 'C' }
  const posShort = pos[player.position] ?? player.position ?? ''

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 12px',
    }}>
      {player.photo_url
        ? <img src={player.photo_url} alt={player.name}
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}40` }} />
        : <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color,
          }}>
            {player.jersey_number ?? player.name?.[0]}
          </div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-m)' }}>
          {[posShort, player.grad_year ? `'${String(player.grad_year).slice(-2)}` : null].filter(Boolean).join(' · ')}
        </div>
      </div>
      <span style={{
        fontFamily: 'var(--font-d)', fontSize: 18, color,
        minWidth: 32, textAlign: 'center',
      }}>
        {ovr}
      </span>
      {action}
    </div>
  )
}
