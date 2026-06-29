import { useEffect, useRef, useMemo, useState } from 'react';
import { useAudioStore, audioEngine } from '../store/useAudioStore';
import { Compass } from 'lucide-react';

interface SpatialRadarProps {
  cursorRef: React.RefObject<SVGGElement>;
  coordXRef: React.RefObject<HTMLSpanElement>;
  coordYRef: React.RefObject<HTMLSpanElement>;
  coordPanRef: React.RefObject<HTMLSpanElement>;
}

export default function SpatialRadar({ 
  cursorRef, 
  coordXRef, 
  coordYRef, 
  coordPanRef 
}: SpatialRadarProps) {
  const { loadedFileName, motionMode, spatialParams } = useAudioStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // sonart-style canvas FFT frequency visualizer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const dataArray = new Uint8Array(128);

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      audioEngine.getAnalyserData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Sonar pulse rings driven by audio spectrum bands (Lows to Highs)
      for (let i = 0; i < 4; i++) {
        const startIdx = i * 24;
        let sum = 0;
        for (let j = 0; j < 24; j++) {
          sum += dataArray[startIdx + j] || 0;
        }
        const val = sum / 24; // average amplitude (0-255)
        const amplitudeFactor = val / 255;

        // Radiating ring radius influenced by intensity and frequency magnitude
        const baseRadius = 40 + i * 30;
        const radius = baseRadius + amplitudeFactor * 12;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.lineWidth = 1 + amplitudeFactor * 1.5;
        
        // Colors ranging from deep spatial blue to cyan
        const alpha = 0.05 + amplitudeFactor * 0.25;
        ctx.strokeStyle = `rgba(0, 210, 255, ${alpha})`;
        ctx.shadowColor = '#00d2ff';
        ctx.shadowBlur = amplitudeFactor * 6;
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Recalculate guide paths only when motion mode or intensity changes
  const pathDAttribute = useMemo((): string => {
    const size = 340;
    const center = size / 2;
    const radius = 100 * spatialParams.intensity;

    switch (motionMode) {
      case 'stereo-panning':
        return `M ${center - radius} ${center} L ${center + radius} ${center}`;
      case 'circular':
        return `M ${center} ${center} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`;
      case 'figure-eight': {
        let path = '';
        for (let i = 0; i <= 100; i++) {
          const t = (i / 100) * Math.PI * 2;
          const x = center + Math.sin(t) * radius;
          const y = center + Math.sin(2 * t) * radius;
          path += `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
        }
        return path + ' Z';
      }
      case 'orbit': {
        const rx = radius * 0.9;
        const ry = radius * 0.5;
        const cy = center + (radius * 0.3);
        return `M ${center} ${cy} m -${rx}, 0 a ${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 -${rx * 2},0`;
      }
      case 'random': {
        const boxSize = radius * 0.7;
        return `M ${center - boxSize} ${center - boxSize} H ${center + boxSize} V ${center + boxSize} H ${center - boxSize} Z`;
      }
      default:
        return '';
    }
  }, [motionMode, spatialParams.intensity]);

  // Pointer drag coordinate mapper
  const handlePointerUpdate = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    
    // Center point is 170px, 170px inside the 340x340 container
    const dx = clientX - rect.left - 170;
    const dy = clientY - rect.top - 170;

    // Radius boundary = 140px
    let x = dx / 140;
    let y = -dy / 140; // positive Y is North

    // Clamp coordinates to unit circle/square
    x = Math.max(-1.0, Math.min(1.0, x));
    y = Math.max(-1.0, Math.min(1.0, y));

    // Update coordinates directly on engine and DOM refs to prevent React rendering
    audioEngine.setManualPosition(x, y);

    if (cursorRef.current) {
      cursorRef.current.setAttribute('transform', `translate(${170 + x * 140}, ${170 - y * 140})`);
    }
    if (coordXRef.current) {
      coordXRef.current.textContent = x.toFixed(3);
    }
    if (coordYRef.current) {
      coordYRef.current.textContent = y.toFixed(3);
    }
    if (coordPanRef.current) {
      coordPanRef.current.textContent = (x * spatialParams.width).toFixed(2);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!loadedFileName) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerUpdate(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    handlePointerUpdate(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="flex-1 p-6 flex flex-col items-center justify-center grid-bg min-h-[380px] relative">
      {/* Soft grid background */}
      <div className="absolute inset-0 grid-bg-fine pointer-events-none"></div>

      {/* Radar Panel Screen */}
      <div className="relative w-[340px] h-[340px] rounded-full border border-studio-border bg-studio-panel/40 backdrop-blur-md flex items-center justify-center p-6 shadow-2xl overflow-hidden">
        
        {/* Real-time Sonar Canvas FFT visualizer */}
        <canvas 
          ref={canvasRef} 
          width={340} 
          height={340} 
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
        />

        {/* Outer compass marks */}
        <div className="absolute inset-0 rounded-full border border-studio-border/20 border-dashed pointer-events-none scale-[1.08] flex items-center justify-center">
          <div className="absolute top-2 text-[8px] font-mono text-studio-muted">N 0°</div>
          <div className="absolute right-2 text-[8px] font-mono text-studio-muted">E 90°</div>
          <div className="absolute bottom-2 text-[8px] font-mono text-studio-muted">S 180°</div>
          <div className="absolute left-2 text-[8px] font-mono text-studio-muted">W 270°</div>
        </div>

        {/* Dynamic SVG Drawing Trajectory path & active dot */}
        <svg 
          ref={svgRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`w-full h-full absolute inset-0 z-10 ${loadedFileName ? 'cursor-crosshair' : 'pointer-events-none'}`}
        >
          {/* Circular ring boundaries */}
          <circle cx="170" cy="170" r="140" fill="none" stroke="rgba(42, 47, 61, 0.4)" strokeWidth="1" />
          <circle cx="170" cy="170" r="100" fill="none" stroke="rgba(42, 47, 61, 0.4)" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="170" cy="170" r="60" fill="none" stroke="rgba(42, 47, 61, 0.4)" strokeWidth="1" />
          
          {/* Crosshairs */}
          <line x1="170" y1="10" x2="170" y2="330" stroke="rgba(42, 47, 61, 0.3)" strokeWidth="1" />
          <line x1="10" y1="170" x2="330" y2="170" stroke="rgba(42, 47, 61, 0.3)" strokeWidth="1" />

          {/* Trajectory Guide Path */}
          {loadedFileName && (
            <path
              d={pathDAttribute}
              fill="none"
              stroke="rgba(0, 210, 255, 0.2)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              className="radar-sweep"
            />
          )}

          {/* Dynamic Sound Source Cursor */}
          {loadedFileName && (
            <g ref={cursorRef} transform="translate(170, 170)">
              {/* Ring radiating glow */}
              <circle cx="0" cy="0" r="12" fill="none" stroke="#ff5c00" strokeWidth="1.5" className="animate-ping opacity-45" />
              {/* Primary Cursor */}
              <circle cx="0" cy="0" r="7" fill="#ff5c00" stroke="#ffffff" strokeWidth="1.5" className="shadow-studio-glow" />
              {/* Inner core */}
              <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
            </g>
          )}

          {/* Listener Head representation in center */}
          <g transform="translate(170, 170)" className="pointer-events-none">
            <circle cx="0" cy="0" r="10" fill="#1c1f2a" stroke="#2a2f3d" strokeWidth="2" />
            {/* Left Ear */}
            <rect x="-13" y="-4" width="3" height="8" rx="1" fill="#8f96a8" />
            {/* Right Ear */}
            <rect x="10" y="-4" width="3" height="8" rx="1" fill="#8f96a8" />
            {/* Nose point to indicate direction (Facing forward) */}
            <polygon points="0,-13 -3,-10 3,-10" fill="#ff5c00" />
          </g>
        </svg>

        {/* No Source Overlay placeholder */}
        {!loadedFileName && (
          <div className="z-20 text-center px-6 pointer-events-none select-none">
            <Compass className="w-8 h-8 text-studio-muted mx-auto mb-2.5 animate-pulse" />
            <p className="text-xs font-mono text-studio-text">SPATIAL RADAR ACTIVE</p>
            <p className="text-[10px] text-studio-muted mt-1 leading-relaxed">
              Source coordinate tracker mapping real-time binaural distribution. Load an audio track to visualize panning trajectory.
            </p>
          </div>
        )}
      </div>

      {/* Radar Coordinates Overlay badge */}
      {loadedFileName && (
        <div className="absolute bottom-4 bg-studio-panel/90 border border-studio-border rounded px-3 py-1 font-mono text-[10px] text-studio-muted flex space-x-4">
          <div>X: <span ref={coordXRef} className="text-white">0.000</span></div>
          <div>Y: <span ref={coordYRef} className="text-white">0.000</span></div>
          <div>PAN: <span ref={coordPanRef} className="text-studio-accent">0.00</span></div>
        </div>
      )}
    </div>
  );
}
