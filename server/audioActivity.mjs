// Inspect the actual PCM samples before asking an AI model to transcribe audio.
// Browser recordings are converted to 16-bit mono WAV before upload.
export function analyzeWavActivity(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 44
    || bytes.toString('ascii', 0, 4) !== 'RIFF'
    || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Rekaman bukan WAV yang valid. Silakan rekam ulang tes.');
  }

  let sampleRate = 0;
  let dataStart = -1;
  let dataLength = 0;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (size > bytes.length - start) {
      throw new Error('Rekaman WAV terpotong. Silakan rekam ulang tes.');
    }
    const chunk = bytes.toString('ascii', offset, offset + 4);
    if (chunk === 'fmt ') {
      if (size < 16 || bytes.readUInt16LE(start) !== 1
        || bytes.readUInt16LE(start + 2) !== 1 || bytes.readUInt16LE(start + 14) !== 16) {
        throw new Error('Rekaman harus berupa WAV PCM mono 16-bit. Silakan rekam ulang tes.');
      }
      sampleRate = bytes.readUInt32LE(start + 4);
    } else if (chunk === 'data') {
      dataStart = start;
      dataLength = size;
    }
    offset = start + size + (size & 1);
  }
  if (sampleRate < 8000 || sampleRate > 192000 || dataStart < 0
    || dataLength < sampleRate * 2 || dataLength % 2 !== 0) {
    throw new Error('Rekaman tidak lengkap. Silakan rekam ulang tes.');
  }

  const frameSamples = Math.max(1, Math.round(sampleRate * 0.02));
  const frameLevels = [];
  let peak = 0;
  for (let offset = dataStart; offset + 1 < dataStart + dataLength;) {
    let sumSquares = 0;
    let count = 0;
    for (; count < frameSamples && offset + 1 < dataStart + dataLength; count += 1, offset += 2) {
      const level = Math.abs(bytes.readInt16LE(offset)) / 32768;
      peak = Math.max(peak, level);
      sumSquares += level * level;
    }
    if (count) frameLevels.push(Math.sqrt(sumSquares / count));
  }
  const activeFrames = frameLevels.filter(level => level >= 0.008).length;
  const sorted = frameLevels.slice().sort((a, b) => a - b);
  const low = sorted[Math.floor(sorted.length * 0.1)] || 0;
  const high = sorted[Math.floor(sorted.length * 0.9)] || 0;
  return {
    silent: peak < 0.002 && activeFrames < 5,
    hasSpeechLikeSignal: peak >= 0.015 && activeFrames >= 10
      && high >= 0.012 && high >= Math.max(low * 1.5, low + 0.005)
  };
}
