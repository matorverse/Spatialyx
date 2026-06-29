import { useState, useEffect } from 'react';
import { useAudioStore } from '../store/useAudioStore';
import { SlidersHorizontal } from 'lucide-react';

export default function PresetsPanel() {
  const { applyPreset, saveCustomPreset, customPresets, loadCustomPresets } = useAudioStore();
  const [newPresetName, setNewPresetName] = useState('');

  // Load custom presets on mount
  useEffect(() => {
    loadCustomPresets();
  }, [loadCustomPresets]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    saveCustomPreset(newPresetName.trim());
    setNewPresetName('');
  };

  const builtInPresets = [
    { name: 'Concert Hall', desc: 'Large space with rich tail' },
    { name: 'Stadium', desc: 'Epic stadium echo and heavy delay' },
    { name: 'Cinema', desc: 'Rich dialog lows and wide surround spatial' },
    { name: 'EDM', desc: 'Tight dynamic EQ punch and high width' },
    { name: 'Gaming', desc: 'Crisp transients, immediate spatial positioning' },
    { name: 'Lo-Fi', desc: 'Warm mids, reduced highs, retro echo' },
  ];

  return (
    <div className="space-y-4">
      {/* Save Custom Preset Form */}
      <form onSubmit={handleSave} className="bg-studio-dark p-4 rounded-lg border border-studio-border">
        <label className="text-[10px] font-mono font-bold uppercase text-studio-muted tracking-wider block mb-2">
          SAVE CURRENT CONFIG AS PRESET
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Preset Name..."
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            className="flex-1 bg-studio-panel border border-studio-border text-xs px-3 py-1.5 rounded text-white focus:outline-none focus:border-studio-accent font-mono"
            maxLength={20}
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-studio-accent hover:bg-studio-accent-hover text-white text-[11px] font-mono rounded transition-colors"
          >
            SAVE
          </button>
        </div>
      </form>

      {/* Built-in Presets */}
      <div>
        <label className="text-[10px] font-mono font-bold uppercase text-studio-muted tracking-wider block mb-2 px-1">
          BUILT-IN PRESETS
        </label>
        <div className="grid grid-cols-1 gap-2">
          {builtInPresets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset.name)}
              className="p-3 bg-studio-dark hover:bg-studio-border border border-studio-border text-left rounded-lg transition-colors group"
            >
              <div className="text-xs font-mono font-bold text-white group-hover:text-studio-accent">
                {preset.name.toUpperCase()}
              </div>
              <div className="text-[10px] text-studio-muted mt-1 leading-relaxed">
                {preset.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Presets Section */}
      {customPresets.length > 0 && (
        <div>
          <label className="text-[10px] font-mono font-bold uppercase text-studio-muted tracking-wider block mb-2 px-1">
            CUSTOM PRESETS
          </label>
          <div className="grid grid-cols-1 gap-2">
            {customPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset.name)}
                className="p-3 bg-studio-dark hover:bg-studio-border border border-studio-border text-left rounded-lg transition-colors group flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-mono font-bold text-white group-hover:text-studio-accent">
                    {preset.name.toUpperCase()}
                  </div>
                  <div className="text-[9px] text-studio-muted mt-0.5 font-mono">
                    CUSTOM PRESET
                  </div>
                </div>
                <SlidersHorizontal className="w-3.5 h-3.5 text-studio-muted group-hover:text-studio-accent" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
