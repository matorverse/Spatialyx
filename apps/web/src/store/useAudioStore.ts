import { create } from 'zustand';
import { SpatialyxAudioEngine } from '@spatialyx/audio-engine';
import { 
  MotionMode, 
  SpatialParameters, 
  ReverbParameters, 
  DelayParameters, 
  EqualizerParameters 
} from '@spatialyx/shared';

// Global engine instance
export const audioEngine = new SpatialyxAudioEngine();

interface AudioState {
  initialized: boolean;
  isPlaying: boolean;
  isLooping: boolean;
  isDecoding: boolean;
  loadedFileName: string;
  duration: number;
  activeTab: 'effects' | 'presets';
  volume: number;
  motionMode: MotionMode;
  spatialParams: SpatialParameters;
  eqParams: EqualizerParameters;
  delayParams: DelayParameters;
  reverbParams: ReverbParameters;
  customPresets: Array<{ name: string; eq: EqualizerParameters; delay: DelayParameters; reverb: ReverbParameters }>;

  // Actions
  setInitialized: (val: boolean) => void;
  setIsPlaying: (val: boolean) => void;
  setIsLooping: (val: boolean) => void;
  setIsDecoding: (val: boolean) => void;
  setLoadedFileName: (name: string) => void;
  setDuration: (dur: number) => void;
  setActiveTab: (tab: 'effects' | 'presets') => void;
  
  setVolume: (val: number) => void;
  setMotionMode: (mode: MotionMode) => void;
  setSpatialParams: (params: Partial<SpatialParameters>) => void;
  setEqParams: (params: Partial<EqualizerParameters>) => void;
  setDelayParams: (params: Partial<DelayParameters>) => void;
  setReverbParams: (params: Partial<ReverbParameters>) => void;

  initializeEngine: () => Promise<void>;
  handlePlayPause: () => Promise<void>;
  handleStop: () => void;
  handleLoopToggle: () => void;
  loadTestSynth: (wavesurferRef: any) => Promise<void>;
  handleFileUpload: (file: File, wavesurferRef: any) => Promise<void>;
  applyPreset: (presetName: string) => void;
  saveCustomPreset: (name: string) => void;
  loadCustomPresets: () => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  initialized: false,
  isPlaying: false,
  isLooping: true,
  isDecoding: false,
  loadedFileName: '',
  duration: 0,
  activeTab: 'effects',
  volume: 0.7,
  motionMode: 'circular',
  spatialParams: {
    intensity: 0.8,
    speed: 0.5,
    width: 0.8,
    depth: 0.6
  },
  eqParams: {
    low: 2,
    mid: -1,
    high: 3
  },
  delayParams: {
    delayTime: 0.35,
    feedback: 0.45,
    wetDryMix: 0.3
  },
  reverbParams: {
    roomSize: 0.6,
    decay: 2.0,
    wetDryMix: 0.25
  },
  customPresets: [],

