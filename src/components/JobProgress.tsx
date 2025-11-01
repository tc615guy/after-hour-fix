"use client"
import { useEffect, useState } from 'react'

type JobState = {
  id: string
  projectId: string
  type: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | string
  total?: number | null
  processed: number
  error?: string | null
  result?: any
  createdAt: string
  updatedAt: string
}

export function JobProgress({ jobId, pollMs = 1000 }: { jobId: string; pollMs?: number }) {
  const [job, setJob] = useState<JobState | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let timer: any
    let aborted = false
    async function tick() {
      try {
        const res = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!aborted) setJob(data)
        if (data.status === 'completed' || data.status === 'failed') return
        timer = setTimeout(tick, pollMs)
      } catch (e: any) {
        if (!aborted) setError(e?.message || 'Failed to poll job')
        timer = setTimeout(tick, pollMs * 2)
      }
    }
    tick()
    return () => { aborted = true; if (timer) clearTimeout(timer) }
  }, [jobId, pollMs])

  const pct = (() => {
    if (!job) return 0
    const total = Number(job.total || 0)
    if (total <= 0) return job.status === 'completed' ? 100 : 0
    return Math.max(0, Math.min(100, Math.round((Number(job.processed || 0) / total) * 100)))
  })()

  return (
    <div className="border rounded p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Job {jobId}</div>
        <div className="text-sm text-gray-600">{job?.type || '...'}</div>
      </div>
      <div className="h-2 bg-gray-200 rounded">
        <div className="h-2 bg-blue-600 rounded" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 text-sm text-gray-700">
        Status: <strong>{job?.status || 'loading...'}</strong>
        {typeof job?.processed === 'number' && job?.total ? (
          <span> · {job.processed}/{job.total}</span>
        ) : null}
      </div>
      {error ? <div className="text-sm text-red-600 mt-2">{error}</div> : null}
      {job?.error ? <div className="text-sm text-red-600 mt-2">{job.error}</div> : null}
    </div>
  )
}

