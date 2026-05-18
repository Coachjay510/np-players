import { useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text, RoundedBox, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { getRatingColor } from '../../lib/ratings'

// Renders the front face of the card
function CardFront({ player, ovr, color }) {
  const meshRef = useRef()

  // Build a canvas texture with player info
  const canvasTexture = (() => {
    const canvas  = document.createElement('canvas')
    canvas.width  = 512
    canvas.height = 720
    const ctx = canvas.getContext('2d')

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 512, 720)
    grad.addColorStop(0, '#0d1420')
    grad.addColorStop(1, '#04060a')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 512, 720)

    // Accent glow bar
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 512, 6)
    ctx.fillRect(0, 714, 512, 6)

    // OVR number
    ctx.font = 'bold 120px Arial Black'
    ctx.fillStyle = color
    ctx.textAlign = 'left'
    ctx.fillText(String(ovr), 28, 140)

    // OVR label
    ctx.font = '22px Courier New'
    ctx.fillStyle = '#4a5568'
    ctx.fillText('OVR', 30, 168)

    // Position
    const posShort = {
      'Point Guard': 'PG', 'Shooting Guard': 'SG', 'Small Forward': 'SF',
      'Power Forward': 'PF', 'Center': 'C',
    }
    const pos = posShort[player.position] ?? player.position ?? ''
    ctx.font = 'bold 28px Courier New'
    ctx.fillStyle = color
    ctx.textAlign = 'right'
    ctx.fillText(pos, 484, 140)

    // Jersey number
    if (player.jersey_number != null) {
      ctx.font = '20px Courier New'
      ctx.fillStyle = '#4a5568'
      ctx.fillText(`#${player.jersey_number}`, 484, 168)
    }

    // Divider
    ctx.strokeStyle = color + '40'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(24, 188)
    ctx.lineTo(488, 188)
    ctx.stroke()

    // Name
    const nameParts = player.name.split(' ')
    const lastName  = nameParts.pop()
    const firstName = nameParts.join(' ')

    ctx.textAlign = 'left'
    ctx.font = '28px Arial'
    ctx.fillStyle = '#8a9ab0'
    ctx.fillText(firstName.toUpperCase(), 28, 640)

    ctx.font = 'bold 52px Arial Black'
    ctx.fillStyle = '#f0f4f8'
    ctx.fillText(lastName.toUpperCase(), 24, 696)

    // NP badge
    ctx.font = 'bold 16px Courier New'
    ctx.fillStyle = color
    ctx.textAlign = 'right'
    ctx.fillText('NEXTPLAY', 488, 696)

    return new THREE.CanvasTexture(canvas)
  })()

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2.56, 3.6]} />
      <meshStandardMaterial map={canvasTexture} transparent />
    </mesh>
  )
}

// Stats back of card
function CardBack({ player, ovr, color, stats }) {
  const canvasTexture = (() => {
    const canvas  = document.createElement('canvas')
    canvas.width  = 512
    canvas.height = 720
    const ctx = canvas.getContext('2d')

    const grad = ctx.createLinearGradient(0, 0, 512, 720)
    grad.addColorStop(0, '#0d1420')
    grad.addColorStop(1, '#04060a')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 512, 720)

    ctx.fillStyle = color
    ctx.fillRect(0, 0, 512, 6)
    ctx.fillRect(0, 714, 512, 6)

    // Header
    ctx.font = 'bold 28px Courier New'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.fillText('SEASON STATS', 256, 80)

    ctx.strokeStyle = color + '40'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(24, 100)
    ctx.lineTo(488, 100)
    ctx.stroke()

    const rows = [
      ['PPG',    stats.ppg,    null],
      ['RPG',    stats.rpg,    null],
      ['APG',    stats.apg,    null],
      ['SPG',    stats.spg,    null],
      ['BPG',    stats.bpg,    null],
      ['FG%',    stats.fg_pct, v => v ? Math.round(v * 100) + '%' : '—'],
      ['FT%',    stats.ft_pct, v => v ? Math.round(v * 100) + '%' : '—'],
      ['TO/G',   stats.tpg,    null],
    ]

    rows.forEach(([label, val, fmt], i) => {
      const y     = 158 + i * 66
      const value = fmt ? fmt(val) : (val != null ? (+val).toFixed(1) : '—')

      // Bar
      const barW  = 340
      const norm  = Math.min(1, (parseFloat(val) || 0) / (label === 'FG%' || label === 'FT%' ? 1 : 30))
      ctx.fillStyle = '#0d1218'
      ctx.beginPath()
      ctx.roundRect(88, y - 20, barW, 12, 6)
      ctx.fill()
      if (norm > 0) {
        ctx.fillStyle = color + '80'
        ctx.beginPath()
        ctx.roundRect(88, y - 20, barW * norm, 12, 6)
        ctx.fill()
      }

      ctx.textAlign = 'left'
      ctx.font = 'bold 13px Courier New'
      ctx.fillStyle = '#4a5568'
      ctx.fillText(label, 28, y - 8)

      ctx.textAlign = 'right'
      ctx.font = 'bold 32px Arial Black'
      ctx.fillStyle = '#f0f4f8'
      ctx.fillText(value, 484, y + 2)
    })

    return new THREE.CanvasTexture(canvas)
  })()

  return (
    <mesh rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[2.56, 3.6]} />
      <meshStandardMaterial map={canvasTexture} transparent />
    </mesh>
  )
}

