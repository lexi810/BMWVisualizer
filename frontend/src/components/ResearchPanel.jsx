import React, { useState, useRef } from 'react'
import { uploadCSV, uploadPartnerships } from '../api/client'

function DropZone({ label, accept, onUpload, uploading }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  function handleFile(file) {
    if (file) onUpload(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFile(e.dataTransfer.files[0])
      }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        dragging ? 'border-bmw-blue bg-blue-50' : 'border-bmw-border hover:border-bmw-blue'
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => handleFile(e.target.files[0])} />
      <div className="text-2xl mb-2">↑</div>
      <div className="text-sm font-medium text-gray-700">{label}</div>
      <div className="text-xs text-gray-400 mt-1">Click or drag & drop</div>
      {uploading && <div className="mt-2 text-xs text-bmw-blue animate-pulse">Uploading…</div>}
    </div>
  )
}

function ResultBanner({ result, onDismiss }) {
  if (!result) return null
  const isError = !!result.error
  return (
    <div className={`mt-3 text-xs rounded-lg p-3 border flex items-start justify-between gap-2 ${
      isError ? 'border-red-200 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-700'
    }`}>
      <span>
        {isError ? result.error : (
          result.added !== undefined
            ? `Added ${result.added}, updated ${result.updated} companies`
            : result.companies_added !== undefined && result.news_added !== undefined
            ? `Added ${result.companies_added} companies, ${result.news_added} news, ${result.proceedings_added} proceedings`
            : result.source
            ? `${result.source} — ${result.companies_added} added · ${result.companies_updated} updated${result.partnerships_added > 0 ? ` · ${result.partnerships_added} partnerships` : ''}`
            : JSON.stringify(result)
        )}
      </span>
      <button onClick={onDismiss} className="opacity-50 hover:opacity-100 flex-shrink-0">✕</button>
    </div>
  )
}

export default function ResearchPanel() {
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvResult, setCsvResult] = useState(null)

  const [pbUploading, setPbUploading] = useState(false)
  const [pbResult, setPbResult] = useState(null)

  async function handleCsvUpload(file) {
    setCsvUploading(true)
    setCsvResult(null)
    try {
      const { data } = await uploadCSV(file)
      setCsvResult(data)
    } catch (e) {
      setCsvResult({ error: e.response?.data?.detail || e.message })
    }
    setCsvUploading(false)
  }

  async function handlePbUpload(file) {
    setPbUploading(true)
    setPbResult(null)
    try {
      const { data } = await uploadPartnerships(file)
      setPbResult(data)
    } catch (e) {
      setPbResult({ error: e.response?.data?.detail || e.message })
    }
    setPbUploading(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-bmw-gray-light">
      <div className="max-w-3xl mx-auto space-y-6">

        <div>
          <h2 className="text-lg font-semibold text-[text-bmw-text-primary] mb-1">Data Import</h2>
          <p className="text-sm text-gray-500">Upload company data from spreadsheets or partnership network exports.</p>
        </div>

        {/* CSV / XLSX */}
        <div className="bg-white rounded-xl border border-[#DDE4EA] p-6">
          <h3 className="font-semibold text-[text-bmw-text-primary] mb-1">Companies Spreadsheet</h3>
          <p className="text-xs text-gray-500 mb-4">Import a CSV or XLSX with company records. New companies are added; existing ones are updated.</p>
          <DropZone label="CSV or XLSX file" accept=".csv,.xlsx" onUpload={handleCsvUpload} uploading={csvUploading} />
          <ResultBanner result={csvResult} onDismiss={() => setCsvResult(null)} />
        </div>

        {/* PitchBook / Crunchbase */}
        <div className="bg-white rounded-xl border border-[#DDE4EA] p-6">
          <h3 className="font-semibold text-[text-bmw-text-primary] mb-1">PitchBook / Crunchbase Export</h3>
          <p className="text-xs text-gray-500 mb-2">
            Drop a company list, deals sheet, or funding rounds export. Format is auto-detected and partnerships are linked into the network graph.
          </p>
          <div className="text-xs text-gray-400 mb-4 grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span>· PitchBook — Company List</span>
            <span>· PitchBook — Deals</span>
            <span>· Crunchbase — Organizations</span>
            <span>· Crunchbase — Funding Rounds</span>
          </div>
          <DropZone label=".csv or .xlsx export" accept=".csv,.xlsx" onUpload={handlePbUpload} uploading={pbUploading} />
          <ResultBanner result={pbResult} onDismiss={() => setPbResult(null)} />
        </div>


      </div>
    </div>
  )
}
