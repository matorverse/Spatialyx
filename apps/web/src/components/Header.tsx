import { Radio, Volume2 } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';

export default function Header() {
  const { volume, initialized, setVolume } = useAudioStore();

  return (
    <header className="h-14 bg-studio-header border-b border-studio-border px-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded bg-studio-accent flex items-center justify-center shadow-studio-glow">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-semibold text-sm tracking-widest text-white uppercase font-sans">SPATIALYX</span>
          <span className="text-[10px] text-studio-muted font-mono ml-2">// SPATIAL AUDIO LAB</span>
        </div>
      </div>

      {/* Global Output Monitoring */}
      <div className="flex items-center space-x-6">
        {/* Master Volume */}
        <div className="flex items-center space-x-3">
          <Volume2 className="w-4 h-4 text-studio-muted" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-24 accent-studio-accent"
          />
          <span className="text-[11px] font-mono text-studio-muted w-8 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>

        <div className="h-6 w-[1px] bg-studio-border"></div>

        {/* Engine Status Tag */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${initialized ? 'bg-studio-green shadow-studio-green-glow' : 'bg-studio-muted'}`}></div>
          <span className="text-[11px] font-mono text-studio-muted">
            {initialized ? 'ENGINE READY' : 'ENGINE SLEEP'}
          </span>
        </div>
      </div>
    </header>
  );
}
