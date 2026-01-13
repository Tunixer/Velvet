# Velvet WebGPU

WebGPU cloth simulation engine ported from Velvet CUDA.

## Overview

This is a TypeScript/WebGPU port of the Velvet cloth simulation engine, which uses Extended Position Based Dynamics (XPBD) for realistic cloth physics.

## Features

- ✅ **WebGPU Compute Shaders** - GPU-accelerated physics simulation
- ✅ **TypeScript** - Type-safe development experience
- ✅ **Three.js Integration** - Easy rendering pipeline
- ✅ **Mobile Optimized** - Designed for mobile browsers with WebGPU support
- ✅ **Adaptive Quality** - Automatic quality scaling for smooth 60 FPS

## Requirements

- Browser with WebGPU support (Chrome 113+, Edge 113+)
- Node.js 18+ for development
- pnpm for package management

## Development

### Installation

```bash
cd Velvet-ts
pnpm install
```

### Development Server

```bash
pnpm dev
```

Open http://localhost:3000 in your browser.

### Build

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

## Project Structure

```
Velvet-ts/
├── src/
│   ├── core/           # Core physics engine
│   │   ├── ClothSolverWebGPU.ts    # Main XPBD solver ✅
│   │   ├── GPUBuffers.ts           # Buffer management ✅
│   │   ├── ComputePipelines.ts     # Pipeline management ✅
│   │   └── types.ts                # Type definitions ✅
│   ├── shaders/        # WGSL compute shaders
│   │   ├── predict_positions.wgsl  # Position prediction ✅
│   │   ├── finalize_velocities.wgsl # Velocity update ✅
│   │   ├── solve_stretch.wgsl      # Stretch constraints ✅
│   │   ├── solve_attachment.wgsl   # Attachment constraints ✅
│   │   └── apply_deltas.wgsl       # Jacobi iteration ✅
│   ├── rendering/      # Three.js integration
│   ├── utils/          # Utilities
│   ├── ui/             # UI components
│   └── examples/       # Example scenes
├── public/             # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

## Implementation Status

### ✅ Completed (Phase 1: Core Physics)
- [x] GPU buffer management system
- [x] Compute pipeline management
- [x] Position prediction shader
- [x] Stretch constraint solver
- [x] Attachment constraint solver
- [x] Jacobi iteration delta application
- [x] Velocity/position finalization
- [x] Basic cloth solver class
- [x] Game loop with FPS tracking

### ⏳ In Progress
- [ ] Three.js rendering integration
- [ ] Visual debugging (render particles/constraints)

### 📋 Pending (Phase 2: Collision & Advanced Features)
- [ ] SDF collision detection
- [ ] Bending constraints
- [ ] Self-collision system
- [ ] Adaptive quality scaling
- [ ] Performance monitoring


## Performance Targets

- **5,000 particles**: 60 FPS on modern mobile devices
- **10,000 particles**: 45-60 FPS with optimizations
- **20,000 particles**: 30-45 FPS with simplified physics

## Original Velvet (C++/CUDA)

This is a TypeScript/WebGPU port of the Velvet cloth simulation engine. The original CUDA implementation is in the parent directory.

### Key Differences from CUDA Version

1. **WebGPU instead of CUDA** - Runs in browsers without native dependencies
2. **Uniform Grid instead of Spatial Hashing** - Better mobile performance
3. **Adaptive Quality** - Automatic quality scaling for smooth gameplay
4. **Three.js Integration** - Easy to use with existing Three.js projects

## License

See parent directory for license information.

## References

- [WebGPU Specification](https://www.w3.org/TR/webgpu/)
- [Three.js](https://threejs.org/)
- [XPBD Paper](https://matthias-research.github.io/pages/tenMinutePhysics/08-xpbd.html)
