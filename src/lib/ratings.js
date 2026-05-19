// 2K-style overall rating from raw stats
// Weights sum to 1.0

const WEIGHTS = {
  ppg:  0.28,  // scoring
  rpg:  0.18,  // rebounding
  apg:  0.18,  // playmaking
  spg:  0.10,  // defense
  bpg:  0.08,  // shot-blocking
  fg_pct: 0.10, // efficiency
  ft_pct: 0.04, // clutch
  tpg:  0.04,  // (negative) turnovers — inverted below
}

// Max realistic values per stat category for normalisation
const MAXES = {
  ppg:    35,
  rpg:    18,
  apg:    12,
  spg:    4,
  bpg:    4,
  fg_pct: 0.70,
  ft_pct: 1.0,
  tpg:    6,    // higher tpg = worse
}

export function calcOverall(stats) {
  const s = { ppg: 0, rpg: 0, apg: 0, spg: 0, bpg: 0, fg_pct: 0, ft_pct: 0, tpg: 0, ...stats }

  const norm = {
    ppg:    clamp(s.ppg    / MAXES.ppg),
    rpg:    clamp(s.rpg    / MAXES.rpg),
    apg:    clamp(s.apg    / MAXES.apg),
    spg:    clamp(s.spg    / MAXES.spg),
    bpg:    clamp(s.bpg    / MAXES.bpg),
    fg_pct: clamp(s.fg_pct / MAXES.fg_pct),
    ft_pct: clamp(s.ft_pct / MAXES.ft_pct),
    tpg:    1 - clamp(s.tpg / MAXES.tpg),
  }

  const raw = Object.keys(WEIGHTS).reduce((sum, k) => sum + WEIGHTS[k] * norm[k], 0)

  // Scale 0–1 → 55–99 (nobody is below 55, nobody is 100)
  return Math.round(55 + raw * 44)
}

function clamp(v) { return Math.min(1, Math.max(0, v || 0)) }

export function getArchetype(stats) {
  const { ppg = 0, rpg = 0, apg = 0, spg = 0, bpg = 0 } = stats
  if (ppg >= 20) return 'Scorer'
  if (apg >= 7)  return 'Playmaker'
  if (rpg >= 10) return 'Glass Cleaner'
  if (spg >= 2)  return 'Lockdown'
  if (bpg >= 2)  return 'Rim Protector'
  if (ppg >= 15) return 'Two-Way'
  return 'Role Player'
}

export function combineStats(aau, hs) {
  if (!aau && !hs) return null
  if (!aau) return { ...hs, source: 'combined' }
  if (!hs)  return { ...aau, source: 'combined' }
  const total = (aau.gp || 0) + (hs.gp || 0)
  if (!total) return null
  const w = (a, b) => ((a || 0) * (aau.gp || 0) + (b || 0) * (hs.gp || 0)) / total
  return {
    gp: total, source: 'combined',
    ppg:    w(aau.ppg,    hs.ppg),
    rpg:    w(aau.rpg,    hs.rpg),
    apg:    w(aau.apg,    hs.apg),
    spg:    w(aau.spg,    hs.spg),
    bpg:    w(aau.bpg,    hs.bpg),
    tpg:    w(aau.tpg,    hs.tpg),
    fg_pct: w(aau.fg_pct, hs.fg_pct),
    ft_pct: w(aau.ft_pct, hs.ft_pct),
    fg3_pct:w(aau.fg3_pct,hs.fg3_pct),
  }
}

export function getRatingColor(ovr) {
  if (ovr >= 90) return '#fcd34d'   // gold — elite
  if (ovr >= 80) return '#7de000'   // green — good
  if (ovr >= 70) return '#38bdf8'   // blue — solid
  return '#9ca3af'                  // grey — developing
}
