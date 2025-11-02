'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, DollarSign, Send, Sparkles, CheckSquare, XSquare, Upload, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PricingItem {
  id: string
  service: string
  description?: string
  basePrice: number
  unit?: string // 'flat' | 'hourly' | 'per_unit'
  durationMinutes?: number
  crewSize?: number
  selected?: boolean
}

interface PricingSheetEditorProps {
  projectId: string
  trade?: string // 'plumbing' | 'hvac' | 'electrical'
}

// AI-suggested pricing templates
const PRICING_TEMPLATES = {
  plumbing: [
    { service: 'Drain Cleaning', description: 'Clear clogged drains, sinks, or toilets', basePrice: 150, unit: 'flat', durationMinutes: 60, crewSize: 1 },
    { service: 'Water Heater Repair', description: 'Diagnose and repair water heater issues', basePrice: 200, unit: 'flat', durationMinutes: 90, crewSize: 1 },
    { service: 'Water Heater Installation', description: 'Full water heater replacement', basePrice: 1200, unit: 'flat', durationMinutes: 240, crewSize: 2 },
    { service: 'Leak Repair', description: 'Fix leaking pipes, faucets, or fixtures', basePrice: 175, unit: 'flat', durationMinutes: 60, crewSize: 1 },
    { service: 'Pipe Replacement', description: 'Replace damaged or old pipes', basePrice: 300, unit: 'flat', durationMinutes: 180, crewSize: 2 },
    { service: 'Toilet Repair', description: 'Fix running, leaking, or clogged toilets', basePrice: 125, unit: 'flat', durationMinutes: 60, crewSize: 1 },
    { service: 'Toilet Installation', description: 'Install new toilet', basePrice: 250, unit: 'flat', durationMinutes: 120, crewSize: 1 },
    { service: 'Faucet Installation', description: 'Install kitchen or bathroom faucet', basePrice: 150, unit: 'flat', durationMinutes: 90, crewSize: 1 },
    { service: 'Garbage Disposal Repair', description: 'Repair or replace garbage disposal', basePrice: 175, unit: 'flat', durationMinutes: 90, crewSize: 1 },
    { service: 'Sump Pump Service', description: 'Install or repair sump pump', basePrice: 300, unit: 'flat', durationMinutes: 120, crewSize: 1 },
    { service: 'Water Line Repair', description: 'Repair main water line', basePrice: 400, unit: 'flat', durationMinutes: 240, crewSize: 2 },
    { service: 'Sewer Line Service', description: 'Camera inspection and cleaning', basePrice: 350, unit: 'flat', durationMinutes: 120, crewSize: 2 },
  ],
  hvac: [
    { service: 'AC Repair', description: 'Diagnose and repair air conditioning', basePrice: 200, unit: 'flat', durationMinutes: 90, crewSize: 1 },
    { service: 'AC Installation', description: 'Install new AC unit', basePrice: 3500, unit: 'flat', durationMinutes: 480, crewSize: 2 },
    { service: 'Furnace Repair', description: 'Diagnose and repair heating system', basePrice: 200, unit: 'flat', durationMinutes: 90, crewSize: 1 },
    { service: 'Furnace Installation', description: 'Install new furnace', basePrice: 3000, unit: 'flat', durationMinutes: 420, crewSize: 2 },
    { service: 'AC Maintenance', description: 'Seasonal AC tune-up and cleaning', basePrice: 125, unit: 'flat', durationMinutes: 60, crewSize: 1 },
    { service: 'Furnace Maintenance', description: 'Seasonal furnace tune-up', basePrice: 125, unit: 'flat', durationMinutes: 60, crewSize: 1 },
    { service: 'Thermostat Installation', description: 'Install programmable thermostat', basePrice: 150, unit: 'flat', durationMinutes: 60, crewSize: 1 },
    { service: 'Duct Cleaning', description: 'Clean air ducts and vents', basePrice: 300, unit: 'flat', durationMinutes: 180, crewSize: 2 },
    { service: 'Refrigerant Recharge', description: 'Add refrigerant to AC system', basePrice: 250, unit: 'flat', durationMinutes: 60, crewSize: 1 },
    { service: 'Heat Pump Service', description: 'Repair or maintain heat pump', basePrice: 225, unit: 'flat', durationMinutes: 120, crewSize: 1 },
    { service: 'Air Filter Replacement', description: 'Replace HVAC air filters', basePrice: 75, unit: 'flat', durationMinutes: 30, crewSize: 1 },
    { service: 'Emergency Service', description: 'No heat/AC emergency response', basePrice: 150, unit: 'flat', durationMinutes: 60, crewSize: 1 },
  ],
  electrical: [
    { service: 'Outlet Installation', description: 'Install new electrical outlet', basePrice: 100, unit: 'flat', durationMinutes: 60, crewSize: 1 },
    { service: 'Switch Installation', description: 'Install light switch', basePrice: 85, unit: 'flat', durationMinutes: 45, crewSize: 1 },
    { service: 'Light Fixture Installation', description: 'Install ceiling or wall light', basePrice: 125, unit: 'flat', durationMinutes: 60, crewSize: 1 },
    { service: 'Ceiling Fan Installation', description: 'Install ceiling fan with light', basePrice: 175, unit: 'flat', durationMinutes: 90, crewSize: 2 },
    { service: 'Panel Upgrade', description: 'Upgrade electrical panel', basePrice: 1500, unit: 'flat', durationMinutes: 480, crewSize: 2 },
    { service: 'Circuit Breaker Replacement', description: 'Replace faulty breaker', basePrice: 150, unit: 'flat', durationMinutes: 60, crewSize: 1 },
    { service: 'GFCI Outlet Installation', description: 'Install ground fault outlet', basePrice: 125, unit: 'flat', durationMinutes: 60, crewSize: 1 },
    { service: 'Smoke Detector Installation', description: 'Install hardwired smoke detector', basePrice: 100, unit: 'flat', durationMinutes: 45, crewSize: 1 },
    { service: 'Electrical Troubleshooting', description: 'Diagnose electrical issues', basePrice: 125, unit: 'flat', durationMinutes: 90, crewSize: 1 },
    { service: 'Whole House Surge Protection', description: 'Install surge protector', basePrice: 400, unit: 'flat', durationMinutes: 120, crewSize: 1 },
    { service: 'EV Charger Installation', description: 'Install electric vehicle charger', basePrice: 800, unit: 'flat', durationMinutes: 240, crewSize: 2 },
    { service: 'Generator Installation', description: 'Install backup generator', basePrice: 3000, unit: 'flat', durationMinutes: 480, crewSize: 3 },
  ],
}

