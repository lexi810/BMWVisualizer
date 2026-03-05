import React, { useEffect, useState, useMemo } from 'react'
import { getCompanies } from '../api/client'
import CompanyDetail from './CompanyDetail'

const PAGE_SIZE = 25

const COLS = [
  { key: 'company_name', label: 'Company' },
  { key: 'company_type', label: 'Type' },
  { key: 'company_status', label: 'Status' },
  { key: 'hq', label: 'HQ' },
  { key: 'supply_chain_segment', label: 'Segment' },
  { key: 'number_of_employees', label: 'Employees' },
  { key: 'naatbatt_member', label: 'NAATBatt' },
]

function exportCSV(companies) {
  const headers = ['Name', 'Type', 'Status', 'HQ City', 'HQ State', 'Segment', 'Employees', 'Website', 'NAATBatt Member']
  const rows = companies.map((c) => [
    c.company_name, c.company_type, c.company_status,
    c.company_hq_city, c.company_hq_state, c.supply_chain_segment,
    c.number_of_employees, c.company_website, c.naatbatt_member ? 'Yes' : 'No',
  ])
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v ?? ''}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'bmw_battery_companies.csv'
  a.click()
}

export default function CompanyTable({ filters }) {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('company_name')
  const [sortDir, setSortDir] = useState(1)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    setLoading(true)
    getCompanies()
      .then(({ data }) => setCompanies(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let rows = companies
    const q = (search || filters.search || '').toLowerCase()
    if (q) {
      rows = rows.filter(
        (c) =>
          c.company_name?.toLowerCase().includes(q) ||
          c.company_type?.toLowerCase().includes(q) ||
          c.supply_chain_segment?.toLowerCase().includes(q)
      )
    }
    if (filters.types.length) rows = rows.filter((c) => filters.types.includes(c.company_type))
    if (filters.statuses.length) rows = rows.filter((c) => filters.statuses.includes(c.company_status))
    if (filters.segments.length) rows = rows.filter((c) => filters.segments.includes(c.supply_chain_segment))
    if (filters.countries.length)
      rows = rows.filter((c) => filters.countries.some((co) => c.company_hq_country?.includes(co)))

    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      return av < bv ? -sortDir : av > bv ? sortDir : 0
    })
    return rows
  }, [companies, search, filters, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSort(key) {
    if (sortKey === key) setSortDir((d) => -d)
    else { setSortKey(key); setSortDir(1) }
    setPage(1)
  }

  function SortIcon({ col }) {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="ml-1">{sortDir === 1 ? '↑' : '↓'}</span>
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-4 border-b border-[#B8CAD1] bg-white">
        <input
          type="text"
          placeholder="Search companies…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 border border-[#B8CAD1] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4599FE]"
        />
        <span className="text-sm text-gray-500">{filtered.length} results</span>
        <button
          onClick={() => exportCSV(filtered)}
          className="bg-[#4599FE] hover:bg-[#4599FE] text-white text-sm px-4 py-2 rounded"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">Loading…</div>
        ) : (
          <table className="min-w-[900px] w-max text-sm border-collapse">
            <thead className="bg-[#F0F4F8] sticky top-0 z-10">
              <tr>
                {COLS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900 border-b border-[#B8CAD1] whitespace-nowrap"
                  >
                    {col.label}
                    <SortIcon col={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`cursor-pointer border-b border-[#B8CAD1] hover:bg-blue-50 transition-colors ${
                    i % 2 === 0 ? 'bg-white' : 'bg-[#F0F4F8]/50'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-[#4599FE]">{c.company_name}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{c.company_type || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.company_status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {[c.company_hq_city, c.company_hq_state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.supply_chain_segment || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.number_of_employees?.toLocaleString() || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.naatbatt_member ? (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Yes</span>
                    ) : (
                      <span className="text-gray-400 text-xs">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#B8CAD1] bg-white">
        <span className="text-sm text-gray-500">
          Page {page} of {totalPages} ({filtered.length} total)
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border border-[#B8CAD1] rounded disabled:opacity-40 hover:bg-[#F0F4F8]"
          >
            ← Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm border border-[#B8CAD1] rounded disabled:opacity-40 hover:bg-[#F0F4F8]"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Detail panel */}
      {selectedId && (
        <CompanyDetail companyId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const MAP = {
    'Commercial': 'bg-green-100 text-green-700',
    'Operational': 'bg-green-100 text-green-700',
    'Pre-commercial/startup': 'bg-blue-100 text-blue-700',
    'Planned': 'bg-yellow-100 text-yellow-700',
    'Under Construction': 'bg-orange-100 text-orange-700',
    'Pilot Plant': 'bg-purple-100 text-purple-700',
    'Closed': 'bg-red-100 text-red-700',
    'Paused': 'bg-gray-100 text-gray-700',
  }
  if (!status) return <span className="text-gray-400 text-xs">—</span>
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${MAP[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}
