import { 
  MotionMode, 
  SpatialParameters, 
  ReverbParameters, 
  DelayParameters, 
  EqualizerParameters 
} from '@spatialyx/shared';

export class SpatialyxAudioEngine {
  private ctx: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;

  // Nodes in the routing chain
  private eqLow: BiquadFilterNode | null = null;
  private eqMid: BiquadFilterNode | null = null;
  private eqHigh: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayDryGain: GainNode | null = null;
  private delayWetGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbDryGain: GainNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private pannerNode: PannerNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private volumeNode: GainNode | null = null;

  // Manual drag position override
  private isManualPosition: boolean = false;
  private manualCoords = { x: 0, y: 0 };

  // Animation / Automation frame
  private automationFrameId: number | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;
  private isLooping: boolean = true;

  // Config parameters
  private spatialParams: SpatialParameters = { intensity: 0.8, speed: 0.5, width: 0.8, depth: 0.5 };
  private motionMode: MotionMode = 'stereo-panning';
  private eqParams: EqualizerParameters = { low: 0, mid: 0, high: 0 };
  private delayParams: DelayParameters = { delayTime: 0.3, feedback: 0.4, wetDryMix: 0.3 };
  private reverbParams: ReverbParameters = { roomSize: 0.5, decay: 1.5, wetDryMix: 0.3 };
  private volume: number = 0.8;

  // Debounce/reuse trackers to optimize performance
  private reverbTimeoutId: number | null = null;
  private spatialCoordinates = { x: 0, y: 0 };

