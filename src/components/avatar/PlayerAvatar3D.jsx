import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { getRatingColor } from '../../lib/ratings'

// ── palette ──────────────────────────────────────────────────
const NAVY  = '#0d1b32'
const GOLD  = '#c8a440'
const WHITE = '#f0f0f0'
const SHOE  = '#0a0a0a'
const SKIN  = '#8B5E3C'

// ── canvas helpers ───────────────────────────────────────────

function buildFaceTex(skinHex = SKIN) {
  const S = 512
  const c = document.createElement('canvas')
  c.width = S; c.height = S
  const ctx = c.getContext('2d')

  // Oval face background (transparent outside)
  ctx.clearRect(0, 0, S, S)
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(S / 2, S / 2, S * 0.46, S * 0.50, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = skinHex
  ctx.fillRect(0, 0, S, S)

  // Subtle jaw shading
  const jaw = ctx.createRadialGradient(S/2, S*0.85, 0, S/2, S/2, S*0.5)
  jaw.addColorStop(0, 'rgba(0,0,0,0.18)')
  jaw.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = jaw
  ctx.fillRect(0, 0, S, S)
  ctx.restore()

  // Hairline (dark crescent at top)
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(S/2, S*0.07, S*0.42, S*0.18, 0, 0, Math.PI*2)
  ctx.fillStyle = '#1a0e08'
  ctx.fill()
  ctx.restore()

  // Eyebrows
  const browColor = '#1f1008'
  ctx.save()
  for (const [cx, tilt] of [[S*0.36, -0.22], [S*0.64, 0.22]]) {
    ctx.beginPath()
    ctx.save()
    ctx.translate(cx, S*0.365)
    ctx.rotate(tilt)
    ctx.ellipse(0, 0, S*0.115, S*0.028, 0, 0, Math.PI*2)
    ctx.fillStyle = browColor
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()

  // Eyes
  for (const cx of [S*0.36, S*0.64]) {
    const ey = S*0.43

    // Sclera (white)
    ctx.beginPath()
    ctx.ellipse(cx, ey, S*0.09, S*0.065, 0, 0, Math.PI*2)
    ctx.fillStyle = '#ececec'
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Iris
    ctx.beginPath()
    ctx.arc(cx, ey, S*0.048, 0, Math.PI*2)
    ctx.fillStyle = '#2e1a0e'
    ctx.fill()

    // Pupil
    ctx.beginPath()
    ctx.arc(cx, ey, S*0.026, 0, Math.PI*2)
    ctx.fillStyle = '#0a0606'
    ctx.fill()

    // Catchlight
    ctx.beginPath()
    ctx.arc(cx + S*0.018, ey - S*0.018, S*0.012, 0, Math.PI*2)
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.fill()

    // Eyelid top line
    ctx.beginPath()
    ctx.ellipse(cx, ey - S*0.012, S*0.09, S*0.055, 0, Math.PI, Math.PI*2)
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth = 2.5
    ctx.stroke()
  }

  // Nose bridge & nostrils
  ctx.strokeStyle = `rgba(0,0,0,0.2)`
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(S*0.44, S*0.5)
  ctx.quadraticCurveTo(S*0.41, S*0.59, S*0.38, S*0.62)
  ctx.moveTo(S*0.56, S*0.5)
  ctx.quadraticCurveTo(S*0.59, S*0.59, S*0.62, S*0.62)
  ctx.stroke()
  // Nose base arc
  ctx.beginPath()
  ctx.arc(S*0.5, S*0.61, S*0.055, 0.2, Math.PI - 0.2)
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'
  ctx.stroke()

  // Nostrils
  for (const nx of [S*0.425, S*0.575]) {
    ctx.beginPath()
    ctx.ellipse(nx, S*0.625, S*0.025, S*0.018, nx < S/2 ? -0.4 : 0.4, 0, Math.PI*2)
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.fill()
  }

  // Philtrum dip
  ctx.beginPath()
  ctx.moveTo(S*0.47, S*0.645)
  ctx.lineTo(S*0.5, S*0.66)
  ctx.lineTo(S*0.53, S*0.645)
  ctx.strokeStyle = 'rgba(0,0,0,0.1)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Upper lip
  ctx.beginPath()
  ctx.moveTo(S*0.36, S*0.695)
  ctx.quadraticCurveTo(S*0.43, S*0.68, S*0.5, S*0.688)
  ctx.quadraticCurveTo(S*0.57, S*0.68, S*0.64, S*0.695)
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'
  ctx.stroke()

  // Lower lip
  ctx.beginPath()
  ctx.moveTo(S*0.375, S*0.695)
  ctx.quadraticCurveTo(S*0.5, S*0.735, S*0.625, S*0.695)
  ctx.fillStyle = `${skinHex}cc`
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Chin crease
  ctx.beginPath()
  ctx.arc(S/2, S*0.81, S*0.06, -0.35, Math.PI+0.35)
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'
  ctx.lineWidth = 2
  ctx.stroke()

  return new THREE.CanvasTexture(c)
}

function buildPhotoFaceTex(img) {
  const S = 512
  const c = document.createElement('canvas')
  c.width = S; c.height = S
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, S, S)

  // Circular clip with soft edge
  const grad = ctx.createRadialGradient(S/2, S/2, S*0.38, S/2, S/2, S*0.5)
  grad.addColorStop(0,   'rgba(0,0,0,1)')
  grad.addColorStop(0.85,'rgba(0,0,0,1)')
  grad.addColorStop(1,   'rgba(0,0,0,0)')

  ctx.save()
  ctx.beginPath()
  ctx.arc(S/2, S/2, S*0.5, 0, Math.PI*2)
  ctx.clip()

  // Crop to face (use top 70% of the image, centered horizontally)
  const srcW  = img.naturalWidth
  const srcH  = img.naturalHeight
  const cropH = srcH * 0.7
  const cropY = 0
  const cropX = 0
  ctx.drawImage(img, cropX, cropY, srcW, cropH, 0, 0, S, S)

  ctx.restore()

  // Vignette to blend edges
  const vig = ctx.createRadialGradient(S/2, S/2, S*0.3, S/2, S/2, S*0.5)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.fillStyle = vig
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillRect(0, 0, S, S)
  ctx.globalCompositeOperation = 'source-over'

  return new THREE.CanvasTexture(c)
}

function buildJerseyTex(number, accentColor, back = false, playerName = '') {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 640
  const ctx = c.getContext('2d')

  const g = ctx.createLinearGradient(0, 0, 0, 640)
  g.addColorStop(0, '#152240')
  g.addColorStop(1, '#0a1220')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 640)

  // Border stripes
  ctx.fillStyle = accentColor
  ctx.fillRect(0,   0, 512, 14)
  ctx.fillRect(0, 626, 512, 14)
  ctx.fillRect(0,   0, 14, 640)
  ctx.fillRect(498, 0, 14, 640)

  if (back && playerName) {
    const lastName = playerName.split(' ').pop().toUpperCase()
    let fs = 60
    ctx.font = `bold ${fs}px Arial Black`
    while (ctx.measureText(lastName).width > 460 && fs > 18) {
      fs -= 2; ctx.font = `bold ${fs}px Arial Black`
    }
    ctx.fillStyle = WHITE
    ctx.textAlign = 'center'
    ctx.fillText(lastName, 256, 100)
  }

  if (number != null) {
    ctx.font = 'bold 280px Arial Black'
    ctx.fillStyle = WHITE
    ctx.textAlign = 'center'
    ctx.fillText(String(number), 256, back ? 450 : 440)
    ctx.strokeStyle = accentColor
    ctx.lineWidth = 8
    ctx.strokeText(String(number), 256, back ? 450 : 440)
  }

  return new THREE.CanvasTexture(c)
}

