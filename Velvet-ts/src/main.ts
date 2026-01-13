/**
 * Velvet WebGPU - Main Entry Point
 *
 * This is the main entry point for the WebGPU cloth simulation engine.
 * It initializes WebGPU and sets up the basic scene.
 */

import { ClothSolverWebGPU } from './core/ClothSolverWebGPU.js';
import { SceneManager } from './rendering/SceneManager.js';
import { ClothMesh } from './rendering/ClothMesh.js';

async function main() {
    const errorDiv = document.getElementById('error');
    const fpsDiv = document.getElementById('fps');
    const particlesDiv = document.getElementById('particles');
    const rendererContainer = document.getElementById('renderer');

    if (!rendererContainer) {
        throw new Error('Renderer container not found');
    }

    // Check WebGPU support
    if (!navigator.gpu) {
        errorDiv!.style.display = 'block';
        errorDiv!.innerHTML = `
      <h2>⚠️ WebGPU Not Supported</h2>
      <p><strong>Your browser does not support WebGPU.</strong></p>
      <p>WebGPU is required for Velvet cloth simulation.</p>
      <h3>Solutions:</h3>
      <p><strong>Option 1: Update Chrome/Edge (Recommended)</strong></p>
      <ul>
        <li>Chrome 113+ and Edge 113+ support WebGPU by default</li>
        <li>Update your browser to the latest version</li>
      </ul>
      <p><strong>Option 2: Enable WebGPU Flags</strong></p>
      <ol>
        <li>Open <code>chrome://flags</code> (or <code>edge://flags</code>)</li>
        <li>Search for "WebGPU"</li>
        <li>Enable "WebGPU Developer Features"</li>
        <li>Restart browser</li>
      </ol>
      <p><strong>Option 3: Try a Different Browser</strong></p>
      <ul>
        <li>Chrome 113+ (Windows, macOS, Linux, Android)</li>
        <li>Edge 113+ (Windows, macOS)</li>
        <li>Firefox Nightly (experimental support)</li>
      </ul>
      <p><em>Note: Safari does not yet support WebGPU as of early 2024</em></p>
    `;
        return;
    }

    try {
        // Request WebGPU adapter with fallback options
        let adapter = await navigator.gpu.requestAdapter();

        // If high-performance GPU fails, try default
        if (!adapter) {
            console.warn('Failed to get preferred GPU adapter, trying fallback...');
            adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'low-power',
            });
        }

        if (!adapter) {
            throw new Error(
                'Failed to get WebGPU adapter. Your browser may not support WebGPU or it may be disabled.'
            );
        }

        // Log adapter info for debugging
        console.log('WebGPU Adapter:', adapter.info);

        // Request WebGPU device with required features
        const device = await adapter.requestDevice({
            requiredFeatures: [],
            requiredLimits: {
                maxBufferSize: adapter.limits.maxBufferSize,
                maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
            },
        });

        console.log('WebGPU Device created successfully');
        console.log('Device limits:', device.limits);

        // Initialize cloth solver
        const clothConfig = {
            resolution: 50, // 51x51 = 2601 particles
            size: 2.0,
            enableSelfCollision: false,
            // Pin the top corners of the cloth
            attachIndices: [0, 50], // Top-left and top-right corners
        };

        const solver = new ClothSolverWebGPU(device, clothConfig);

        // Update info
        const numParticles = (clothConfig.resolution + 1) * (clothConfig.resolution + 1);
        particlesDiv!.textContent = numParticles.toString();

        console.log(`Cloth solver initialized with ${numParticles} particles`);

        // Create Three.js scene
        const sceneManager = new SceneManager(rendererContainer);

        // Create cloth mesh
        const clothMesh = new ClothMesh(clothConfig);
        sceneManager.add(clothMesh.mesh);

        console.log('Three.js scene initialized');

        // FPS counter and simulation loop
        let frameCount = 0;
        let lastTime = performance.now();
        let lastFpsUpdate = lastTime;

        async function gameLoop() {
            const currentTime = performance.now();
            const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
            lastTime = currentTime;

            // Simulate physics
            await solver.simulate(deltaTime);

            // Get positions from GPU and update mesh
            const positions = await solver.getPositions();
            clothMesh.updatePositions(positions);

            // Render scene
            sceneManager.render();

            // Update FPS counter
            frameCount++;
            if (currentTime - lastFpsUpdate >= 1000) {
                const fps = frameCount;
                fpsDiv!.textContent = fps.toString();
                solver.updateStats(fps, deltaTime * 1000);

                const stats = solver.getStats();
                console.log(`FPS: ${fps}, Frame Time: ${stats.frameTime.toFixed(2)}ms`);

                frameCount = 0;
                lastFpsUpdate = currentTime;
            }

            requestAnimationFrame(gameLoop);
        }

        // Start simulation loop
        gameLoop();

        console.log('Velvet WebGPU simulation started');
    } catch (error) {
        console.error('Failed to initialize WebGPU:', error);
        errorDiv!.style.display = 'block';
        errorDiv!.innerHTML = `
      <h2>❌ Initialization Error</h2>
      <p><strong>Failed to initialize WebGPU:</strong></p>
      <pre style="background: rgba(0,0,0,0.3); padding: 10px; overflow: auto;">${error}</pre>
      <p><strong>Possible causes:</strong></p>
      <ul>
        <li>GPU drivers are outdated (update your graphics drivers)</li>
        <li>WebGPU is disabled in browser flags</li>
        <li>Browser doesn't support WebGPU on your OS</li>
        <li>Running in a virtual machine without GPU passthrough</li>
      </ul>
      <p>Check the browser console (F12) for more details.</p>
    `;
    }
}

main();
