import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { audioStorage } from '../../services/audioStorage';

interface TutorAudioPlayerProps {
  audioPath?: string;
  label?: string;
  fallbackDuration?: number;
}

export const TutorAudioPlayer: React.FC<TutorAudioPlayerProps> = ({
  audioPath,
  label,
  fallbackDuration = 0
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!audioPath) {
      setResolvedUrl(null);
      return;
    }

    if (!audioPath.startsWith('speaking-recordings/')) {
      setResolvedUrl(audioPath);
      return;
    }

    setIsLoadingUrl(true);
    audioStorage.getAudio(audioPath).then(url => {
      if (isMounted) {
        setResolvedUrl(url);
        setIsLoadingUrl(false);
      }
    }).catch(() => {
      if (isMounted) setIsLoadingUrl(false);
    });

    return () => {
      isMounted = false;
    };
  }, [audioPath]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const togglePlay = () => {
    if (!audioRef.current || !resolvedUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const skipSeconds = (sec: number) => {
    if (audioRef.current) {
      const targetTime = Math.max(0, Math.min(duration || 120, audioRef.current.currentTime + sec));
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const togglePlaybackRate = () => {
    const rates = [1, 1.25, 1.5];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (timeInSec: number) => {
    const m = Math.floor(timeInSec / 60);
    const s = Math.floor(timeInSec % 60);
    return [m, s].map(v => String(v).padStart(2, '0')).join(':');
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  if (!audioPath) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-bold text-slate-400">
        Kandidat belum merekam audio untuk soal ini.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-[#f8fbff] to-[#edf3fc] p-4 shadow-sm space-y-3">
      <audio
        ref={audioRef}
        src={resolvedUrl || undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
        className="hidden"
      />

      {label && (
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>{label}</span>
          <span className="font-mono text-[11px] text-slate-400">
            {formatTime(currentTime)} / {formatTime(duration || fallbackDuration)}
          </span>
        </div>
      )}

      {/* YouTube-style Progress / Scrubber Bar */}
      <div className="space-y-1">
        <div className="relative flex items-center group cursor-pointer py-1">
          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden relative">
            <div
              className="h-full bg-red-600 rounded-full transition-all duration-75"
              style={{ width: progressPercent + '%' }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || fallbackDuration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            disabled={!resolvedUrl || isLoadingUrl}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* Time stamps */}
        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || fallbackDuration)}</span>
        </div>
      </div>

      {/* Player Controls Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-2">
          {/* Main Play / Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={!resolvedUrl || isLoadingUrl}
            className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center shadow-sm transition-all disabled:opacity-50"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoadingUrl ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white ml-0.5" />
            )}
          </button>

          {/* Rewind -5s */}
          <button
            type="button"
            onClick={() => skipSeconds(-5)}
            disabled={!resolvedUrl || isLoadingUrl}
            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center text-xs transition-all shadow-2xs"
            title="Mundur 5 detik (-5s)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Forward +5s */}
          <button
            type="button"
            onClick={() => skipSeconds(5)}
            disabled={!resolvedUrl || isLoadingUrl}
            className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center text-xs transition-all shadow-2xs"
            title="Maju 5 detik (+5s)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Playback speed toggle */}
          <button
            type="button"
            onClick={togglePlaybackRate}
            disabled={!resolvedUrl || isLoadingUrl}
            className="px-2.5 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[11px] font-bold transition-all"
            title="Ubah kecepatan putar"
          >
            {playbackRate}x
          </button>

          {/* Mute button */}
          <button
            type="button"
            onClick={toggleMute}
            disabled={!resolvedUrl || isLoadingUrl}
            className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center transition-all"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
