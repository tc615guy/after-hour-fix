'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface FAQ { q: string; a: string }
interface Snippet { title: string; content: string }

export default function KnowledgeManager({ projectId, plan = 'starter' }: { projectId: string; plan?: 'starter'|'pro' }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [snippets, setSnippets] = useState<Snippet[]>([])

  useEffect(() => { load() }, [projectId])

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/knowledge`)
      if (res.ok) {
        const data = await res.json()
        setFaqs(data.faqs || [])
        setSnippets(data.snippets || [])
      }
    } finally { setLoading(false) }
  }

  const addFaq = () => setFaqs([...faqs, { q: '', a: '' }])
  const updateFaq = (i: number, field: keyof FAQ, value: string) => setFaqs(faqs.map((f, idx) => idx === i ? { ...f, [field]: value } : f))
  const removeFaq = (i: number) => setFaqs(faqs.filter((_, idx) => idx !== i))

  const addSnippet = () => setSnippets([...snippets, { title: '', content: '' }])
  const updateSnippet = (i: number, field: keyof Snippet, value: string) => setSnippets(snippets.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  const removeSnippet = (i: number) => setSnippets(snippets.filter((_, idx) => idx !== i))

  const save = async () => {
    try {
      setSaving(true)
      const body: any = { faqs }
      if (plan === 'pro') body.snippets = snippets
      const res = await fetch(`/api/projects/${projectId}/knowledge`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error('Failed to save')
      alert('Saved knowledge')
    } catch (e: any) {
      alert(e.message)
    } finally { setSaving(false) }
  }

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading knowledge…</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base</CardTitle>
          <CardDescription>
            {plan === 'pro' ? 'Upload snippets and FAQs the assistant can learn from.' : 'Add FAQs the assistant can use in responses.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-sm">Frequently Asked Questions</Label>
            <div className="space-y-3 mt-2">
              {faqs.length === 0 && <div className="text-xs text-gray-500">No FAQs yet.</div>}
              {faqs.map((f, i) => (
                <div key={i} className="border rounded p-3 space-y-2">
                  <Input value={f.q} onChange={(e) => updateFaq(i, 'q', e.target.value)} placeholder="Question" />
                  <Textarea value={f.a} onChange={(e) => updateFaq(i, 'a', e.target.value)} placeholder="Answer" rows={3} />
                  <div className="text-right"><Button variant="ghost" className="text-red-600" onClick={() => removeFaq(i)}>Remove</Button></div>
                </div>
              ))}
              <Button variant="outline" onClick={addFaq}>Add FAQ</Button>
            </div>
          </div>

          {plan === 'pro' && (
            <div>
              <Label className="text-sm">Knowledge Snippets (Pro)</Label>
              <div className="space-y-3 mt-2">
                {snippets.length === 0 && <div className="text-xs text-gray-500">No snippets yet.</div>}
                {snippets.map((s, i) => (
                  <div key={i} className="border rounded p-3 space-y-2">
                    <Input value={s.title} onChange={(e) => updateSnippet(i, 'title', e.target.value)} placeholder="Title" />
                    <Textarea value={s.content} onChange={(e) => updateSnippet(i, 'content', e.target.value)} placeholder="Paste SOPs, policies, troubleshooting steps…" rows={4} />
                    <div className="text-right"><Button variant="ghost" className="text-red-600" onClick={() => removeSnippet(i)}>Remove</Button></div>
                  </div>
                ))}
                <Button variant="outline" onClick={addSnippet}>Add Snippet</Button>
                <p className="text-xs text-gray-500">Future: file uploads (PDF/CSV) and retrieval during calls.</p>
              </div>
            </div>
          )}

          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Knowledge'}</Button>
        </CardContent>
      </Card>
    </div>
  )
}

