/**
 * WebGPU Buffer Manager
 * Provides type-safe buffer operations for the cloth simulation engine
 */

import type { GPUBufferDescriptor } from './types.js';

/**
 * WebGPU Buffer Manager
 * Handles creation and management of GPU buffers for compute and rendering
 */
export class GPUBufferManager {
    readonly device: GPUDevice;

    constructor(device: GPUDevice) {
        this.device = device;
    }

    /**
     * Create a storage buffer for compute shaders
     * @param size - Buffer size in bytes
     * @param data - Optional initial data
     * @returns GPUBuffer with STORAGE + COPY_DST + COPY_SRC usage
     */
    createStorageBuffer(size: number, data?: ArrayBufferView): GPUBuffer {
        const buffer = this.device.createBuffer({
            size,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: data !== undefined,
        });

        if (data) {
            new Uint8Array(buffer.getMappedRange()).set(
                new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            );
            buffer.unmap();
        }

        return buffer;
    }

    /**
     * Create a vertex buffer for rendering
     * Can be shared between compute and render pipelines
     * @param size - Buffer size in bytes
     * @param data - Optional initial data
     * @returns GPUBuffer with VERTEX + STORAGE + COPY_DST + COPY_SRC usage
     */
    createVertexBuffer(size: number, data?: ArrayBufferView): GPUBuffer {
        const buffer = this.device.createBuffer({
            size,
            usage:
                GPUBufferUsage.VERTEX |
                GPUBufferUsage.STORAGE |
                GPUBufferUsage.COPY_DST |
                GPUBufferUsage.COPY_SRC,
            mappedAtCreation: data !== undefined,
        });

        if (data) {
            new Uint8Array(buffer.getMappedRange()).set(
                new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            );
            buffer.unmap();
        }

        return buffer;
    }

    /**
     * Create a uniform buffer for passing parameters to shaders
     * @param size - Buffer size in bytes
     * @returns GPUBuffer with UNIFORM + COPY_DST usage
     */
    createUniformBuffer(size: number): GPUBuffer {
        return this.device.createBuffer({
            size,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    /**
     * Create an index buffer for rendering
     * @param size - Buffer size in bytes
     * @param data - Optional initial data
     * @returns GPUBuffer with INDEX + COPY_DST usage
     */
    createIndexBuffer(size: number, data?: ArrayBufferView): GPUBuffer {
        const buffer = this.device.createBuffer({
            size,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: data !== undefined,
        });

        if (data) {
            new Uint8Array(buffer.getMappedRange()).set(
                new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            );
            buffer.unmap();
        }

        return buffer;
    }

    /**
     * Write data to a buffer
     * @param buffer - Target buffer
     * @param data - Data to write
     * @param offset - Byte offset in buffer (default: 0)
     */
    writeBuffer(buffer: GPUBuffer, data: ArrayBufferView, offset = 0): void {
        this.device.queue.writeBuffer(
            buffer,
            offset,
            data.buffer,
            data.byteOffset,
            data.byteLength
        );
    }

    /**
     * Read data from a buffer (requires staging buffer)
     * Expensive operation, use only for debugging
     * @param buffer - Source buffer
     * @param size - Number of bytes to read
     * @returns Promise with buffer data
     */
    async readBuffer(buffer: GPUBuffer, size: number): Promise<ArrayBuffer> {
        const stagingBuffer = this.device.createBuffer({
            size,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });

        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(buffer, 0, stagingBuffer, 0, size);
        this.device.queue.submit([commandEncoder.finish()]);

        await stagingBuffer.mapAsync(GPUMapMode.READ);
        const data = stagingBuffer.getMappedRange().slice(0);
        stagingBuffer.unmap();

        stagingBuffer.destroy();

        return data;
    }

    /**
     * Destroy a buffer
     * @param buffer - Buffer to destroy
     */
    destroyBuffer(buffer: GPUBuffer): void {
        buffer.destroy();
    }
}
