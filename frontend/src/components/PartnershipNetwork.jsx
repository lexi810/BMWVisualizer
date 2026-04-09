import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { getPartnershipGraph, getCompaniesNetwork } from '../api/client'

/* ── Constants ── */

const TYPE_COLORS = {
  'Raw Materials':                  { border: '#F59E0B', light: '#FDE68A', dark: '#D97706' },
  'Battery Grade Materials':        { border: '#EAB308', light: '#FEF08A', dark: '#CA8A04' },
  'Other Battery Components & Mat.':{ border: '#D97706', light: '#FCD34D', dark: '#B45309' },
  'Electrode & Cell Manufacturing': { border: '#4599FE', light: '#93C5FD', dark: '#2563EB' },
  'Module-Pack Manufacturing':      { border: '#2563EB', light: '#93C5FD', dark: '#1D4ED8' },
  'Recycling-Repurposing':          { border: '#10B981', light: '#6EE7B7', dark: '#059669' },
  'Equipment':                      { border: '#06B6D4', light: '#67E8F9', dark: '#0891B2' },
  'R&D':                            { border: '#8B5CF6', light: '#C4B5FD', dark: '#7C3AED' },
  'Services & Consulting':          { border: '#84CC16', light: '#BEF264', dark: '#65A30D' },
  'Modeling & Software':            { border: '#A855F7', light: '#D8B4FE', dark: '#9333EA' },
  'Distributors':                   { border: '#F97316', light: '#FDBA74', dark: '#EA580C' },
  'Professional Services':          { border: '#EC4899', light: '#F9A8D4', dark: '#DB2777' },
  'other':                          { border: '#9CA3AF', light: '#E5E7EB', dark: '#6B7280' },
}

// Partnership type colors for arrows
const LINK_TYPE_COLORS = {
  jv:               { base: '#34D399', label: 'Joint Venture' },
  supply_agreement: { base: '#F472B6', label: 'Supply Agreement' },
  licensing:        { base: '#FBBF24', label: 'Licensing' },
  equity_stake:     { base: '#60A5FA', label: 'Equity Stake' },
  r_and_d_collab:   { base: '#A78BFA', label: 'R&D Collaboration' },
  government_grant: { base: '#FB923C', label: 'Government Grant' },
  other:            { base: '#94A3B8', label: 'Other' },
}

const SCALE_OPTIONS = [
  { key: 'market_cap_usd',             label: 'Market Cap' },
  { key: 'revenue_usd',                label: 'Revenue' },
  { key: 'employee_count',             label: 'Employees' },
  { key: 'total_funding_usd',          label: 'Total Funding' },
  { key: 'manufacturing_capacity_gwh', label: 'Capacity (GWh)' },
  { key: 'patent_count',               label: 'Patents' },
  { key: 'partnership_investment_total',label: 'Partnership Value' },
]

const STAGES = ['announced', 'signed', 'active', 'dissolved']

const INDUSTRY_SEGMENTS = [
  'cell_manufacturing', 'materials_mining', 'recycling', 'ev_oem', 'energy_storage', 'other'
]

// Supply chain hierarchy for vertical gravity
const HIERARCHY_ORDER = {
  'Raw Materials': 0,
  'Battery Grade Materials': 1,
  'Other Battery Components & Mat.': 2,
  'Electrode & Cell Manufacturing': 3,
  'Module-Pack Manufacturing': 4,
  'Recycling-Repurposing': 5,
  'Equipment': 3,
  'R&D': 2,
  'Services & Consulting': 4,
  'Modeling & Software': 3,
  'Distributors': 5,
  'Professional Services': 4,
  'other': 3,
}

/* ── Helpers ── */

function typeColors(type, isDark) {
  const c = TYPE_COLORS[type] || TYPE_COLORS.other
  return { fill: isDark ? c.dark : c.light, border: c.border }
}

