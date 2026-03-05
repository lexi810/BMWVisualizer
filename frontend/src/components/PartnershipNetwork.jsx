import React, { useEffect, useState, useRef, useCallback } from 'react'
import { getCompaniesNetwork } from '../api/client'

const LINK_COLORS = {
  'Joint Venture': '#4599FE',
  'Investment': '#10B981',
  'MOU': '#F59E0B',
  'Off-take': '#8B5CF6',
  'Supply Agreement': '#EC4899',
  'Other': '#9CA3AF',
}

const NODE_COLORS = {
  'start-up': '#8B5CF6',
  'cell supplier': '#4599FE',
  'materials supplier': '#F59E0B',
  'EV OEM': '#10B981',
  'testing partner': '#EC4899',
  'prototyping partner': '#F97316',
  'recycler': '#6B7280',
  'equipment supplier': '#06B6D4',
  'R&D': '#3B82F6',
  'services': '#84CC16',
  'modeling/software': '#A855F7',
  'other': '#9CA3AF',
}

// Lazy-load react-force-graph-2d to avoid SSR issues
let ForceGraph2D = null

export default function PartnershipNetwork({ onSelectCompany }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [highlight, setHighlight] = useState('')
  const [tooltip, setTooltip] = useState(null)
  const [FG, setFG] = useState(null)
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ w: 800, h: 600 })

  useEffect(() => {
    import('react-force-graph-2d').then((mod) => {
      setFG(() => mod.default)
    })
  }, [])

  useEffect(() => {
    getCompaniesNetwork()
      .then(({ data }) => setGraphData(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setDims({ w: width, h: height })
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const nodeCanvasObject = useCallback(
    (node, ctx, globalScale) => {
      const isHighlighted = highlight && node.name.toLowerCase().includes(highlight.toLowerCase())
      const radius = Math.max(4, Math.sqrt((node.employees || 10) / 10) + 3)
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = NODE_COLORS[node.type] || '#9CA3AF'
      ctx.fill()
      if (isHighlighted) {
        ctx.strokeStyle = '#FFD700'
        ctx.lineWidth = 2 / globalScale
        ctx.stroke()
      }
      if (globalScale > 1.5 || isHighlighted) {
        const label = node.name
        ctx.font = `${11 / globalScale}px Sans-Serif`
        ctx.fillStyle = '#031E49'
        ctx.textAlign = 'center'
        ctx.fillText(label, node.x, node.y + radius + 8 / globalScale)
      }
    },
    [highlight]
  )

  if (loading || !FG) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        {loading ? 'Loading network data…' : 'Initializing graph…'}
      </div>
    )
  }

  if (graphData.links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="text-5xl mb-3"></div>
        <div className="text-lg font-medium">No partnership data yet</div>
        <div className="text-sm mt-1">Research companies with AI to populate partnership links</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="bg-white border-b border-[#B8CAD1] p-3 flex items-center gap-3">
        <input
          type="text"
          placeholder="Highlight company…"
          value={highlight}
          onChange={(e) => setHighlight(e.target.value)}
          className="border border-[#B8CAD1] rounded px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#4599FE]"
        />
        <div className="flex gap-4 ml-4 text-xs">
          {Object.entries(LINK_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <span className="w-4 h-1 inline-block rounded" style={{ backgroundColor: color }} />
              <span className="text-gray-600">{type}</span>
            </div>
          ))}
        </div>
        <div className="ml-auto text-xs text-gray-500">
          {graphData.nodes.length} companies · {graphData.links.length} partnerships
        </div>
      </div>

      {/* Graph */}
      <div ref={containerRef} className="flex-1 relative">
        <FG
          graphData={graphData}
          width={dims.w}
          height={dims.h}
          nodeCanvasObject={nodeCanvasObject}
          nodeCanvasObjectMode={() => 'replace'}
          linkColor={(link) => LINK_COLORS[link.type] || LINK_COLORS.Other}
          linkWidth={1.5}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          onNodeClick={(node) => onSelectCompany && onSelectCompany(node.id)}
          onNodeHover={(node) => {
            if (node) {
              setTooltip({ name: node.name, type: node.type, employees: node.employees })
            } else {
              setTooltip(null)
            }
          }}
          backgroundColor="#F0F4F8"
          cooldownTicks={100}
        />
        {tooltip && (
          <div className="absolute top-4 left-4 bg-white rounded shadow-lg px-3 py-2 text-xs border border-[#B8CAD1] pointer-events-none">
            <div className="font-semibold text-sm">{tooltip.name}</div>
            <div className="text-gray-500">{tooltip.type}</div>
            {tooltip.employees && <div className="text-gray-500">{tooltip.employees.toLocaleString()} employees</div>}
          </div>
        )}
      </div>
    </div>
  )
}
