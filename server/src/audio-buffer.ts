/**
 * Audio Buffer Manager for efficient audio chunk batching
 * 
 * Buffers audio chunks to reduce WebSocket message overhead
 * and improve audio quality by sending larger chunks.
 */

export class AudioBufferManager {
  private buffer: Buffer[] = []
  private targetChunkSize: number // Target size in bytes before flushing
  private flushInterval: number // Max time (ms) before flushing even if buffer not full
  private lastFlushTime: number
  private flushTimer: NodeJS.Timeout | null = null
  private onFlush: (audio: Buffer) => void

  /**
   * @param targetChunkSize Target buffer size in bytes before flushing (default: 4800 = ~100ms at 24kHz PCM16)
   * @param flushInterval Max time (ms) before flushing even if buffer not full (default: 50ms)
   * @param onFlush Callback called when buffer is flushed
   */
  constructor(
    onFlush: (audio: Buffer) => void,
    targetChunkSize: number = 4800, // ~100ms at 24kHz PCM16 mono
    flushInterval: number = 50 // Flush every 50ms max
  ) {
    this.targetChunkSize = targetChunkSize
    this.flushInterval = flushInterval
    this.onFlush = onFlush
    this.lastFlushTime = Date.now()
  }

  /**
   * Add audio chunk to buffer
   */
  add(chunk: Buffer): void {
    this.buffer.push(chunk)

    // Check if we should flush
    const totalSize = this.buffer.reduce((sum, buf) => sum + buf.length, 0)
    
    if (totalSize >= this.targetChunkSize) {
      this.flush()
    } else {
      // Schedule flush if we haven't flushed in a while
      this.scheduleFlush()
    }
  }

  /**
   * Schedule a flush timer if not already scheduled
   */
  private scheduleFlush(): void {
    if (this.flushTimer) {
      return // Already scheduled
    }

    const timeSinceLastFlush = Date.now() - this.lastFlushTime
    const timeUntilFlush = Math.max(0, this.flushInterval - timeSinceLastFlush)

    this.flushTimer = setTimeout(() => {
      this.flush()
      this.flushTimer = null
    }, timeUntilFlush)
  }

  /**
   * Flush all buffered audio
   */
  flush(): void {
    if (this.buffer.length === 0) {
      return
    }

    // Clear any pending timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    // Concatenate all buffers
    const totalSize = this.buffer.reduce((sum, buf) => sum + buf.length, 0)
    const concatenated = Buffer.concat(this.buffer, totalSize)

    // Clear buffer
    this.buffer = []

    // Update flush time
    this.lastFlushTime = Date.now()

    // Call callback
    this.onFlush(concatenated)
  }

  /**
   * Force flush and cleanup (called on disconnect)
   */
  destroy(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    this.flush() // Flush any remaining audio
  }
}
