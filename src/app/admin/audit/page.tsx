import { prisma } from '@/lib/db'
import { getServerSession } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function AdminAuditPage() {
  const session = await getServerSession()
  if (!session) redirect('/auth/login')
  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } })
  if (!user || user.role !== 'admin') redirect('/auth/login')

  const events = await prisma.eventLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Audit Logs</h1>
        <Link className="text-blue-600" href="/admin">Back to Admin</Link>
      </div>
      <div className="overflow-x-auto bg-white border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2">Time</th>
              <th className="p-2">Project</th>
              <th className="p-2">Type</th>
              <th className="p-2">Payload</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-2 whitespace-nowrap">{e.createdAt.toISOString()}</td>
                <td className="p-2">{e.projectId || '-'}</td>
                <td className="p-2">{e.type}</td>
                <td className="p-2 font-mono text-xs max-w-[640px] truncate" title={JSON.stringify(e.payload)}>
                  {JSON.stringify(e.payload).slice(0, 140)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

