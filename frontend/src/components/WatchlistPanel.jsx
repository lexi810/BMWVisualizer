import React, { useEffect, useState, useCallback } from 'react'
import {
  getWatchlist,
  getWatchlistDigest,
  triggerWatchlistDigest,
  triggerCompanyDigest,
  removeFromWatchlist,
} from '../api/client'

const CATEGORY_COLORS = {
  funding: 'bg-green-100 text-green-700',
  partnership: 'bg-blue-100 text-blue-700',
  regulatory: 'bg-purple-100 text-purple-700',
  technology: 'bg-cyan-100 text-cyan-700',
  expansion: 'bg-indigo-100 text-indigo-700',
  leadership: 'bg-orange-100 text-orange-700',
  financial: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-600',
}

function ImportanceDots({ score }) {
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i < score
              ? score >= 8 ? 'bg-red-500' : score >= 5 ? 'bg-amber-400' : 'bg-gray-300'
              : 'bg-gray-100'
          }`}
        />
      ))}
    </div>
  )
}

function ArticleCard({ article }) {
  return (
    <div className={`rounded-lg border p-3 ${article.is_breaking ? 'border-red-200 bg-red-50' : 'border-[#E2EAF0] bg-white'}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <a
          href={article.url}
          target="_blank"
          rel="noreferrer"
          className={`text-sm font-medium leading-snug hover:underline ${article.is_breaking ? 'text-red-700' : 'text-[#1A5FAD]'}`}
        >
          {article.title}
          {article.is_breaking && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
              Breaking
            </span>
          )}
        </a>
        <div className="flex-shrink-0">
          <ImportanceDots score={article.importance || 0} />
        </div>
      </div>
      {article.why && (
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{article.why}</p>
      )}
      <div className="flex items-center gap-2 mt-2">
        {article.category && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[article.category] || CATEGORY_COLORS.other}`}>
            {article.category}
          </span>
        )}
        {article.published_date && (
          <span className="text-[10px] text-gray-400">{article.published_date}</span>
        )}
      </div>
    </div>
  )
}

function CompanyDigestCard({ digest, onRefreshOne, refreshingId }) {
  const [expanded, setExpanded] = useState(false)
  const articles = digest.articles || []
  const breaking = articles.filter((a) => a.is_breaking)
  const topArticles = expanded ? articles : articles.slice(0, 3)

  return (
    <div className={`rounded-xl border ${digest.has_breaking ? 'border-red-300 shadow-sm shadow-red-100' : 'border-[#DDE4EA]'} overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${digest.has_breaking ? 'bg-red-50' : 'bg-[#F7F9FB]'}`}>
        <div className="flex items-center gap-2">
          {digest.has_breaking && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
          <span className="font-semibold text-sm text-[text-bmw-text_primary]">{digest.company_name}</span>
          {breaking.length > 0 && (
            <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
              {breaking.length} Breaking
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{digest.run_date}</span>
          <button
            onClick={() => onRefreshOne(digest.company_id)}
            disabled={refreshingId === digest.company_id}
            title="Refresh this company"
            className="text-bmw-blue hover:text-[#2a7de8] disabled:opacity-40 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${refreshingId === digest.company_id ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      {/* Articles */}
      <div className="p-3 space-y-2">
        {articles.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-4">No articles yet — click refresh to fetch news.</div>
        ) : (
          <>
            {topArticles.map((a, i) => <ArticleCard key={i} article={a} />)}
            {articles.length > 3 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full text-xs text-bmw-blue hover:underline text-center py-1"
              >
                {expanded ? 'Show less' : `Show ${articles.length - 3} more articles`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function EmptyWatchedCard({ company, onRemove, onRefreshOne, refreshingId }) {
  return (
    <div className="rounded-xl border border-[#DDE4EA] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-[#F7F9FB]">
        <span className="font-semibold text-sm text-[text-bmw-text_primary]">{company.company_name}</span>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <button
            onClick={() => onRefreshOne(company.company_id)}
            disabled={refreshingId === company.company_id}
            className="text-bmw-blue hover:text-[#2a7de8] disabled:opacity-40 transition-colors"
            title="Fetch news now"
          >
            <svg className={`w-3.5 h-3.5 ${refreshingId === company.company_id ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
          <button
            onClick={() => onRemove(company.company_id)}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Remove from watchlist"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="px-4 py-6 text-xs text-gray-400 text-center">
        No digest yet — click <span className="text-bmw-blue">↻</span> to fetch news now.
      </div>
    </div>
  )
}

