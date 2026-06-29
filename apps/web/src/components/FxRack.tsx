import { useAudioStore } from '../store/useAudioStore';

export default function FxRack() {
  const { 
    eqParams, 
    setEqParams, 
    delayParams, 
    setDelayParams, 
    reverbParams, 
    setReverbParams 
  } = useAudioStore();

  return (
    <div className="space-y-5">
      {/* 1. Equalizer Section */}
      <div className="bg-studio-dark p-4 rounded-lg border border-studio-border">
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-studio-accent font-mono flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-studio-accent mr-2"></span>
            3-Band Equalizer
          </span>
          <span className="text-[10px] text-studio-muted font-mono">ACTIVE</span>
        </div>
        <div className="space-y-3">
          {/* Low EQ */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-studio-muted mb-1">
              <span>LOW (200Hz)</span>
              <span className={eqParams.low > 0 ? 'text-studio-accent' : 'text-studio-text'}>
                {eqParams.low > 0 ? `+${eqParams.low}` : eqParams.low} dB
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={eqParams.low}
              onChange={(e) => setEqParams({ low: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          {/* Mid EQ */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-studio-muted mb-1">
              <span>MID (1kHz)</span>
              <span className={eqParams.mid > 0 ? 'text-studio-accent' : 'text-studio-text'}>
                {eqParams.mid > 0 ? `+${eqParams.mid}` : eqParams.mid} dB
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={eqParams.mid}
              onChange={(e) => setEqParams({ mid: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          {/* High EQ */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-studio-muted mb-1">
              <span>HIGH (5kHz)</span>
              <span className={eqParams.high > 0 ? 'text-studio-accent' : 'text-studio-text'}>
                {eqParams.high > 0 ? `+${eqParams.high}` : eqParams.high} dB
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={eqParams.high}
              onChange={(e) => setEqParams({ high: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* 2. Delay Section */}
      <div className="bg-studio-dark p-4 rounded-lg border border-studio-border">
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-studio-accent font-mono flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-studio-accent mr-2"></span>
            Delay Engine
          </span>
          <span className="text-[10px] text-studio-muted font-mono">ROUTED</span>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-[10px] font-mono text-studio-muted mb-1">
              <span>TIME</span>
              <span>{Math.round(delayParams.delayTime * 1000)} ms</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.5"
              step="0.01"
              value={delayParams.delayTime}
              onChange={(e) => setDelayParams({ delayTime: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-mono text-studio-muted mb-1">
              <span>FEEDBACK</span>
              <span>{Math.round(delayParams.feedback * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.95"
              step="0.01"
              value={delayParams.feedback}
              onChange={(e) => setDelayParams({ feedback: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-mono text-studio-muted mb-1">
              <span>WET MIX</span>
              <span>{Math.round(delayParams.wetDryMix * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={delayParams.wetDryMix}
              onChange={(e) => setDelayParams({ wetDryMix: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* 3. Reverb Section */}
      <div className="bg-studio-dark p-4 rounded-lg border border-studio-border">
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-studio-accent font-mono flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-studio-accent mr-2"></span>
            Reverb (Convolver)
          </span>
          <span className="text-[10px] text-studio-muted font-mono">SYNTHETIC IR</span>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-[10px] font-mono text-studio-muted mb-1">
              <span>DECAY TIME</span>
              <span>{reverbParams.decay.toFixed(1)} s</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="6.0"
              step="0.1"
              value={reverbParams.decay}
              onChange={(e) => setReverbParams({ decay: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-mono text-studio-muted mb-1">
              <span>WET MIX</span>
              <span>{Math.round(reverbParams.wetDryMix * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={reverbParams.wetDryMix}
              onChange={(e) => setReverbParams({ wetDryMix: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
