'use client'

import { useState, useEffect, ChangeEvent, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PhoneInput from '@/components/PhoneInput'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Phone, AlertCircle, CheckCircle2, Download, Upload, MapPin } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import AddressAutocomplete from '@/components/AddressAutocomplete'

interface Technician {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  isActive: boolean
  isOnCall: boolean
  emergencyOnly: boolean
  priority: number
}

interface OnCallManagerProps {
  projectId: string
}

export default function OnCallManager({ projectId }: OnCallManagerProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [newTech, setNewTech] = useState({ name: '', phone: '', email: '', address: '' })
  const [showAddForm, setShowAddForm] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectedTechs, setSelectedTechs] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadTechnicians()
  }, [projectId])

  const loadTechnicians = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/technicians`)
      if (res.ok) {
        const data = await res.json()
        setTechnicians(data.technicians || [])
      }
    } catch (error) {
      console.error('Failed to load technicians:', error)
    } finally {
      setLoading(false)
    }
  }

  const addTechnician = async () => {
    if (!newTech.name || !newTech.phone) {
      alert('Please enter name and phone number')
      return
    }

    try {
      setSaving(true)
      const res = await fetch(`/api/projects/${projectId}/technicians`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTech),
      })

      if (!res.ok) throw new Error('Failed to add technician')

      const { technician } = await res.json()
      setTechnicians([...technicians, technician])
      setNewTech({ name: '', phone: '', email: '', address: '' })
      setShowAddForm(false)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  const updateTechnician = async (id: string, updates: Partial<Technician>) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/technicians/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) throw new Error('Failed to update technician')

      setTechnicians(technicians.map((t) => (t.id === id ? { ...t, ...updates } : t)))
    } catch (error: any) {
      alert(error.message)
    }
  }

  const deleteTechnician = async (id: string) => {
    if (!window.confirm('Delete this technician?')) return

    try {
      const res = await fetch(`/api/projects/${projectId}/technicians/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete technician')

      setTechnicians(technicians.filter((t) => t.id !== id))
      setSelectedTechs(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (error: any) {
      alert(error.message)
    }
  }

  const deleteSelectedTechnicians = async () => {
    if (selectedTechs.size === 0) return
    
    const count = selectedTechs.size
    if (!window.confirm(`Delete ${count} selected technician${count > 1 ? 's' : ''}? This cannot be undone.`)) return

    try {
      setDeleting(true)
      const ids = Array.from(selectedTechs)
      
      // Delete each technician
      const results = await Promise.allSettled(
        ids.map(id =>
          fetch(`/api/projects/${projectId}/technicians/${id}`, {
            method: 'DELETE',
          })
        )
      )

      // Check for failures
      const failures = results.filter(r => r.status === 'rejected').length
      if (failures > 0) {
        alert(`${failures} technician(s) failed to delete. Please try again.`)
      }

      // Reload technicians to get fresh list
      await loadTechnicians()
      setSelectedTechs(new Set())
    } catch (error: any) {
      alert(error.message)
    } finally {
      setDeleting(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedTechs.size === technicians.length) {
      // Deselect all
      setSelectedTechs(new Set())
    } else {
      // Select all
      setSelectedTechs(new Set(technicians.map(t => t.id)))
    }
  }

  const toggleSelectTech = (id: string) => {
    setSelectedTechs(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = []
    let row: string[] = []
    let field = ''
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            field += '"'
            i++
          } else {
            inQuotes = false
          }
        } else {
          field += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === ',') {
          row.push(field)
          field = ''
        } else if (char === '\n') {
          row.push(field)
          rows.push(row)
          row = []
          field = ''
        } else if (char === '\r') {
          // Ignore carriage returns
        } else {
          field += char
        }
      }
    }

    if (field.length > 0 || row.length > 0) {
      row.push(field)
      rows.push(row)
    }

    return rows
  }

  const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

  const parseBoolean = (value?: string | null) => {
    if (!value) return undefined
    const normalized = value.trim().toLowerCase()
    if (['yes', 'y', 'true', '1', 'on', 'active'].includes(normalized)) return true
    if (['no', 'n', 'false', '0', 'off', 'inactive'].includes(normalized)) return false
    return undefined
  }

  const handleImportCSV = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      const text = await file.text()
      const table = parseCSV(text)

      if (table.length === 0) {
        throw new Error('The CSV file is empty.')
      }

      const header = table[0]
      const normalizedHeader = header.map((h) => normalizeKey(h))

      const findIndex = (...candidates: string[]) => {
        for (const candidate of candidates) {
          const idx = normalizedHeader.indexOf(normalizeKey(candidate))
          if (idx >= 0) return idx
        }
        return -1
      }

      const idxName = findIndex('name', 'technician', 'tech', 'fullname', 'employee', 'technicianname')
      const idxPhone = findIndex('phone', 'phonenumber', 'mobile', 'cell', 'contactnumber')
      const idxEmail = findIndex('email', 'emailaddress', 'mail')
      const idxAddress = findIndex('address', 'fulladdress', 'location')
      const idxStreet = findIndex('street', 'address1', 'addressline1')
      const idxCity = findIndex('city', 'town')
      const idxState = findIndex('state', 'region', 'province')
      const idxZip = findIndex('zip', 'zipcode', 'postal', 'postalcode')
      const idxOnCall = findIndex('oncall', 'isoncall', 'oncallnow')
      const idxActive = findIndex('active', 'isactive', 'status')
      const idxEmergency = findIndex('emergencyonly', 'emergency', 'emergency_only')
      const idxPriority = findIndex('priority', 'rank', 'order')

      if (idxName < 0 || idxPhone < 0) {
        throw new Error('CSV must include at least name and phone columns.')
      }

      const rows: Array<Record<string, any>> = []

      for (let i = 1; i < table.length; i++) {
        const row = table[i]
        if (!row || row.length === 0) continue

        const name = (row[idxName] || '').trim()
        const phone = (row[idxPhone] || '').trim()
        if (!name || !phone) continue

        const payload: Record<string, any> = { name, phone }

        const email = idxEmail >= 0 ? (row[idxEmail] || '').trim() : ''
        if (email) payload.email = email

        let address = idxAddress >= 0 ? (row[idxAddress] || '').trim() : ''
        if (!address) {
          const parts = [idxStreet >= 0 ? row[idxStreet] : '', idxCity >= 0 ? row[idxCity] : '', idxState >= 0 ? row[idxState] : '', idxZip >= 0 ? row[idxZip] : '']
            .map((part) => (part || '').trim())
            .filter(Boolean)
          address = parts.join(', ')
        }
        if (address) payload.address = address

        const isOnCall = idxOnCall >= 0 ? parseBoolean(row[idxOnCall]) : undefined
        if (typeof isOnCall === 'boolean') payload.isOnCall = isOnCall

        const isActive = idxActive >= 0 ? parseBoolean(row[idxActive]) : undefined
        if (typeof isActive === 'boolean') payload.isActive = isActive

        const emergencyOnly = idxEmergency >= 0 ? parseBoolean(row[idxEmergency]) : undefined
        if (typeof emergencyOnly === 'boolean') payload.emergencyOnly = emergencyOnly

        if (idxPriority >= 0) {
          const rawPriority = (row[idxPriority] || '').trim()
          if (rawPriority) {
            const parsed = parseInt(rawPriority, 10)
            if (!Number.isNaN(parsed)) {
              payload.priority = Math.min(100, Math.max(0, parsed))
            }
          }
        }

        rows.push(payload)
      }

      if (rows.length === 0) {
        throw new Error('No technician rows found in CSV. Make sure name and phone columns are populated.')
      }

      const response = await fetch(`/api/projects/${projectId}/technicians/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || 'Import failed')
      }

      const result = await response.json()
      await loadTechnicians()
      alert(`Import complete: ${result.created || 0} added, ${result.updated || 0} updated, ${result.skipped || 0} skipped.`)
    } catch (error: any) {
      console.error('Technician import failed:', error)
      alert(error.message || 'Failed to import technicians.')
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  const exportTechnicians = () => {
    if (technicians.length === 0) {
      alert('No technicians to export')
      return
    }

    // Create CSV content
    const headers = ['Name', 'Phone', 'Email', 'Address', 'Status', 'On-Call', 'Priority']
    const rows = technicians.map(tech => [
      tech.name,
      tech.phone,
      tech.email || '',
      tech.address || '',
      tech.isActive ? 'Active' : 'Inactive',
      tech.isOnCall ? 'Yes' : 'No',
      tech.priority.toString()
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `technicians_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const onCallTechs = technicians.filter((t) => t.isOnCall && t.isActive)

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Emergency Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {onCallTechs.length > 0 ? (
              <>
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <div className="font-semibold text-green-800">Emergency Coverage Active</div>
                  <div className="text-sm text-gray-600">
                    {onCallTechs.length} technician{onCallTechs.length > 1 ? 's' : ''} available now:{' '}
                    {onCallTechs.map((t) => t.name).join(', ')}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <div>
                  <div className="font-semibold text-gray-600">No Emergency Coverage</div>
                  <div className="text-sm text-gray-500">
                    Set a technician to "On-Call" for emergency routing
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Emergency Routing
          </CardTitle>
          <CardDescription>
            How the platform handles urgent vs routine calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-2">🚨 TRUE EMERGENCY</h4>
              <p className="text-sm text-red-700 mb-3">
                Burst pipe, no heat in winter, sparking electrical, gas leak
              </p>
              <div className="text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">1.</span>
                  <span>AI detects urgency from customer's description</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">2.</span>
                  <span>Checks if on-call tech available RIGHT NOW</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">3.</span>
                  <span>
                    <strong>If available:</strong> "I can get someone there in 30 minutes!" → Transfers to on-call tech
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">4.</span>
                  <span>
                    <strong>If not available:</strong> "I'll schedule you first thing tomorrow morning"
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">📅 ROUTINE / NON-URGENT</h4>
              <p className="text-sm text-blue-700 mb-3">
                Slow drain, AC not cooling well, outlet installation, regular maintenance
              </p>
              <div className="text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">1.</span>
                  <span>AI books appointment for next day</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">2.</span>
                  <span>No emergency routing needed</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">3.</span>
                  <span>Customer gets confirmation, tech arrives as scheduled</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technicians List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Technicians
              </CardTitle>
              <CardDescription>Manage your team and on-call status</CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedTechs.size > 0 && (
                <Button
                  onClick={deleteSelectedTechnicians}
                  size="sm"
                  variant="destructive"
                  disabled={deleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleting ? 'Deleting...' : `Delete Selected (${selectedTechs.size})`}
                </Button>
              )}
              <Button
                onClick={exportTechnicians}
                size="sm"
                variant="outline"
                disabled={technicians.length === 0}
              >
                <Upload className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={() => {
                  if (importing) return
                  fileInputRef.current?.click()
                }}
                size="sm"
                variant="outline"
                disabled={importing}
              >
                <Download className="w-4 h-4 mr-2" />
                {importing ? 'Importing...' : 'Import CSV'}
              </Button>
              <input
                ref={fileInputRef}
                id="tech-csv-import"
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
              <Button onClick={() => setShowAddForm(!showAddForm)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Technician
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Form */}
          {showAddForm && (
            <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg space-y-3">
              <h4 className="font-semibold">Add New Technician</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="newName">Name *</Label>
                  <Input
                    id="newName"
                    value={newTech.name}
                    onChange={(e) => setNewTech({ ...newTech, name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="newPhone">Phone *</Label>
                  <PhoneInput id="newPhone" value={newTech.phone} onChange={(v) => setNewTech({ ...newTech, phone: v })} />
                </div>
                <div>
                  <Label htmlFor="newEmail">Email (optional)</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newTech.email}
                    onChange={(e) => setNewTech({ ...newTech, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <AddressAutocomplete
                  value={newTech.address}
                  onChange={(address) => setNewTech({ ...newTech, address })}
                  label="Home/Base Address"
                  placeholder="123 Main St, City, State"
                  className="md:col-span-2 lg:col-span-3"
                />
              </div>
              <p className="text-xs text-gray-600 -mt-2">
                The emergency dispatcher uses this address to route the closest on-call technician.
              </p>
              <div className="flex gap-2">
                <Button onClick={addTechnician} disabled={saving}>
                  {saving ? 'Adding...' : 'Add Technician'}
                </Button>
                <Button onClick={() => setShowAddForm(false)} variant="ghost">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Technicians List */}
          {technicians.length === 0 ? (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
              No technicians added yet. Click "Add Technician" to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Select All Header */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 border rounded-lg">
                <Checkbox
                  id="select-all"
                  checked={technicians.length > 0 && selectedTechs.size === technicians.length}
                  onCheckedChange={toggleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Select All ({technicians.length})
                </Label>
                {selectedTechs.size > 0 && (
                  <span className="text-xs text-gray-500 ml-2">
                    {selectedTechs.size} selected
                  </span>
                )}
              </div>

              {technicians.map((tech) => (
                <div
                  key={tech.id}
                  className={`p-4 border rounded-lg ${
                    tech.isOnCall ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  } ${selectedTechs.has(tech.id) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-1">
                      <Checkbox
                        id={`select-${tech.id}`}
                        checked={selectedTechs.has(tech.id)}
                        onCheckedChange={() => toggleSelectTech(tech.id)}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{tech.name}</h4>
                        {tech.isOnCall && (
                          <Badge className="bg-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            On-Call NOW
                          </Badge>
                        )}
                        {!tech.isActive && <Badge variant="secondary">Inactive</Badge>}
                        {tech.emergencyOnly && (
                          <Badge variant="outline">Emergency Only</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          {tech.phone}
                        </div>
                        {tech.email && <div className="ml-5">{tech.email}</div>}
                        {tech.address && (
                          <div className="flex items-center gap-2 ml-0">
                            <MapPin className="w-3 h-3 text-gray-500" />
                            <span>{tech.address}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={tech.isActive}
                            onCheckedChange={(checked) =>
                              updateTechnician(tech.id, { isActive: checked })
                            }
                            id={`active-${tech.id}`}
                          />
                          <Label htmlFor={`active-${tech.id}`} className="text-sm cursor-pointer">
                            Active
                          </Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={tech.isOnCall}
                            onCheckedChange={(checked) =>
                              updateTechnician(tech.id, { isOnCall: checked })
                            }
                            id={`oncall-${tech.id}`}
                            disabled={!tech.isActive}
                          />
                          <Label
                            htmlFor={`oncall-${tech.id}`}
                            className={`text-sm ${tech.isActive ? 'cursor-pointer' : 'opacity-50'}`}
                          >
                            <strong>On-Call Right Now</strong>
                          </Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={tech.emergencyOnly}
                            onCheckedChange={(checked) =>
                              updateTechnician(tech.id, { emergencyOnly: checked })
                            }
                            id={`emergency-${tech.id}`}
                            disabled={!tech.isActive}
                          />
                          <Label
                            htmlFor={`emergency-${tech.id}`}
                            className={`text-sm ${tech.isActive ? 'cursor-pointer' : 'opacity-50'}`}
                          >
                            Emergency Only
                          </Label>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTechnician(tech.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority Explanation */}
      {technicians.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">💡 Tip: Multiple On-Call Technicians</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              If multiple technicians are on-call, the system will route emergencies based on priority
              (set in advanced settings). The highest priority available technician gets the call first.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