// ── Head component ───────────────────────────────────────────

function Head({ player }) {
  const [faceTex, setFaceTex] = useState(null)
  const syntheticTex = useMemo(() => buildFaceTex(SKIN), [])

  useEffect(() => () => { syntheticTex.dispose() }, [syntheticTex])
  useEffect(() => () => { if (faceTex) faceTex.dispose() }, [faceTex])

  useEffect(() => {
    if (!player.photo_url) return
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setFaceTex(buildPhotoFaceTex(img))
    img.src = player.photo_url
  }, [player.photo_url])

  const activeTex = faceTex ?? syntheticTex

  return (
    <group position={[0, 2.18, 0]}>
      {/* Skull */}
      <mesh scale={[1, 1.12, 1]}>
        <sphereGeometry args={[0.175, 32, 22]} />
        <meshStandardMaterial color={SKIN} roughness={0.72} />
      </mesh>
      {/* Face plane — fills front of head */}
      <mesh position={[0, -0.01, 0.16]}>
        <circleGeometry args={[0.148, 32]} />
        <meshStandardMaterial map={activeTex} transparent alphaTest={0.05} roughness={0.75} />
      </mesh>
      {/* Ears */}
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 0.18, 0, 0]} scale={[0.35, 0.6, 0.6]}>
          <sphereGeometry args={[0.075, 10, 8]} />
          <meshStandardMaterial color={SKIN} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// ── Main figure ──────────────────────────────────────────────

