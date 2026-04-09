import React, { useEffect, useState, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet.heat'
import { getCompaniesMap } from '../api/client'

const LIGHT_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const LIGHT_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const DARK_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'

const SPLIT_ZOOM = 8

const TYPE_COLORS = {
  'Raw Materials': '#F59E0B',
  'Battery Grade Materials': '#EAB308',
  'Other Battery Components & Mat.': '#D97706',
  'Electrode & Cell Manufacturing': '#4599FE',
  'Module-Pack Manufacturing': '#2563EB',
  'Recycling-Repurposing': '#10B981',
  'Equipment': '#06B6D4',
  'R&D': '#8B5CF6',
  'Services & Consulting': '#84CC16',
  'Modeling & Software': '#A855F7',
  'Distributors': '#F97316',
  'Professional Services': '#EC4899',
  'other': '#9CA3AF',
}

const HEAT_GRADIENT = {
  0.0: '#3B82F6',
  0.2: '#06B6D4',
  0.4: '#22C55E',
  0.6: '#EAB308',
  0.8: '#F97316',
  1.0: '#EF4444',
}

/* ── Leaflet heat layer managed via useMap ── */

function HeatLayer({ points }) {
  const map = useMap()
  const layerRef = useRef(null)

  useEffect(() => {
    const heat = L.heatLayer(points, {
      radius: 35,
      blur: 28,
      maxZoom: 10,
      minOpacity: 0.35,
      gradient: HEAT_GRADIENT,
    })
    layerRef.current = heat

    const sync = () => {
      if (map.getZoom() < SPLIT_ZOOM) {
        if (!map.hasLayer(heat)) heat.addTo(map)
      } else {
        if (map.hasLayer(heat)) map.removeLayer(heat)
      }
    }
    sync()
    map.on('zoomend', sync)

    return () => {
      map.off('zoomend', sync)
      if (map.hasLayer(heat)) map.removeLayer(heat)
    }
  }, [map, points])

  return null
}

/* ── Cluster label (floating count number, no bubble) ── */

function createCountLabel(cluster) {
  const count = cluster.getChildCount()
  const fontSize = count >= 100 ? 15 : count >= 10 ? 17 : 15
  return L.divIcon({
    html: `<span class="heatmap-count">${count}</span>`,
    className: 'heatmap-count-label',
    iconSize: L.point(44, 24),
    iconAnchor: L.point(22, 12),
  })
}

/* ── Small dot for individual markers in heatmap mode ── */

function createDotIcon(companyType, isHQ) {
  const fill = TYPE_COLORS[companyType] || '#9CA3AF'
  const sz = isHQ ? 14 : 10
  return L.divIcon({
    html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${fill};border:${isHQ ? 2 : 1}px solid ${fill};opacity:0.85;${isHQ ? 'box-shadow:0 0 4px ' + fill + ';' : ''}"></div>`,
    className: 'heatmap-dot-icon',
    iconSize: L.point(sz, sz),
    iconAnchor: L.point(sz / 2, sz / 2),
  })
}

/* ── Shared popup content ── */

function PopupContent({ c, onSelectCompany }) {
  const baseColor = TYPE_COLORS[c.company_type] || '#9CA3AF'
  const isHQ = c.is_hq
  return (
    <div className="min-w-[200px]">
      <div className="font-bold text-[#031E49] text-sm mb-1">{c.company_name}</div>
      {c.facility_name && (
        <div className="text-xs text-[#4599FE] font-medium mb-1">{c.facility_name}</div>
      )}
      <div className="text-xs text-gray-600 space-y-0.5">
        <div>
          <span className="font-medium">{isHQ ? 'HQ' : 'Facility'}:</span>{' '}
          {[c.facility_city, c.facility_state, c.facility_country].filter(Boolean).join(', ') || '—'}
        </div>
        <div>
          <span className="font-medium">Type:</span>{' '}
          <span style={{ color: baseColor }}>{c.company_type || 'Unknown'}</span>
        </div>
        <div><span className="font-medium">Segment:</span> {c.supply_chain_segment || '—'}</div>
        <div><span className="font-medium">Status:</span> {c.status || c.company_status || '—'}</div>
        {c.product && <div><span className="font-medium">Product:</span> {c.product}</div>}
        {c.product_type && <div><span className="font-medium">Product Type:</span> {c.product_type}</div>}
        {c.capacity && (
          <div><span className="font-medium">Capacity:</span> {c.capacity}{c.capacity_units ? ` ${c.capacity_units}` : ''}</div>
        )}
        {c.workforce && <div><span className="font-medium">Workforce:</span> {c.workforce}</div>}
        {c.chemistries && <div><span className="font-medium">Chemistries:</span> {c.chemistries}</div>}
        {c.company_website && (
          <div>
            <a href={c.company_website} target="_blank" rel="noreferrer" className="text-[#4599FE] hover:underline">
              Website
            </a>
          </div>
        )}
      </div>
      <button
        onClick={() => onSelectCompany(c.id)}
        className="mt-2 w-full bg-[#4599FE] text-white text-xs py-1 rounded hover:bg-[#4599FE]"
      >
        Company Details
      </button>
    </div>
  )
}

/* ── Legend ── */

function Legend() {
  const [collapsed, setCollapsed] = React.useState(false)
  return (
    <div className="absolute bottom-8 right-4 z-[1000] bg-white rounded-lg shadow-lg text-xs border border-[#B8CAD1] overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full px-3 py-2 font-semibold text-[#031E49] hover:bg-[#F0F4F8]"
      >
        <span>Company Type</span>
        <span className="ml-4 text-gray-400">{collapsed ? '▲' : '▼'}</span>
      </button>
      {!collapsed && (
        <div className="px-3 pb-3 max-h-56 overflow-y-auto space-y-1">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-700 capitalize">{type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Heat legend (gradient bar) ── */

function HeatLegend() {
  return (
    <div className="absolute bottom-8 left-4 z-[1000] bg-white rounded-lg shadow-lg text-xs border border-[#B8CAD1] px-3 py-2">
      <div className="font-semibold text-[#031E49] mb-1.5">Company Density</div>
      <div
        className="h-3 w-36 rounded-sm"
        style={{ background: 'linear-gradient(to right, #3B82F6, #06B6D4, #22C55E, #EAB308, #F97316, #EF4444)' }}
      />
      <div className="flex justify-between mt-1 text-gray-500">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  )
}

/* ── Main component ── */

export default function CompanyMap({ filters, onSelectCompany, highlightName, darkMode }) {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [heatmapMode, setHeatmapMode] = useState(false)

  useEffect(() => {
    getCompaniesMap()
      .then(({ data }) => setCompanies(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => companies.filter((c) => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!c.company_name?.toLowerCase().includes(q)) return false
    }
    if (filters.types.length && !filters.types.includes(c.company_type)) return false
    if (filters.statuses.length && !filters.statuses.includes(c.company_status)) return false
    if (filters.segments.length && !filters.segments.includes(c.supply_chain_segment)) return false
    if (filters.countries.length && !filters.countries.some((co) => c.facility_country?.includes(co) || c.company_hq_country?.includes(co))) return false
    return true
  }), [companies, filters])

  const heatPoints = useMemo(
    () => filtered.map((c) => [c.lat, c.lng, 1]),
    [filtered],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading map data…
      </div>
    )
  }

  return (
    <div className="relative flex-1 min-h-0">
      <MapContainer
        center={[39.5, -98.35]}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
        zoomAnimation={true}
        zoomAnimationThreshold={4}
        wheelPxPerZoomLevel={120}
        wheelDebounceTime={80}
      >
        <TileLayer
          key={darkMode ? 'dark' : 'light'}
          attribution={darkMode ? DARK_ATTR : LIGHT_ATTR}
          url={darkMode ? DARK_TILES : LIGHT_TILES}
        />

        {heatmapMode ? (
          <>
            <HeatLayer points={heatPoints} />
            <MarkerClusterGroup
              key="heatmap-clusters"
              chunkedLoading
              iconCreateFunction={createCountLabel}
              maxClusterRadius={80}
              disableClusteringAtZoom={SPLIT_ZOOM}
              spiderfyOnMaxZoom={false}
              animate={true}
              animateAddingMarkers={false}
            >
              {filtered.map((c, idx) => (
                <Marker
                  key={`heat-${c.id}-${idx}`}
                  position={[c.lat, c.lng]}
                  icon={createDotIcon(c.company_type, c.is_hq)}
                >
                  <Popup>
                    <PopupContent c={c} onSelectCompany={onSelectCompany} />
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </>
        ) : (
          filtered.map((c, idx) => {
            const isHighlighted = highlightName && c.company_name === highlightName
            const isHQ = c.is_hq
            const baseColor = TYPE_COLORS[c.company_type] || '#9CA3AF'
            return (
              <React.Fragment key={`${c.id}-${idx}`}>
                {isHQ && (
                  <CircleMarker
                    center={[c.lat, c.lng]}
                    radius={isHighlighted ? 18 : 13}
                    pathOptions={{
                      color: isHighlighted ? '#EE0405' : baseColor,
                      fillColor: 'transparent',
                      fillOpacity: 0,
                      weight: 2,
                      dashArray: '4 4',
                    }}
                    interactive={false}
                  />
                )}
                <CircleMarker
                  center={[c.lat, c.lng]}
                  radius={isHighlighted ? 12 : isHQ ? 8 : 6}
                  pathOptions={{
                    color: isHighlighted ? '#EE0405' : baseColor,
                    fillColor: isHighlighted ? '#EE0405' : baseColor,
                    fillOpacity: isHighlighted ? 1 : isHQ ? 0.9 : 0.7,
                    weight: isHighlighted ? 3 : isHQ ? 2 : 1,
                  }}
                >
                  <Popup>
                    <PopupContent c={c} onSelectCompany={onSelectCompany} />
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            )
          })
        )}
      </MapContainer>

      {/* Heatmap toggle */}
      <button
        onClick={() => setHeatmapMode(!heatmapMode)}
        className={`absolute top-3 right-4 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow text-xs font-semibold border transition-all ${
          heatmapMode
            ? 'bg-gradient-to-r from-red-500 to-orange-400 text-white border-red-400'
            : 'bg-white text-gray-600 border-[#B8CAD1] hover:bg-[#F0F4F8]'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C8 7 4 10 4 14a8 8 0 0016 0c0-4-4-7-8-12z" />
        </svg>
        Heatmap
      </button>

      {heatmapMode ? <HeatLegend /> : <Legend />}

      <div className="absolute top-3 left-14 z-[1000] bg-white rounded shadow px-3 py-1.5 text-xs text-gray-600 border border-[#B8CAD1]">
        Showing <strong>{filtered.length}</strong> of <strong>{companies.length}</strong> locations
      </div>
    </div>
  )
}