export default function WatchlistPanel() {
  const [watchlist, setWatchlist] = useState([])
  const [digests, setDigests] = useState([])
  const [loading, setLoading] = useState(true)
  const [runningAll, setRunningAll] = useState(false)
  const [refreshingId, setRefreshingId] = useState(null)
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [pollTimer, setPollTimer] = useState(null)

  const loadData = useCallback(async () => {
    try {
      const [{ data: wl }, { data: dg }] = await Promise.all([
        getWatchlist(),
        getWatchlistDigest(),
      ])
      setWatchlist(wl)
      setDigests(dg)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  // Poll after triggering a digest to pick up results
  function startPolling() {
    const t = setInterval(() => {
      loadData()
    }, 4000)
    setPollTimer(t)
    setTimeout(() => {
      clearInterval(t)
      setPollTimer(null)
    }, 60000)
  }

  async function handleRunAll() {
    setRunningAll(true)
    try {
      await triggerWatchlistDigest()
      setLastRefreshed(new Date().toLocaleTimeString())
      startPolling()
    } catch (e) {
      console.error(e)
    }
    setTimeout(() => setRunningAll(false), 2000)
  }

  async function handleRefreshOne(companyId) {
    setRefreshingId(companyId)
    try {
      await triggerCompanyDigest(companyId)
      setLastRefreshed(new Date().toLocaleTimeString())
      startPolling()
    } catch (e) {
      console.error(e)
    }
    setTimeout(() => setRefreshingId(null), 2000)
  }

  async function handleRemove(companyId) {
    try {
      await removeFromWatchlist(companyId)
      setWatchlist((prev) => prev.filter((w) => w.company_id !== companyId))
      setDigests((prev) => prev.filter((d) => d.company_id !== companyId))
    } catch (e) {
      console.error(e)
    }
  }

  // Map digest by company_id
  const digestMap = Object.fromEntries(digests.map((d) => [d.company_id, d]))

  const breakingCount = digests.filter((d) => d.has_breaking).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Loading watchlist…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bmw-gray_light">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#DDE4EA]">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-[text-bmw-text_primary] text-sm">Watchlist</h2>
          <span className="text-xs text-gray-400">{watchlist.length} companies</span>
          {breakingCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {breakingCount} with breaking news
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-gray-400">Updated {lastRefreshed}</span>
          )}
          {pollTimer && (
            <span className="text-xs text-bmw-blue animate-pulse">Fetching news…</span>
          )}
          <button
            onClick={handleRunAll}
            disabled={runningAll || watchlist.length === 0}
            className="flex items-center gap-1.5 bg-bmw-blue hover:bg-[#2a7de8] disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${runningAll ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {runningAll ? 'Running…' : 'Refresh All'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
            <div className="text-gray-400 text-sm">No companies in your watchlist yet.</div>
            <div className="text-gray-300 text-xs">Star companies in the Company Table to track them here.</div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto grid gap-4">
            {/* Breaking news section */}
            {breakingCount > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <h3 className="font-semibold text-red-700 text-sm">Breaking News</h3>
                </div>
                <div className="space-y-2">
                  {digests
                    .filter((d) => d.has_breaking)
                    .flatMap((d) =>
                      (d.articles || [])
                        .filter((a) => a.is_breaking)
                        .map((a, i) => (
                          <div key={`${d.company_id}-${i}`} className="flex items-start gap-3 bg-white rounded-lg border border-red-200 p-3">
                            <span className="text-xs font-semibold text-red-500 bg-red-100 px-1.5 py-0.5 rounded whitespace-nowrap">{d.company_name}</span>
                            <div>
                              <a href={a.url} target="_blank" rel="noreferrer" className="text-sm text-red-700 font-medium hover:underline leading-snug">{a.title}</a>
                              {a.why && <p className="text-xs text-gray-500 mt-0.5">{a.why}</p>}
                            </div>
                          </div>
                        ))
                    )}
                </div>
              </div>
            )}

            {/* Per-company cards */}
            {watchlist.map((company) => {
              const digest = digestMap[company.company_id]
              if (digest) {
                return (
                  <CompanyDigestCard
                    key={company.company_id}
                    digest={digest}
                    onRefreshOne={handleRefreshOne}
                    refreshingId={refreshingId}
                  />
                )
              }
              return (
                <EmptyWatchedCard
                  key={company.company_id}
                  company={company}
                  onRemove={handleRemove}
                  onRefreshOne={handleRefreshOne}
                  refreshingId={refreshingId}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
