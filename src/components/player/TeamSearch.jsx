import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export function TeamSearch({ onSelect, placeholder = 'Search teams…' }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const debounce = useRef(null)

  useEffect(() => {
    clearTimeout(debounce.current)
    if (!query.trim()) { setResults([]); return }
    setLoading(true)
    debounce.current = setTimeout(async () => {
      const { data } = await supabase
        .from('bt_master_teams')
        .select('id, display_name, age_group, grad_year, logo_url, contact_name')
        .ilike('display_name', `%${query}%`)
        .is('merged_into_id', null)
        .order('display_name')
        .limit(12)
      setResults(data ?? [])
      setLoading(false)
      setOpen(true)
    }, 280)
  }, [query])

  function select(team) {
    onSelect(team)
    setQuery(team.display_name)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        style={{ width: '100%' }}
      />
      {loading && (
        <div style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-m)',
        }}>
          …
        </div>
      )}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg2)', border: '1px solid var(--border2)',
          borderRadius: 10, marginTop: 4, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {results.map(team => (
            <div
              key={team.id}
              onClick={() => select(team)}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'background .1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(92,184,0,.08)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              {team.logo_url
                ? <img src={team.logo_url} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'contain' }} />
                : <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🏀</div>
              }
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{team.display_name}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-m)' }}>
                  {[team.age_group, team.grad_year ? `Class ${team.grad_year}` : null, team.contact_name].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