export default function PricingSheetEditor({ projectId, trade = 'plumbing' }: PricingSheetEditorProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<PricingItem[]>([])
  const [emergencyMultiplier, setEmergencyMultiplier] = useState(1.5)
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [tripFee, setTripFee] = useState(0)
  const [enableCostSheet, setEnableCostSheet] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadPricing()
  }, [projectId])

  const loadPricing = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) {
        const { project } = await res.json()
        if (project.pricingSheet) {
          const loadedItems = (project.pricingSheet.items || []).map((item: any) => ({
            ...item,
            selected: false,
          }))
          setItems(loadedItems)
          setAdditionalNotes(project.pricingSheet.notes || '')
          setTripFee(project.pricingSheet.tripFee || 0)
          setEnableCostSheet(project.pricingSheet.enabled !== false)
        }
        if (project.emergencyMultiplier) {
          setEmergencyMultiplier(project.emergencyMultiplier)
        }
      }
    } catch (error) {
      console.error('Failed to load pricing:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTemplate = () => {
    const template = PRICING_TEMPLATES[trade as keyof typeof PRICING_TEMPLATES] || PRICING_TEMPLATES.plumbing
    const newItems = template.map((item) => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      selected: false,
    }))
    setItems(newItems)
  }

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substr(2, 9),
        service: '',
        description: '',
        basePrice: 0,
        unit: 'flat',
        durationMinutes: 60,
        crewSize: 1,
        selected: false,
      },
    ])
  }

  const updateItem = (id: string, field: keyof PricingItem, value: any) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const toggleSelect = (id: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)))
  }

  const selectAll = () => {
    setItems(items.map((item) => ({ ...item, selected: true })))
  }

  const deselectAll = () => {
    setItems(items.map((item) => ({ ...item, selected: false })))
  }

  const deleteSelected = () => {
    if (window.confirm(`Delete ${items.filter((i) => i.selected).length} selected items?`)) {
      setItems(items.filter((item) => !item.selected))
    }
  }

  const savePricing = async () => {
    try {
      setSaving(true)
      const res = await fetch(`/api/projects/${projectId}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricingSheet: {
            items: items.map(({ selected, ...item }) => item), // Remove 'selected' field
            notes: additionalNotes,
            tripFee,
            enabled: enableCostSheet,
            lastUpdated: new Date().toISOString(),
          },
          emergencyMultiplier,
        }),
      })

      if (!res.ok) throw new Error('Failed to save pricing')

      alert('Pricing sheet saved successfully!')
    } catch (error: any) {
      alert(error.message)
    } finally {
      setSaving(false)
    }
  }

  const generateTextVersion = () => {
    let text = '📋 PRICING & SERVICES\n\n'

    if (tripFee > 0) {
      text += `🚗 Trip Fee: $${tripFee.toFixed(2)}\n`
      text += `(Applied to all service calls)\n\n`
    }

    items.forEach((item) => {
      text += `${item.service}\n`
      if (item.description) text += `  ${item.description}\n`
      text += `  $${item.basePrice.toFixed(2)}`
      if (item.unit === 'hourly') text += ' /hour'
      if (item.unit === 'per_unit') text += ' each'
      const dur = item.durationMinutes ? ` • Est. duration: ${item.durationMinutes} min` : ''
      const crew = item.crewSize ? ` • Crew: ${item.crewSize}` : ''
      if (dur || crew) text += ` (${[dur, crew].filter(Boolean).join(' ')})`
      text += '\n\n'
    })

    if (emergencyMultiplier > 1) {
      text += `⚠️ After-hours/Emergency: ${emergencyMultiplier}x standard rates\n\n`
    }

    if (additionalNotes) {
      text += `📌 ${additionalNotes}\n`
    }

    return text
  }

  const testSMS = () => {
    const text = generateTextVersion()
    console.log('SMS Preview:', text)
    alert('Check console for SMS preview')
  }

  const downloadTemplate = () => {
    window.location.href = `/api/projects/${projectId}/pricing/template?trade=${trade}`
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/projects/${projectId}/pricing/import`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to upload CSV')
      }

      const data = await res.json()
      alert(`Successfully imported ${data.imported} pricing items!${data.errors ? `\n\nWarnings:\n${data.errors.join('\n')}` : ''}`)

      // Reload pricing data
      await loadPricing()

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      alert(`Error uploading CSV: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const selectedCount = items.filter((i) => i.selected).length
  const [pushing, setPushing] = useState(false)

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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Pricing & Cost Sheet
              </CardTitle>
              <CardDescription>
                Set your pricing that AI can share with customers
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={enableCostSheet}
                  onCheckedChange={setEnableCostSheet}
                  id="enable-costsheet"
                />
                <Label htmlFor="enable-costsheet" className="cursor-pointer">
                  {enableCostSheet ? (
                    <Badge variant="default" className="bg-green-600">Cost Sheet Enabled</Badge>
                  ) : (
                    <Badge variant="secondary">Cost Sheet Disabled</Badge>
                  )}
                </Label>
              </div>
            </div>
          </div>

          {!enableCostSheet && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Cost Sheet Disabled:</strong> AI will tell customers "Pricing depends on parts and labor. The technician will provide an exact quote when they arrive."
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trip Fee */}
          <div className="border-b pb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-base font-semibold">Trip Fee (Service Call Fee)</Label>
                <p className="text-sm text-gray-500">Charged for coming out, then parts & labor quoted on-site</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-48">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <Input
                  type="number"
                  value={tripFee}
                  onChange={(e) => setTripFee(parseFloat(e.target.value) || 0)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
              <span className="text-sm text-gray-600">
                AI tells customer: "There's a ${tripFee} trip fee, then pricing depends on parts and labor needed"
              </span>
            </div>
          </div>

          {/* Service Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">Services & Pricing (Optional)</Label>
              <div className="flex gap-2">
                <Button onClick={downloadTemplate} size="sm" variant="outline" title="Download CSV template">
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
                <Button onClick={triggerFileUpload} size="sm" variant="outline" disabled={uploading} title="Upload pricing CSV">
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Import CSV'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {items.length === 0 && (
                  <Button onClick={loadTemplate} size="sm" variant="outline">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Load {trade} Template
                  </Button>
                )}
                <Button onClick={addItem} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </div>
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Import from CSV:</strong> Download the template to see the format. Your CSV must have columns: <code className="bg-blue-100 px-1 rounded">service</code>, <code className="bg-blue-100 px-1 rounded">description</code>, <code className="bg-blue-100 px-1 rounded">basePrice</code>, and <code className="bg-blue-100 px-1 rounded">unit</code> (flat, hourly, or per_unit).
              </p>
            </div>

            {items.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <Button onClick={selectAll} size="sm" variant="ghost">
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Select All
                </Button>
                <Button onClick={deselectAll} size="sm" variant="ghost">
                  <XSquare className="w-4 h-4 mr-2" />
                  Deselect All
                </Button>
                {selectedCount > 0 && (
                  <Button onClick={deleteSelected} size="sm" variant="ghost" className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedCount})
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-4">
              {items.length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                  <p className="mb-2">No services added yet.</p>
                  <p className="text-sm">Click "Load Template" to start with common {trade} services, or "Add Service" to create your own.</p>
                </div>
              )}

              {items.map((item) => (
                <div key={item.id} className={`border rounded-lg p-4 space-y-3 ${item.selected ? 'border-blue-500 bg-blue-50' : ''}`}>
                  <div className="flex gap-3">
                    <div className="pt-2">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`service-${item.id}`} className="text-sm">
                        Service Name *
                      </Label>
                      <Input
                        id={`service-${item.id}`}
                        value={item.service}
                        onChange={(e) => updateItem(item.id, 'service', e.target.value)}
                        placeholder="e.g., Drain Cleaning, AC Repair"
                      />
                    </div>
                    <div className="w-32">
                      <Label htmlFor={`price-${item.id}`} className="text-sm">
                        Price *
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                        <Input
                          id={`price-${item.id}`}
                          type="number"
                          value={item.basePrice}
                          onChange={(e) => updateItem(item.id, 'basePrice', parseFloat(e.target.value))}
                          className="pl-7"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="w-28">
                      <Label htmlFor={`unit-${item.id}`} className="text-sm">
                        Unit
                      </Label>
                      <select
                        id={`unit-${item.id}`}
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="flat">Flat Rate</option>
                        <option value="hourly">Per Hour</option>
                        <option value="per_unit">Per Unit</option>
                      </select>
                    </div>
                    <div className="pt-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`desc-${item.id}`} className="text-sm">
                      Description (optional)
                    </Label>
                    <Input
                      id={`desc-${item.id}`}
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Brief description of what's included"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Multiplier */}
          <div className="border-t pt-6">
            <Label htmlFor="emergency" className="text-base font-semibold">
              After-Hours / Emergency Pricing
            </Label>
            <p className="text-sm text-gray-500 mb-3">
              Multiply standard rates for after-hours or emergency calls
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <Input
                  id="emergency"
                  type="number"
                  step="0.1"
                  value={emergencyMultiplier}
                  onChange={(e) => setEmergencyMultiplier(parseFloat(e.target.value))}
                />
              </div>
              <span className="text-sm text-gray-600">
                = {(emergencyMultiplier * 100).toFixed(0)}% of standard rate
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Example: ${tripFee} trip fee becomes ${(tripFee * emergencyMultiplier).toFixed(2)} after hours
            </p>
          </div>

          {/* Additional Notes */}
          <div className="border-t pt-6">
            <Label htmlFor="notes" className="text-base font-semibold">
              Additional Notes
            </Label>
            <p className="text-sm text-gray-500 mb-3">
              Payment terms, warranties, disclaimers, etc.
            </p>
            <Textarea
              id="notes"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g., Payment due upon completion. All prices include parts & labor unless noted. 90-day warranty on all work."
              rows={4}
            />
          </div>

          {/* Preview */}
          {(tripFee > 0 || items.length > 0) && enableCostSheet && (
            <div className="border-t pt-6">
              <Label className="text-base font-semibold mb-3 block">SMS Preview</Label>
              <div className="bg-gray-50 border rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                {generateTextVersion()}
              </div>
            </div>
          )}

          {/* AI Messaging Strategy */}
          <div className="border-t pt-6">
            <Label className="text-base font-semibold mb-3 block">How Your AI Uses This Pricing</Label>
            <div className="space-y-3 text-sm">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-purple-900 mb-2">
                      Your AI automatically adapts responses based on this pricing sheet:
                    </p>
                    <ul className="space-y-2 text-gray-700">
                      {tripFee > 0 ? (
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>
                            Mentions your <strong>${tripFee.toFixed(2)} trip fee</strong> when discussing pricing
                          </span>
                        </li>
                      ) : (
                        <li className="flex items-start gap-2">
                          <span className="text-amber-600 mt-0.5">⚠</span>
                          <span>
                            <strong>No trip fee set</strong> - AI will not mention any trip fee
                          </span>
                        </li>
                      )}
                      {items.length > 0 ? (
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>
                            References your <strong>{items.length} services</strong> when answering specific service questions
                          </span>
                        </li>
                      ) : (
                        <li className="flex items-start gap-2">
                          <span className="text-amber-600 mt-0.5">⚠</span>
                          <span>
                            <strong>No services added</strong> - AI will give generic pricing responses
                          </span>
                        </li>
                      )}
                      {emergencyMultiplier > 1 && (
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>
                            Explains <strong>{emergencyMultiplier}x pricing</strong> for emergency/after-hours calls
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-semibold text-blue-900 mb-2">Example AI Response:</p>
                <div className="bg-white p-3 rounded border italic text-gray-700">
                  {tripFee > 0 ? (
                    <p>
                      "We charge a ${tripFee.toFixed(2)} trip fee to come out and assess the situation.
                      The final price depends on the parts and labor needed, but our technician will provide
                      a detailed quote before starting any work. {items.length > 0 && `For example, ${items[0].service.toLowerCase()}
                      typically runs around $${items[0].basePrice.toFixed(2)}.`} Would you like to schedule an appointment?"
                    </p>
                  ) : (
                    <p>
                      "Our pricing depends on the specific service and parts needed. Our technician will assess
                      the situation and provide you with a detailed quote before starting any work. There's no
                      charge for the estimate. {items.length > 0 && `For reference, ${items[0].service.toLowerCase()}
                      typically starts around $${items[0].basePrice.toFixed(2)}.`} Would you like to schedule
                      an appointment?"
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2 text-sm text-green-800">
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p>
                    <strong>Pro Tip:</strong> The more detailed your pricing sheet, the more specific and
                    confident your AI can be when answering pricing questions. See the "AI Pricing Response
                    Templates" section below for more advanced response scenarios.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={savePricing} disabled={saving}>
          {saving ? 'Saving...' : 'Save Pricing Sheet'}
        </Button>
        <Button
          onClick={async () => {
            try {
              setPushing(true)
              const res = await fetch('/api/agents/push-pricing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
              })
              const data = await res.json()
              if (!res.ok) throw new Error(data.error || 'Failed to push to assistant')
              alert('Pricing pushed to assistant successfully')
            } catch (e: any) {
              alert(`Error: ${e.message}`)
            } finally {
              setPushing(false)
            }
          }}
          disabled={pushing}
          variant="outline"
        >
          <Upload className="w-4 h-4 mr-2" />
          {pushing ? 'Pushing...' : 'Push to Assistant'}
        </Button>
        {items.length > 0 && enableCostSheet && (
          <Button onClick={testSMS} variant="outline">
            <Send className="w-4 h-4 mr-2" />
            Test SMS Preview
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => {
            window.open(`/api/projects/${projectId}/pricing/export`, '_blank')
          }}
        >
          Export Pricing CSV
        </Button>
      </div>
    </div>
  )
}
