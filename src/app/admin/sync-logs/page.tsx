/**
 * Sync Logs Admin Page
 * View and filter calendar sync operation logs
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronDown, ChevronRight, RefreshCw, Search, FileText } from 'lucide-react'

interface SyncLog {
  id: string
  userId: string
  projectId?: string
  source: string
  direction: string
  status: string
  summary: string
  payload?: any
  createdAt: string
}

export default function SyncLogsPage() {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    provider: 'all',
    direction: 'all',
    search: '',
  })
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    loadLogs()
  }, [filters, page])

  async function loadLogs() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '100',
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.provider !== 'all' && { provider: filters.provider }),
        ...(filters.direction !== 'all' && { direction: filters.direction }),
        ...(filters.search && { search: filters.search }),
      })

      const res = await fetch(`/api/admin/sync-logs?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setHasMore(data.hasMore || false)
      }
    } catch (error) {
      console.error('Failed to load sync logs:', error)
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, any> = {
      ok: 'default',
      error: 'destructive',
      retry: 'secondary',
    }
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  function getProviderIcon(provider: string) {
    const icons: Record<string, string> = {
      google: '📧',
      microsoft: '📅',
      ics: '📄',
      system: '⚙️',
    }
    return icons[provider] || '❓'
  }

  function toggleExpand(id: string) {
    setExpandedLog(expandedLog === id ? null : id)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Calendar Sync Logs
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor and troubleshoot calendar synchronization
          </p>
        </div>
        <Button onClick={() => loadLogs()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => {
                  setFilters({ ...filters, status: value })
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ok">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="retry">Retry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Provider</label>
              <Select
                value={filters.provider}
                onValueChange={(value) => {
                  setFilters({ ...filters, provider: value })
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="microsoft">Microsoft</SelectItem>
                  <SelectItem value="ics">ICS</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Direction</label>
              <Select
                value={filters.direction}
                onValueChange={(value) => {
                  setFilters({ ...filters, direction: value })
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Directions</SelectItem>
                  <SelectItem value="import">Import</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters({ ...filters, search: e.target.value })
                    setPage(1)
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="pt-6">
          {loading && logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No sync logs found
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-2xl">
                        {expandedLog === log.id ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                      <div className="text-xl">{getProviderIcon(log.source)}</div>
                      <div className="flex-1">
                        <div className="font-medium">{log.summary}</div>
                        <div className="text-sm text-gray-600">
                          {log.source} • {log.direction} • {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {getStatusBadge(log.status)}
                    </div>
                  </div>

                  {expandedLog === log.id && (
                    <div className="p-4 border-t bg-gray-50">
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Log ID:</strong> {log.id}
                        </div>
                        <div>
                          <strong>User ID:</strong> {log.userId}
                        </div>
                        {log.projectId && (
                          <div>
                            <strong>Project ID:</strong> {log.projectId}
                          </div>
                        )}
                        {log.payload && (
                          <div>
                            <strong>Payload:</strong>
                            <pre className="mt-2 p-3 bg-white border rounded text-xs overflow-auto max-h-96">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-gray-600">
                Page {page} • {logs.length} logs
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

