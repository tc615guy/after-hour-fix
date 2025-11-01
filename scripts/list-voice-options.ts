#!/usr/bin/env tsx

/**
 * Common Cartesia Voice IDs for reference
 */

console.log('🎙️  Cartesia Voice Options\n')
console.log('=' .repeat(60))

console.log('\n📢 MALE VOICES:\n')

const maleVoices = [
  {
    id: 'a0e99841-438c-4a64-b679-ae501e7d6091',
    name: 'Helpful Man',
    description: 'Energetic, helpful, professional'
  },
  {
    id: '41534e16-2966-4c6b-9670-111411def906',
    name: 'Salesman',
    description: 'Smooth, persuasive, confident'
  },
  {
    id: '69267136-1bdc-412f-ad78-0caad210fb40',
    name: 'Newsman',
    description: 'Clear, authoritative, professional broadcaster'
  },
  {
    id: '700d1ee3-a641-4018-ba6e-899dcadc9e2b',
    name: 'Kentucky Man',
    description: 'Southern accent, warm, friendly'
  },
  {
    id: '87748186-23bb-4158-a1eb-332911b0b708',
    name: 'Classy British Man',
    description: 'British accent, sophisticated, professional'
  },
  {
    id: '638efaaa-4d0c-442e-b701-3fae16aad012',
    name: 'Wise Man',
    description: 'Deep, calm, reassuring'
  },
  {
    id: 'bd9120b6-7761-47a6-a446-77ca49132781',
    name: 'Young Man',
    description: 'Casual, energetic, friendly'
  }
]

maleVoices.forEach((voice, idx) => {
  console.log(`${idx + 1}. ${voice.name}`)
  console.log(`   ID: ${voice.id}`)
  console.log(`   Style: ${voice.description}`)
  console.log('')
})

console.log('=' .repeat(60))
console.log('\n💡 To switch voices, pick a voice ID from above.')
console.log('   Current voice: a0e99841-438c-4a64-b679-ae501e7d6091 (Helpful Man)')
