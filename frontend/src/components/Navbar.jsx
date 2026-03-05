import React, { useState, useEffect } from 'react'
import { getSyncStatus, triggerSync } from '../api/client'

const TABS = [
  { id: 'map', label: 'Company Map' },
  { id: 'table', label: 'Company Table' },
  { id: 'news', label: 'News Feed' },
  { id: 'network', label: 'Partnership Network' },
  { id: 'research', label: 'Research Panel' },
  { id: 'proceedings', label: 'Conference Proceedings' },
]

export default function Navbar({ activeTab, setActiveTab }) {
  const [syncInfo, setSyncInfo] = useState(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadSync()
    const interval = setInterval(loadSync, 60000)
    return () => clearInterval(interval)
  }, [])

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
    <nav className="bg-[#031E49] select-none border-b border-[#0a2a5e]" style={{ height: '44px' }}>
      <div className="flex items-center h-full px-4 gap-6">
        {/* Logo + Title */}
        <div className="flex items-center gap-2 min-w-fit">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/600px-BMW.svg.png"
            alt="BMW"
            className="w-6 h-6 rounded-full object-cover flex-shrink-0"
          />
          <span className="text-white font-semibold text-sm whitespace-nowrap tracking-wide">
            BMW Battery Intelligence
          </span>
        </div>

        {/* Tabs */}
        <div className="flex items-center h-full flex-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative h-full px-4 text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-[#8aa4be] hover:text-white'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#4599FE]" />
              )}
            </button>
          ))}
        </div>

        {/* Sync badge */}
        <div className="flex items-center gap-2 min-w-fit">
          <span className="text-[#8aa4be] text-xs whitespace-nowrap">
            Synced: <span className="text-white">{lastSynced}</span>
          </span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="border border-[#4599FE] text-[#4599FE] hover:bg-[#4599FE] hover:text-white disabled:opacity-40 text-xs px-3 py-1 rounded transition-colors"
          >
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>
    </nav>
  )
}
