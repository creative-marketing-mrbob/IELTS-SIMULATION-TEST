/**
 * Audio Conversion Utility for IELTS Speaking Simulator
 * Converts browser-recorded audio (WebM, MP4, OGG) to standard 16kHz 16-bit Mono PCM WAV.
 * 16kHz Mono WAV is the standard format for speech analysis (Gemini, Whisper),
 * compact in size (~32 KB/sec) and natively supported by KIE and OpenAI audio endpoints.
 */

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length minus 8 bytes */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM = 1) */
  view.setUint16(20, 1, true);
  /* channel count = 1 (mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sampleRate * blockAlign) = sampleRate * 2 */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) = 2 */
  view.setUint16(32, 2, true);
  /* bits per sample = 16 */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples: convert float -1.0..1.0 to int16 -32768..32767
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return buffer;
}

/**
 * Converts any audio Blob to 16kHz Mono 16-bit WAV.
 * Falls back to the original blob if decoding is not supported in the browser environment.
 */
export async function convertBlobToWav(blob: Blob): Promise<Blob> {
  if (typeof window === 'undefined' || !window.AudioContext) {
    return blob;
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();

    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } finally {
      if (audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => undefined);
      }
    }

    // Resample to 16,000 Hz Mono using OfflineAudioContext
    const targetSampleRate = 16000;
    const targetLength = Math.max(1, Math.ceil(audioBuffer.duration * targetSampleRate));
    const offlineCtx = new OfflineAudioContext(1, targetLength, targetSampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const pcmData = renderedBuffer.getChannelData(0);

    const wavBuffer = encodeWav(pcmData, targetSampleRate);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  } catch (err) {
    console.warn('WAV conversion failed, falling back to original audio format:', err);
    return blob;
  }
}
