import { calcOverall, getArchetype, getRatingColor } from '../../lib/ratings'

const POSITION_SHORT = {
  'Point Guard': 'PG', 'Shooting Guard': 'SG', 'Small Forward': 'SF',
  'Power Forward': 'PF', 'Center': 'C',
  'PG': 'PG', 'SG': 'SG', 'SF': 'SF', 'PF': 'PF', 'C': 'C',
}

export function PlayerCard2K({ player, onClick }) {
  const stats  = player.stats || {}
  const ovr    = calcOverall(stats)
  const arch   = getArchetype(stats)
  const color  = getRatingColor(ovr)
  const pos    = POSITION_SHORT[player.position] ?? player.position ?? '—'

  const cardStats = [
    { label: 'PPG', value: stats.ppg ?? '—' },
    { label: 'RPG', value: stats.rpg ?? '—' },
    { label: 'APG', value: stats.apg ?? '—' },
    { label: 'SPG', value: stats.spg ?? '—' },
    { label: 'BPG', value: stats.bpg ?? '—' },
    { label: 'FG%', value: stats.fg_pct ? `${Math.round(stats.fg_pct * 100)}%` : '—' },
  ]

  return (
    <div onClick={onClick} style={{
      width: 200, cursor: onClick ? 'pointer' : 'default',
      borderRadius: 16, overflow: 'hidden',
      background: 'linear-gradient(160deg, #0d1218 0%, #080c12 100%)',
      border: `1px solid ${color}40`,
      boxShadow: `0 0 24px ${color}20`,
      transition: 'transform .15s, box-shadow .15s',
      userSelect: 'none',
    }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${color}40` } }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 0 24px ${color}20` }}
    >
      {/* Photo / gradient top */}
      <div style={{
        height: 180, position: 'relative', overflow: 'hidden',
        background: `linear-gradient(160deg, ${color}18 0%, #04060a 100%)`,
      }}>
        {player.photo_url
          ? <img src={player.photo_url} alt={player.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          : <div style={{
              width: '100%', height: '100%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 64, fontFamily: 'var(--font-d)', color: `${color}60`,
            }}>
              {player.jersey_number ?? '#'}
            </div>
        }
        {/* OVR badge */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: 'rgba(4,6,10,.85)', backdropFilter: 'blur(8px)',
          borderRadius: 8, padding: '4px 8px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <span style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, color, fontFamily: 'var(--font-d)' }}>
            {ovr}
          </span>
          <span style={{ fontSize: 9, color: '#6b7280', letterSpacing: 1, fontFamily: 'var(--font-m)' }}>
            OVR
          </span>
        </div>
        {/* Position badge */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: `${color}20`, border: `1px solid ${color}50`,
          borderRadius: 6, padding: '2px 8px',
          fontSize: 11, fontWeight: 700, color, letterSpacing: 1,
          fontFamily: 'var(--font-m)',
        }}>
          {pos}
        </div>
        {/* Bottom gradient */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
          background: 'linear-gradient(to top, #080c12, transparent)',
        }} />
      </div>

      {/* Name + archetype */}
      <div style={{ padding: '10px 12px 0' }}>
        <div style={{ fontFamily: 'var(--font-d)', fontSize: 17, lineHeight: 1.1, color: 'var(--text)' }}>
          {player.name}
        </div>
        <div style={{ fontSize: 10, color, fontFamily: 'var(--font-m)', letterSpacing: 1, marginTop: 2 }}>
          {arch}
        </div>
        {player.grade && (
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
            Class of {player.grad_year ?? player.grade}
          </div>
        )}
      </div>

      {/* Stat grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1, margin: '10px 12px 12px',
        background: 'var(--border)', borderRadius: 8, overflow: 'hidden',
      }}>
        {cardStats.map(({ label, value }) => (
          <div key={label} style={{
            background: 'var(--bg2)', padding: '6px 4px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-d)' }}>
              {value}
            </span>
            <span style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: 1, fontFamily: 'var(--font-m)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