function nodeRadius(node, metric, maxValues) {
  if (node.in_db === false) return 5
  const v = node[metric]
  if (v != null && v > 0 && maxValues[metric]) {
    // Scale radius between 6 and 40 based on value relative to max
    const ratio = v / maxValues[metric]
    return Math.max(6, Math.min(40, 6 + Math.sqrt(ratio) * 34))
  }
  // Approximate using percentile
  const pct = node.percentile || 20
  return Math.max(5, Math.min(20, 5 + (pct / 100) * 15))
}

function linkColor(type, date, isDark) {
  const info = LINK_TYPE_COLORS[type] || LINK_TYPE_COLORS.other
  const base = info.base
  // Brighter = more recent
  let alpha = isDark ? 0.4 : 0.5
  if (date) {
    const year = parseInt(date)
    if (year >= 2025) alpha = isDark ? 0.9 : 1.0
    else if (year >= 2023) alpha = isDark ? 0.7 : 0.8
    else if (year >= 2020) alpha = isDark ? 0.5 : 0.6
  }
  return { color: base, alpha }
}

function fmtVal(v) {
  if (v == null) return null
  if (typeof v === 'number') {
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}B`
    if (v >= 1) return `$${Math.round(v)}M`
    return `$${(v * 1000).toFixed(0)}K`
  }
  return String(v)
}

/* ── Component ── */

export default function PartnershipNetwork({ onSelectCompany, darkMode }) {
  const dark = darkMode ?? false
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [FG, setFG] = useState(null)
  const containerRef = useRef(null)
  const fgRef = useRef(null)
  const [dims, setDims] = useState({ w: 800, h: 600 })
  const fitDoneRef = useRef(false)

  // Controls
  const [searchQuery, setSearchQuery] = useState('')
  const [scaleMetric, setScaleMetric] = useState('employee_count')
  const [hoveredNode, setHoveredNode] = useState(null)
  const [hoveredLink, setHoveredLink] = useState(null)

  // Filter state
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filterTypes, setFilterTypes] = useState([])       // partnership types
  const [filterStages, setFilterStages] = useState([])
  const [filterSegments, setFilterSegments] = useState([])
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterGeography, setFilterGeography] = useState('')
  const [filterGovToggle, setFilterGovToggle] = useState('all') // all, gov_only, private_only

  // Lazy-load react-force-graph-2d
  useEffect(() => {
    import('react-force-graph-2d').then((m) => setFG(() => m.default))
  }, [])

  // Fetch data
  useEffect(() => {
    getPartnershipGraph()
      .then(({ data }) => setGraphData(data))
      .catch((err) => {
        console.error('Failed to load partnership graph, falling back to legacy:', err)
        getCompaniesNetwork()
          .then(({ data }) => setGraphData(data))
          .catch(console.error)
      })
      .finally(() => setLoading(false))
  }, [])

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setDims({ w: width, h: height })
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Configure forces with hierarchical bias
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    const t = setTimeout(() => {
      fg.d3Force('charge')?.strength(-400).distanceMax(600)
      fg.d3Force('center')?.strength(0.1)

      // Add vertical gravity bias for supply chain hierarchy
      // react-force-graph exposes d3Force API — use forceY from loaded d3
      try {
        import('d3-force').then(d3 => {
          fg.d3Force('y', d3.forceY((node) => {
            const order = HIERARCHY_ORDER[node.type] ?? 3
            return (order / 5) * dims.h * 0.6
          }).strength(0.05))
          fg.d3ReheatSimulation()
        })
      } catch (_) {
        fg.d3ReheatSimulation()
      }
    }, 100)
    return () => clearTimeout(t)
  }, [FG, graphData, dims.h])

  useEffect(() => { fgRef.current?.refresh() }, [dark])

  // Max values for scaling
  const maxValues = useMemo(() => {
    const max = {}
    for (const opt of SCALE_OPTIONS) {
      const vals = graphData.nodes.map(n => n[opt.key]).filter(v => v != null && v > 0)
      max[opt.key] = vals.length > 0 ? Math.max(...vals) : 1
    }
    return max
  }, [graphData.nodes])

  /* ── Filtered graph ── */
  const filteredGraph = useMemo(() => {
    let links = [...graphData.links]

    // Filter by partnership type
    if (filterTypes.length > 0) {
      links = links.filter(l => filterTypes.includes(l.type))
    }
    // Filter by stage
    if (filterStages.length > 0) {
      links = links.filter(l => filterStages.includes(l.stage))
    }
    // Filter by date range
    if (filterDateFrom) {
      links = links.filter(l => !l.date || l.date >= filterDateFrom)
    }
    if (filterDateTo) {
      links = links.filter(l => !l.date || l.date <= filterDateTo)
    }
    // Filter by geography
    if (filterGeography) {
      const geoLower = filterGeography.toLowerCase()
      const geoNodeIds = new Set(
        graphData.nodes.filter(n =>
          (n.industry_segment || '').toLowerCase().includes(geoLower) ||
          (n.type || '').toLowerCase().includes(geoLower)
        ).map(n => n.id)
      )
      links = links.filter(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source
        const t = typeof l.target === 'object' ? l.target.id : l.target
        return geoNodeIds.has(s) || geoNodeIds.has(t)
      })
    }
    // Gov toggle
    if (filterGovToggle === 'gov_only') {
      links = links.filter(l => l.type === 'government_grant')
    } else if (filterGovToggle === 'private_only') {
      links = links.filter(l => l.type !== 'government_grant')
    }

    // Filter nodes to only those connected
    const connectedIds = new Set()
    links.forEach(l => {
      connectedIds.add(typeof l.source === 'object' ? l.source.id : l.source)
      connectedIds.add(typeof l.target === 'object' ? l.target.id : l.target)
    })

    let nodes = graphData.nodes.filter(n => connectedIds.has(n.id))

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchIds = new Set(nodes.filter(n => n.name.toLowerCase().includes(q)).map(n => n.id))
      // Show matching nodes + their direct partners
      const expandedIds = new Set(matchIds)
      links.forEach(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source
        const t = typeof l.target === 'object' ? l.target.id : l.target
        if (matchIds.has(s)) expandedIds.add(t)
        if (matchIds.has(t)) expandedIds.add(s)
      })
      nodes = nodes.filter(n => expandedIds.has(n.id))
      links = links.filter(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source
        const t = typeof l.target === 'object' ? l.target.id : l.target
        return expandedIds.has(s) && expandedIds.has(t)
      })
    }

    // Filter by industry segment
    if (filterSegments.length > 0) {
      const segNodeIds = new Set(nodes.filter(n => filterSegments.includes(n.industry_segment)).map(n => n.id))
      links = links.filter(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source
        const t = typeof l.target === 'object' ? l.target.id : l.target
        return segNodeIds.has(s) || segNodeIds.has(t)
      })
      const finalIds = new Set()
      links.forEach(l => {
        finalIds.add(typeof l.source === 'object' ? l.source.id : l.source)
        finalIds.add(typeof l.target === 'object' ? l.target.id : l.target)
      })
      nodes = nodes.filter(n => finalIds.has(n.id))
    }

    return { nodes, links }
  }, [graphData, filterTypes, filterStages, filterDateFrom, filterDateTo, filterGeography, filterGovToggle, filterSegments, searchQuery])

  // Re-fit on filter change
  useEffect(() => {
    fitDoneRef.current = false
    const t = setTimeout(() => fgRef.current?.zoomToFit(400, 60), 800)
    return () => clearTimeout(t)
  }, [filteredGraph])

  // Compute link curvatures for parallel edges
  useMemo(() => {
    const groups = {}
    filteredGraph.links.forEach((link) => {
      const s = typeof link.source === 'object' ? link.source.id : link.source
      const t = typeof link.target === 'object' ? link.target.id : link.target
      const key = [Math.min(s, t), Math.max(s, t)].join('::')
      ;(groups[key] ??= []).push(link)
    })
    Object.values(groups).forEach((g) => {
      if (g.length === 1) { g[0]._curve = 0.15; return }
      g.forEach((l, i) => { l._curve = 0.08 + (i - (g.length - 1) / 2) * 0.12 })
    })
  }, [filteredGraph.links])

  const linkTypes = useMemo(
    () => [...new Set(graphData.links.map(l => l.type).filter(Boolean))],
    [graphData.links]
  )

  /* ── Canvas: node ── */
  const paintNode = useCallback((node, ctx, globalScale) => {
    if (node.x == null || node.y == null) return
    const r = nodeRadius(node, scaleMetric, maxValues)
    const { fill, border } = node.in_db === false
      ? { fill: dark ? '#1E293B' : '#E2E8F0', border: dark ? '#475569' : '#94A3B8' }
      : typeColors(node.type, dark)
    const isSearch = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase())
    const isHov = hoveredNode?.id === node.id

    // Glow
    if (isHov || isSearch) {
      const g = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, r + 12)
      g.addColorStop(0, border + (dark ? '50' : '30'))
      g.addColorStop(1, border + '00')
      ctx.beginPath(); ctx.arc(node.x, node.y, r + 12, 0, Math.PI * 2)
      ctx.fillStyle = g; ctx.fill()
    }

    ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
    ctx.fillStyle = fill; ctx.fill()
    ctx.strokeStyle = border
    ctx.lineWidth = isHov ? 2.5 : 1.2
    ctx.globalAlpha = isHov ? 1 : 0.8
    ctx.stroke(); ctx.globalAlpha = 1

    // Dashed ring for external
    if (node.in_db === false) {
      ctx.setLineDash([2, 2]); ctx.strokeStyle = dark ? '#64748B' : '#94A3B8'
      ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([])
    }

    // Label
    const fs = Math.max(4, Math.min(11, 10 / globalScale))
    ctx.font = `${isHov ? 'bold ' : ''}${fs}px Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    const label = node.name.length > 22 ? node.name.slice(0, 20) + '\u2026' : node.name
    const ty = node.y + r + 2.5 / globalScale

    ctx.fillStyle = dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)'
    ctx.fillText(label, node.x + 0.5 / globalScale, ty + 0.5 / globalScale)
    ctx.fillStyle = dark
      ? (isHov ? '#fff' : 'rgba(255,255,255,0.8)')
      : (isHov ? '#0F172A' : '#374151')
    ctx.fillText(label, node.x, ty)
    ctx.textBaseline = 'alphabetic'
  }, [searchQuery, hoveredNode, scaleMetric, dark, maxValues])

  /* ── Canvas: link ── */
  const paintLink = useCallback((link, ctx, globalScale) => {
    const s = link.source, t = link.target
    if (!s || !t || typeof s !== 'object' || typeof t !== 'object') return
    if (s.x == null || t.x == null) return

    const dx = t.x - s.x, dy = t.y - s.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 1) return

    const nx = -dy / dist, ny = dx / dist
    const curve = link._curve || 0.15
    const sign = (s.id ?? 0) < (t.id ?? 0) ? 1 : -1
    const cpX = (s.x + t.x) / 2 + nx * curve * dist * sign
    const cpY = (s.y + t.y) / 2 + ny * curve * dist * sign

    const { color, alpha } = linkColor(link.type, link.date, dark)

    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(0.6, 1.2 / globalScale)
    ctx.globalAlpha = alpha
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(cpX, cpY, t.x, t.y); ctx.stroke()

    // Arrowhead
    const dir = link.direction || 'bidirectional'
    const drawArrow = (fromX, fromY, toX, toY, targetNode) => {
      const angle = Math.atan2(toY - fromY, toX - fromX)
      const tr = nodeRadius(targetNode, scaleMetric, maxValues) + 2
      const ax = toX - Math.cos(angle) * tr
      const ay = toY - Math.sin(angle) * tr
      const al = Math.max(3.5, 6 / globalScale)
      const ah = Math.PI / 7
      ctx.fillStyle = color; ctx.globalAlpha = alpha * 0.9
      ctx.beginPath(); ctx.moveTo(ax, ay)
      ctx.lineTo(ax - al * Math.cos(angle - ah), ay - al * Math.sin(angle - ah))
      ctx.lineTo(ax - al * Math.cos(angle + ah), ay - al * Math.sin(angle + ah))
      ctx.closePath(); ctx.fill()
    }

    // Forward arrow (source -> target)
    drawArrow(cpX, cpY, t.x, t.y, t)

    // Bidirectional: also draw reverse arrow
    if (dir === 'bidirectional') {
      drawArrow(cpX, cpY, s.x, s.y, s)
    }

    ctx.globalAlpha = 1
  }, [scaleMetric, dark, maxValues])

  /* ── Hit area ── */
  const pointerArea = useCallback((node, color, ctx) => {
    if (node.x == null || node.y == null) return
    const r = nodeRadius(node, scaleMetric, maxValues) + 4
    ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
    ctx.fillStyle = color; ctx.fill()
  }, [scaleMetric, maxValues])

  /* ── Loading / empty ── */
  if (loading || !FG) {
    return (
      <div className={`flex items-center justify-center h-full ${dark ? 'bg-[#0D1B2E] text-gray-400' : 'bg-[#F0F4F8] text-gray-500'}`}>
        {loading ? 'Loading network data\u2026' : 'Initializing graph\u2026'}
      </div>
    )
  }

  if (graphData.links.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-3 ${dark ? 'bg-[#0D1B2E]' : 'bg-[#F0F4F8]'}`}>
        <div className={`text-lg font-medium ${dark ? 'text-gray-300' : 'text-gray-600'}`}>No partnership data yet</div>
        <div className={`text-sm text-center max-w-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
          Go to the Research tab and run "Research a Company" or upload PitchBook/Crunchbase data to populate partnerships.
        </div>
      </div>
    )
  }

  const bg = dark ? '#0D1B2E' : '#F0F4F8'
  const panelBg = dark ? 'bg-[#0F1D2F]' : 'bg-white'
  const borderClr = dark ? 'border-gray-700' : 'border-[#B8CAD1]'
  const textMuted = dark ? 'text-gray-400' : 'text-gray-500'
  const textNormal = dark ? 'text-gray-200' : 'text-gray-600'
  const inputBg = dark ? 'bg-[#1E293B] border-gray-600 text-gray-200 placeholder-gray-500' : 'border-[#B8CAD1] text-gray-800 placeholder-gray-400'

  return (
    <div className={`flex flex-1 min-h-0 ${dark ? 'bg-[#0D1B2E]' : 'bg-[#F0F4F8]'}`}>
      {/* ── Filter sidebar ── */}
      {sidebarOpen && (
        <div className={`w-64 ${panelBg} border-r ${borderClr} flex flex-col overflow-y-auto shrink-0`}>
          <div className="px-4 py-3 border-b border-inherit flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Filters</span>
            <button onClick={() => setSidebarOpen(false)} className={`text-sm ${textMuted} hover:text-gray-300`}>x</button>
          </div>

          {/* Partnership Type */}
          <FilterSection title="Partnership Type" dark={dark}>
            {Object.entries(LINK_TYPE_COLORS).map(([key, { label, base }]) => (
              <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterTypes.includes(key)}
                  onChange={() => setFilterTypes(prev =>
                    prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
                  )}
                  className="rounded"
                />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: base }} />
                <span className={textNormal}>{label}</span>
              </label>
            ))}
          </FilterSection>

          {/* Stage */}
          <FilterSection title="Stage" dark={dark}>
            {STAGES.map(s => (
              <label key={s} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterStages.includes(s)}
                  onChange={() => setFilterStages(prev =>
                    prev.includes(s) ? prev.filter(t => t !== s) : [...prev, s]
                  )}
                  className="rounded"
                />
                <span className={`${textNormal} capitalize`}>{s}</span>
              </label>
            ))}
          </FilterSection>

          {/* Date Range */}
          <FilterSection title="Date Range" dark={dark}>
            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="From (YYYY)"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className={`w-full border rounded px-2 py-1 text-xs ${inputBg}`}
              />
              <input
                type="text"
                placeholder="To (YYYY)"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className={`w-full border rounded px-2 py-1 text-xs ${inputBg}`}
              />
            </div>
          </FilterSection>

          {/* Industry Segment */}
          <FilterSection title="Industry Segment" dark={dark}>
            {INDUSTRY_SEGMENTS.map(s => (
              <label key={s} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterSegments.includes(s)}
                  onChange={() => setFilterSegments(prev =>
                    prev.includes(s) ? prev.filter(t => t !== s) : [...prev, s]
                  )}
                  className="rounded"
                />
                <span className={`${textNormal} capitalize`}>{s.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </FilterSection>

          {/* Government Toggle */}
          <FilterSection title="Government / Private" dark={dark}>
            {['all', 'gov_only', 'private_only'].map(opt => (
              <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="gov"
                  checked={filterGovToggle === opt}
                  onChange={() => setFilterGovToggle(opt)}
                />
                <span className={textNormal}>
                  {opt === 'all' ? 'All' : opt === 'gov_only' ? 'Government Only' : 'Private Only'}
                </span>
              </label>
            ))}
          </FilterSection>

          {/* Clear all */}
          <div className="px-4 py-3">
            <button
              onClick={() => {
                setFilterTypes([]); setFilterStages([]); setFilterDateFrom(''); setFilterDateTo('')
                setFilterGeography(''); setFilterGovToggle('all'); setFilterSegments([])
              }}
              className="w-full text-xs text-[#4599FE] hover:underline"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* ── Main graph area ── */}
      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        {/* Controls bar */}
        <div className={`${panelBg} border-b ${borderClr} px-4 py-2.5 flex items-center gap-3 flex-wrap`}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              sidebarOpen
                ? (dark ? 'bg-blue-600 text-white border-blue-600' : 'bg-[#031E49] text-white border-[#031E49]')
                : `${dark ? 'border-gray-600 text-gray-400 hover:border-blue-500' : 'border-[#B8CAD1] text-gray-600 hover:border-[#4599FE]'}`
            }`}
          >
            Filters
          </button>

          <input
            type="text"
            placeholder="Search companies, types, geography\u2026"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`border rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#4599FE] ${inputBg}`}
          />

          {/* Scale by */}
          <div className="flex items-center gap-2">
            <span className={`text-xs ${textMuted} whitespace-nowrap`}>Bubble size:</span>
            <select
              value={scaleMetric}
              onChange={(e) => setScaleMetric(e.target.value)}
              className={`text-xs border rounded px-2 py-1.5 ${inputBg}`}
            >
              {SCALE_OPTIONS.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className={`ml-auto flex items-center gap-4 text-xs ${textMuted}`}>
            <span>{filteredGraph.nodes.length} companies</span>
            <span>{filteredGraph.links.length} partnerships</span>
          </div>
        </div>

        {/* Legend */}
        <div className={`${dark ? 'bg-[#0D1B2E]' : 'bg-[#F0F4F8]'} border-b ${borderClr} px-4 py-1.5 flex items-center gap-5 flex-wrap`}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs font-medium ${textMuted} uppercase tracking-wider`}>Arrows:</span>
            {Object.entries(LINK_TYPE_COLORS).map(([key, { base, label }]) => (
              <div key={key} className="flex items-center gap-1">
                <svg width="18" height="8" viewBox="0 0 18 8" className="inline-block">
                  <path d="M1 7 Q9 -1 17 7" stroke={base} fill="none" strokeWidth="1.5" opacity="0.65" />
                  <polygon points="17,7 13,5.5 14,8" fill={base} opacity="0.65" />
                </svg>
                <span className={`text-xs ${textNormal}`}>{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1 ml-1">
              <span className={`w-2.5 h-2.5 rounded-full inline-block border-2 border-dashed ${dark ? 'border-gray-500' : 'border-gray-400'}`} />
              <span className={`text-xs ${textMuted}`}>External</span>
            </div>
          </div>
        </div>

        {/* Graph canvas */}
        <div ref={containerRef} className="flex-1 relative min-h-0">
          <FG
            ref={fgRef}
            graphData={filteredGraph}
            width={dims.w}
            height={dims.h}
            nodeCanvasObject={paintNode}
            nodeCanvasObjectMode={() => 'replace'}
            linkCanvasObject={paintLink}
            linkCanvasObjectMode={() => 'replace'}
            nodePointerAreaPaint={pointerArea}
            enableNodeDrag={true}
            onNodeDrag={(node) => { node.fx = node.x; node.fy = node.y }}
            onNodeDragEnd={(node) => { node.fx = node.x; node.fy = node.y }}
            onNodeClick={(node) => { if (node.in_db !== false && onSelectCompany) onSelectCompany(node.id) }}
            onNodeHover={(node) => setHoveredNode(node || null)}
            backgroundColor={bg}
            cooldownTicks={250}
            d3AlphaDecay={0.015}
            d3VelocityDecay={0.35}
            d3AlphaMin={0.002}
            warmupTicks={50}
            onEngineStop={() => {
              if (fitDoneRef.current) return
              fitDoneRef.current = true
              filteredGraph.nodes.forEach((n) => { n.fx = n.x; n.fy = n.y })
              fgRef.current?.zoomToFit(400, 60)
            }}
          />

          {/* Fit All button */}
          <button
            onClick={() => fgRef.current?.zoomToFit(400, 60)}
            className={`absolute bottom-4 left-4 z-10 rounded-lg shadow px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1.5
              ${dark
                ? 'bg-[#1E293B] border border-gray-600 text-gray-300 hover:bg-[#2D3B4F]'
                : 'bg-white border border-[#B8CAD1] text-gray-600 hover:bg-[#F0F4F8]'
              }`}
          >
            Fit All
          </button>

          {/* Tooltip */}
          {hoveredNode && (
            <div className={`absolute top-4 left-4 rounded-xl shadow-lg px-4 py-3 text-sm border pointer-events-none max-w-[260px]
              ${dark ? 'bg-[#1E293B] border-gray-600' : 'bg-white border-[#B8CAD1]'}`}
            >
              <div className={`font-semibold leading-tight ${dark ? 'text-gray-100' : 'text-[#031E49]'}`}>
                {hoveredNode.name}
              </div>
              {hoveredNode.in_db === false && (
                <div className="text-xs text-amber-500 font-medium mt-0.5">External partner</div>
              )}
              {hoveredNode.type && hoveredNode.type !== 'other' && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors(hoveredNode.type, dark).fill }} />
                  <span className={`text-xs ${textMuted}`}>{hoveredNode.type}</span>
                </div>
              )}
              {hoveredNode.industry_segment && (
                <div className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{hoveredNode.industry_segment}</div>
              )}
              {hoveredNode.in_db !== false && (
                <div className="mt-2 space-y-0.5">
                  {hoveredNode.employee_count != null && <HRow dark={dark} label="Employees" value={hoveredNode.employee_count.toLocaleString()} />}
                  {hoveredNode.revenue_usd != null && <HRow dark={dark} label="Revenue" value={fmtVal(hoveredNode.revenue_usd)} />}
                  {hoveredNode.market_cap_usd != null && <HRow dark={dark} label="Market Cap" value={fmtVal(hoveredNode.market_cap_usd)} />}
                  {hoveredNode.total_funding_usd != null && <HRow dark={dark} label="Funding" value={fmtVal(hoveredNode.total_funding_usd)} />}
                  {hoveredNode.manufacturing_capacity_gwh != null && <HRow dark={dark} label="Capacity" value={`${hoveredNode.manufacturing_capacity_gwh} GWh`} />}
                </div>
              )}
              {hoveredNode.in_db !== false && (
                <div className="text-xs text-[#4599FE] mt-2">Click to open profile</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function HRow({ dark, label, value }) {
  return (
    <div className="text-xs flex justify-between gap-4">
      <span className={dark ? 'text-gray-500' : 'text-gray-400'}>{label}</span>
      <span className={`font-medium ${dark ? 'text-gray-200' : 'text-gray-700'}`}>{value}</span>
    </div>
  )
}

function FilterSection({ title, dark, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div className={`border-b ${dark ? 'border-gray-700' : 'border-[#B8CAD1]'}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full px-4 py-2.5 text-xs font-medium uppercase tracking-wider flex items-center justify-between ${
          dark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        {title}
        <span className="text-[10px]">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}