// Photo plane — shows player photo in the center of front face
function PhotoPlane({ photoUrl }) {
  const texture = useTexture(photoUrl)
  return (
    <mesh position={[0, 0.28, 0.001]}>
      <planeGeometry args={[2.2, 2.4]} />
      <meshStandardMaterial map={texture} transparent />
    </mesh>
  )
}

function Card({ player, ovr, stats, color }) {
  const groupRef  = useRef()
  const [flipped, setFlipped] = useState(false)
  const targetY   = useRef(0)
  const isDragging = useRef(false)
  const lastX      = useRef(0)
  const velX       = useRef(0)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    // Drift toward target
    const target = flipped ? Math.PI : 0
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y, target + velX.current, 0.1
    )
    velX.current *= 0.9
  })

  function onPointerDown(e) {
    isDragging.current = true
    lastX.current = e.clientX
    e.stopPropagation()
  }

  function onPointerUp(e) {
    if (!isDragging.current) return
    isDragging.current = false
    const delta = e.clientX - lastX.current
    if (Math.abs(delta) < 8) setFlipped(f => !f)
  }

  function onPointerMove(e) {
    if (!isDragging.current) return
    const dx = e.clientX - lastX.current
    velX.current += dx * 0.005
    lastX.current = e.clientX
  }

  return (
    <group
      ref={groupRef}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
      style={{ cursor: 'grab' }}
    >
      {/* Card body */}
      <RoundedBox args={[2.62, 3.66, 0.04]} radius={0.08} smoothness={4}>
        <meshStandardMaterial color="#080c12" />
      </RoundedBox>

      {/* Front face */}
      <CardFront player={player} ovr={ovr} color={color} />
      {player.photo_url && <PhotoPlane photoUrl={player.photo_url} />}

      {/* Back face */}
      <CardBack player={player} ovr={ovr} color={color} stats={stats} />
    </group>
  )
}

export function PlayerCard3D({ player, ovr, stats, height = 420 }) {
  const color = getRatingColor(ovr)

  return (
    <div style={{ height, borderRadius: 16, overflow: 'hidden', background: '#06080e', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 4.5], fov: 38 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 5]} intensity={1.4} />
        <directionalLight position={[-4, 2, -4]} intensity={0.2} color={color} />
        <pointLight position={[0, 0, 3]} intensity={0.4} color={color} />
        <Card player={player} ovr={ovr} stats={stats} color={color} />
      </Canvas>
      <div style={{
        position: 'absolute', bottom: 10, left: 0, right: 0,
        textAlign: 'center', fontFamily: 'var(--font-m)',
        fontSize: 9, letterSpacing: 2, color: '#4a5568',
        pointerEvents: 'none',
      }}>
        CLICK TO FLIP · DRAG TO ROTATE
      </div>
    </div>
  )
}
