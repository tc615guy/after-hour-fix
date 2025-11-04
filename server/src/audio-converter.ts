/**
 * Audio Converter for Twilio Media Streams ↔ OpenAI Realtime API
 * 
 * Handles:
 * - μ-law ↔ PCM16 conversion
 * - 8kHz ↔ 24kHz resampling
 */

// μ-law encoding/decoding lookup tables (ITU-T G.711 standard)
const MU_LAW_BIAS = 0x84
const MU_LAW_MAX = 0x1FFF
const MU_LAW_SEG_SHIFT = 4
const MU_LAW_SIGN_BIT = 0x80
const MU_LAW_QUANT_MASK = 0x0F
const MU_LAW_SEG_MASK = 0x70

/**
 * Convert linear PCM16 to μ-law (G.711)
 * Input: 16-bit signed PCM samples (little-endian)
 * Output: μ-law encoded bytes
 */
export function pcm16ToMulaw(pcm16: Buffer): Buffer {
  const result = Buffer.alloc(pcm16.length / 2)
  
  for (let i = 0; i < pcm16.length; i += 2) {
    // Read 16-bit signed PCM sample (little-endian)
    let sample = pcm16.readInt16LE(i)
    
    // Get sign bit
    const sign = (sample >> 8) & MU_LAW_SIGN_BIT
    
    // Make sample positive
    if (sample < 0) {
      sample = -sample
    }
    
    // Clamp to maximum
    if (sample > MU_LAW_MAX) {
      sample = MU_LAW_MAX
    }
    
    // Add bias
    sample += MU_LAW_BIAS
    
    // Find segment (0-7)
    let segment = 7
    let exp = sample >> 7
    let mask = 0x4000
    while ((exp & mask) === 0 && segment > 0) {
      segment--
      mask >>= 1
    }
    
    // Quantize
    const quantize = (sample >> (segment + 3)) & MU_LAW_QUANT_MASK
    
    // Encode
    let encoded = ~(sign | (segment << MU_LAW_SEG_SHIFT) | quantize)
    result[i / 2] = encoded & 0xFF
  }
  
  return result
}

/**
 * Convert μ-law (G.711) to linear PCM16
 * Input: μ-law encoded bytes
 * Output: 16-bit signed PCM samples (little-endian)
 */
export function mulawToPcm16(mulaw: Buffer): Buffer {
  const result = Buffer.alloc(mulaw.length * 2)
  
  for (let i = 0; i < mulaw.length; i++) {
    // Invert all bits
    let encoded = ~mulaw[i]
    
    // Extract sign, segment, and quantize
    const sign = encoded & MU_LAW_SIGN_BIT
    const segment = (encoded & MU_LAW_SEG_MASK) >> MU_LAW_SEG_SHIFT
    const quantize = encoded & MU_LAW_QUANT_MASK
    
    // Reconstruct linear value
    let sample = (quantize << 3) + MU_LAW_BIAS
    sample = (sample << segment) - MU_LAW_BIAS
    
    // Apply sign
    if (sign) {
      sample = -sample
    }
    
    // Clamp to 16-bit range
    if (sample > 32767) sample = 32767
    if (sample < -32768) sample = -32768
    
    // Write as 16-bit signed integer (little-endian)
    result.writeInt16LE(sample, i * 2)
  }
  
  return result
}

/**
 * Audio Converter class for real-time audio format conversion
 */
export class AudioConverter {
  private resampler8to24: any = null
  private resampler24to8: any = null
  private isResamplerReady = false

  constructor() {
    this.initializeResampler()
  }

  private async initializeResampler() {
    try {
      // Use dynamic import for WebAssembly module
      // speex-resampler uses default export
      const SpeexResamplerModule = await import('speex-resampler')
      const SpeexResampler = SpeexResamplerModule.default || SpeexResamplerModule.SpeexResampler
      
      // Wait for WASM to initialize
      if (SpeexResampler.initPromise) {
        await SpeexResampler.initPromise
      }
      
      // Create resamplers: 8kHz → 24kHz (3x) and 24kHz → 8kHz (1/3x)
      // speex-resampler API: new SpeexResampler(channels, inRate, outRate, quality)
      // Quality: 1-10 (1=fastest, 10=best)
      // Using quality 10 for maximum audio clarity
      this.resampler8to24 = new SpeexResampler(1, 8000, 24000, 10)
      this.resampler24to8 = new SpeexResampler(1, 24000, 8000, 10)
      
      this.isResamplerReady = true
      console.log('[AudioConverter] Resamplers initialized')
    } catch (error: any) {
      console.error('[AudioConverter] Failed to initialize resamplers:', error)
      // Fallback: continue without resampling (will need alternative)
      throw new Error(`Failed to initialize audio resampler: ${error.message}`)
    }
  }

  /**
   * Convert Twilio μ-law 8kHz audio to OpenAI PCM16 24kHz
   * Input: μ-law encoded buffer (8kHz, from Twilio)
   * Output: PCM16 buffer (24kHz, for OpenAI)
   */
  convertTwilioToOpenAI(mulawBuffer: Buffer): Buffer {
    // Step 1: μ-law → PCM16 (8kHz)
    const pcm8k = mulawToPcm16(mulawBuffer)
    
    // Step 2: Resample 8kHz → 24kHz
    // speex-resampler.processChunk takes PCM16 signed int16 Buffer and returns PCM16 Buffer
    if (!this.isResamplerReady || !this.resampler8to24) {
      throw new Error('Resampler not ready')
    }
    
    const pcm24k = this.resampler8to24.processChunk(pcm8k)
    
    return pcm24k
  }

  /**
   * Convert OpenAI PCM16 24kHz audio to Twilio μ-law 8kHz
   * Input: PCM16 buffer (24kHz, from OpenAI)
   * Output: μ-law encoded buffer (8kHz, for Twilio)
   */
  convertOpenAIToTwilio(pcm24kBuffer: Buffer): Buffer {
    // Step 1: Resample 24kHz → 8kHz
    // speex-resampler.processChunk takes PCM16 signed int16 Buffer and returns PCM16 Buffer
    if (!this.isResamplerReady || !this.resampler24to8) {
      throw new Error('Resampler not ready')
    }
    
    const pcm8k = this.resampler24to8.processChunk(pcm24kBuffer)
    
    // Step 2: PCM16 → μ-law
    return pcm16ToMulaw(pcm8k)
  }

  /**
   * Wait for resampler to be ready (for async initialization)
   */
  async waitUntilReady(): Promise<void> {
    const maxWait = 5000 // 5 seconds
    const startTime = Date.now()
    
    while (!this.isResamplerReady && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    if (!this.isResamplerReady) {
      throw new Error('Audio converter resampler initialization timeout')
    }
  }

  /**
   * Check if converter is ready
   */
  isReady(): boolean {
    return this.isResamplerReady
  }
}
