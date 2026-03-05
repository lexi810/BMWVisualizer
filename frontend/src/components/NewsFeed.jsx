import React, { useEffect, useState, useMemo } from 'react'
import { getNews } from '../api/client'

const CATEGORY_STYLES = {
  funding: 'bg-green-100 text-green-800',
  partnership: 'bg-blue-100 text-blue-800',
  'product launch': 'bg-purple-100 text-purple-800',
  facility: 'bg-orange-100 text-orange-800',
  regulatory: 'bg-red-100 text-red-800',
  research: 'bg-teal-100 text-teal-800',
  market: 'bg-indigo-100 text-indigo-800',
  other: 'bg-gray-100 text-gray-700',
}

const CATEGORIES = Object.keys(CATEGORY_STYLES)

export default function NewsFeed() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (category) params.category = category
    if (fromDate) params.from_date = fromDate
    if (toDate) params.to_date = toDate
    if (search) params.search = search
    getNews(params)
      .then(({ data }) => setNews(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [category, fromDate, toDate, search])

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="bg-white border-b border-[#B8CAD1] p-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search headlines…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-[#B8CAD1] rounded px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#4599FE]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-[#B8CAD1] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4599FE]"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="capitalize">{c}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-[#B8CAD1] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4599FE]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-[#B8CAD1] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4599FE]"
          />
        </div>
        <span className="text-sm text-gray-500 ml-auto">{news.length} articles</span>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">Loading…</div>
        ) : news.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="text-5xl mb-3"></div>
            <div>No news articles found</div>
            <div className="text-sm mt-1">Use the Research Panel to fetch news for a company</div>
          </div>
        ) : (
          news.map((n) => (
            <NewsCard key={n.id} article={n} />
          ))
        )}
      </div>
    </div>
  )
}

function NewsCard({ article }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-[#B8CAD1] p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                CATEGORY_STYLES[article.category] || CATEGORY_STYLES.other
              }`}
            >
              {article.category || 'other'}
            </span>
            {article.company_name && (
              <span className="text-xs text-[#4599FE] font-medium">{article.company_name}</span>
            )}
            <span className="text-xs text-gray-400">{article.date_of_article || 'Date unknown'}</span>
            {article.news_source && (
              <span className="text-xs text-gray-400">· {article.news_source}</span>
            )}
          </div>
          <h3 className="font-semibold text-[#031E49] text-sm leading-snug">{article.news_headline}</h3>
          {article.summary && (
            <p className={`text-sm text-gray-600 mt-2 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
              {article.summary}
            </p>
          )}
          {article.summary && article.summary.length > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-[#4599FE] mt-1 hover:underline"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {article.topics?.slice(0, 4).map((t) => (
          <span key={t} className="text-xs bg-[#F0F4F8] text-gray-600 px-2 py-0.5 rounded">
            {t}
          </span>
        ))}
        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[#4599FE] hover:underline ml-auto"
          >
            Read article →
          </a>
        )}
      </div>
    </div>
  )
}
