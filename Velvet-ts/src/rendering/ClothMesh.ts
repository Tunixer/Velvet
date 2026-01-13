/**
 * Cloth Mesh Renderer
 * Renders cloth simulation using Three.js
 * Updates mesh vertices from GPU compute results
 */

import * as THREE from 'three';
import type { ClothConfig } from '../core/types.js';

/**
 * Cloth mesh component
 * Manages Three.js mesh for rendering cloth simulation
 */
export class ClothMesh {
  readonly mesh: THREE.Mesh;
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.Material;
  readonly config: ClothConfig;

  // Vertex count
  readonly numVertices: number;

  // CPU-side buffer for reading GPU data (for debugging)
  private positionArray: Float32Array;

  constructor(config: ClothConfig) {
    this.config = config;
    this.numVertices = (config.resolution + 1) * (config.resolution + 1);

    // Create geometry
    this.geometry = this.createClothGeometry();
    this.positionArray = this.geometry.attributes.position.array as Float32Array;

    // Create material
    this.material = this.createClothMaterial();

    // Create mesh
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // Position mesh
    this.mesh.position.set(0, 0, 0);
  }

  /**
   * Create buffer geometry for cloth grid
   */
  private createClothGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    // Generate vertices (flat grid)
    const positions = new Float32Array(this.numVertices * 3);
    const uvs = new Float32Array(this.numVertices * 2);

    const step = this.config.size / this.config.resolution;
    const offset = this.config.size / 2;

    for (let y = 0; y <= this.config.resolution; y++) {
      for (let x = 0; x <= this.config.resolution; x++) {
        const i = y * (this.config.resolution + 1) + x;

        // Position
        positions[i * 3 + 0] = x * step - offset;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = y * step - offset;

        // UV coordinates
        uvs[i * 2 + 0] = x / this.config.resolution;
        uvs[i * 2 + 1] = y / this.config.resolution;
      }
    }

    // Generate indices (triangles)
    const indices = this.generateIndices();

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  /**
   * Generate triangle indices for grid
   */
  private generateIndices(): Uint16Array {
    const indices: number[] = [];
    const resolution = this.config.resolution;

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const i = y * (resolution + 1) + x;

        // First triangle
        indices.push(i);
        indices.push(i + 1);
        indices.push(i + resolution + 1);

        // Second triangle
        indices.push(i + 1);
        indices.push(i + resolution + 2);
        indices.push(i + resolution + 1);
      }
    }

    return new Uint16Array(indices);
  }

  /**
   * Create cloth material
   */
  private createClothMaterial(): THREE.Material {
    // Use a simple colored material for now
    return new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      side: THREE.DoubleSide,
      flatShading: false,
      roughness: 0.8,
      metalness: 0.1,
      wireframe: false,
    });
  }

  /**
   * Update vertex positions from CPU array
   * @param positions - New particle positions (numVertices * 3)
   */
  updatePositions(positions: Float32Array): void {
    const geometryPositions = this.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.numVertices * 3; i++) {
      geometryPositions[i] = positions[i];
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  /**
   * Set wireframe mode
   */
  setWireframe(enabled: boolean): void {
    if (this.material instanceof THREE.MeshStandardMaterial) {
      this.material.wireframe = enabled;
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.geometry.dispose();
    if (this.material instanceof THREE.Material) {
      this.material.dispose();
    }
  }
}
