# Spatialyx — Immersive Spatial Audio Laboratory

Spatialyx is a privacy-first, fully local, browser-based spatial audio studio for creating immersive audio experiences through real-time digital signal processing (DSP), 3D spatial positioning, and high-fidelity waveform visualizations. 

Designed with engineering precision, Spatialyx provides a playground to enhance, experiment, and automate spatial distribution directly in the browser using standard Web Audio APIs.

---

## 🚀 Key Features

*   **HRTF 3D Spatial Panning Engine**: Implements Web Audio's Head-Related Transfer Function (`HRTF`) panning model with inverse distance roll-offs, mapping coordinates to 3D positions ($X \rightarrow left/right$, $Y \rightarrow front/back$), creating realistic interaural time and level differences (ITD/ILD).
*   **Sonar Canvas visualizer**: Centers a circular `<canvas>` FFT frequency spectrum visualizer inside the visualizer grid. Concentric waves pulsate and radiate dynamically to the active frequency bands of the audio, driven by a native `AnalyserNode`.
*   **Interactive Pointer Dragging**: Pointer event handlers (`onPointerDown`, `onPointerMove`, `onPointerUp`) let you click and drag the sound source directly on the radar screen. Selecting a manual position overrides automation; choosing any trajectory guide resets manual mode and resumes automation.
*   **Performance Optimized (Zero-Render visual ticks)**: Replaced root-level React animation states with DOM references (`useRef`), updating visual coordinates and timing progress directly in the DOM. This reduces React renders during playback from $60\text{Hz}+$ to **$0\text{Hz}$**.
*   **Debounced Convolution Reverb**: Debounces algorithmic white noise impulse response buffer updates by $100\text{ ms}$ during decay drags. This prevents blocking the Web Audio thread and removes audible pop/click artifacts.
*   **Custom Preset Persistence**: Save and name custom configurations of the equalizer, delay, and reverb. Presets are persisted locally using `localStorage` and can be loaded dynamically.
*   **Advanced FX Rack**: Includes a 3-Band cascaded Biquad equalizer, a feedback delay with dry/wet crossfading, and a convolver reverb using optimized exponential decay multiplication ($O(1)$ loop execution).

---

## 🎛️ Audio Signal Routing Pipeline

The signal flow path is constructed using standard Web Audio node connections:

```
[ Stereo Buffer Input ] 
         │
         ▼
[ 3-Band Biquad Filter EQ ] (Lowshelf -> Peaking -> Highshelf)
         │
         ▼
[ Dry/Wet Feedback Delay ] (Dry/Wet Gain Junction & Feedback loop)
         │
         ▼
[ Convolver Reverb ] (Algorithmic white noise exponential decay IR)
         │
         ▼
[ HRTF 3D PannerNode ] (positionX = X * width, positionZ = -Y * depth)
         │
         ▼
[ AnalyserNode ] (128-band frequency visualizer capture)
         │
         ▼
[ Master GainNode ] (Volume attenuation)
         │
         ▼
[ AudioContext Destination ] (Headphones / Speakers)
```

---

## 📁 Workspace Monorepo Structure

Spatialyx is structured as a monorepo workspace managed via `pnpm`:

*   `apps/web`: The Vite React TypeScript frontend dashboard. Houses UI layouts, style systems, components, and the global Zustand state store.
*   `packages/audio-engine`: The core Web Audio wrapper package. Houses playbacks, automation loop calculations, DSP effect chains, and analysis data feeds.
*   `packages/shared`: Shared types, parameter interfaces, and constant definitions used by both the engine and frontend app.

---

## 🛠️ Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18+) and [pnpm](https://pnpm.io/) installed.

### Installation

Clone the repository and install the dependencies from the root directory:

```bash
pnpm install
```

### Running Locally

To run the frontend dev server and start compiling the shared libraries in watch mode:

```bash
# Starts development server (usually local port 3000)
pnpm dev
```

### Production Build

To run type-checks and bundle all packages for production:

```bash
pnpm build
```

---

## 💡 Tech Stack

*   **Core**: HTML5, TypeScript, Web Audio API, HTML5 Canvas
*   **Frontend**: React (v18), Vite, Zustand (State Management)
*   **Styling**: Tailwind CSS
*   **Bundling**: tsup (for shared packages), Vite (for Web App)
