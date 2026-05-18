import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

export function PhotoUpload({ value, onChange, playerId }) {
  const inputRef  = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState(null)

  async function handleFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 10 * 1024 * 1024)   { setError('Image must be under 10 MB'); return }

    setError(null)
    setUploading(true)

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file)
    onChange(localUrl, null) // preview before upload finishes

    const ext      = file.name.split('.').pop()
    const path     = `${playerId ?? Date.now()}/photo.${ext}`

    const { error: upErr } = await supabase.storage
      .from('player-photos')
      .upload(path, file, { upsert: true })

    if (upErr) {
      setError(upErr.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('player-photos').getPublicUrl(path)
    onChange(data.publicUrl, path)
    setUploading(false)
  }

  function onDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        style={{
          width: '100%', height: value ? 260 : 160,
          borderRadius: 14, overflow: 'hidden',
          border: value ? '2px solid var(--green)' : '2px dashed var(--border2)',
          background: 'var(--bg2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative', transition: 'border-color .2s',
        }}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Player photo"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
            />
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
                CHANGE PHOTO
              </span>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
            {uploading
              ? <div style={{ color: 'var(--green2)', fontFamily: 'var(--font-m)', fontSize: 11, letterSpacing: 2 }}>UPLOADING…</div>
              : <>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>Click or drag to upload</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>JPG, PNG, HEIC · max 10 MB</div>
                </>
            }
          </div>
        )}
        {uploading && value && (
          <div style={{
            position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(4,6,10,.85)', borderRadius: 6, padding: '4px 12px',
            color: 'var(--green2)', fontFamily: 'var(--font-m)', fontSize: 10, letterSpacing: 2,
          }}>
            UPLOADING…
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0])}
      />
      {error && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 6 }}>{error}</div>}
    </div>
  )
}
