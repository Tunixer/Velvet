/**
 * WebGPU Cloth Solver
 * Core physics engine using Extended Position Based Dynamics (XPBD)
 * Ported from Velvet CUDA implementation
 */

import type {
    SimulationParams,
    ClothConfig,
    PerformanceStats,
    StretchConstraint,
    AttachmentConstraint,
} from './types.js';
import { GPUBufferManager } from './GPUBuffers.js';
import { ComputePipelineManager } from './ComputePipelines.js';

/**
 * WebGPU Cloth Physics Solver
 * Implements XPBD algorithm for realistic cloth simulation
 */
export class ClothSolverWebGPU {
    readonly device: GPUDevice;
    readonly config: ClothConfig;
    readonly bufferManager: GPUBufferManager;
    readonly pipelineManager: ComputePipelineManager;

    // Simulation parameters (mutable)
    params: SimulationParams;

    // GPU buffers
    readonly positionBuffer: GPUBuffer;
    readonly velocityBuffer: GPUBuffer;
    readonly predictedBuffer: GPUBuffer;
    readonly deltaBuffer: GPUBuffer;
    readonly deltaCountBuffer: GPUBuffer;
    readonly invMassBuffer: GPUBuffer;
    readonly uniformBuffer: GPUBuffer;

    // Constraint buffers
    private stretchConstraintsBuffer?: GPUBuffer;
    private attachmentConstraintsBuffer?: GPUBuffer;
    private slotPositionsBuffer?: GPUBuffer;

    // Bind groups
    private predictBindGroup?: GPUBindGroup;
    private solveStretchBindGroup?: GPUBindGroup;
    private solveAttachmentBindGroup?: GPUBindGroup;
    private applyDeltasBindGroup?: GPUBindGroup;
    private finalizeBindGroup?: GPUBindGroup;

    // Pipelines
    private predictPipeline?: GPUComputePipeline;
    private solveStretchPipeline?: GPUComputePipeline;
    private solveAttachmentPipeline?: GPUComputePipeline;
    private applyDeltasPipeline?: GPUComputePipeline;
    private finalizePipeline?: GPUComputePipeline;

    // State
    private isInitialized: boolean = false;
    private numStretchConstraints: number = 0;
    private numAttachmentConstraints: number = 0;

    // Performance tracking
    private performanceStats: PerformanceStats = {
        fps: 60,
        frameTime: 0,
        gpuTime: 0,
        physicsTime: 0,
        renderTime: 0,
        particleCount: 0,
        qualityLevel: 1.0,
    };

    constructor(device: GPUDevice, config: ClothConfig) {
        this.device = device;
        this.config = config;
        this.bufferManager = new GPUBufferManager(device);
        this.pipelineManager = new ComputePipelineManager(device);

        // Calculate particle count
        const numParticles = (config.resolution + 1) * (config.resolution + 1);
        this.performanceStats.particleCount = numParticles;

        // Set default parameters
        this.params = this.getDefaultParams(numParticles);

        // Create buffers
        this.positionBuffer = this.bufferManager.createVertexBuffer(numParticles * 3 * 4);
        this.velocityBuffer = this.bufferManager.createStorageBuffer(numParticles * 3 * 4);
        this.predictedBuffer = this.bufferManager.createStorageBuffer(numParticles * 3 * 4);
        this.deltaBuffer = this.bufferManager.createStorageBuffer(numParticles * 3 * 4);
        this.deltaCountBuffer = this.bufferManager.createStorageBuffer(numParticles * 4);
        this.invMassBuffer = this.bufferManager.createStorageBuffer(numParticles * 4);
        this.uniformBuffer = this.bufferManager.createUniformBuffer(16); // 4 floats

        // Initialize cloth
        this.initializeCloth();
    }

    /**
     * Initialize solver with default cloth setup
     */
    private async initializeCloth(): Promise<void> {
        const numParticles = (this.config.resolution + 1) * (this.config.resolution + 1);

        // Generate initial positions (flat grid)
        const positions = new Float32Array(numParticles * 3);
        const invMasses = new Float32Array(numParticles);

        const step = this.config.size / this.config.resolution;
        const offset = this.config.size / 2;

        for (let y = 0; y <= this.config.resolution; y++) {
            for (let x = 0; x <= this.config.resolution; x++) {
                const i = y * (this.config.resolution + 1) + x;
                positions[i * 3 + 0] = x * step - offset;
                positions[i * 3 + 1] = 0;
                positions[i * 3 + 2] = y * step - offset;

                // All particles have mass
                invMasses[i] = 1.0;
            }
        }

        // Write initial data to buffers
        this.bufferManager.writeBuffer(this.positionBuffer, positions);
        this.bufferManager.writeBuffer(this.invMassBuffer, invMasses);

        // Initialize to zero
        const zeros = new Float32Array(numParticles * 3);
        this.bufferManager.writeBuffer(this.velocityBuffer, zeros);
        this.bufferManager.writeBuffer(this.predictedBuffer, positions);

        // Generate constraints
        this.generateStretchConstraints();

        // Add attachment constraints if specified (pass positions to avoid GPU read)
        if (this.config.attachIndices && this.config.attachIndices.length > 0) {
            this.generateAttachmentConstraints(this.config.attachIndices, positions);
        }

        // Initialize pipelines
        await this.initPipelines();

        this.isInitialized = true;
    }

