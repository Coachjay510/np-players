import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PhotoUpload } from '../components/player/PhotoUpload'

const POSITIONS = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center']

export function AddPlayer() {
  const navigate = useNavigate()
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [pendingPath, setPendingPath] = useState(null) // storage path before player id is known

  const [info, setInfo] = useState({
    name: '', position: 'Point Guard', jersey_number: '', grad_year: '', bio: '', school_name: '',
  })

  const [stats, setStats] = useState({
    ppg: '', rpg: '', apg: '', spg: '', bpg: '',
    fg_pct: '', ft_pct: '', tpg: '', gp: '',
  })

  const [links, setLinks] = useState([
    { type: 'aau_passport', label: 'AAU Passport', url: '' },
    { type: 'maxpreps',     label: 'MaxPreps',     url: '' },
    { type: 'instagram',    label: 'Instagram',    url: '' },
    { type: 'twitter',      label: 'Twitter/X',    url: '' },
    { type: 'tiktok',       label: 'TikTok',       url: '' },
    { type: 'youtube',      label: 'YouTube',      url: '' },
  ])

  function handlePhotoChange(url, path) {
    setPhotoUrl(url)
    if (path) setPendingPath(path)
  }

  async function handleSave() {
    if (!info.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      // If photo was uploaded to a temp path (no playerId yet), move it now
      let finalPhotoUrl = photoUrl
      if (pendingPath && pendingPath.startsWith('undefined/')) {
        // Photo was uploaded before we had a player id — it's already stored, url is fine
      }

      const { data: player, error: pErr } = await supabase
        .from('players')
        .insert({
          name:          info.name.trim(),
          position:      info.position,
          jersey_number: info.jersey_number ? +info.jersey_number : null,
          grad_year:     info.grad_year     ? +info.grad_year      : null,
          bio:           info.bio.trim()        || null,
          school_name:   info.school_name.trim() || null,
          photo_url:     finalPhotoUrl          || null,
        })
        .select()
        .single()

      if (pErr) throw pErr

      const statPayload = Object.fromEntries(
        Object.entries(stats)
          .filter(([, v]) => v !== '')
          .map(([k, v]) => [k, parseFloat(v)])
      )
      if (Object.keys(statPayload).length > 0) {
        await supabase.from('stats').insert({ player_id: player.id, ...statPayload })
      }

      const linkPayload = links
        .filter(l => l.url.trim())
        .map(l => ({ player_id: player.id, type: l.type, label: l.label, url: l.url.trim() }))
      if (linkPayload.length > 0) {
        await supabase.from('player_links').insert(linkPayload)
      }

      navigate(`/player/${player.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '80px clamp(16px,4vw,40px) 80px' }}>
      <div style={{ fontFamily: 'var(--font-m)', fontSize: 9, letterSpacing: 3, color: 'var(--green2)', marginBottom: 6, textTransform: 'uppercase' }}>
        // Admin
      </div>
      <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 40, marginBottom: 32, letterSpacing: 1 }}>
        ADD PLAYER
      </h1>

      <Section title="Player Photo">
        <PhotoUpload value={photoUrl} onChange={handlePhotoChange} />
      </Section>

      <Section title="Player Info">
        <Row>
          <Field label="Full Name *">
            <input value={info.name} onChange={e => setInfo(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Jaylen Smith" />
          </Field>
          <Field label="Jersey #">
            <input type="number" value={info.jersey_number} onChange={e => setInfo(p => ({ ...p, jersey_number: e.target.value }))} placeholder="23" />
          </Field>
        </Row>
        <Row>
          <Field label="Position">
            <select value={info.position} onChange={e => setInfo(p => ({ ...p, position: e.target.value }))}>
              {POSITIONS.map(pos => <option key={pos}>{pos}</option>)}
            </select>
          </Field>
          <Field label="Grad Year">
            <input type="number" value={info.grad_year} onChange={e => setInfo(p => ({ ...p, grad_year: e.target.value }))} placeholder="2026" />
          </Field>
        </Row>
        <Field label="High School">
          <input value={info.school_name} onChange={e => setInfo(p => ({ ...p, school_name: e.target.value }))} placeholder="e.g. Lincoln High School" />
        </Field>
        <Field label="Bio (optional)">
          <textarea
            rows={3}
            value={info.bio}
            onChange={e => setInfo(p => ({ ...p, bio: e.target.value }))}
            placeholder="Short bio…"
            style={{
              resize: 'vertical', width: '100%',
              background: 'var(--bg2)', border: '1px solid var(--border2)',
              borderRadius: 8, color: 'var(--text)', padding: '10px 14px',
              fontFamily: 'var(--font-b)', outline: 'none',
            }}
          />
        </Field>
      </Section>

      <Section title="Season Stats (Averages)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            ['ppg',    'PPG'],
            ['rpg',    'RPG'],
            ['apg',    'APG'],
            ['spg',    'SPG'],
            ['bpg',    'BPG'],
            ['tpg',    'TO/G'],
            ['fg_pct', 'FG% (0–1)'],
            ['ft_pct', 'FT% (0–1)'],
            ['gp',     'Games Played'],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="number" step="0.1" min="0"
                value={stats[key]}
                onChange={e => setStats(p => ({ ...p, [key]: e.target.value }))}
                placeholder="0.0"
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Profiles & Links">
        {links.map((link, i) => (
          <Field key={link.type} label={`${link.label} URL`}>
            <input
              value={link.url}
              onChange={e => setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, url: e.target.value } : l))}
              placeholder="https://…"
            />
          </Field>
        ))}
      </Section>

      {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, padding: '14px 0', background: 'var(--green)',
            border: 'none', borderRadius: 10, color: '#000',
            fontWeight: 800, fontSize: 14, letterSpacing: 0.5,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save Player'}
        </button>
        <button onClick={() => navigate('/')} style={{
          padding: '14px 20px', background: 'none',
          border: '1px solid var(--border2)', borderRadius: 10,
          color: 'var(--text2)', fontSize: 14,
        }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-m)', letterSpacing: 2, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 14 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5, fontFamily: 'var(--font-m)', letterSpacing: 1 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
}
