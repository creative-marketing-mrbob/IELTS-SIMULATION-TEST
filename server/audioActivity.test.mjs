import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWavActivity } from './audioActivity.mjs';
import { evaluateCandidateSection } from './aiEvaluatorEndpoint.mjs';

function wav(samples, sampleRate = 16000) {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => bytes.writeInt16LE(Math.round(sample * 32767), 44 + index * 2));
  return bytes;
}

const silence = wav(Array(32000).fill(0));
const voiceLike = wav(Array.from({ length: 32000 }, (_, index) => {
  const envelope = index > 4000 && index < 24000 ? 0.18 : 0;
  return envelope * Math.sin(2 * Math.PI * 180 * index / 16000);
}));
const steadyTone = wav(Array.from({ length: 32000 }, (_, index) =>
  0.18 * Math.sin(2 * Math.PI * 180 * index / 16000)));

test('audio activity rejects silence and steady non-speech but allows voiced signal', () => {
  assert.deepEqual(analyzeWavActivity(silence), { silent: true, hasSpeechLikeSignal: false });
  assert.equal(analyzeWavActivity(steadyTone).hasSpeechLikeSignal, false);
  assert.equal(analyzeWavActivity(voiceLike).hasSpeechLikeSignal, true);
  assert.throws(() => analyzeWavActivity(Buffer.from('not a wav')), /WAV yang valid/);
});

test('silent data URL stops evaluation before any provider call', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Provider must not be called'); };
  try {
    await assert.rejects(
      evaluateCandidateSection('speaking', { candidateId: 'test', resultId: 'test' }, {
        part1Audio: `data:audio/wav;base64,${silence.toString('base64')}`
      }, true),
      /rekaman hening.*Tidak ada nilai yang dibuat/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('voiced data URL passes the audio guard and reaches the provider', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.KIE_API_KEY;
  let providerCalls = 0;
  process.env.KIE_API_KEY = 'test-only';
  globalThis.fetch = async () => {
    providerCalls += 1;
    throw new Error('Provider reached');
  };
  try {
    await assert.rejects(
      evaluateCandidateSection('speaking', { candidateId: 'test', resultId: 'test' }, {
        part1Audio: `data:audio/wav;base64,${voiceLike.toString('base64')}`
      }, true),
      /Provider reached/
    );
    assert.equal(providerCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.KIE_API_KEY;
    else process.env.KIE_API_KEY = originalKey;
  }
});

test('silent stored recording stops evaluation before signing or contacting provider', async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const requests = [];
  process.env.SUPABASE_URL = 'https://storage.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
  globalThis.fetch = async url => {
    requests.push(String(url));
    if (String(url) === 'https://storage.example/storage/v1/object/speaking-recordings/test/part-1.wav') {
      return new Response(silence);
    }
    throw new Error('Provider must not be called');
  };
  try {
    await assert.rejects(
      evaluateCandidateSection('speaking', { candidateId: 'test', resultId: 'test' }, {
        part1Audio: 'speaking-recordings/test/part-1.wav'
      }, true),
      /rekaman hening.*Tidak ada nilai yang dibuat/
    );
    assert.deepEqual(requests, ['https://storage.example/storage/v1/object/speaking-recordings/test/part-1.wav']);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
});