    /**
     * Generate stretch constraints for grid cloth
     */
    private generateStretchConstraints(): void {
        const constraints: StretchConstraint[] = [];
        const resolution = this.config.resolution;
        const step = this.config.size / resolution;

        // Structural constraints (horizontal and vertical)
        for (let y = 0; y <= resolution; y++) {
            for (let x = 0; x <= resolution; x++) {
                const idx = y * (resolution + 1) + x;

                // Horizontal constraint
                if (x < resolution) {
                    const idx2 = y * (resolution + 1) + (x + 1);
                    constraints.push({
                        idx1: idx,
                        idx2: idx2,
                        distance: step,
                    });
                }

                // Vertical constraint
                if (y < resolution) {
                    const idx2 = (y + 1) * (resolution + 1) + x;
                    constraints.push({
                        idx1: idx,
                        idx2: idx2,
                        distance: step,
                    });
                }
            }
        }

        this.numStretchConstraints = constraints.length;

        // Create GPU buffer
        const constraintData = new Float32Array(constraints.length * 4); // 2 u32 + 2 f32
        for (let i = 0; i < constraints.length; i++) {
            constraintData[i * 4 + 0] = constraints[i].idx1;
            constraintData[i * 4 + 1] = constraints[i].idx2;
            constraintData[i * 4 + 2] = constraints[i].distance;
            constraintData[i * 4 + 3] = 0.0; // compliance
        }

        this.stretchConstraintsBuffer = this.bufferManager.createStorageBuffer(
            constraints.length * 16,
            constraintData
        );
    }

    /**
     * Generate attachment constraints
     */
    private generateAttachmentConstraints(attachIndices: number[], positions: Float32Array): void {
        const constraints: AttachmentConstraint[] = [];
        const slotPositions: Float32Array = new Float32Array(attachIndices.length * 3);

        const numParticles = (this.config.resolution + 1) * (this.config.resolution + 1);

        for (let i = 0; i < attachIndices.length; i++) {
            const particleIdx = attachIndices[i];

            if (particleIdx >= numParticles) {
                console.warn(
                    `Attachment index ${particleIdx} exceeds particle count ${numParticles}`
                );
                continue;
            }

            constraints.push({
                particleIndex: particleIdx,
                slotIndex: i,
                distance: 0.0,
            });

            // Set slot position to initial particle position
            slotPositions[i * 3 + 0] = positions[particleIdx * 3 + 0];
            slotPositions[i * 3 + 1] = positions[particleIdx * 3 + 1];
            slotPositions[i * 3 + 2] = positions[particleIdx * 3 + 2];

            // Set infinite mass (static)
            const invMasses = new Float32Array(1);
            invMasses[0] = 0.0;
            this.bufferManager.writeBuffer(this.invMassBuffer, invMasses, particleIdx * 4);
        }

        this.numAttachmentConstraints = constraints.length;

        // Create GPU buffers
        const constraintData = new Float32Array(constraints.length * 4);
        for (let i = 0; i < constraints.length; i++) {
            constraintData[i * 4 + 0] = constraints[i].particleIndex;
            constraintData[i * 4 + 1] = constraints[i].slotIndex;
            constraintData[i * 4 + 2] = constraints[i].distance;
            constraintData[i * 4 + 3] = 0.0;
        }

        this.attachmentConstraintsBuffer = this.bufferManager.createStorageBuffer(
            constraints.length * 16,
            constraintData
        );

        this.slotPositionsBuffer = this.bufferManager.createStorageBuffer(
            slotPositions.length * 4,
            slotPositions
        );
    }

