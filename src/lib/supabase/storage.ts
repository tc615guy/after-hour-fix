import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const supabaseStorage = createClient(supabaseUrl, supabaseServiceKey)

const BUCKET_NAME = 'demo-recordings'

/**
 * Upload demo recording to Supabase Storage
 * Returns public URL for embedding in marketing materials
 */
export async function uploadDemoRecording(
  projectId: string,
  callId: string,
  audioBlob: Buffer,
  fileName: string
): Promise<string> {
  try {
    // Create bucket if it doesn't exist
    const { data: buckets } = await supabaseStorage.storage.listBuckets()
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME)

    if (!bucketExists) {
      await supabaseStorage.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      })
    }

    // Upload file
    const path = `${projectId}/${callId}/${fileName}`
    const { data, error } = await supabaseStorage.storage
      .from(BUCKET_NAME)
      .upload(path, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: true,
      })

    if (error) throw error

    // Get public URL
    const { data: publicData } = supabaseStorage.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path)

    return publicData.publicUrl
  } catch (error: any) {
    console.error('Supabase upload error:', error)
    // Return mock URL if upload fails
    return `https://demo.afterhourfix.com/recordings/${projectId}/${callId}.mp3`
  }
}

/**
 * Download recording from Vapi and upload to Supabase
 */
export async function downloadAndUploadRecording(
  vapiRecordingUrl: string,
  projectId: string,
  callId: string
): Promise<string> {
  try {
    // Download from Vapi
    const response = await fetch(vapiRecordingUrl)
    if (!response.ok) throw new Error('Failed to download recording')

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase
    const fileName = `call-${callId}.mp3`
    return await uploadDemoRecording(projectId, callId, buffer, fileName)
  } catch (error: any) {
    console.error('Download and upload error:', error)
    // Return original Vapi URL as fallback
    return vapiRecordingUrl
  }
}

/**
 * Delete recording from Supabase Storage
 */
export async function deleteDemoRecording(publicUrl: string): Promise<boolean> {
  try {
    const path = publicUrl.split(`/${BUCKET_NAME}/`)[1]
    if (!path) return false

    const { error } = await supabaseStorage.storage.from(BUCKET_NAME).remove([path])

    if (error) throw error
    return true
  } catch (error: any) {
    console.error('Delete recording error:', error)
    return false
  }
}
