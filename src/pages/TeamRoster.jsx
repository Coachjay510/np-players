import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PlayerCard2K } from '../components/cards/PlayerCard2K'
import { calcOverall, getRatingColor } from '../lib/ratings'

export function TeamRoster() {
  const { teamId } = useParams()
  const [team, setTeam]       = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort]       = useState('ovr') // 'ovr' | 'position' | 'jersey'

  useEffect(() => {
    async function load() {
      // Load team info from bt_master_teams
      const { data: teamData } = await supabase
        .from('bt_master_teams')
        .select('id, display_name, age_group, grad_year, gender, logo_url, contact_name')
        .eq('id', teamId)
        .single()
      setTeam(teamData)

      // Load all players linked to this team
      const { data: links } = await supabase
        .from('team_players')
        .select('linked_by, players(*, stats(*))')
        .eq('np_team_id', teamId)

      const roster = (links ?? [])
        .map(l => ({
          ...l.players,
          stats:     l.players?.stats?.[0] ?? {},
          linked_by: l.linked_by,
        }))
        .filter(p => p.id)

      setPlayers(roster)
      setLoading(false)
    }
    load()
  }, [teamId])

  const sorted = [...players].sort((a, b) => {
    if (sort === 'ovr')      return calcOverall(b.stats) - calcOverall(a.stats)
    if (sort === 'jersey')   return (a.jersey_number ?? 99) - (b.jersey_number ?? 99)
    if (sort === 'position') {
      const order = { 'Point Guard': 1, 'Shooting Guard': 2, 'Small Forward': 3, 'Power Forward': 4, 'Center': 5 }
      return (order[a.position] ?? 9) - (order[b.position] ?? 9)
    }
    return 0
  })

  const avgOvr = players.length
    ? Math.round(players.reduce((s, p) => s + calcOverall(p.stats), 0) / players.length)
    : null

  if (loading) {
    return <div style={{ paddingTop: 120, textAlign: 'center', color: 'var(--text3)', fontFamily: 'var(--font-m)', letterSpacing: 2 }}>LOADING…</div>
  }

  if (!team) {
    return (
      <div style={{ paddingTop: 120, textAlign: 'center' }}>
        <div style={{ color: 'var(--text3)' }}>Team not found.</div>
        <Link to="/" style={{ color: 'var(--green2)', marginTop: 12, display: 'block' }}>← Back to Roster</Link>
      </div>
    )
  }

  const teamColor = avgOvr ? getRatingColor(avgOvr) : 'var(--green2)'

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px clamp(16px,4vw,48px) 60px' }}>

      {/* Team header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 24, marginBottom: 40,
        background: `linear-gradient(135deg, ${teamColor}08, transparent)`,
        border: `1px solid ${teamColor}20`,
        borderRadius: 16, padding: '24px 28px',
      }}>
        {team.logo_url
          ? <img src={team.logo_url} alt={team.display_name}
              style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 12 }} />
          : <div style={{
              width: 72, height: 72, borderRadius: 12,
              background: `${teamColor}20`, border: `1px solid ${teamColor}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
            }}>🏀</div>
        }
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-m)', fontSize: 9, letterSpacing: 3, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>
            NextPlay Sports · Team Roster
          </div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(28px,4vw,48px)', lineHeight: .95, letterSpacing: 1 }}>
            {team.display_name}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
            {[team.age_group, team.grad_year ? `Class of ${team.grad_year}` : null, team.gender].filter(Boolean).join(' · ')}
          </div>
        </div>
        {/* Team stat pills */}
        <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-d)', fontSize: 32, color: teamColor, lineHeight: 1 }}>{players.length}</div>
            <div style={{ fontSize: 9, fontFamily: 'var(--font-m)', color: 'var(--text3)', letterSpacing: 1, marginTop: 2 }}>PLAYERS</div>
          </div>
          {avgOvr && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: 32, color: teamColor, lineHeight: 1 }}>{avgOvr}</div>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-m)', color: 'var(--text3)', letterSpacing: 1, marginTop: 2 }}>AVG OVR</div>
            </div>
          )}
        </div>
      </div>

      {/* Sort controls */}
      {players.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-m)', color: 'var(--text3)', letterSpacing: 1, marginRight: 6 }}>SORT:</span>
          {[['ovr', 'By Rating'], ['position', 'By Position'], ['jersey', 'By Jersey #']].map(([val, label]) => (
            <button key={val} onClick={() => setSort(val)} style={{
              padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              border: 'none',
              background: sort === val ? 'var(--green)' : 'var(--bg2)',
              color: sort === val ? '#000' : 'var(--text2)',
            }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Roster grid */}
      {players.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          background: 'var(--bg2)', border: '1px dashed var(--border2)',
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏀</div>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: 24, marginBottom: 8 }}>NO PLAYERS YET</div>
          <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>
            Players can link to this team from their profile, or coaches can add them.
          </div>
          <Link to="/coach" style={{
            display: 'inline-block', padding: '10px 24px',
            background: 'var(--green)', color: '#000',
            borderRadius: 8, fontWeight: 800, fontSize: 13,
          }}>
            Coach Roster Builder →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {sorted.map(player => (
            <Link key={player.id} to={`/player/${player.id}`} style={{ textDecoration: 'none' }}>
              <PlayerCard2K player={player} />
            </Link>
          ))}
        </div>
      )}

      {/* Coach link */}
      {players.length > 0 && (
        <div style={{
          marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '16px 20px',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Are you the coach?</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Add or remove players from this team's roster.</div>
          </div>
          <Link to="/coach" style={{
            padding: '8px 18px', background: 'var(--green)', color: '#000',
            borderRadius: 8, fontWeight: 800, fontSize: 12,
          }}>
            Roster Builder →
          </Link>
        </div>
      )}
    </div>
  )
}
