# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Velvet is a CUDA-accelerated cloth simulation engine based on Extended Position Based Dynamics (XPBD). It's designed for high-performance GPU-based cloth simulation with real-time applications and educational value.

## Build and Development

### Build Requirements
- **Platform**: Windows (Visual Studio 2019)
- **Compiler**: MSVC v142 toolset
- **Languages**: C++17, CUDA 11.1
- **Dependencies**: Managed via vcpkg

### Build Commands
```bash
# Install dependencies via vcpkg (if not already installed)
./vcpkg.exe install glfw3:x64-windows
./vcpkg.exe install glad:x64-windows
./vcpkg.exe install fmt:x64-windows
./vcpkg.exe install glm:x64-windows
./vcpkg.exe install assimp:x64-windows
./vcpkg.exe install imgui[core, opengl3-binding, glfw-binding]:x64-windows

# Build the project
# Open Velvet.sln in Visual Studio 2019 and build for x64 platform
# Build configurations: Debug|x64, Release|x64

# Run the application
./run_velvet.bat  # Launches built executable from bin/Release/
```

### Development Workflow
- No automated tests are present in the codebase
- Debug by running the application and testing cloth interactions
- Use CUDA Visual Studio integration for GPU kernel debugging
- Performance profiling available via Timer.hpp system

## Architecture Overview

### Core Design Patterns
- **Component-Based Engine**: Entity-component system with Actor/Component hierarchy
- **Dual Solver Architecture**: Separate CPU and GPU implementations for flexibility
- **Resource Management**: Centralized asset loading and GPU buffer management

### Key Components

#### Simulation Pipeline
The cloth simulation follows this pipeline in `VtClothSolverGPU.[hpp,cuh,cu]`:
```c++
CollideSDF(); // Pre-stabilization pass
for (int substep = 0; substep < numSubsteps; substep++) {
    PredictPositions();
    FindNeighborsBySpatialHash();
    CollideParticles();
    CollideSDF();

    for (int iteration = 0; iteration < numIterations; iteration++) {
        SolveStretch();
        SolveAttachment();
        SolveBending();
        ApplyDeltas(); // Jacobi iteration accumulation
    }

    Finalize(); // Update velocities/positions
}
ComputeNormals();
```

#### Constraint System
- **Stretch Constraints**: Distance preservation between particles
- **Attachment Constraints**: Fix particles to world positions
- **Bending Constraints**: Angle preservation for triangle pairs
- **Long Range Attachments**: Prevent excessive stretching

#### Performance Optimizations
- **Atomic Update Reordering**: Optimized GPU atomic operations
- **Spatial Hashing**: Efficient neighbor finding with CUB radix sort
- **Neighbor Caching**: Reuse neighbor information across frames
- **Jacobi Iteration**: Better GPU parallelization vs Gauss-Seidel

### Important Implementation Details

#### Collision Filtering
Particles use collision filtering to prevent artifacts between initially adjacent particles. Implementation uses `initialPositions` buffer to determine initial particle distances during neighbor finding.

#### Avoiding Stretchy Cloth
Uses Long Range Attachments technique to compensate for slower Jacobi convergence. All particles constrained to stay within distances from attachment points via `attachDistances` attribute.

#### GPU Memory Layout
- Coalesced memory access patterns in neighbor arrays
- Structured as `neighbors[i + numMaxNeighborsPerParticle * j]` for particle i's j-th neighbor
- Avoids `neighbors[i * numMaxNeighborsPerParticle + j]` layout

## File Structure

### Core Simulation Files
- `VtClothSolverGPU.cu/.cuh/.hpp`: Main GPU cloth solver
- `VtClothSolverCPU.hpp`: CPU reference implementation
- `SpatialHashGPU.cu/.cuh/.hpp`: GPU spatial hashing system

### Engine Framework
- `VtEngine.hpp/cpp`: Main engine coordinator
- `GameInstance.hpp/cpp`: Core game engine instance
- `Scene.hpp/cpp`: Scene management
- `Actor.hpp/cpp`: Entity system root
- `Component.hpp/cpp`: Base component class

### Rendering System
- `RenderPipeline.hpp`: Rendering pipeline management
- `MeshRenderer.hpp/cpp`: Static mesh rendering
- `ParticleInstancedRenderer.hpp`: Particle rendering
- `Material.hpp`: Material and shader system

### Key Dependencies
- **CUDA 11.1**: GPU computing platform
- **OpenGL**: Graphics rendering (via glad)
- **glfw**: Window management
- **ImGui**: GUI system
- **GLM**: Mathematics library
- **Assimp**: Model loading

## Development Guidelines

### Working with CUDA Kernels
- Use Jacobi iteration for better GPU parallelization
- Implement atomic update reordering for performance
- Consider coalesced memory access patterns
- Leverage CUB library for high-performance sorting

### Constraint Implementation
- Accumulate deltas separately and apply after all constraint solving
- Use collision filtering for stable particle interactions
- Implement Long Range Attachments to prevent stretching

### Performance Considerations
- Profile GPU kernels extensively - small changes can have large impacts
- Use neighbor caching to reduce spatial hash computation
- Consider screen space rendering for high particle counts
- Optimize atomic operations with reordering techniques