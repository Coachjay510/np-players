import { calcSkills, getRatingColor } from '../../lib/ratings'

const POS_SHORT = {
  'Point Guard': 'PG', 'Shooting Guard': 'SG', 'Small Forward': 'SF',
  'Power Forward': 'PF', 'Center': 'C',
  PG: 'PG', SG: 'SG', SF: 'SF', PF: 'PF', C: 'C',
}

const SKILL_LABELS = [
  ['SCR', 'scoring'],
  ['3PT', 'threePoint'],
  ['PLY', 'playmaking'],
  ['DEF', 'defense'],
  ['REB', 'rebounding'],
  ['FT',  'freeThrow'],
]

export function PlayerSpotlight({ player, ovr, stats, height = 460 }) {
  const color  = getRatingColor(ovr)
  const skills = calcSkills(stats ?? {})
  const pos    = POS_SHORT[player.position] ?? player.position ?? ''

  const nameParts = (player.name ?? '').trim().split(' ')
  const lastName  = nameParts.pop()
  const firstName = nameParts.join(' ')

  return (
    <div style={{
      position: 'relative',
      height,
      borderRadius: 16,
      overflow: 'hidden',
      background: '#04060a',
      border: `1px solid ${color}30`,
      boxShadow: `0 0 40px ${color}18`,
    }}>

      {/* ── Photo / hero background ── */}
      {player.photo_url ? (
        <img
          src={player.photo_url}
          alt={player.name}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'top center',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 50% 30%, ${color}22 0%, #04060a 70%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: 120, fontWeight: 900, fontFamily: 'var(--font-d)',
            color: `${color}25`, lineHeight: 1,
          }}>
            {player.jersey_number ?? '#'}
          </span>
        </div>
      )}

      {/* ── Gradient overlays ── */}
      {/* Top fade */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 120,
        background: 'linear-gradient(to bottom, rgba(4,6,10,0.85) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      {/* Bottom fade — taller so skill bars are readable */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '62%',
        background: 'linear-gradient(to top, rgba(4,6,10,0.98) 40%, rgba(4,6,10,0.7) 75%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Top bar: OVR + Position ── */}
      <div style={{
        position: 'absolute', top: 14, left: 14, right: 14,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        {/* OVR badge */}
        <div style={{
          background: 'rgba(4,6,10,0.75)', backdropFilter: 'blur(10px)',
          borderRadius: 10, padding: '6px 12px',
          border: `1px solid ${color}50`,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <span style={{
            fontSize: 32, fontWeight: 900, lineHeight: 1,
            color, fontFamily: 'var(--font-d)',
          }}>{ovr}</span>
          <span style={{
            fontSize: 8, color: '#6b7280', letterSpacing: 2,
            fontFamily: 'var(--font-m)', marginTop: 1,
          }}>OVR</span>
        </div>

        {/* Position + jersey */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {pos && (
            <div style={{
              background: `${color}22`, backdropFilter: 'blur(10px)',
              border: `1px solid ${color}60`,
              borderRadius: 8, padding: '4px 12px',
              fontSize: 13, fontWeight: 700, color,
              fontFamily: 'var(--font-m)', letterSpacing: 1,
            }}>{pos}</div>
          )}
          {player.jersey_number != null && (
            <div style={{
              background: 'rgba(4,6,10,0.65)', backdropFilter: 'blur(10px)',
              borderRadius: 8, padding: '3px 10px',
              fontSize: 11, color: '#6b7280',
              fontFamily: 'var(--font-m)', letterSpacing: 1,
            }}>#{player.jersey_number}</div>
          )}
        </div>
      </div>

      {/* ── Bottom content ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '0 18px 18px',
      }}>
        {/* Name */}
        <div style={{ marginBottom: 14 }}>
          {firstName && (
            <div style={{
              fontSize: 13, color: '#9ca3af', fontFamily: 'var(--font-m)',
              letterSpacing: 2, textTransform: 'uppercase', lineHeight: 1,
              marginBottom: 2,
            }}>{firstName}</div>
          )}
          <div style={{
            fontSize: 34, fontWeight: 900, color: '#f0f4f8',
            fontFamily: 'var(--font-d)', lineHeight: 1, textTransform: 'uppercase',
            textShadow: '0 2px 12px rgba(0,0,0,0.8)',
          }}>{lastName}</div>
        </div>

        {/* Skill bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {SKILL_LABELS.map(([label, key]) => {
            const val = skills[key] ?? 60
            const barColor = val >= 85 ? '#fcd34d' : val >= 75 ? '#7de000' : val >= 65 ? '#38bdf8' : '#9ca3af'
            const pct = ((val - 40) / 59) * 100
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 28, fontSize: 8, color: '#6b7280',
                  fontFamily: 'var(--font-m)', letterSpacing: 1, flexShrink: 0,
                }}>{label}</span>
                <div style={{
                  flex: 1, height: 5, borderRadius: 3,
                  background: 'rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
                    borderRadius: 3,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                <span style={{
                  width: 24, fontSize: 11, fontWeight: 700,
                  color: barColor, fontFamily: 'var(--font-d)',
                  textAlign: 'right', flexShrink: 0,
                }}>{val}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Accent glow line at top ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
      }} />
    </div>
  )
}
