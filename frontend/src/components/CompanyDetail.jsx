import React, { useEffect, useState } from 'react'
import { getCompany, researchCompany, getJob } from '../api/client'

const CATEGORY_COLORS = {
  funding: 'bg-green-100 text-green-800',
  partnership: 'bg-blue-100 text-blue-800',
  'product launch': 'bg-purple-100 text-purple-800',
  facility: 'bg-orange-100 text-orange-800',
  regulatory: 'bg-red-100 text-red-800',
  research: 'bg-teal-100 text-teal-800',
  other: 'bg-gray-100 text-gray-700',
}

export default function CompanyDetail({ companyId, onClose }) {
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [researching, setResearching] = useState(false)
  const [researchStatus, setResearchStatus] = useState(null)

  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    getCompany(companyId)
      .then(({ data }) => setCompany(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [companyId])

  async function handleReResearch() {
    if (!company) return
    setResearching(true)
    setResearchStatus('Starting…')
    try {
      const { data } = await researchCompany(company.company_name)
      const jobId = data.job_id
      // Poll until done
      const poll = setInterval(async () => {
        try {
          const { data: job } = await getJob(jobId)
          setResearchStatus(`Status: ${job.status}`)
          if (job.status === 'complete' || job.status === 'failed') {
            clearInterval(poll)
            setResearching(false)
            if (job.status === 'complete') {
              const { data: updated } = await getCompany(companyId)
              setCompany(updated)
              setResearchStatus('Research complete!')
            } else {
              setResearchStatus('Research failed.')
            }
          }
        } catch (_) {
          clearInterval(poll)
          setResearching(false)
        }
      }, 3000)
    } catch (e) {
      setResearching(false)
      setResearchStatus('Error starting research.')
    }
  }

  if (!companyId) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />
      {/* Panel */}
      <div className="w-[520px] bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#031E49] text-white px-5 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">
              {loading ? 'Loading…' : company?.company_name}
            </h2>
            {company && (
              <div className="text-sm text-blue-300 mt-0.5">
                {company.company_type} · {company.company_status}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none ml-4">
            ×
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Loading…</div>
        ) : !company ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Not found</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Quick facts */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="HQ" value={[company.company_hq_city, company.company_hq_state, company.company_hq_country].filter(Boolean).join(', ')} />
              <Info label="Segment" value={company.supply_chain_segment} />
              <Info label="Employees" value={company.number_of_employees} />
              <Info label="Last Fundraise" value={company.last_fundraise_date} />
              <Info label="NAATBatt Member" value={company.naatbatt_member ? 'Yes' : 'No'} />
              <Info label="Data Source" value={company.data_source} />
              {company.company_website && (
                <div className="col-span-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Website</span>
                  <div className="mt-0.5">
                    <a href={company.company_website} target="_blank" rel="noreferrer" className="text-[#4599FE] hover:underline text-sm break-all">
                      {company.company_website}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Keywords */}
            {company.keywords?.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Keywords</div>
                <div className="flex flex-wrap gap-1">
                  {company.keywords.map((k) => (
                    <span key={k} className="bg-[#F0F4F8] border border-[#B8CAD1] text-xs px-2 py-0.5 rounded-full">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {company.summary && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Summary</div>
                <p className="text-sm text-gray-700 leading-relaxed">{company.summary}</p>
              </div>
            )}

            {/* Long description */}
            {company.long_description && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Description</div>
                <p className="text-sm text-gray-600 leading-relaxed">{company.long_description}</p>
              </div>
            )}

            {/* Partnerships */}
            {company.announced_partners?.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Partnerships ({company.announced_partners.length})
                </div>
                <div className="space-y-2">
                  {company.announced_partners.map((p, i) => (
                    <div key={i} className="bg-[#F0F4F8] rounded p-3 text-sm">
                      <div className="font-medium">{p.partner_name}</div>
                      <div className="text-gray-500 text-xs mt-0.5">
                        {p.type_of_partnership} {p.scale ? `· ${p.scale}` : ''} {p.date ? `· ${p.date}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Locations */}
            {company.company_locations?.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Facilities ({company.company_locations.length})
                </div>
                <div className="space-y-1">
                  {company.company_locations.map((loc, i) => (
                    <div key={i} className="text-sm text-gray-600">
                      {loc.facility_name && <span className="font-medium">{loc.facility_name} — </span>}
                      {[loc.city, loc.state, loc.country].filter(Boolean).join(', ')}
                      {loc.product && <span className="text-gray-400"> · {loc.product}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related News */}
            {company.news?.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Recent News</div>
                <div className="space-y-2">
                  {company.news.map((n) => (
                    <div key={n.id} className="border border-[#B8CAD1] rounded p-3 text-sm">
                      <div className="font-medium">{n.news_headline}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[n.category] || CATEGORY_COLORS.other}`}>
                          {n.category}
                        </span>
                        <span className="text-gray-400 text-xs">{n.date_of_article}</span>
                        {n.url && (
                          <a href={n.url} target="_blank" rel="noreferrer" className="text-[#4599FE] text-xs hover:underline">
                            Source
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proceedings */}
            {company.proceedings?.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Conference Proceedings</div>
                <div className="space-y-1">
                  {company.proceedings.map((p) => (
                    <div key={p.id} className="text-sm text-gray-700">
                      <span className="font-medium">{p.title}</span>
                      {p.event_name && <span className="text-gray-400"> · {p.event_name}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Research button */}
            <div className="border-t border-[#B8CAD1] pt-4">
              <button
                onClick={handleReResearch}
                disabled={researching}
                className="w-full bg-[#4599FE] hover:bg-[#4599FE] disabled:opacity-60 text-white py-2 rounded text-sm font-medium transition-colors"
              >
                {researching ? 'Researching…' : 'Re-research with AI'}
              </button>
              {researchStatus && (
                <div className="mt-2 text-xs text-gray-500 text-center">{researchStatus}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Info({ label, value }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-sm text-[#031E49] mt-0.5">{value}</div>
    </div>
  )
}
