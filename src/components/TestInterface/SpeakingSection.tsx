import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTest } from '../../context/TestContext';
import { speakingTasks } from '../../data/speakingQuestions';
import { audioStorage } from '../../services/audioStorage';
import { Mic, Square, Play, Pause, RotateCcw, CheckCircle2, Send, AlertCircle } from 'lucide-react';

interface SpeakingSectionProps {
  onSubmitRequest: () => void;
}

type RecordingTarget = {
  key: string;
  label: string;
  partId: 1 | 2 | 3;
  prompt: string;
  recordTimeSeconds: number;
  answerAudioKey: string;
  answerDurationKey: string;
};

type SaveState = 'idle' | 'recording' | 'processing' | 'uploading' | 'saved' | 'failed';

const qaSpeakingTargets: RecordingTarget[] = [
  { key: 'part1_q1', label: 'Part 1 Question 1', partId: 1, prompt: 'How many hours do you usually sleep at night?', recordTimeSeconds: 60, answerAudioKey: 'part1_q1_audio', answerDurationKey: 'part1_q1_duration' },
  { key: 'part1_q2', label: 'Part 1 Question 2', partId: 1, prompt: 'Do you sometimes sleep during the day? Why / why not?', recordTimeSeconds: 60, answerAudioKey: 'part1_q2_audio', answerDurationKey: 'part1_q2_duration' },
  { key: 'part2', label: 'Part 2 Cue Card', partId: 2, prompt: `Describe a time when you met someone who you became good friends with.

You should say:
• Who you met
• When and where you met this person
• What you thought about this person when you first met
• And explain why you think you became good friends with this person.`, recordTimeSeconds: 120, answerAudioKey: 'part2_audio', answerDurationKey: 'part2_duration' },
  { key: 'part3_q1', label: 'Part 3 Question 1', partId: 3, prompt: 'How important is it for children to have lots of friends at school?', recordTimeSeconds: 60, answerAudioKey: 'part3_q1_audio', answerDurationKey: 'part3_q1_duration' },
  { key: 'part3_q2', label: 'Part 3 Question 2', partId: 3, prompt: 'Do you think it is wrong for parents to influence which friends their children have?', recordTimeSeconds: 60, answerAudioKey: 'part3_q2_audio', answerDurationKey: 'part3_q2_duration' }
];

const splitPromptLines = (lines: string[] = []) => lines.flatMap(line =>
  line.split('\n').map(item => item.replace(/^•\s*/, '').trim()).filter(Boolean)
);

const AUDIO_ACTIVE_THRESHOLD = 0.018;
const EFFECTIVE_GAIN_MULTIPLIER = 1.5;