function PlayerFigure({ player, accentColor }) {
  const groupRef = useRef()

  const frontTex = useMemo(() => buildJerseyTex(player.jersey_number, accentColor, false, player.name), [player, accentColor])
  const backTex  = useMemo(() => buildJerseyTex(player.jersey_number, accentColor, true,  player.name), [player, accentColor])

  useEffect(() => () => { frontTex.dispose(); backTex.dispose() }, [frontTex, backTex])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 1.1) * 0.013
  })

  const sk  = <meshStandardMaterial color={SKIN} roughness={0.72} />
  const nav = (roughness = 0.8) => <meshStandardMaterial color={NAVY} roughness={roughness} />
  const gld = <meshStandardMaterial color={GOLD} roughness={0.65} metalness={0.1} />
  const shoe = <meshStandardMaterial color={SHOE} roughness={0.65} />

  return (
    <group ref={groupRef}>

      {/* ── NECK ── */}
      <mesh position={[0, 2.005, 0]}>
        <cylinderGeometry args={[0.068, 0.075, 0.14, 12]} />
        {sk}
      </mesh>

      {/* ── HEAD ── */}
      <Head player={player} />

      {/* ── TORSO (jersey) ── */}
      <mesh position={[0, 1.36, 0]}>
        <boxGeometry args={[0.58, 0.68, 0.26]} />
        <meshStandardMaterial attach="material-0" color={NAVY} roughness={0.8} />
        <meshStandardMaterial attach="material-1" color={NAVY} roughness={0.8} />
        <meshStandardMaterial attach="material-2" color={NAVY} roughness={0.8} />
        <meshStandardMaterial attach="material-3" color={NAVY} roughness={0.8} />
        <meshStandardMaterial attach="material-4" map={frontTex} />
        <meshStandardMaterial attach="material-5" map={backTex}  />
      </mesh>

      {/* Shoulder caps */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * 0.32, 1.67, 0]} rotation={[0, 0, s * 0.55]} scale={[0.9, 1, 0.9]}>
          <sphereGeometry args={[0.095, 12, 8]} />
          {nav()}
        </mesh>
      ))}

      {/* ── SHORTS ── */}
      <mesh position={[0, 0.96, 0]}>
        <boxGeometry args={[0.54, 0.30, 0.26]} />
        {gld}
      </mesh>
      {/* side stripes */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * 0.273, 0.96, 0]}>
          <boxGeometry args={[0.01, 0.30, 0.26]} />
          <meshStandardMaterial color={accentColor} roughness={0.8} />
        </mesh>
      ))}

      {/* ── LEFT ARM ── */}
      <mesh position={[-0.375, 1.50, 0]} rotation={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.078, 0.07, 0.44, 12]} />
        {sk}
      </mesh>
      <mesh position={[-0.465, 1.24, 0]}>
        <sphereGeometry args={[0.076, 10, 8]} />
        {sk}
      </mesh>
      <mesh position={[-0.505, 0.97, 0.05]} rotation={[0.18, 0, 0.2]}>
        <cylinderGeometry args={[0.068, 0.06, 0.42, 12]} />
        {sk}
      </mesh>
      <mesh position={[-0.545, 0.74, 0.09]}>
        <sphereGeometry args={[0.065, 10, 8]} />
        {sk}
      </mesh>

      {/* ── RIGHT ARM (ball side) ── */}
      <mesh position={[0.375, 1.50, 0]} rotation={[0, 0, -0.25]}>
        <cylinderGeometry args={[0.078, 0.07, 0.44, 12]} />
        {sk}
      </mesh>
      <mesh position={[0.465, 1.24, 0]}>
        <sphereGeometry args={[0.076, 10, 8]} />
        {sk}
      </mesh>
      {/* forearm bent forward */}
      <mesh position={[0.505, 1.00, 0.18]} rotation={[-0.55, 0, -0.18]}>
        <cylinderGeometry args={[0.068, 0.06, 0.40, 12]} />
        {sk}
      </mesh>
      <mesh position={[0.54, 0.78, 0.36]}>
        <sphereGeometry args={[0.065, 10, 8]} />
        {sk}
      </mesh>

      {/* ── BASKETBALL ── */}
      <group position={[0.54, 0.65, 0.50]}>
        <mesh>
          <sphereGeometry args={[0.14, 24, 16]} />
          <meshStandardMaterial color="#d84e00" roughness={0.88} />
        </mesh>
        {/* seams */}
        {[
          [0, 0, 0],
          [0, Math.PI / 2, 0],
          [Math.PI / 2, 0, 0],
        ].map((rot, i) => (
          <mesh key={i} rotation={rot}>
            <torusGeometry args={[0.14, 0.005, 8, 36]} />
            <meshStandardMaterial color="#111" roughness={1} />
          </mesh>
        ))}
      </group>

      {/* ── LEFT LEG ── */}
      {/* Thigh */}
      <mesh position={[-0.152, 0.665, 0]} rotation={[0.04, 0, 0]}>
        <cylinderGeometry args={[0.108, 0.098, 0.40, 12]} />
        {gld}
      </mesh>
      {/* Knee */}
      <mesh position={[-0.152, 0.455, 0.01]}>
        <sphereGeometry args={[0.097, 12, 8]} />
        {sk}
      </mesh>
      {/* Shin */}
      <mesh position={[-0.152, 0.255, 0]}>
        <cylinderGeometry args={[0.092, 0.078, 0.40, 12]} />
        {sk}
      </mesh>
      {/* Ankle */}
      <mesh position={[-0.152, 0.054, 0]}>
        <sphereGeometry args={[0.08, 10, 7]} />
        {sk}
      </mesh>
      {/* Sock */}
      <mesh position={[-0.152, 0.04, 0]}>
        <cylinderGeometry args={[0.082, 0.079, 0.13, 10]} />
        <meshStandardMaterial color={WHITE} roughness={0.9} />
      </mesh>
      {/* Shoe */}
      <mesh position={[-0.152, -0.045, 0.028]}>
        <boxGeometry args={[0.19, 0.115, 0.32]} />
        {shoe}
      </mesh>
      {/* Sole stripe */}
      <mesh position={[-0.152, -0.100, 0.028]}>
        <boxGeometry args={[0.191, 0.012, 0.322]} />
        <meshStandardMaterial color={accentColor} roughness={0.75} />
      </mesh>

      {/* ── RIGHT LEG ── */}
      <mesh position={[0.152, 0.665, 0]} rotation={[-0.04, 0, 0]}>
        <cylinderGeometry args={[0.108, 0.098, 0.40, 12]} />
        {gld}
      </mesh>
      <mesh position={[0.152, 0.455, -0.01]}>
        <sphereGeometry args={[0.097, 12, 8]} />
        {sk}
      </mesh>
      <mesh position={[0.152, 0.255, 0]}>
        <cylinderGeometry args={[0.092, 0.078, 0.40, 12]} />
        {sk}
      </mesh>
      <mesh position={[0.152, 0.054, 0]}>
        <sphereGeometry args={[0.08, 10, 7]} />
        {sk}
      </mesh>
      <mesh position={[0.152, 0.04, 0]}>
        <cylinderGeometry args={[0.082, 0.079, 0.13, 10]} />
        <meshStandardMaterial color={WHITE} roughness={0.9} />
      </mesh>
      <mesh position={[0.152, -0.045, 0.028]}>
        <boxGeometry args={[0.19, 0.115, 0.32]} />
        {shoe}
      </mesh>
      <mesh position={[0.152, -0.100, 0.028]}>
        <boxGeometry args={[0.191, 0.012, 0.322]} />
        <meshStandardMaterial color={accentColor} roughness={0.75} />
      </mesh>

      {/* ── GROUND SHADOW ── */}
      <mesh position={[0.08, -0.106, 0.06]} rotation={[-Math.PI / 2, 0, 0]}>
        <ellipseGeometry args={[0.38, 0.30, 28]} />
        <meshStandardMaterial color="#000" transparent opacity={0.20} />
      </mesh>

    </group>
  )
}

// ── Export ───────────────────────────────────────────────────

export function PlayerAvatar3D({ player, ovr, height = 500 }) {
  const accentColor = getRatingColor(ovr)

  return (
    <div style={{
      height,
      borderRadius: 16,
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 50% 25%, #0e1f38 0%, #04060a 100%)',
      position: 'relative',
    }}>
      <Canvas camera={{ position: [0, 1.25, 3.1], fov: 44 }}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[3,  7,  5]} intensity={2.0} />
        <directionalLight position={[-3, 2, -3]} intensity={0.5} color={accentColor} />
        <pointLight position={[0, 3.5, 2.5]} intensity={1.0} color={accentColor} distance={7} />
        <pointLight position={[0, 0,   2.5]} intensity={0.4} color="#ffffff"     distance={4} />

        <PlayerFigure player={player} accentColor={accentColor} />

        <OrbitControls
          enablePan={false}
          minDistance={1.8}
          maxDistance={5.5}
          target={[0, 1.1, 0]}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.85}
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