  setInitialized: (val) => set({ initialized: val }),
  setIsPlaying: (val) => set({ isPlaying: val }),
  setIsLooping: (val) => set({ isLooping: val }),
  setIsDecoding: (val) => set({ isDecoding: val }),
  setLoadedFileName: (name) => set({ loadedFileName: name }),
  setDuration: (dur) => set({ duration: dur }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  setVolume: (val) => {
    set({ volume: val });
    audioEngine.setVolume(val);
  },
  setMotionMode: (mode) => {
    set({ motionMode: mode });
    audioEngine.setMotionMode(mode);
  },
  setSpatialParams: (params) => {
    set((state) => {
      const next = { ...state.spatialParams, ...params };
      audioEngine.setSpatialParameters(next);
      return { spatialParams: next };
    });
  },
  setEqParams: (params) => {
    set((state) => {
      const next = { ...state.eqParams, ...params };
      audioEngine.setEqualizer(next);
      return { eqParams: next };
    });
  },
  setDelayParams: (params) => {
    set((state) => {
      const next = { ...state.delayParams, ...params };
      audioEngine.setDelay(next);
      return { delayParams: next };
    });
  },
  setReverbParams: (params) => {
    set((state) => {
      const next = { ...state.reverbParams, ...params };
      audioEngine.setReverb(next);
      return { reverbParams: next };
    });
  },

  initializeEngine: async () => {
    if (get().initialized) return;
    await audioEngine.initialize();
    
    // Sync initial states to engine
    const state = get();
    audioEngine.setVolume(state.volume);
    audioEngine.setMotionMode(state.motionMode);
    audioEngine.setSpatialParameters(state.spatialParams);
    audioEngine.setEqualizer(state.eqParams);
    audioEngine.setDelay(state.delayParams);
    audioEngine.setReverb(state.reverbParams);
    audioEngine.setLoop(state.isLooping);

    set({ initialized: true });
  },

  handlePlayPause: async () => {
    await get().initializeEngine();
    const { isPlaying } = get();

    if (isPlaying) {
      audioEngine.pause();
      set({ isPlaying: false });
    } else {
      await audioEngine.play();
      set({ isPlaying: true });
    }
  },

  handleStop: () => {
    audioEngine.stop();
    set({ isPlaying: false });
  },

  handleLoopToggle: () => {
    const nextVal = !get().isLooping;
    set({ isLooping: nextVal });
    audioEngine.setLoop(nextVal);
  },

  loadTestSynth: async (wavesurferRef) => {
    set({ isDecoding: true });
    try {
      await get().initializeEngine();
      audioEngine.generateSyntheticBuffer();
      const buffer = audioEngine.getAudioBuffer();
      if (buffer) {
        set({
          loadedFileName: 'Ambient Synth Pulse (Generated)',
          duration: buffer.duration,
        });

        if (wavesurferRef.current) {
          const channelData = buffer.getChannelData(0);
          wavesurferRef.current.load('', [channelData], buffer.duration);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ isDecoding: false });
    }
  },

  handleFileUpload: async (file, wavesurferRef) => {
    set({ isDecoding: true, loadedFileName: file.name });
    try {
      await get().initializeEngine();
      const arrayBuffer = await file.arrayBuffer();
      const context = (audioEngine as any).ctx;
      if (context) {
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        audioEngine.setAudioBuffer(audioBuffer);
        set({
          duration: audioBuffer.duration,
          isPlaying: false
        });

        if (wavesurferRef.current) {
          const channelData = audioBuffer.getChannelData(0);
          wavesurferRef.current.load('', [channelData], audioBuffer.duration);
        }
      }
    } catch (err) {
      console.error('Failed to decode file:', err);
      alert('Could not decode audio file. Make sure it is a valid MP3, WAV, or OGG file.');
    } finally {
      set({ isDecoding: false });
    }
  },

  applyPreset: (presetName) => {
    const apply = (r: Partial<ReverbParameters>, d: Partial<DelayParameters>, eq: Partial<EqualizerParameters>) => {
      get().setReverbParams(r);
      get().setDelayParams(d);
      get().setEqParams(eq);
    };

    switch (presetName) {
      case 'Concert Hall':
        apply({ roomSize: 0.8, decay: 3.5, wetDryMix: 0.45 }, { delayTime: 0.4, feedback: 0.3, wetDryMix: 0.15 }, { low: 3, mid: -1, high: -2 });
        break;
      case 'Stadium':
        apply({ roomSize: 0.95, decay: 5.5, wetDryMix: 0.55 }, { delayTime: 0.6, feedback: 0.55, wetDryMix: 0.35 }, { low: 4, mid: -2, high: 2 });
        break;
      case 'Cinema':
        apply({ roomSize: 0.7, decay: 2.2, wetDryMix: 0.3 }, { delayTime: 0.25, feedback: 0.2, wetDryMix: 0.1 }, { low: 6, mid: 0, high: 4 });
        break;
      case 'EDM':
        apply({ roomSize: 0.5, decay: 1.2, wetDryMix: 0.2 }, { delayTime: 0.33, feedback: 0.4, wetDryMix: 0.25 }, { low: 5, mid: -1, high: 4 });
        break;
      case 'Gaming':
        apply({ roomSize: 0.4, decay: 1.0, wetDryMix: 0.15 }, { delayTime: 0.18, feedback: 0.3, wetDryMix: 0.2 }, { low: 2, mid: 2, high: 5 });
        break;
      case 'Lo-Fi':
        apply({ roomSize: 0.6, decay: 1.8, wetDryMix: 0.35 }, { delayTime: 0.5, feedback: 0.5, wetDryMix: 0.4 }, { low: -4, mid: 4, high: -6 });
        break;
      default:
        // Try custom preset
        const custom = get().customPresets.find(p => p.name === presetName);
        if (custom) {
          apply({ roomSize: 0.5, decay: custom.reverb.decay, wetDryMix: custom.reverb.wetDryMix }, custom.delay, custom.eq);
        }
        break;
    }
  },

  saveCustomPreset: (name) => {
    const newPreset = {
      name,
      eq: get().eqParams,
      delay: get().delayParams,
      reverb: get().reverbParams,
    };
    set((state) => {
      const nextList = [...state.customPresets.filter(p => p.name !== name), newPreset];
      localStorage.setItem('spatialyx_presets', JSON.stringify(nextList));
      return { customPresets: nextList };
    });
  },

  loadCustomPresets: () => {
    try {
      const raw = localStorage.getItem('spatialyx_presets');
      if (raw) {
        set({ customPresets: JSON.parse(raw) });
      }
    } catch (err) {
      console.error('Failed to load custom presets', err);
    }
  }
}));