export const SpeakingSection: React.FC<SpeakingSectionProps> = ({ onSubmitRequest }) => {
  const {
    user,
    answers,
    updateSpeakingAnswer,
    updateSpeakingQaAnswer,
    isQaMode,
    selectedAudioDeviceId,
    setSelectedAudioDeviceId,
    hasCompletedAudioSetup,
    setHasCompletedAudioSetup
  } = useTest();

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [setupStatus, setSetupStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [setupMessage, setSetupMessage] = useState('Pilih mikrofon, lalu jalankan tes mikrofon.');
  const [setupLevel, setSetupLevel] = useState(0);
  const [setupChecks, setSetupChecks] = useState({ mic: false, recording: false, playback: false });
  const [micGain, setMicGain] = useState(100);
  const [sampleSeconds, setSampleSeconds] = useState(0);
  const [sampleUrl, setSampleUrl] = useState('');
  const [isSampleRecording, setIsSampleRecording] = useState(false);
  const [activeRecordingKey, setActiveRecordingKey] = useState<string | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [audioLevel, setAudioLevel] = useState<number[]>(Array(28).fill(8));
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const sampleRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sampleChunksRef = useRef<Blob[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const setupAudioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const recordingStartedAtRef = useRef(0);
  const sampleStartedAtRef = useRef(0);
  const sampleTimerRef = useRef<number | null>(null);

  const productionTargets = useMemo<RecordingTarget[]>(() => speakingTasks.map(task => ({
    key: `part${task.partId}`,
    label: `Speaking Part ${task.partId}`,
    partId: task.partId,
    prompt: task.title,
    recordTimeSeconds: task.recordTimeSeconds,
    answerAudioKey: `part${task.partId}Audio`,
    answerDurationKey: `part${task.partId}Duration`
  })), []);

  const targets = isQaMode ? qaSpeakingTargets : productionTargets;
  const recordedCount = targets.filter(target => {
    const audio = (answers.speaking as any)[target.answerAudioKey];
    const duration = (answers.speaking as any)[target.answerDurationKey];
    const size = (answers.speaking as any)[target.answerAudioKey.replace(/_audio$/, '_file_size').replace(/Audio$/, 'FileSize')];
    return Boolean(audio) && typeof duration === 'number' && duration > 0 && (typeof size !== 'number' || size > 0);
  }).length;

  const getSupportedMimeType = () => [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus'
  ].find(type => window.MediaRecorder && MediaRecorder.isTypeSupported(type)) || '';

  const refreshDevices = async () => {
    const list = await navigator.mediaDevices.enumerateDevices();
    const microphones = list.filter(device => device.kind === 'audioinput');
    setDevices(microphones);
    if (!selectedAudioDeviceId && microphones[0]?.deviceId) {
      setSelectedAudioDeviceId(microphones[0].deviceId);
    }
  };

  useEffect(() => {
    refreshDevices().catch(() => undefined);
    const handler = () => refreshDevices().catch(() => undefined);
    navigator.mediaDevices?.addEventListener?.('devicechange', handler);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', handler);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeRecordingKey) {
      const target = targets.find(item => item.key === activeRecordingKey);
      const maxSec = target?.recordTimeSeconds || 120;
      timer = setInterval(() => {
        setRecordSeconds(prev => {
          if (prev >= maxSec) {
            handleStopRecording();
            return maxSec;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeRecordingKey, targets]);

  useEffect(() => () => stopStream(), []);

  const stopStream = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (sampleRecorderRef.current && sampleRecorderRef.current.state !== 'inactive') {
      sampleRecorderRef.current.stop();
    }
    if (sampleTimerRef.current) window.clearInterval(sampleTimerRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    rawStreamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    rawStreamRef.current = null;
    analyserRef.current = null;
    gainNodeRef.current = null;
    setIsSampleRecording(false);
    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    setAudioLevel(Array(28).fill(8));
  };

  useEffect(() => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = (micGain / 100) * EFFECTIVE_GAIN_MULTIPLIER;
  }, [micGain]);

  const setupAudioPipeline = (rawStream: MediaStream) => {
    audioContextRef.current?.close().catch(() => undefined);
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(rawStream);
    const gainNode = audioCtx.createGain();
    const analyser = audioCtx.createAnalyser();
    const destination = audioCtx.createMediaStreamDestination();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.58;
    gainNode.gain.value = (micGain / 100) * EFFECTIVE_GAIN_MULTIPLIER;
    source.connect(gainNode);
    gainNode.connect(analyser);
    gainNode.connect(destination);
    audioContextRef.current = audioCtx;
    analyserRef.current = analyser;
    gainNodeRef.current = gainNode;
    streamRef.current = destination.stream;
    return destination.stream;
  };

  const attachMeter = (onLevel?: (level: number) => void) => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    const updateWaveform = () => {
      const dataArray = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i += 1) {
        const value = (dataArray[i] - 128) / 128;
        sum += value * value;
      }
      const level = Math.min(1, Math.sqrt(sum / dataArray.length) * 14);
      const bars = Array.from({ length: 28 }, (_, index) => {
        const base = 10 + ((index * 7) % 24);
        const movement = 0.75 + Math.abs(Math.sin((Date.now() / 190) + (index * 0.82))) * 0.8;
        return level > AUDIO_ACTIVE_THRESHOLD ? Math.max(7, Math.min(46, base * level * 3.3 * movement)) : 5;
      });
      setAudioLevel(bars);
      onLevel?.(level);
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    };
    updateWaveform();
  };

  const openMicStream = async () => {
    rawStreamRef.current?.getTracks().forEach(track => track.stop());
    const rawStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        ...(selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : {}),
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    rawStreamRef.current = rawStream;
    return setupAudioPipeline(rawStream);
  };

  const ensureRecordingStream = async () => {
    const live = streamRef.current?.getAudioTracks?.().some(track => track.readyState === 'live');
    if (live) return streamRef.current!;
    await openMicStream();
    await refreshDevices();
    return streamRef.current!;
  };

  const saveMicSample = () => {
    const recorder = sampleRecorderRef.current;
    const mimeType = recorder?.mimeType || getSupportedMimeType() || 'audio/webm';
    const blob = new Blob(sampleChunksRef.current, { type: mimeType });
    const duration = Math.max(1, Math.round((Date.now() - sampleStartedAtRef.current) / 1000));
    if (sampleUrl) URL.revokeObjectURL(sampleUrl);
    if (blob.size > 0 && duration > 0 && blob.type.startsWith('audio/')) {
      const url = URL.createObjectURL(blob);
      setSampleUrl(url);
      setSetupChecks(prev => ({ ...prev, mic: true, recording: true, playback: false }));
      setSetupStatus('success');
      setSetupMessage('Sample tersimpan. Dengarkan dulu sebelum mulai.');
      setSampleSeconds(duration);
    } else {
      setSetupStatus('failed');
      setSetupMessage('Tidak ada suara yang terdeteksi. Silakan cek microphone atau pilih perangkat lain.');
    }
  };

  const stopSampleRecording = () => {
    if (!sampleRecorderRef.current || sampleRecorderRef.current.state === 'inactive') return;
    sampleRecorderRef.current.stop();
    setIsSampleRecording(false);
    if (sampleTimerRef.current) window.clearInterval(sampleTimerRef.current);
  };

  const handleTestMicrophone = async () => {
    if (isSampleRecording) {
      stopSampleRecording();
      return;
    }

    setSetupStatus('testing');
    setSetupMessage('Sedang merekam sample...');
    setHasCompletedAudioSetup(false);
    setSetupChecks({ mic: false, recording: false, playback: false });
    setSetupLevel(0);
    setSampleSeconds(0);
    if (sampleUrl) URL.revokeObjectURL(sampleUrl);
    setSampleUrl('');

    try {
      const stream = await ensureRecordingStream();
      await refreshDevices();
      if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
      setSetupChecks(prev => ({ ...prev, mic: true }));
      attachMeter(level => {
        setSetupLevel(Math.min(100, Math.round((level / 0.12) * 100)));
        if (level > AUDIO_ACTIVE_THRESHOLD) {
          setSetupMessage('Input terdeteksi. Klik Stop Rekam setelah sample cukup.');
        }
      });

      const mimeType = getSupportedMimeType();
      sampleRecorderRef.current = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      sampleChunksRef.current = [];
      sampleRecorderRef.current.addEventListener('dataavailable', event => {
        if (event.data && event.data.size) sampleChunksRef.current.push(event.data);
      });
      sampleRecorderRef.current.addEventListener('stop', saveMicSample, { once: true });
      sampleStartedAtRef.current = Date.now();
      setIsSampleRecording(true);
      sampleRecorderRef.current.start();
      sampleTimerRef.current = window.setInterval(() => {
        setSampleSeconds(Math.round((Date.now() - sampleStartedAtRef.current) / 1000));
      }, 500);
    } catch {
      stopStream();
      setIsSampleRecording(false);
      setSetupStatus('failed');
      setSetupMessage('Microphone permission denied or selected microphone is unavailable.');
    }
  };

  const handleStartRecording = async (target: RecordingTarget) => {
    try {
      const stream = await ensureRecordingStream();
      if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      setSaveStates(prev => ({ ...prev, [target.key]: 'recording' }));
      attachMeter();

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const duration = Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000));
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setActiveRecordingKey(null);
        setSaveStates(prev => ({ ...prev, [target.key]: 'processing' }));

        if (!audioBlob || audioBlob.size <= 0 || !mimeType.startsWith('audio/') || duration <= 0) {
          setSaveStates(prev => ({ ...prev, [target.key]: 'failed' }));
          return;
        }

        try {
          const resId = user?.resultId || 'TEST_CANDIDATE';
          setSaveStates(prev => ({ ...prev, [target.key]: 'uploading' }));
          const { storagePath, mimeType: storedMimeType, fileSize } = await audioStorage.saveAudio(resId, target.key, audioBlob, duration);
          if (!storagePath?.startsWith('speaking-recordings/')) throw new Error('Storage path was not confirmed.');
          if (isQaMode) {
            await updateSpeakingQaAnswer(target.key as any, storagePath, duration, {
              mimeType: storedMimeType || audioBlob.type,
              fileSize: fileSize || audioBlob.size
            });
          } else {
            updateSpeakingAnswer(`part${target.partId}` as 'part1' | 'part2' | 'part3', storagePath, duration, {
              mimeType: storedMimeType || audioBlob.type,
              fileSize: fileSize || audioBlob.size
            });
          }
          setSaveStates(prev => ({ ...prev, [target.key]: 'saved' }));
        } catch {
          setSaveStates(prev => ({ ...prev, [target.key]: 'failed' }));
        }
      };

      mediaRecorder.start(250);
      setActiveRecordingKey(target.key);
      setRecordSeconds(0);
    } catch {
      setSaveStates(prev => ({ ...prev, [target.key]: 'failed' }));
      alert('Microphone access is required to record Speaking audio.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handlePlayAudio = async (target: RecordingTarget) => {
    const audioUrl = (answers.speaking as any)[target.answerAudioKey];
    if (!audioUrl) return;
    if (playingKey === target.key) {
      previewAudioRef.current?.pause();
      setPlayingKey(null);
      return;
    }
    const playableUrl = audioUrl.startsWith('speaking-recordings/')
      ? await audioStorage.getAudio(audioUrl)
      : audioUrl;
    if (!playableUrl || !previewAudioRef.current) return;
    previewAudioRef.current.src = playableUrl;
    previewAudioRef.current.play();
    setPlayingKey(target.key);
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const renderTaskPrompts = (partId: 1 | 2 | 3) => {
    const task = speakingTasks.find(item => item.partId === partId);
    if (!task) return null;
    if (isQaMode && partId !== 2) return null;
    const lines = splitPromptLines(task.bulletPoints);

    return (
      <div className="space-y-2.5">
        <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
          {partId === 2 ? 'Cue Card:' : 'Topic Questions:'}
        </span>
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="flex items-start space-x-3 bg-[#f8fbff] p-4 rounded-2xl border border-[#e6eaf2]">
              <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {partId === 2 && idx > 1 ? '•' : idx + 1}
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">
                {line}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!hasCompletedAudioSetup) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 pb-28">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl p-7 sm:p-8 border border-[#e6eaf2] shadow-soft space-y-6">
            <div className="space-y-2 border-b border-slate-100 pb-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-red-500 bg-red-50 px-2.5 py-1 rounded-md">Audio Setup</span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#08245c]">Microphone Source</h2>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">Microphone Source</label>
              <select
                value={selectedAudioDeviceId}
                onChange={e => {
                  setSelectedAudioDeviceId(e.target.value);
                  setSetupStatus('idle');
                  setSetupMessage('Pilih mikrofon, lalu jalankan tes mikrofon.');
                  setSetupChecks({ mic: false, recording: false, playback: false });
                  setHasCompletedAudioSetup(false);
                  stopStream();
                }}
                className="w-full h-12 rounded-xl border border-[#e6eaf2] bg-[#f8fbff] px-3 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {devices.length === 0 ? (
                  <option value="">Allow microphone permission to load devices</option>
                ) : devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3 rounded-2xl border border-[#e6eaf2] bg-[#f8fbff] p-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Live input level</span>
                <span>{setupStatus === 'success' ? 'Input detected' : setupStatus === 'failed' ? 'No input detected' : setupStatus === 'testing' ? 'Testing...' : 'Ready'}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full rounded-full ${setupStatus === 'failed' ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${setupLevel}%` }} />
              </div>
              <p className={`text-xs font-bold leading-relaxed ${setupStatus === 'failed' ? 'text-rose-700' : 'text-slate-600'}`}>{setupMessage}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  ['Microphone detected', setupChecks.mic],
                  ['Recording detected', setupChecks.recording],
                  ['Playback works', setupChecks.playback]
                ].map(([label, ok]) => (
                  <span key={String(label)} className={`rounded-xl border px-3 py-2 text-xs font-extrabold ${
                    ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'
                  }`}>
                    {label}{ok ? ' ✓' : ''}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">Audio adjust meter</label>
                <span className="text-xs font-black text-blue-700">{micGain}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={180}
                value={micGain}
                onChange={event => setMicGain(Number(event.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button type="button" onClick={handleTestMicrophone} className={`h-12 rounded-full text-white text-sm font-extrabold flex items-center justify-center space-x-2 ${
                isSampleRecording ? 'bg-rose-500 hover:bg-rose-600' : 'bg-red-500 hover:bg-red-600'
              }`}>
                <Mic className="w-4 h-4" />
                <span>{isSampleRecording ? `Stop Rekam ${formatSec(sampleSeconds)}` : sampleUrl ? 'Rekam Ulang' : 'Rekam Sample'}</span>
              </button>
              <button type="button" onClick={() => setupAudioRef.current?.play()} disabled={!sampleUrl || setupStatus !== 'success'} className="h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold disabled:opacity-40">
                Play Test Audio
              </button>
            </div>

            <div className="space-y-3 rounded-2xl border border-[#dbe8ff] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-[#08245c]">Sample suara kamu</h3>
                  <p className="text-xs font-medium text-slate-500">Dengarkan hasil sample ini sebelum mulai Speaking Test.</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{formatSec(sampleSeconds)}</span>
              </div>
              {sampleUrl ? (
                <audio ref={setupAudioRef} src={sampleUrl} controls className="w-full" onPlay={() => {
                  setSetupChecks(prev => ({ ...prev, playback: true }));
                  setSetupMessage('Playback works. Klik Start Speaking Test kalau audio test sudah terdengar jelas.');
                }} />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-[#f8fbff] px-4 py-3 text-xs font-bold text-slate-500">
                  Rekam sample dulu, lalu audio player akan muncul di sini.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              {setupStatus === 'failed' && (
                <button type="button" onClick={handleTestMicrophone} className="h-11 px-5 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-extrabold">Try Again</button>
              )}
              <button type="button" disabled={!setupChecks.mic || !setupChecks.recording || !setupChecks.playback} onClick={() => setHasCompletedAudioSetup(true)} className="h-11 px-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold disabled:opacity-40">
                Start Speaking Test
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 pb-28">
      <audio ref={previewAudioRef} onEnded={() => setPlayingKey(null)} className="hidden" />

      <div className="max-w-4xl mx-auto space-y-10">
        <div className="bg-white rounded-2xl p-4 border border-[#e6eaf2] shadow-soft flex items-center justify-between text-xs font-extrabold text-slate-600">
          <div className="flex items-center space-x-2">
            <Mic className="w-4 h-4 text-red-500" />
            <span className="text-[#08245c]">{isQaMode ? 'QA Speaking Section (5 Responses)' : 'Speaking Section (Parts 1, 2, 3)'}</span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
            <span>Saved: <strong>{recordedCount} / {targets.length}</strong></span>
          </div>
        </div>

        {isQaMode && renderTaskPrompts(2)}

        {targets.map((target) => {
          const recordedAudio = (answers.speaking as any)[target.answerAudioKey] as string | undefined;
          const savedDuration = (answers.speaking as any)[target.answerDurationKey] as number | undefined;
          const isRecordingThis = activeRecordingKey === target.key;
          const isPlayingThis = playingKey === target.key;
          const saveState = saveStates[target.key] || (recordedAudio ? 'saved' : 'idle');

          return (
            <div key={target.key} className="bg-white rounded-3xl p-7 sm:p-8 border border-[#e6eaf2] shadow-soft space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-red-500 bg-red-50 px-2.5 py-1 rounded-md">{target.label}</span>
                  {saveState === 'saved' && (
                    <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Saved ✓</span>
                    </span>
                  )}
                </div>
                <h3 className="whitespace-pre-line text-base sm:text-lg font-extrabold text-[#08245c] leading-relaxed mt-3">{target.prompt}</h3>
                {!isQaMode && renderTaskPrompts(target.partId)}
              </div>

              {saveState === 'failed' && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Rekaman belum berhasil tersimpan. Silakan rekam ulang.</span>
                </div>
              )}

              <div className="bg-[#f8fbff] p-5 sm:p-6 rounded-2xl border border-[#e6eaf2] flex flex-col items-center justify-center space-y-4 text-center">
                <div className="w-full max-w-sm h-12 bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center space-x-1 overflow-hidden">
                  {audioLevel.map((height, i) => (
                    <div key={i} className={`w-1.5 rounded-full transition-all duration-100 ${isRecordingThis ? 'bg-red-500' : recordedAudio ? 'bg-emerald-500' : 'bg-slate-300'}`} style={{ height: `${isRecordingThis ? height : recordedAudio ? 16 : 6}px` }} />
                  ))}
                </div>

                {(isRecordingThis || saveState === 'processing' || saveState === 'uploading') && (
                  <div className="font-mono text-xs font-black text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                    {isRecordingThis ? `Recording: ${formatSec(recordSeconds)} / ${formatSec(target.recordTimeSeconds)}` : saveState === 'processing' ? 'Processing...' : 'Uploading...'}
                  </div>
                )}

                <div className="w-full max-w-xs space-y-2">
                  {!isRecordingThis && !recordedAudio && saveState !== 'uploading' && (
                    <button onClick={() => handleStartRecording(target)} disabled={activeRecordingKey !== null} className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs sm:text-sm rounded-full shadow-sm transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50">
                      <Mic className="w-4 h-4" />
                      <span>Record Response</span>
                    </button>
                  )}

                  {isRecordingThis && (
                    <button onClick={handleStopRecording} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm rounded-full shadow-lg transition-all flex items-center justify-center space-x-2 animate-pulse active:scale-95">
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>Stop & Save Recording</span>
                    </button>
                  )}

                  {!isRecordingThis && recordedAudio && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handlePlayAudio(target)} className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1.5">
                          {isPlayingThis ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                          <span>{isPlayingThis ? 'Pause' : 'Play Recording'}</span>
                        </button>
                        <button onClick={() => handleStartRecording(target)} disabled={activeRecordingKey !== null} className="px-3.5 h-11 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center space-x-1" title="Re-record">
                          <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                          <span>Re-record</span>
                        </button>
                      </div>
                      <span className="block text-[10px] font-mono font-bold text-slate-400">Duration: {formatSec(savedDuration || 0)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="pt-6 pb-12 flex items-center justify-center">
          <button onClick={onSubmitRequest} disabled={activeRecordingKey !== null || Object.values(saveStates).includes('uploading')} className="w-full max-w-md h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-base rounded-full shadow-btn hover:shadow-soft-lg transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50">
            <Send className="w-5 h-5" />
            <span>Submit Speaking Section</span>
          </button>
        </div>
      </div>
    </div>
  );
};
