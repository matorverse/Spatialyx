/**
 * Spatialyx Shared Core Types & Constants
 */

export interface AudioPlugin {
  id: string;
  name: string;
  initialize(context: AudioContext): void;
  process(input: AudioBuffer): Promise<AudioBuffer> | AudioBuffer;
}

export type MotionMode = 
  | 'stereo-panning'
  | 'circular'
  | 'figure-eight'
  | 'orbit'
  | 'random';

export interface SpatialParameters {
  intensity: number; // 0 to 1
  speed: number;     // Hz or relative velocity multiplier
  width: number;     // 0 to 1 (stereo image width)
  depth: number;     // 0 to 1 (perceived distance depth)
}

export interface ReverbParameters {
  roomSize: number;  // 0 to 1
  decay: number;     // seconds
  wetDryMix: number; // 0 to 1
}

export interface DelayParameters {
  delayTime: number; // seconds
  feedback: number;  // 0 to 1
  wetDryMix: number; // 0 to 1
}

export interface EqualizerParameters {
  low: number;  // gain in dB (-12 to +12)
  mid: number;  // gain in dB (-12 to +12)
  high: number; // gain in dB (-12 to +12)
}

export interface AudioEngineState {
  isPlaying: boolean;
  playbackPosition: number; // progress 0 to 1 or seconds
  duration: number;         // total seconds
  tempo: number;            // BPM (estimated or manual)
  volume: number;           // 0 to 1
}