    /**
     * Initialize compute pipelines
     */
    private async initPipelines(): Promise<void> {
        // Load shaders
        const predictShader = await fetch('/src/shaders/predict_positions.wgsl').then((r) =>
            r.text()
        );
        const finalizeShader = await fetch('/src/shaders/finalize_velocities.wgsl').then((r) =>
            r.text()
        );
        const stretchShader = await fetch('/src/shaders/solve_stretch.wgsl').then((r) => r.text());
        const attachmentShader = await fetch('/src/shaders/solve_attachment.wgsl').then((r) =>
            r.text()
        );
        const applyDeltasShader = await fetch('/src/shaders/apply_deltas.wgsl').then((r) =>
            r.text()
        );

        // Create pipelines
        this.predictPipeline = this.pipelineManager.getOrCreatePipeline({
            shader: predictShader,
            entryPoint: 'predict_positions_main',
            label: 'Predict Positions',
        });

        this.finalizePipeline = this.pipelineManager.getOrCreatePipeline({
            shader: finalizeShader,
            entryPoint: 'finalize_velocities_main',
            label: 'Finalize Velocities',
        });

        this.solveStretchPipeline = this.pipelineManager.getOrCreatePipeline({
            shader: stretchShader,
            entryPoint: 'solve_stretch_main',
            label: 'Solve Stretch',
        });

        this.solveAttachmentPipeline = this.pipelineManager.getOrCreatePipeline({
            shader: attachmentShader,
            entryPoint: 'solve_attachment_main',
            label: 'Solve Attachment',
        });

        this.applyDeltasPipeline = this.pipelineManager.getOrCreatePipeline({
            shader: applyDeltasShader,
            entryPoint: 'apply_deltas_main',
            label: 'Apply Deltas',
        });

        // Create bind groups
        this.createBindGroups();
    }

