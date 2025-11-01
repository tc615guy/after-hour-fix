import { prisma } from '@/lib/db'
import { getServerSession } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function AdminJobsPage() {
  const session = await getServerSession()
  if (!session) redirect('/auth/login')
  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } })
  if (!user || user.role !== 'admin') redirect('/auth/login')

  const jobs = await prisma.importJob.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Recent Jobs</h1>
        <Link className="text-blue-600" href="/admin">Back to Admin</Link>
      </div>
      <div className="overflow-x-auto bg-white border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2">Job ID</th>
              <th className="p-2">Type</th>
              <th className="p-2">Project</th>
              <th className="p-2">Status</th>
              <th className="p-2">Progress</th>
              <th className="p-2">Created</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => {
              const pct = j.total && j.total > 0 ? Math.round(((j.processed || 0) / j.total) * 100) : (j.status === 'completed' ? 100 : 0)
              return (
                <tr key={j.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{j.id}</td>
                  <td className="p-2">{j.type}</td>
                  <td className="p-2">{j.projectId}</td>
                  <td className="p-2 capitalize">{j.status}</td>
                  <td className="p-2">{j.processed}/{j.total ?? 0} ({pct}%)</td>
                  <td className="p-2">{j.createdAt.toISOString()}</td>
                  <td className="p-2 text-right"><Link className="text-blue-600" href={`/jobs/${j.id}`}>View</Link></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

