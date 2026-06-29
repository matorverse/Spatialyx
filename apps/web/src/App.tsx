import { useEffect, useRef } from 'react';
import { Compass, SlidersHorizontal } from 'lucide-react';
import { useAudioStore, audioEngine } from './store/useAudioStore';

import Header from './components/Header';
import FxRack from './components/FxRack';
import PresetsPanel from './components/PresetsPanel';
import TransportPanel from './components/TransportPanel';
import SpatialRadar from './components/SpatialRadar';

export default function App() {
  const wavesurferRef = useRef<any>(null);
  
  // DOM refs for zero-render high-frequency tick updates
  const progressTimeRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<SVGGElement>(null);
  const coordXRef = useRef<HTMLSpanElement>(null);
  const coordYRef = useRef<HTMLSpanElement>(null);
  const coordPanRef = useRef<HTMLSpanElement>(null);

  const {
    activeTab,
    motionMode,
    setMotionMode,
    spatialParams,
    setSpatialParams,
    setActiveTab
  } = useAudioStore();

  // Keep spatialParams in ref to prevent stale closures in progress callback
  const spatialParamsRef = useRef(spatialParams);
  useEffect(() => {
    spatialParamsRef.current = spatialParams;
  }, [spatialParams]);

  // Hook up engine's progress callback to drive the zero-render visual tick updates
  useEffect(() => {
    audioEngine.setProgressCallback((currentProgress, dur, coordinates) => {
      // Sync WaveSurfer progress bar directly
      if (wavesurferRef.current && dur > 0) {
        wavesurferRef.current.setTime(currentProgress);
      }

      // Update progress time in DOM
      if (progressTimeRef.current) {
        const formatTime = (time: number) => {
          if (isNaN(time) || time === 0) return '0:00';
          const minutes = Math.floor(time / 60);
          const seconds = Math.floor(time % 60);
          return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };
        progressTimeRef.current.textContent = formatTime(currentProgress);
      }

      // Update visualizer cursor transform in DOM
      if (cursorRef.current) {
        cursorRef.current.setAttribute(
          'transform',
          `translate(${170 + coordinates.x * 140}, ${170 - coordinates.y * 140})`
        );
      }

      // Update coordinates text in DOM
      if (coordXRef.current) {
        coordXRef.current.textContent = coordinates.x.toFixed(3);
      }
      if (coordYRef.current) {
        coordYRef.current.textContent = coordinates.y.toFixed(3);
      }
      if (coordPanRef.current) {
        coordPanRef.current.textContent = (coordinates.x * spatialParamsRef.current.width).toFixed(2);
      }
    });

    return () => {
      audioEngine.destroy();
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-studio-bg font-sans text-studio-text select-none">
      
      {/* Top Header */}
      <Header />

      {/* Main Console Workspace */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Equalizer and FX Chain */}
        <section className="w-80 bg-studio-panel border-r border-studio-border flex flex-col">
          <div className="h-11 border-b border-studio-border px-4 flex items-center justify-between bg-studio-dark">
            <div className="flex space-x-2">
              <button 
                onClick={() => setActiveTab('effects')}
                className={`text-[11px] font-mono tracking-wider uppercase px-3 py-1 rounded transition-colors ${activeTab === 'effects' ? 'bg-studio-border text-white' : 'text-studio-muted hover:text-white'}`}
              >
                FX RACK
              </button>
              <button 
                onClick={() => setActiveTab('presets')}
                className={`text-[11px] font-mono tracking-wider uppercase px-3 py-1 rounded transition-colors ${activeTab === 'presets' ? 'bg-studio-border text-white' : 'text-studio-muted hover:text-white'}`}
              >
                PRESETS
              </button>
            </div>
            <SlidersHorizontal className="w-3.5 h-3.5 text-studio-muted" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {activeTab === 'effects' ? <FxRack /> : <PresetsPanel />}
          </div>
        </section>

        {/* Center Column: Waveform and Spatial Visualizer */}
        <section className="flex-1 bg-studio-bg flex flex-col overflow-y-auto min-w-[500px]">
          
          {/* Top visual section: File Loading & Waveform */}
          <TransportPanel 
            wavesurferRef={wavesurferRef} 
            progressTimeRef={progressTimeRef} 
          />

          {/* Bottom visual section: Spatial Radar Screen */}
          <SpatialRadar 
            cursorRef={cursorRef} 
            coordXRef={coordXRef} 
            coordYRef={coordYRef} 
            coordPanRef={coordPanRef} 
          />
        </section>

        {/* Right Column: Spatial Automation controls */}
        <section className="w-80 bg-studio-panel border-l border-studio-border flex flex-col">
          <div className="h-11 border-b border-studio-border px-4 flex items-center justify-between bg-studio-dark">
            <span className="text-[11px] font-mono tracking-wider uppercase text-studio-text">
              SPATIAL ENGINE
            </span>
            <Compass className="w-3.5 h-3.5 text-studio-muted" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Motion Mode selector */}
            <div className="bg-studio-dark p-4 rounded-lg border border-studio-border">
              <label className="text-[10px] font-mono font-bold uppercase text-studio-muted tracking-wider block mb-3">
                TRAJECTORY PATTERNS
              </label>
              
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'stereo-panning', label: 'Stereo Sweep (L to R)' },
                  { id: 'circular', label: 'Circular Rotation' },
                  { id: 'figure-eight', label: 'Figure Eight Path' },
                  { id: 'orbit', label: 'Orbital Path' },
                  { id: 'random', label: 'Random Wander' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      audioEngine.clearManualPosition();
                      setMotionMode(mode.id as any);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-[11px] font-mono border transition-colors ${motionMode === mode.id ? 'bg-studio-accent/10 border-studio-accent text-studio-accent' : 'bg-studio-panel border-studio-border text-studio-text hover:bg-studio-border'}`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Spatial parameters */}
            <div className="bg-studio-dark p-4 rounded-lg border border-studio-border">
              <label className="text-[10px] font-mono font-bold uppercase text-studio-muted tracking-wider block mb-3.5">
                MOTION AUTOMATION
              </label>

              <div className="space-y-4">
                {/* Intensity Slider */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-studio-muted mb-1">
                    <span>INTENSITY (DEPTH)</span>
                    <span>{Math.round(spatialParams.intensity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={spatialParams.intensity}
                    onChange={(e) => setSpatialParams({ intensity: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Speed Slider */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-studio-muted mb-1">
                    <span>AUTOMATION SPEED</span>
                    <span>{spatialParams.speed.toFixed(2)} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="2.5"
                    step="0.05"
                    value={spatialParams.speed}
                    onChange={(e) => setSpatialParams({ speed: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Width Slider */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-studio-muted mb-1">
                    <span>STEREO WIDTH</span>
                    <span>{Math.round(spatialParams.width * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={spatialParams.width}
                    onChange={(e) => setSpatialParams({ width: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Depth (Acoustic absorption) */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-studio-muted mb-1">
                    <span>ABSORPTION DEPTH</span>
                    <span>{Math.round(spatialParams.depth * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={spatialParams.depth}
                    onChange={(e) => setSpatialParams({ depth: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            
            {/* Tech Details block */}
            <div className="bg-studio-dark/50 p-3.5 rounded border border-studio-border font-mono text-[9px] text-studio-muted leading-relaxed">
              <div className="text-[10px] text-studio-text mb-1 uppercase font-bold tracking-wider">ROUTING STAGE:</div>
              <div className="flex justify-between"><span>INPUT:</span> <span className="text-white">STEREO_BUFFER</span></div>
              <div className="flex justify-between"><span>STAGE 1:</span> <span className="text-studio-accent">BIQUAD_EQ</span></div>
              <div className="flex justify-between"><span>STAGE 2:</span> <span className="text-studio-blue">FEEDBACK_DELAY</span></div>
              <div className="flex justify-between"><span>STAGE 3:</span> <span className="text-studio-green">CONVOLVER_REVERB</span></div>
              <div className="flex justify-between"><span>STAGE 4:</span> <span className="text-studio-accent font-bold">HRTF_3D_PANNER</span></div>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom status bar */}
      <footer className="h-6 bg-studio-dark border-t border-studio-border px-4 flex items-center justify-between font-mono text-[10px] text-studio-muted">
        <div className="flex items-center space-x-4">
          <span>LATENCY: ~2.9ms</span>
          <span className="opacity-30">|</span>
          <span>SR: 44.1 kHz</span>
          <span className="opacity-30">|</span>
          <span>BUFFER SIZE: 128kb</span>
        </div>
        <div>
          <span>SPATIALYX LABS // V1.0.0 (BETA)</span>
        </div>
      </footer>
    </div>
  );
}
