import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei'

function AvatarModel({ url }) {
  const { scene } = useGLTF(url)
  const ref = useRef()

  // Gentle idle sway
  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.08
  })

  return <primitive ref={ref} object={scene} scale={1} position={[0, -1, 0]} />
}

function Loader() {
  return (
    <Html center>
      <div style={{
        color: 'var(--green2)', fontFamily: 'var(--font-m)',
        fontSize: 12, letterSpacing: 2, textAlign: 'center',
      }}>
        LOADING<br />AVATAR…
      </div>
    </Html>
  )
}

export function AvatarViewer({ avatarUrl, height = 420 }) {
  if (!avatarUrl) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg2)', borderRadius: 16,
        border: '1px dashed var(--border2)',
        flexDirection: 'column', gap: 10,
      }}>
        <span style={{ fontSize: 48 }}>🎮</span>
        <span style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--font-m)', letterSpacing: 1 }}>
          NO AVATAR YET
        </span>
      </div>
    )
  }

  return (
    <div style={{ height, borderRadius: 16, overflow: 'hidden', background: '#06080e' }}>
      <Canvas camera={{ position: [0, 0.8, 2.8], fov: 40 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 6, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-3, 4, -3]} intensity={0.3} color="#5cb800" />

        <Suspense fallback={<Loader />}>
          <AvatarModel url={avatarUrl} />
          <ContactShadows position={[0, -1.05, 0]} opacity={0.6} blur={2} />
          <Environment preset="night" />
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={1.5}
          maxDistance={5}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.8}
          target={[0, 0.2, 0]}
        />
      </Canvas>
    </div>
  )
}