    /**
     * Create bind groups for all pipelines
     */
    private createBindGroups(): void {
        const numParticles = (this.config.resolution + 1) * (this.config.resolution + 1);

        // Predict positions bind group
        if (this.predictPipeline) {
            const layout = this.predictPipeline.getBindGroupLayout(0);
            this.predictBindGroup = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBuffer } },
                    { binding: 1, resource: { buffer: this.positionBuffer } },
                    { binding: 2, resource: { buffer: this.velocityBuffer } },
                    { binding: 3, resource: { buffer: this.predictedBuffer } },
                ],
            });
        }

        // Finalize bind group
        if (this.finalizePipeline) {
            const layout = this.finalizePipeline.getBindGroupLayout(0);
            this.finalizeBindGroup = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBuffer } },
                    { binding: 1, resource: { buffer: this.predictedBuffer } },
                    { binding: 2, resource: { buffer: this.positionBuffer } },
                    { binding: 3, resource: { buffer: this.velocityBuffer } },
                    { binding: 4, resource: { buffer: this.invMassBuffer } },
                ],
            });
        }

        // Solve stretch bind group
        if (this.solveStretchPipeline && this.stretchConstraintsBuffer) {
            const layout = this.solveStretchPipeline.getBindGroupLayout(0);
            this.solveStretchBindGroup = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBuffer } },
                    { binding: 1, resource: { buffer: this.stretchConstraintsBuffer } },
                    { binding: 2, resource: { buffer: this.predictedBuffer } },
                    { binding: 3, resource: { buffer: this.invMassBuffer } },
                    { binding: 4, resource: { buffer: this.deltaBuffer } },
                    { binding: 5, resource: { buffer: this.deltaCountBuffer } },
                ],
            });
        }

        // Solve attachment bind group
        if (
            this.solveAttachmentPipeline &&
            this.attachmentConstraintsBuffer &&
            this.slotPositionsBuffer
        ) {
            const layout = this.solveAttachmentPipeline.getBindGroupLayout(0);
            this.solveAttachmentBindGroup = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBuffer } },
                    { binding: 1, resource: { buffer: this.attachmentConstraintsBuffer } },
                    { binding: 2, resource: { buffer: this.predictedBuffer } },
                    { binding: 3, resource: { buffer: this.invMassBuffer } },
                    { binding: 4, resource: { buffer: this.slotPositionsBuffer } },
                ],
            });
        }

        // Apply deltas bind group
        if (this.applyDeltasPipeline) {
            const layout = this.applyDeltasPipeline.getBindGroupLayout(0);
            this.applyDeltasBindGroup = this.device.createBindGroup({
                layout,
                entries: [
                    { binding: 0, resource: { buffer: this.uniformBuffer } },
                    { binding: 1, resource: { buffer: this.deltaBuffer } },
                    { binding: 2, resource: { buffer: this.deltaCountBuffer } },
                    { binding: 3, resource: { buffer: this.predictedBuffer } },
                ],
            });
        }
    }

    /**
     * Simulate one frame
     * @param deltaTime - Time step in seconds
     */
    async simulate(deltaTime: number): Promise<void> {
        if (!this.isInitialized) {
            await this.initializeCloth();
        }

        const commandEncoder = this.device.createCommandEncoder();

        // Update uniform buffer
        const uniformData = new Float32Array([
            deltaTime,
            ...this.params.gravity,
            this.params.particleDiameter,
            this.params.numParticles,
        ]);
        this.bufferManager.writeBuffer(this.uniformBuffer, uniformData);

        // XPBD simulation loop
        for (let substep = 0; substep < this.params.numSubsteps; substep++) {
            const substepTime = deltaTime / this.params.numSubsteps;

            // Predict positions
            this.predictPositions(commandEncoder, substepTime);

            // Constraint solving iterations
            for (let iter = 0; iter < this.params.numIterations; iter++) {
                this.solveStretch(commandEncoder);
                this.solveAttachment(commandEncoder);
                this.applyDeltas(commandEncoder);
            }

            // Finalize velocities and positions
            this.finalize(commandEncoder, substepTime);
        }

        // Submit commands
        this.device.queue.submit([commandEncoder.finish()]);
    }

    /**
     * Predict positions step
     */
    private predictPositions(encoder: GPUCommandEncoder, deltaTime: number): void {
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.predictPipeline!);
        pass.setBindGroup(0, this.predictBindGroup!);

        const numParticles = (this.config.resolution + 1) * (this.config.resolution + 1);
        const workgroups = Math.ceil(numParticles / 256);
        pass.dispatchWorkgroups(workgroups);

        pass.end();
    }

    /**
     * Solve stretch constraints
     */
    private solveStretch(encoder: GPUCommandEncoder): void {
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.solveStretchPipeline!);
        pass.setBindGroup(0, this.solveStretchBindGroup!);

        const workgroups = Math.ceil(this.numStretchConstraints / 256);
        pass.dispatchWorkgroups(workgroups);

        pass.end();
    }

    /**
     * Solve attachment constraints
     */
    private solveAttachment(encoder: GPUCommandEncoder): void {
        if (!this.solveAttachmentPipeline || this.numAttachmentConstraints === 0) {
            return;
        }

        const pass = encoder.beginComputePass();
        pass.setPipeline(this.solveAttachmentPipeline);
        pass.setBindGroup(0, this.solveAttachmentBindGroup!);

        const workgroups = Math.ceil(this.numAttachmentConstraints / 256);
        pass.dispatchWorkgroups(workgroups);

        pass.end();
    }

    /**
     * Apply accumulated deltas
     */
    private applyDeltas(encoder: GPUCommandEncoder): void {
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.applyDeltasPipeline!);
        pass.setBindGroup(0, this.applyDeltasBindGroup!);

        const numParticles = (this.config.resolution + 1) * (this.config.resolution + 1);
        const workgroups = Math.ceil(numParticles / 256);
        pass.dispatchWorkgroups(workgroups);

        pass.end();
    }

    /**
     * Finalize velocities and positions
     */
    private finalize(encoder: GPUCommandEncoder, deltaTime: number): void {
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.finalizePipeline!);
        pass.setBindGroup(0, this.finalizeBindGroup!);

        const numParticles = (this.config.resolution + 1) * (this.config.resolution + 1);
        const workgroups = Math.ceil(numParticles / 256);
        pass.dispatchWorkgroups(workgroups);

        pass.end();
    }

    /**
     * Get default simulation parameters
     */
    private getDefaultParams(numParticles: number): SimulationParams {
        return {
            deltaTime: 1 / 60,
            fixedDeltaTime: 1 / 60,
            numParticles,
            particleDiameter: this.config.size / this.config.resolution,
            maxSpeed: 10,
            numSubsteps: 2,
            numIterations: 4,
            enableSelfCollision: false,
            collisionMargin: 0.01,
            friction: 0.3,
            maxNumNeighbors: 64,
            interleavedHash: 3,
            maxSpeedClamp: 0.5,
            gravity: [0, -9.81, 0] as const,
        };
    }

    /**
     * Get performance statistics
     */
    getStats(): PerformanceStats {
        return { ...this.performanceStats };
    }

    /**
     * Update performance stats
     */
    updateStats(fps: number, frameTime: number): void {
        this.performanceStats.fps = fps;
        this.performanceStats.frameTime = frameTime;
    }

    /**
     * Get current particle positions from GPU
     * Expensive operation, use sparingly (e.g., for rendering)
     * @returns Promise with particle positions as Float32Array
     */
    async getPositions(): Promise<Float32Array> {
        const numParticles = (this.config.resolution + 1) * (this.config.resolution + 1);
        const bufferData = await this.bufferManager.readBuffer(
            this.positionBuffer,
            numParticles * 12
        );
        return new Float32Array(bufferData);
    }
}
