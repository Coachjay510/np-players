import { useEffect, useRef } from 'react'

// Ready Player Me subdomain — set in env or use default demo
const RPM_URL = import.meta.env.VITE_RPM_SUBDOMAIN
  ? `https://${import.meta.env.VITE_RPM_SUBDOMAIN}.readyplayer.me`
  : 'https://nextplayplayers.readyplayer.me'

export function AvatarCreator({ onAvatarCreated, onClose }) {
  const iframeRef = useRef(null)

  useEffect(() => {
    function onMessage(event) {
      // Ready Player Me sends the avatar GLB URL via postMessage
      if (typeof event.data !== 'string') return
      if (event.data.startsWith('https') && event.data.includes('.glb')) {
        onAvatarCreated(event.data)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onAvatarCreated])

  const src = `${RPM_URL}/avatar?frameApi&clearCache&bodyType=fullbody`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(4,6,10,.9)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: 18, color: 'var(--green2)', letterSpacing: 1 }}>
            CREATE YOUR AVATAR
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Upload a selfie to generate your 3D player avatar
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: '1px solid var(--border2)',
            color: 'var(--text2)', borderRadius: 8, padding: '8px 16px', fontSize: 13,
          }}
        >
          Cancel
        </button>
      </div>
      <iframe
        ref={iframeRef}
        src={src}
        title="Ready Player Me Avatar Creator"
        allow="camera *; microphone *"
        style={{ flex: 1, border: 'none', display: 'block' }}
      />
    </div>
  )
}
