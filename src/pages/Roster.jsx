import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PlayerCard2K } from '../components/cards/PlayerCard2K'

export function Roster() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    supabase
      .from('players')
      .select('*, stats(*)')
      .order('jersey_number')
      .then(({ data }) => {
        setPlayers((data ?? []).map(p => ({
          ...p,
          stats: p.stats?.[0] ?? {},
        })))
        setLoading(false)
      })
  }, [])

  const POSITIONS = ['all', 'PG', 'SG', 'SF', 'PF', 'C']

  const visible = filter === 'all'
    ? players
    : players.filter(p => {
        const pos = p.position?.replace('Point Guard','PG').replace('Shooting Guard','SG')
          .replace('Small Forward','SF').replace('Power Forward','PF').replace('Center','C')
        return pos === filter
      })

  return (
    <div style={{ paddingTop: 80, padding: '80px clamp(16px,4vw,48px) 60px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'var(--font-m)', fontSize: 9, letterSpacing: 3, color: 'var(--green2)', marginBottom: 8, textTransform: 'uppercase' }}>
          // Delta Dubs Basketball
        </div>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(36px,6vw,64px)', lineHeight: .9, letterSpacing: 1, marginBottom: 8 }}>
          THE ROSTER
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>
          {players.length} players · NextPlay Sports · 2025–26 Season
        </p>
      </div>

      {/* Position filter */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 32, flexWrap: 'wrap' }}>
        {POSITIONS.map(pos => (
          <button key={pos} onClick={() => setFilter(pos)} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            border: 'none',
            background: filter === pos ? 'var(--green)' : 'var(--bg2)',
            color: filter === pos ? '#000' : 'var(--text2)',
            letterSpacing: 0.5,
          }}>
            {pos === 'all' ? 'All' : pos}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontFamily: 'var(--font-m)', letterSpacing: 2 }}>
          LOADING ROSTER…
        </div>
      ) : visible.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          color: 'var(--text3)', fontFamily: 'var(--font-m)', letterSpacing: 2,
        }}>
          NO PLAYERS YET
        </div>
      ) : (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 20,
          justifyContent: 'flex-start',
        }}>
          {visible.map(player => (
            <PlayerCard2K
              key={player.id}
              player={player}
              onClick={() => navigate(`/player/${player.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
