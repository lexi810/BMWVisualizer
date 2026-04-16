import React, { useState, useEffect, useRef } from 'react'
import { getSyncStatus, triggerSync } from '../api/client'

const TABS = [
  { id: 'map', label: 'Company Map' },
  { id: 'table', label: 'Company Table' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'news', label: 'News Feed' },
  { id: 'network', label: 'Partnership Network' },
]

export default function Navbar({ activeTab, setActiveTab, watchlistBreaking = 0, onOpenDataImport = () => {} }) {
  const [syncInfo, setSyncInfo] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef(null)

  useEffect(() => {
    loadSync()
    const interval = setInterval(loadSync, 60000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false)
      }
    }
    if (settingsOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [settingsOpen])

  async function loadSync() {
    try {
      const { data } = await getSyncStatus()
      setSyncInfo(data)
    } catch (_) {}
  }

  async function handleSync() {
    setSyncing(true)
    try {
      await triggerSync()
      setTimeout(loadSync, 3000)
    } catch (_) {}
    setTimeout(() => setSyncing(false), 2000)
  }

  const lastSynced = syncInfo?.last_sync?.run_at
    ? new Date(syncInfo.last_sync.run_at).toLocaleDateString()
    : 'Never'

  return (
    <nav className="bg-white select-none border-b border-bmw-border shadow-light" style={{ height: '56px' }}>
      <div className="flex items-center h-full px-6 gap-8">
        {/* Logo + Title */}
        <div className="flex items-center gap-3 min-w-fit">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/600px-BMW.svg.png"
            alt="BMW"
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
          <span className="text-bmw-navy font-bold text-base whitespace-nowrap tracking-tight font-display">
            BMW Battery
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center h-full flex-1 overflow-x-auto gap-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative h-full px-5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-bmw-blue'
                  : 'text-bmw-text-secondary hover:text-bmw-text-primary'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {tab.label}
                {tab.id === 'watchlist' && watchlistBreaking > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </span>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-bmw-blue" />
              )}
            </button>
          ))}
        </div>

        {/* Sync badge */}
        <div className="flex items-center gap-3 min-w-fit">
          <span className="text-bmw-text-secondary text-xs whitespace-nowrap">
            Synced: <span className="text-bmw-text-primary font-medium">{lastSynced}</span>
          </span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="border-2 border-bmw-blue text-bmw-blue hover:bg-bmw-blue hover:text-white disabled:opacity-40 text-xs px-3 py-1.5 rounded font-medium transition-colors"
          >
            {syncing ? 'Syncing\u2026' : 'Sync Now'}
          </button>
        </div>

        {/* Settings gear */}
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className={`p-2 rounded transition-colors ${
              settingsOpen
                ? 'bg-bmw-gray-light text-bmw-blue'
                : 'text-bmw-text-secondary hover:text-bmw-blue'
            }`}
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>

          {/* Dropdown */}
          {settingsOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-[text-bmw-text-primary] border border-[#0a2a5e] rounded-lg shadow-2xl z-50 py-1 overflow-hidden">
              <div className="px-3 py-2 text-[10px] font-semibold text-[#8aa4be] uppercase tracking-wider">
                Data
              </div>

              {/* Data Import option */}
              <button
                onClick={() => { onOpenDataImport(); setSettingsOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#8aa4be] hover:text-white hover:bg-[#0a2a5e]/50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5H21m-21 9h21m-21-5.25h21M3 19.5v-15a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3Z" />
                </svg>
                Data Import
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
