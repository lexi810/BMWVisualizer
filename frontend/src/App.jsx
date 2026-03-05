import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import CompanyMap from './components/CompanyMap'
import CompanyTable from './components/CompanyTable'
import NewsFeed from './components/NewsFeed'
import PartnershipNetwork from './components/PartnershipNetwork'
import ResearchPanel from './components/ResearchPanel'
import Proceedings from './components/Proceedings'
import CompanyDetail from './components/CompanyDetail'
import { getSeedStatus, triggerSeed } from './api/client'

export default function App() {
  const [activeTab, setActiveTab] = useState('map')
  const [filters, setFilters] = useState({ search: '', types: [], statuses: [], segments: [], countries: [] })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState(null)
  const [highlightCompany, setHighlightCompany] = useState(null)
  const [seeding, setSeeding] = useState(false)
  const [seedBanner, setSeedBanner] = useState(false)

  // Check if DB is empty on first load
  useEffect(() => {
    getSeedStatus()
      .then(({ data }) => {
        if (!data.seeded) {
          setSeedBanner(true)
          setSeeding(true)
          triggerSeed()
            .then(() => {
              const poll = setInterval(() => {
                getSeedStatus().then(({ data: s }) => {
                  if (s.seeded) {
                    clearInterval(poll)
                    setSeeding(false)
                    setSeedBanner(false)
                  }
                })
              }, 5000)
            })
            .catch(() => setSeeding(false))
        }
      })
      .catch(() => {})
  }, [])

  const showSidebar = activeTab === 'map' || activeTab === 'table'

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F0F4F8]">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Seeding banner */}
      {seedBanner && (
        <div className="bg-[#4599FE] text-white text-sm text-center py-2 px-4 flex items-center justify-center gap-3">
          <span className="animate-spin"></span>
          Importing NAATBatt battery company database — this may take a few minutes on first run…
        </div>
      )}

      <div className="flex flex-1 overflow-y-hidden">
        {/* Sidebar — only for map and table views */}
        {showSidebar && (
          <Sidebar
            filters={filters}
            setFilters={setFilters}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            onHighlightCompany={setHighlightCompany}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 flex flex-col">
          {activeTab === 'map' && (
            <CompanyMap
              filters={filters}
              onSelectCompany={(id) => setSelectedCompanyId(id)}
              highlightName={highlightCompany}
            />
          )}
          {activeTab === 'table' && <CompanyTable filters={filters} />}
          {activeTab === 'news' && <NewsFeed />}
          {activeTab === 'network' && (
            <PartnershipNetwork
              onSelectCompany={(id) => {
                setSelectedCompanyId(id)
                setActiveTab('table')
              }}
            />
          )}
          {activeTab === 'research' && <ResearchPanel />}
          {activeTab === 'proceedings' && <Proceedings />}
        </main>
      </div>

      {/* Global company detail panel (from map clicks or network) */}
      {selectedCompanyId && activeTab === 'map' && (
        <CompanyDetail
          companyId={selectedCompanyId}
          onClose={() => setSelectedCompanyId(null)}
        />
      )}
    </div>
  )
}
