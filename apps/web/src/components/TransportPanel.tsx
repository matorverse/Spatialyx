import { useEffect, useRef } from 'react';
import { useAudioStore, audioEngine } from '../store/useAudioStore';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Activity, 
  Upload, 
  Disc, 
  FileAudio 
} from 'lucide-react';

interface TransportPanelProps {
  wavesurferRef: React.MutableRefObject<any>;
  progressTimeRef: React.RefObject<HTMLSpanElement>;
}

export default function TransportPanel({ wavesurferRef, progressTimeRef }: TransportPanelProps) {
  const wavesurferContainerRef = useRef<HTMLDivElement | null>(null);
  
  const { 
    isPlaying, 
    isLooping, 
    isDecoding, 
    loadedFileName, 
    duration,
    handlePlayPause,
    handleStop,
    handleLoopToggle,
    loadTestSynth,
    handleFileUpload
  } = useAudioStore();

  useEffect(() => {
    let active = true;
    let wavesurferInstance: any = null;

    if (wavesurferContainerRef.current) {
      import('wavesurfer.js').then(({ default: WaveSurfer }) => {
        if (!active || !wavesurferContainerRef.current) return;

        wavesurferInstance = WaveSurfer.create({
          container: wavesurferContainerRef.current,
          waveColor: 'rgba(143, 150, 168, 0.15)',
          progressColor: '#ff5c00',
          cursorColor: '#ffffff',
          height: 64,
          barWidth: 2,
          barGap: 3,
          interact: true,
          fillParent: true,
        });

        wavesurferInstance.on('interaction', (newProgressPercent: number) => {
          const buffer = audioEngine.getAudioBuffer();
          if (buffer) {
            const time = newProgressPercent * buffer.duration;
            audioEngine.seek(time);
          }
        });

        wavesurferRef.current = wavesurferInstance;
      });
    }

    return () => {
      active = false;
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      } else if (wavesurferInstance) {
        wavesurferInstance.destroy();
      }
    };
  }, [wavesurferRef]);

  // Helper formatting for time
  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 border-b border-studio-border bg-studio-panel">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FileAudio className="w-5 h-5 text-studio-accent" />
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-white uppercase font-sans">
              {loadedFileName || 'No Audio Source Loaded'}
            </h1>
            <p className="text-[10px] text-studio-muted font-mono mt-0.5">
              {loadedFileName ? 'BUFFER LOADED IN MEMORY' : 'LOAD SYNTH OR UPLOAD LOCAL FILE'}
            </p>
          </div>
        </div>

        {/* Upload Action Row */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadTestSynth(wavesurferRef)}
            disabled={isDecoding}
            className="px-3 py-1.5 bg-studio-dark hover:bg-studio-border border border-studio-border rounded text-[11px] font-mono text-studio-text flex items-center transition-colors disabled:opacity-50"
          >
            <Activity className="w-3.5 h-3.5 mr-1.5 text-studio-accent" />
            GENERATE TEST SYNTH
          </button>

          <label className="px-3 py-1.5 bg-studio-accent hover:bg-studio-accent-hover text-white rounded text-[11px] font-mono flex items-center cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            UPLOAD AUDIO
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, wavesurferRef);
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Waveform Renderer Panel */}
      <div className="bg-studio-dark border border-studio-border rounded-lg p-3 relative">
        {isDecoding && (
          <div className="absolute inset-0 bg-studio-dark/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <div className="flex items-center space-x-3">
              <Disc className="w-4 h-4 text-studio-accent animate-spin" />
              <span className="text-xs font-mono text-white">DECODING LOCAL AUDIO BUFFER...</span>
            </div>
          </div>
        )}
        <div ref={wavesurferContainerRef} className="w-full"></div>
      </div>
      
      {/* Playback Progress Indicator & Controls */}
      <div className="flex items-center justify-between mt-3 px-1 text-[11px] font-mono text-studio-muted">
        <div className="flex items-center space-x-1 bg-studio-dark px-2 py-0.5 rounded border border-studio-border text-white">
          <span ref={progressTimeRef} className="text-studio-accent">0:00</span>
          <span className="opacity-40">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Primary Transport Panel */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePlayPause}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isPlaying ? 'bg-white text-studio-bg' : 'bg-studio-accent text-white hover:bg-studio-accent-hover shadow-studio-glow'}`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={handleStop}
            className="w-8 h-8 rounded-full bg-studio-dark hover:bg-studio-border border border-studio-border flex items-center justify-center transition-colors text-studio-text"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            onClick={handleLoopToggle}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${isLooping ? 'border-studio-accent text-studio-accent bg-studio-accent/5' : 'border-studio-border text-studio-muted hover:text-white'}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div>
          <span>STATUS: {isPlaying ? 'PLAYING' : 'READY'}</span>
        </div>
      </div>
    </div>
  );
}
