import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { getRatingColor } from '../../lib/ratings'

const SKIN   = '#8B5E3C'
const NAVY   = '#0f1e3a'
const WHITE  = '#f5f5f5'
const SHOE   = '#111111'

function jerseyFrontTex(number, accentColor) {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 320
  const ctx = c.getContext('2d')

  const g = ctx.createLinearGradient(0, 0, 0, 320)
  g.addColorStop(0, '#152035')
  g.addColorStop(1, '#0a1120')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 320)

  ctx.fillStyle = accentColor
  ctx.fillRect(0, 0, 256, 10)
  ctx.fillRect(0, 310, 256, 10)
  ctx.fillRect(0, 0, 10, 320)
  ctx.fillRect(246, 0, 10, 320)

  if (number != null) {
    ctx.font = 'bold 160px Arial Black'
    ctx.fillStyle = WHITE
    ctx.textAlign = 'center'
    ctx.fillText(String(number), 128, 228)
    ctx.strokeStyle = accentColor
    ctx.lineWidth = 5
    ctx.strokeText(String(number), 128, 228)
  }

  return new THREE.CanvasTexture(c)
}

function jerseyBackTex(number, name, accentColor) {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 320
  const ctx = c.getContext('2d')

  const g = ctx.createLinearGradient(0, 0, 0, 320)
  g.addColorStop(0, '#152035')
  g.addColorStop(1, '#0a1120')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 320)

  ctx.fillStyle = accentColor
  ctx.fillRect(0, 0, 256, 10)
  ctx.fillRect(0, 310, 256, 10)
  ctx.fillRect(0, 0, 10, 320)
  ctx.fillRect(246, 0, 10, 320)

  const lastName = (name ?? '').split(' ').pop().toUpperCase()
  let fs = 40
  ctx.font = `bold ${fs}px Arial Black`
  while (ctx.measureText(lastName).width > 228 && fs > 14) {
    fs -= 2
    ctx.font = `bold ${fs}px Arial Black`
  }
  ctx.fillStyle = WHITE
  ctx.textAlign = 'center'
  ctx.fillText(lastName, 128, 72)

  if (number != null) {
    ctx.font = 'bold 140px Arial Black'
    ctx.fillStyle = WHITE
    ctx.fillText(String(number), 128, 248)
    ctx.strokeStyle = accentColor
    ctx.lineWidth = 5
    ctx.strokeText(String(number), 128, 248)
  }

  return new THREE.CanvasTexture(c)
}

function JerseyMesh({ pos, rot, frontTex, backTex }) {
  return (
    <mesh position={pos} rotation={rot}>
      <boxGeometry args={[0.54, 0.62, 0.24]} />
      {/* right, left, top, bottom, front, back */}
      <meshStandardMaterial attach="material-0" color={NAVY} roughness={0.8} />
      <meshStandardMaterial attach="material-1" color={NAVY} roughness={0.8} />
      <meshStandardMaterial attach="material-2" color={NAVY} roughness={0.8} />
      <meshStandardMaterial attach="material-3" color={NAVY} roughness={0.8} />
      <meshStandardMaterial attach="material-4" map={frontTex} />
      <meshStandardMaterial attach="material-5" map={backTex} />
    </mesh>
  )
}

