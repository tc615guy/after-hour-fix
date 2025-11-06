'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, AlertTriangle, Lightbulb, TrendingUp, MessageSquare } from 'lucide-react'

interface KnowledgeGap {
  question: string
  frequency: number
  firstSeen: string
  lastSeen: string
  wasAnswered: boolean
  relatedCalls: string[]
}

interface PromptSuggestion {
  type: string
  currentText?: string
  suggestedText: string
  reason: string
  confidence: number
  basedOnCalls: number
}

interface AutoFAQ {
  question: string
  suggestedAnswer: string
  confidence: number
}

export default function AIInsightsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')

  const [loading, setLoading] = useState(true)
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>([])
  const [promptSuggestions, setPromptSuggestions] = useState<PromptSuggestion[]>([])
  const [autoFAQs, setAutoFAQs] = useState<AutoFAQ[]>([])
  const [activeTab, setActiveTab] = useState<'gaps' | 'suggestions' | 'faqs'>('gaps')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (projectId) {
      loadInsights()
    }
  }, [projectId])

  async function loadInsights() {
    setLoading(true)
    setError(null)

    try {
      const [gapsRes, suggestionsRes, faqsRes] = await Promise.all([
        fetch(`/api/ai-insights/knowledge-gaps?projectId=${projectId}`),
        fetch(`/api/ai-insights/prompt-suggestions?projectId=${projectId}`),
        fetch(`/api/ai-insights/auto-faqs?projectId=${projectId}`),
      ])

      if (!gapsRes.ok || !suggestionsRes.ok || !faqsRes.ok) {
        throw new Error('Failed to load insights')
      }

      const gapsData = await gapsRes.json()
      const suggestionsData = await suggestionsRes.json()
      const faqsData = await faqsRes.json()

      setKnowledgeGaps(gapsData.gaps || [])
      setPromptSuggestions(suggestionsData.suggestions || [])
      setAutoFAQs(faqsData.faqs || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load AI insights')
      console.error('Error loading insights:', err)
    } finally {
      setLoading(false)
    }
  }

  async function acceptFAQ(faq: AutoFAQ) {
    try {
      const res = await fetch('/api/ai-insights/auto-faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          question: faq.question,
          answer: faq.suggestedAnswer,
        }),
      })

      if (!res.ok) throw new Error('Failed to save FAQ')

      const data = await res.json()
      alert(`FAQ added successfully! Total FAQs: ${data.totalFAQs}`)
      
      // Remove from list
      setAutoFAQs(prev => prev.filter(f => f.question !== faq.question))
    } catch (err: any) {
      alert('Error saving FAQ: ' + err.message)
    }
  }

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-red-600">Project ID required</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/dashboard?projectId=${projectId}`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Insights & Learning</h1>
              <p className="text-gray-600 mt-2">
                Your AI is getting smarter with every call. Review insights and approve improvements.
              </p>
            </div>

            <button
              onClick={loadInsights}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh Insights'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('gaps')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'gaps'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Knowledge Gaps ({knowledgeGaps.length})
                </div>
              </button>

              <button
                onClick={() => setActiveTab('suggestions')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'suggestions'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Prompt Suggestions ({promptSuggestions.length})
                </div>
              </button>

              <button
                onClick={() => setActiveTab('faqs')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'faqs'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Auto-Generated FAQs ({autoFAQs.length})
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-r-transparent"></div>
                <p className="mt-4 text-gray-600">Analyzing your calls...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <>
                {/* Knowledge Gaps Tab */}
                {activeTab === 'gaps' && (
                  <div>
                    {knowledgeGaps.length === 0 ? (
                      <div className="text-center py-12">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-600">No knowledge gaps detected! Your AI is answering questions well.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {knowledgeGaps.map((gap, index) => (
                          <div
                            key={index}
                            className={`p-4 rounded-lg border ${
                              gap.wasAnswered ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  {gap.wasAnswered ? (
                                    <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                                  ) : (
                                    <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                                  )}
                                  <span className="font-medium text-gray-900">{gap.question}</span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  Asked {gap.frequency} time{gap.frequency > 1 ? 's' : ''} • 
                                  {gap.wasAnswered ? ' Has answers' : ' No good answer'} • 
                                  Last seen: {new Date(gap.lastSeen).toLocaleDateString()}
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                gap.frequency >= 5
                                  ? 'bg-red-100 text-red-800'
                                  : gap.frequency >= 3
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {gap.frequency}x
                              </span>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <Link
                                href={`/dashboard/settings?projectId=${projectId}&tab=knowledge`}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Add to Knowledge Base →
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Prompt Suggestions Tab */}
                {activeTab === 'suggestions' && (
                  <div>
                    {promptSuggestions.length === 0 ? (
                      <div className="text-center py-12">
                        <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Not enough call data yet. We need at least 10 successful calls to generate suggestions.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {promptSuggestions.map((suggestion, index) => (
                          <div key={index} className="p-6 rounded-lg border border-blue-200 bg-blue-50">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full mb-2">
                                  {suggestion.type.replace(/_/g, ' ').toUpperCase()}
                                </span>
                                <p className="text-gray-900 font-medium">{suggestion.suggestedText}</p>
                              </div>
                              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                                {Math.round(suggestion.confidence * 100)}% confident
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{suggestion.reason}</p>
                            <p className="text-xs text-gray-500">
                              Based on {suggestion.basedOnCalls} successful call{suggestion.basedOnCalls > 1 ? 's' : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Auto-FAQs Tab */}
                {activeTab === 'faqs' && (
                  <div>
                    {autoFAQs.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No auto-generated FAQs yet. Questions need to be asked 3+ times to generate FAQs.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {autoFAQs.map((faq, index) => (
                          <div key={index} className="p-6 rounded-lg border border-green-200 bg-green-50">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <p className="text-gray-900 font-medium mb-2">{faq.question}</p>
                                <p className="text-gray-700 text-sm">{faq.suggestedAnswer}</p>
                              </div>
                              <span className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-full ml-4">
                                {Math.round(faq.confidence * 100)}%
                              </span>
                            </div>
                            <div className="mt-4 flex gap-2">
                              <button
                                onClick={() => acceptFAQ(faq)}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                              >
                                ✓ Add to Knowledge Base
                              </button>
                              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium">
                                Edit Answer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How AI Learning Works</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• <strong>Knowledge Gaps:</strong> Questions customers ask repeatedly that your AI struggles to answer</li>
            <li>• <strong>Prompt Suggestions:</strong> Improvements based on successful booking patterns</li>
            <li>• <strong>Auto-FAQs:</strong> Frequent questions with consistent AI answers, ready to be saved</li>
          </ul>
          <p className="mt-4 text-sm text-blue-700">
            The more calls you receive, the smarter your AI becomes. Review and approve suggestions to continuously improve.
          </p>
        </div>
      </div>
    </div>
  )
}

