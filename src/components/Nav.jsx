import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const LINKS = [
  { to: '/',         label: 'Roster' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/coach',    label: 'Coaches' },
]

export function Nav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, player, signInWithGoogle, signOut } = useAuth()

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 clamp(16px,4vw,48px)', height: 56,
      background: 'rgba(4,6,10,.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-d)', fontSize: 20, color: 'var(--green2)', letterSpacing: 2 }}>NP</span>
        <span style={{ fontFamily: 'var(--font-m)', fontSize: 9, letterSpacing: 3, color: 'var(--text3)', textTransform: 'uppercase' }}>PLAYERS</span>
      </Link>

      <div style={{ display: 'flex', gap: 4 }}>
        {LINKS.map(({ to, label }) => (
          <Link key={to} to={to} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            color: pathname === to ? '#000' : 'var(--text2)',
            background: pathname === to ? 'var(--green)' : 'transparent',
            transition: 'all .15s',
          }}>
            {label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {user === undefined ? null : user ? (
          <>
            {player && (
              <Link to={`/player/${player.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '5px 10px', borderRadius: 8,
                background: 'var(--bg2)', border: '1px solid var(--border2)',
              }}>
                {player.photo_url
                  ? <img src={player.photo_url} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                  : <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#000' }}>
                      {player.name?.[0]}
                    </div>
                }
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>My Profile</span>
              </Link>
            )}
            <button
              onClick={signOut}
              style={{
                padding: '6px 12px', background: 'none',
                border: '1px solid var(--border2)', borderRadius: 8,
                color: 'var(--text3)', fontSize: 12,
              }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <button
              onClick={signInWithGoogle}
              style={{
                padding: '6px 14px', background: 'none',
                border: '1px solid var(--border2)', borderRadius: 8,
                color: 'var(--text2)', fontSize: 12, fontWeight: 600,
              }}
            >
              Sign In
            </button>
            <Link to="/admin/add" style={{
              padding: '6px 16px', background: 'var(--green)', color: '#000',
              borderRadius: 8, fontSize: 12, fontWeight: 800,
            }}>
              + Add Player
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