function PlayerFigure({ player, accentColor }) {
  const groupRef = useRef()

  const frontTex = useMemo(() => jerseyFrontTex(player.jersey_number, accentColor), [player.jersey_number, accentColor])
  const backTex  = useMemo(() => jerseyBackTex(player.jersey_number, player.name, accentColor), [player.jersey_number, player.name, accentColor])

  useEffect(() => () => { frontTex.dispose(); backTex.dispose() }, [frontTex, backTex])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    groupRef.current.position.y = Math.sin(t * 1.1) * 0.012
  })

  const skin = { color: SKIN,   roughness: 0.75, metalness: 0 }
  const navy = { color: NAVY,   roughness: 0.8,  metalness: 0 }
  const gold = { color: '#c8a440', roughness: 0.7, metalness: 0.1 }
  const shoe = { color: SHOE,   roughness: 0.7,  metalness: 0 }
  const sock = { color: WHITE,  roughness: 0.9,  metalness: 0 }

  return (
    <group ref={groupRef}>

      {/* ── HEAD ── */}
      <mesh position={[0, 1.97, 0]}>
        <sphereGeometry args={[0.165, 20, 14]} />
        <meshStandardMaterial {...skin} />
      </mesh>

      {/* ── NECK ── */}
      <mesh position={[0, 1.815, 0]}>
        <cylinderGeometry args={[0.066, 0.072, 0.13, 10]} />
        <meshStandardMaterial {...skin} />
      </mesh>

      {/* ── SHOULDERS (trapezoid feel) ── */}
      <mesh position={[-0.27, 1.69, 0]} rotation={[0, 0, 0.28]}>
        <cylinderGeometry args={[0.075, 0.07, 0.2, 8]} />
        <meshStandardMaterial {...navy} />
      </mesh>
      <mesh position={[0.27, 1.69, 0]} rotation={[0, 0, -0.28]}>
        <cylinderGeometry args={[0.075, 0.07, 0.2, 8]} />
        <meshStandardMaterial {...navy} />
      </mesh>

      {/* ── TORSO / JERSEY ── */}
      <JerseyMesh pos={[0, 1.26, 0]} rot={[0, 0, 0]} frontTex={frontTex} backTex={backTex} />

      {/* ── SHORTS ── */}
      <mesh position={[0, 0.895, 0]}>
        <boxGeometry args={[0.52, 0.29, 0.23]} />
        <meshStandardMaterial {...gold} />
      </mesh>
      {/* Shorts stripe */}
      <mesh position={[-0.262, 0.895, 0]}>
        <boxGeometry args={[0.008, 0.29, 0.23]} />
        <meshStandardMaterial color={accentColor} roughness={0.8} />
      </mesh>
      <mesh position={[0.262, 0.895, 0]}>
        <boxGeometry args={[0.008, 0.29, 0.23]} />
        <meshStandardMaterial color={accentColor} roughness={0.8} />
      </mesh>

      {/* ── LEFT ARM ── */}
      {/* Upper */}
      <mesh position={[-0.36, 1.36, 0]} rotation={[0, 0, 0.22]}>
        <cylinderGeometry args={[0.075, 0.068, 0.40, 10]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      {/* Elbow */}
      <mesh position={[-0.46, 1.11, 0]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      {/* Lower */}
      <mesh position={[-0.50, 0.87, 0.06]} rotation={[0.2, 0, 0.18]}>
        <cylinderGeometry args={[0.065, 0.058, 0.40, 10]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      {/* Hand */}
      <mesh position={[-0.54, 0.65, 0.10]}>
        <sphereGeometry args={[0.068, 10, 7]} />
        <meshStandardMaterial {...skin} />
      </mesh>

      {/* ── RIGHT ARM (ball hand) ── */}
      {/* Upper */}
      <mesh position={[0.36, 1.36, 0]} rotation={[0, 0, -0.22]}>
        <cylinderGeometry args={[0.075, 0.068, 0.40, 10]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      {/* Elbow */}
      <mesh position={[0.46, 1.11, 0]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      {/* Lower arm – bent forward to hold ball */}
      <mesh position={[0.50, 0.92, 0.16]} rotation={[-0.55, 0, -0.15]}>
        <cylinderGeometry args={[0.065, 0.058, 0.38, 10]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      {/* Hand */}
      <mesh position={[0.52, 0.72, 0.34]}>
        <sphereGeometry args={[0.068, 10, 7]} />
        <meshStandardMaterial {...skin} />
      </mesh>

      {/* ── BASKETBALL ── */}
      <mesh position={[0.52, 0.60, 0.46]}>
        <sphereGeometry args={[0.135, 20, 14]} />
        <meshStandardMaterial color="#e05a00" roughness={0.88} />
      </mesh>
      {/* Ball seam lines (thin torus rings) */}
      <mesh position={[0.52, 0.60, 0.46]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.135, 0.005, 8, 32]} />
        <meshStandardMaterial color="#111" roughness={1} />
      </mesh>
      <mesh position={[0.52, 0.60, 0.46]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.135, 0.005, 8, 32]} />
        <meshStandardMaterial color="#111" roughness={1} />
      </mesh>

      {/* ── LEFT LEG ── */}
      {/* Thigh (gold shorts colour) */}
      <mesh position={[-0.145, 0.635, 0]}>
        <cylinderGeometry args={[0.105, 0.095, 0.37, 10]} />
        <meshStandardMaterial {...gold} />
      </mesh>
      {/* Shin */}
      <mesh position={[-0.145, 0.27, 0]}>
        <cylinderGeometry args={[0.09, 0.078, 0.38, 10]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      {/* Knee */}
      <mesh position={[-0.145, 0.455, 0]}>
        <sphereGeometry args={[0.094, 8, 6]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      {/* Ankle */}
      <mesh position={[-0.145, 0.075, 0]}>
        <sphereGeometry args={[0.082, 8, 6]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      {/* Sock */}
      <mesh position={[-0.145, 0.055, 0]}>
        <cylinderGeometry args={[0.082, 0.078, 0.12, 10]} />
        <meshStandardMaterial {...sock} />
      </mesh>
      {/* Shoe */}
      <mesh position={[-0.145, -0.042, 0.028]}>
        <boxGeometry args={[0.175, 0.108, 0.30]} />
        <meshStandardMaterial {...shoe} />
      </mesh>
      {/* Sole stripe */}
      <mesh position={[-0.145, -0.093, 0.028]}>
        <boxGeometry args={[0.176, 0.01, 0.302]} />
        <meshStandardMaterial color={accentColor} roughness={0.8} />
      </mesh>

      {/* ── RIGHT LEG ── */}
      <mesh position={[0.145, 0.635, 0]}>
        <cylinderGeometry args={[0.105, 0.095, 0.37, 10]} />
        <meshStandardMaterial {...gold} />
      </mesh>
      <mesh position={[0.145, 0.27, 0]}>
        <cylinderGeometry args={[0.09, 0.078, 0.38, 10]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      <mesh position={[0.145, 0.455, 0]}>
        <sphereGeometry args={[0.094, 8, 6]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      <mesh position={[0.145, 0.075, 0]}>
        <sphereGeometry args={[0.082, 8, 6]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      <mesh position={[0.145, 0.055, 0]}>
        <cylinderGeometry args={[0.082, 0.078, 0.12, 10]} />
        <meshStandardMaterial {...sock} />
      </mesh>
      <mesh position={[0.145, -0.042, 0.028]}>
        <boxGeometry args={[0.175, 0.108, 0.30]} />
        <meshStandardMaterial {...shoe} />
      </mesh>
      <mesh position={[0.145, -0.093, 0.028]}>
        <boxGeometry args={[0.176, 0.01, 0.302]} />
        <meshStandardMaterial color={accentColor} roughness={0.8} />
      </mesh>

      {/* ── COURT SHADOW ── */}
      <mesh position={[0, -0.097, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <ellipseGeometry args={[0.36, 0.28, 24]} />
        <meshStandardMaterial color="#000" transparent opacity={0.22} />
      </mesh>

    </group>
  )
}

export function PlayerAvatar3D({ player, ovr, height = 500 }) {
  const accentColor = getRatingColor(ovr)

  return (
    <div style={{
      height,
      borderRadius: 16,
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 30%, #0d1a2e 0%, #04060a 100%)',
      position: 'relative',
    }}>
      <Canvas camera={{ position: [0, 1.2, 3.0], fov: 44 }}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 6, 4]}  intensity={1.8} />
        <directionalLight position={[-3, 2, -3]} intensity={0.5} color={accentColor} />
        <pointLight position={[0, 3.5, 2]} intensity={0.8} color={accentColor} distance={6} />
        <pointLight position={[0, 0, 2]}   intensity={0.3} color="#ffffff" distance={4} />

        <PlayerFigure player={player} accentColor={accentColor} />

        <OrbitControls
          enablePan={false}
          minDistance={1.8}
          maxDistance={5}
          target={[0, 1.0, 0]}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.9}
          rotateSpeed={0.7}
        />
      </Canvas>

      <div style={{
        position: 'absolute', bottom: 10, left: 0, right: 0,
        textAlign: 'center', fontFamily: 'var(--font-m)',
        fontSize: 9, letterSpacing: 2, color: '#4a5568',
        pointerEvents: 'none',
      }}>
        DRAG TO ROTATE · SCROLL TO ZOOM
      </div>
    </div>
  )
}
