/**
 * WebGPU Compute Pipeline Manager
 * Manages compute pipelines and their bind group layouts
 */

import type { ComputePipelineConfig, BindGroupLayout } from './types.js';
import { GPUBufferManager } from './GPUBuffers.js';

/**
 * Compute Pipeline Manager
 * Handles creation and management of WebGPU compute pipelines
 */
export class ComputePipelineManager {
  readonly device: GPUDevice;
  readonly bufferManager: GPUBufferManager;

  // Cache for created pipelines
  private pipelines: Map<string, GPUComputePipeline> = new Map();
  private layouts: Map<string, GPUBindGroupLayout> = new Map();

  constructor(device: GPUDevice) {
    this.device = device;
    this.bufferManager = new GPUBufferManager(device);
  }

  /**
   * Create or retrieve a cached compute pipeline
   * @param config - Pipeline configuration
   * @returns GPUComputePipeline
   */
  getOrCreatePipeline(config: ComputePipelineConfig): GPUComputePipeline {
    const cacheKey = `${config.shader}:${config.entryPoint}`;

    if (this.pipelines.has(cacheKey)) {
      return this.pipelines.get(cacheKey)!;
    }

    // Load shader code
    const shaderModule = this.device.createShaderModule({
      code: config.shader,
      label: config.label ? `${config.label} Shader` : undefined,
    });

    // Create pipeline
    const pipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: config.entryPoint,
      },
      label: config.label,
    });

    this.pipelines.set(cacheKey, pipeline);
    return pipeline;
  }

  /**
   * Create bind group layout from entries
   * @param entries - Bind group layout entries
   * @param label - Optional label for debugging
   * @returns GPUBindGroupLayout
   */
  createBindGroupLayout(entries: GPUBindGroupLayoutEntry[], label?: string): GPUBindGroupLayout {
    const cacheKey = JSON.stringify(entries);

    if (this.layouts.has(cacheKey)) {
      return this.layouts.get(cacheKey)!;
    }

    const layout = this.device.createBindGroupLayout({
      entries,
      label,
    });

    this.layouts.set(cacheKey, layout);
    return layout;
  }

  /**
   * Create bind group from layout and buffers
   * @param layout - Bind group layout
   * @param entries - Bind group entries
   * @returns GPUBindGroup
   */
  createBindGroup(
    layout: GPUBindGroupLayout,
    entries: GPUBindGroupEntry[],
  ): GPUBindGroup {
    return this.device.createBindGroup({
      layout,
      entries,
    });
  }

  /**
   * Load shader from file
   * @param path - Path to WGSL file
   * @returns Promise with shader code
   */
  async loadShader(path: string): Promise<string> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load shader: ${path}`);
    }
    return await response.text();
  }

  /**
   * Create pipeline from shader file
   * @param shaderPath - Path to WGSL file
   * @param entryPoint - Entry point function name
   * @param label - Optional label
   * @returns Promise with GPUComputePipeline
   */
  async createPipelineFromFile(
    shaderPath: string,
    entryPoint: string,
    label?: string,
  ): Promise<GPUComputePipeline> {
    const shaderCode = await this.loadShader(shaderPath);
    return this.getOrCreatePipeline({
      shader: shaderCode,
      entryPoint,
      label,
    });
  }

  /**
   * Dispatch compute workgroups
   * @param pass - Compute pass encoder
   * @param pipeline - Compute pipeline
   * @param bindGroups - Bind groups to use
   * @param workgroupCount - Number of workgroups (x, y, z)
   */
  dispatch(
    pass: GPUComputePassEncoder,
    pipeline: GPUComputePipeline,
    bindGroups: GPUBindGroup[],
    workgroupCount: [number, number, number],
  ): void {
    pass.setPipeline(pipeline);

    // Set bind groups
    bindGroups.forEach((bindGroup, index) => {
      pass.setBindGroup(index, bindGroup);
    });

    // Dispatch workgroups
    pass.dispatchWorkgroups(workgroupCount[0], workgroupCount[1], workgroupCount[2]);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.pipelines.forEach((pipeline) => {
      // Pipelines don't need explicit destruction
    });
    this.pipelines.clear();

    this.layouts.forEach((layout) => {
      // Layouts don't need explicit destruction
    });
    this.layouts.clear();
  }
}