  // Visual feedback callback
  private onPositionUpdate: ((position: number, duration: number, coordinates: { x: number; y: number }) => void) | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction (start)
  }

  public async initialize(): Promise<void> {
    if (this.ctx) return;
    
    // Ensure we handle browser vendor prefixes
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    this.setupEffectChain();
  }

  private setupEffectChain(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;

    // 1. Equalizer Nodes (Low, Mid, High cascade)
    this.eqLow = ctx.createBiquadFilter();
    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.value = 200; // Hz

    this.eqMid = ctx.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.Q.value = 1.0;
    this.eqMid.frequency.value = 1000; // Hz

    this.eqHigh = ctx.createBiquadFilter();
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.value = 5000; // Hz

    // Chain EQ nodes
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);

    // 2. Delay Sub-chain (Dry/Wet Split)
    this.delayNode = ctx.createDelay(2.0); // max delay 2s
    this.delayFeedback = ctx.createGain();
    this.delayDryGain = ctx.createGain();
    this.delayWetGain = ctx.createGain();

    this.delayNode.delayTime.value = this.delayParams.delayTime;
    this.delayFeedback.gain.value = this.delayParams.feedback;
    
    // Split EQ output into dry/wet paths
    this.eqHigh.connect(this.delayDryGain);
    this.eqHigh.connect(this.delayNode);

    // Delay Feedback Loop
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);

    // Connect delay output to wet gain
    this.delayNode.connect(this.delayWetGain);

    // Combine Dry/Wet delay paths at a junction node (we use reverb input)
    this.reverbNode = ctx.createConvolver();
    this.reverbDryGain = ctx.createGain();
    this.reverbWetGain = ctx.createGain();

    // Set up default synthetic impulse response
    this.updateReverbImpulse();

    const delayJunction = ctx.createGain();
    this.delayDryGain.connect(delayJunction);
    this.delayWetGain.connect(delayJunction);

    // Apply delay mixes
    this.updateDelayMix();

    // 3. Reverb Sub-chain (Dry/Wet Split)
    delayJunction.connect(this.reverbDryGain);
    delayJunction.connect(this.reverbNode);

    const reverbJunction = ctx.createGain();
    this.reverbDryGain.connect(reverbJunction);
    this.reverbNode.connect(this.reverbWetGain);
    this.reverbWetGain.connect(reverbJunction);

    this.updateReverbMix();

    // 4. Spatial Engine (HRTF 3D Panner)
    this.pannerNode = ctx.createPanner();
    this.pannerNode.panningModel = 'HRTF';
    this.pannerNode.distanceModel = 'inverse';
    this.pannerNode.refDistance = 1;
    this.pannerNode.maxDistance = 100;
    this.pannerNode.rolloffFactor = 1;
    reverbJunction.connect(this.pannerNode);

    // 5. Master Output & Analyzer
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 256; // 128 frequency bands
    this.pannerNode.connect(this.analyserNode);

    this.volumeNode = ctx.createGain();
    this.volumeNode.gain.value = this.volume;
    
    this.analyserNode.connect(this.volumeNode);
    this.volumeNode.connect(ctx.destination);
  }

  // Generate a premium ambient pulsing stereo synth line for quick testing
  public generateSyntheticBuffer(): void {
    if (!this.ctx) return;

    const sampleRate = this.ctx.sampleRate;
    const duration = 10; // seconds
    const numSamples = sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, numSamples, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    // Create a beautiful musical arpeggio
    // Notes: C3 (130.81Hz), E3 (164.81Hz), G3 (196.00Hz), C4 (261.63Hz)
    const notes = [130.81, 164.81, 196.00, 261.63, 329.63, 392.00, 523.25];
    const bpm = 120;
    const sixteenthDuration = 60 / bpm / 4; // seconds
    const samplePerSixteenth = sampleRate * sixteenthDuration;

    for (let i = 0; i < numSamples; i++) {
      const time = i / sampleRate;
      const step = Math.floor(i / samplePerSixteenth);
      const noteIndex = step % notes.length;
      const noteFreq = notes[noteIndex];

      // Envelope: sharp attack, decay, rhythmic pulse
      const stepProgress = (i % samplePerSixteenth) / samplePerSixteenth;
      const ampEnvelope = Math.pow(1 - stepProgress, 2.5);

      // Synthesizer voice (combining fundamental and harmonics for a warm sound)
      let signal = Math.sin(2 * Math.PI * noteFreq * time) * 0.5;
      signal += Math.sin(4 * Math.PI * noteFreq * time) * 0.25; // 2nd harmonic
      signal += Math.sin(6 * Math.PI * noteFreq * time) * 0.125; // 3rd harmonic
      
      // Add a subtle LFO filter modulation
      const lfoSpeed = 0.5; // Hz
      const lfo = Math.sin(2 * Math.PI * lfoSpeed * time) * 0.4 + 0.6;
      signal *= ampEnvelope * lfo;

      // Stereo field distribution (slight phase/freq shift for stereo interest)
      left[i] = signal * 0.3;
      right[i] = signal * 0.3;
    }

    this.audioBuffer = buffer;
  }

  public setAudioBuffer(buffer: AudioBuffer): void {
    this.audioBuffer = buffer;
    this.stop();
  }

  public getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  public setProgressCallback(cb: (pos: number, dur: number, coords: { x: number; y: number }) => void): void {
    this.onPositionUpdate = cb;
  }

  // --- PLAYBACK CONTROLS ---

  public async play(): Promise<void> {
    await this.initialize();
    if (!this.ctx || !this.audioBuffer || this.isPlaying) return;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.loop = this.isLooping;

    // Connect source to start of effect chain (EQ Low)
    if (this.eqLow) {
      this.sourceNode.connect(this.eqLow);
    }

    this.startTime = this.ctx.currentTime - this.pauseTime;
    this.sourceNode.start(0, this.pauseTime % this.audioBuffer.duration);
    
    this.isPlaying = true;
    this.startAutomationLoop();
  }

  public pause(): void {
    if (!this.ctx || !this.isPlaying || !this.sourceNode) return;
    
    this.sourceNode.stop();
    this.sourceNode.disconnect();
    this.sourceNode = null;
    
    this.pauseTime = this.ctx.currentTime - this.startTime;
    this.isPlaying = false;
    this.stopAutomationLoop();
  }

  public stop(): void {
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.reverbTimeoutId !== null) {
      clearTimeout(this.reverbTimeoutId);
      this.reverbTimeoutId = null;
    }
    this.pauseTime = 0;
    this.startTime = 0;
    this.isPlaying = false;
    this.stopAutomationLoop();
    this.triggerProgressUpdate(0, 0);
  }

  public seek(position: number): void {
    if (!this.audioBuffer) return;
    
    const wasPlaying = this.isPlaying;
    this.stop();
    this.pauseTime = Math.max(0, Math.min(position, this.audioBuffer.duration));
    
    if (wasPlaying) {
      this.play();
    } else {
      this.triggerProgressUpdate(this.pauseTime, 0);
    }
  }

  public setLoop(loop: boolean): void {
    this.isLooping = loop;
    if (this.sourceNode) {
      this.sourceNode.loop = loop;
    }
  }

  public setVolume(volume: number): void {
    this.volume = volume;
    if (this.volumeNode && this.ctx) {
      this.volumeNode.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
    }
  }

  // --- PARAMETER UPDATE HANDLERS ---

  public setEqualizer(params: Partial<EqualizerParameters>): void {
    this.eqParams = { ...this.eqParams, ...params };
    if (!this.ctx) return;
    
    const time = this.ctx.currentTime;
    if (this.eqLow && params.low !== undefined) {
      this.eqLow.gain.setTargetAtTime(params.low, time, 0.1);
    }
    if (this.eqMid && params.mid !== undefined) {
      this.eqMid.gain.setTargetAtTime(params.mid, time, 0.1);
    }
    if (this.eqHigh && params.high !== undefined) {
      this.eqHigh.gain.setTargetAtTime(params.high, time, 0.1);
    }
  }

  public setDelay(params: Partial<DelayParameters>): void {
    this.delayParams = { ...this.delayParams, ...params };
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    if (this.delayNode && params.delayTime !== undefined) {
      this.delayNode.delayTime.setTargetAtTime(params.delayTime, time, 0.1);
    }
    if (this.delayFeedback && params.feedback !== undefined) {
      this.delayFeedback.gain.setTargetAtTime(params.feedback, time, 0.1);
    }
    if (params.wetDryMix !== undefined) {
      this.updateDelayMix();
    }
  }

  public setReverb(params: Partial<ReverbParameters>): void {
    const prevDecay = this.reverbParams.decay;
    this.reverbParams = { ...this.reverbParams, ...params };
    
    if (!this.ctx) return;

    // Regenerate impulse response buffer if parameters that alter it changed
    if (params.decay !== undefined && params.decay !== prevDecay) {
      if (this.reverbTimeoutId !== null) {
        clearTimeout(this.reverbTimeoutId);
      }
      this.reverbTimeoutId = window.setTimeout(() => {
        this.updateReverbImpulse();
        this.reverbTimeoutId = null;
      }, 100) as unknown as number;
    }

    if (params.wetDryMix !== undefined) {
      this.updateReverbMix();
    }
  }

  public setSpatialParameters(params: Partial<SpatialParameters>): void {
    this.spatialParams = { ...this.spatialParams, ...params };
  }

  public setMotionMode(mode: MotionMode): void {
    this.motionMode = mode;
  }

  // --- HELPER CONFIG METHODS ---

  private updateDelayMix(): void {
    if (!this.ctx || !this.delayDryGain || !this.delayWetGain) return;
    const time = this.ctx.currentTime;
    const mix = this.delayParams.wetDryMix;
    
    // Constant-power dry/wet crossfade
    this.delayDryGain.gain.setTargetAtTime(Math.cos(mix * Math.PI * 0.5), time, 0.05);
    this.delayWetGain.gain.setTargetAtTime(Math.sin(mix * Math.PI * 0.5), time, 0.05);
  }

  private updateReverbMix(): void {
    if (!this.ctx || !this.reverbDryGain || !this.reverbWetGain) return;
    const time = this.ctx.currentTime;
    const mix = this.reverbParams.wetDryMix;
    
    this.reverbDryGain.gain.setTargetAtTime(Math.cos(mix * Math.PI * 0.5), time, 0.05);
    this.reverbWetGain.gain.setTargetAtTime(Math.sin(mix * Math.PI * 0.5), time, 0.05);
  }

  private updateReverbImpulse(): void {
    if (!this.ctx || !this.reverbNode) return;
    
    const decay = this.reverbParams.decay;
    const duration = decay * 2; // general reverb length
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    
    // Generate simple synthetic algorithmic reverb impulse (white noise decay)
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    const decayFactor = decay * 1.5;
    const rate = Math.exp(-decayFactor / length);
    let envelope = 0.5;

    for (let i = 0; i < length; i++) {
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
      envelope *= rate;
    }

    this.reverbNode.buffer = impulse;
  }

  // --- AUTOMATION & MOTION LOOPS ---

  private startAutomationLoop(): void {
    const tick = () => {
      if (!this.isPlaying || !this.ctx || !this.audioBuffer) return;

      const currentTime = this.ctx.currentTime;
      const elapsed = currentTime - this.startTime;
      const progress = elapsed % this.audioBuffer.duration;

      // Compute coordinate calculations based on automation mode
      let coords;
      if (this.isManualPosition) {
        coords = this.manualCoords;
      } else {
        coords = this.calculateSpatialCoordinates(currentTime);
      }

      // Apply the computed coordinates to HRTF 3D Panner
      if (this.pannerNode) {
        const width = this.spatialParams.width;
        const depth = this.spatialParams.depth;
        this.pannerNode.positionX.setTargetAtTime(coords.x * width, currentTime, 0.02);
        this.pannerNode.positionY.setTargetAtTime(0, currentTime, 0.02);
        this.pannerNode.positionZ.setTargetAtTime(-coords.y * depth, currentTime, 0.02);
      }

      // Proximity effect: adjust volume & filter based on Y coordinate (depth)
      if (this.volumeNode && this.eqHigh) {
        const depth = this.spatialParams.depth;
        
        // As item moves further away (smaller Y coordinate or closer to margins), volume drops slightly
        // Y coordinate ranges from [-1, 1], where 1 is close and -1 is distant.
        const proximityVolume = 0.7 + (coords.y + 1) * 0.15; // ranges from 0.7 to 1.0
        const finalVol = this.volume * proximityVolume;
        this.volumeNode.gain.setTargetAtTime(finalVol, currentTime, 0.02);

        // Standard acoustic absorption simulation: lose higher frequencies as distance grows
        const baseFrequency = 5000;
        const targetFreq = baseFrequency + (coords.y + 1) * 1500 * depth; // filter sweep based on distance
        this.eqHigh.frequency.setTargetAtTime(targetFreq, currentTime, 0.02);
      }

      this.triggerProgressUpdate(progress, coords);
      this.automationFrameId = requestAnimationFrame(tick);
    };

    this.automationFrameId = requestAnimationFrame(tick);
  }

  private stopAutomationLoop(): void {
    if (this.automationFrameId !== null) {
      cancelAnimationFrame(this.automationFrameId);
      this.automationFrameId = null;
    }
  }

  private calculateSpatialCoordinates(time: number): { x: number; y: number } {
    const speed = this.spatialParams.speed * 2.0; // speed multiplier
    const intensity = this.spatialParams.intensity;

    let x = 0;
    let y = 1; // 1 means full close center

    switch (this.motionMode) {
      case 'stereo-panning':
        // Linear left-to-right sweep
        x = Math.sin(time * speed);
        y = 0; // centered in depth
        break;

      case 'circular':
        // Standard circle rotation
        x = Math.sin(time * speed);
        y = Math.cos(time * speed);
        break;

      case 'figure-eight':
        // Lissajous curve
        x = Math.sin(time * speed);
        y = Math.sin(2 * time * speed);
        break;

      case 'orbit':
        // Dynamic ellipse representing an orbiting object
        x = Math.sin(time * speed) * 0.9;
        y = Math.cos(time * speed) * 0.5 + 0.3; // moves forward & backward
        break;

      case 'random':
        // Brownian noise random wandering (simulated via smooth overlapping sine oscillations)
        x = Math.sin(time * speed) * 0.6 + Math.sin(time * speed * 0.31) * 0.4;
        y = Math.cos(time * speed * 0.82) * 0.6 + Math.sin(time * speed * 0.17) * 0.4;
        break;
    }

    // Scale coordinates by intensity and write into reusable object to avoid GC pressure
    this.spatialCoordinates.x = x * intensity;
    this.spatialCoordinates.y = y * intensity;
    return this.spatialCoordinates;
  }

  private triggerProgressUpdate(progress: number, coords: { x: number; y: number } | number): void {
    if (this.onPositionUpdate && this.audioBuffer) {
      const dur = this.audioBuffer.duration;
      const actualCoords = typeof coords === 'object' ? coords : { x: 0, y: 0 };
      this.onPositionUpdate(progress, dur, actualCoords);
    }
  }

  // Release memory/context when destroying engine
  public destroy(): void {
    this.stop();
    if (this.reverbTimeoutId !== null) {
      clearTimeout(this.reverbTimeoutId);
      this.reverbTimeoutId = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }

  // --- MANUAL POSITION OVERRIDES & VISUALIZATION DATA ---

  public setManualPosition(x: number, y: number): void {
    this.isManualPosition = true;
    this.manualCoords.x = x;
    this.manualCoords.y = y;
    
    // Immediately apply position parameters if engine is playing
    if (this.ctx && this.pannerNode) {
      const time = this.ctx.currentTime;
      const width = this.spatialParams.width;
      const depth = this.spatialParams.depth;
      
      this.pannerNode.positionX.setTargetAtTime(x * width, time, 0.02);
      this.pannerNode.positionY.setTargetAtTime(0, time, 0.02);
      this.pannerNode.positionZ.setTargetAtTime(-y * depth, time, 0.02);
      
      this.triggerProgressUpdate(this.getCurrentPlaybackProgress(), { x, y });
    }
  }

  public clearManualPosition(): void {
    this.isManualPosition = false;
  }

  private getCurrentPlaybackProgress(): number {
    if (!this.isPlaying || !this.ctx || !this.audioBuffer) return 0;
    const elapsed = this.ctx.currentTime - this.startTime;
    return elapsed % this.audioBuffer.duration;
  }

  public getAnalyserData(array: Uint8Array): void {
    if (this.analyserNode) {
      this.analyserNode.getByteFrequencyData(array as any);
    } else {
      array.fill(0);
    }
  }
}
