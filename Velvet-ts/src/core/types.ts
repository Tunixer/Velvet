// ============= 基础类型 =============

/** 3D 向量 */
export type Vec3 = readonly [number, number, number];

/** 4x4 矩阵 */
export type Mat4 = readonly number[];

// ============= WebGPU 类型 =============

/** GPU 缓冲描述 */
export interface GPUBufferDescriptor {
  size: number;
  usage: number;
  mappedAtCreation?: boolean;
}

/** 计算管线配置 */
export interface ComputePipelineConfig {
  shader: string;
  entryPoint: string;
  label?: string;
}

/** 绑定组布局 */
export interface BindGroupLayout {
  entries: GPUBindGroupLayoutEntry[];
}

// ============= 物理模拟类型 =============

/** 模拟参数 */
export interface SimulationParams {
  // 时间步
  deltaTime: number;
  fixedDeltaTime: number;

  // 粒子
  numParticles: number;
  particleDiameter: number;
  maxSpeed: number;

  // 求解器
  numSubsteps: number;
  numIterations: number;

  // 碰撞
  enableSelfCollision: boolean;
  collisionMargin: number;
  friction: number;

  // 空间哈希
  maxNumNeighbors: number;
  interleavedHash: number;

  // 性能
  maxSpeedClamp: number;
}

/** 布料配置 */
export interface ClothConfig {
  resolution: number;
  size: number;
  enableSelfCollision?: boolean;
  attachIndices?: number[];
}

/** 碰撞体类型 */
export enum ColliderType {
  Sphere = 0,
  Plane = 1,
  Cube = 2,
}

/** SDF 碰撞体 */
export interface SDFCollider {
  type: ColliderType;
  position: Vec3;
  scale: Vec3;
  rotation: Vec3;
  curTransform: Mat4;
  invCurTransform: Mat4;
  lastTransform: Mat4;
  deltaTime: number;
}

// ============= 约束类型 =============

/** 拉伸约束 */
export interface StretchConstraint {
  idx1: number;
  idx2: number;
  distance: number;
}

/** 弯曲约束 */
export interface BendingConstraint {
  idx1: number;
  idx2: number;
  idx3: number;
  idx4: number;
  angle: number;
}

/** 附着约束 */
export interface AttachmentConstraint {
  particleIndex: number;
  slotIndex: number;
  distance: number;
}

// ============= 性能监控类型 =============

/** 性能统计 */
export interface PerformanceStats {
  fps: number;
  frameTime: number;
  gpuTime: number;
  physicsTime: number;
  renderTime: number;
  particleCount: number;
  qualityLevel: number;
}

/** 质量级别 */
export interface QualityLevel {
  numSubsteps: number;
  numIterations: number;
  enableSelfCollision: boolean;
  enableBending: boolean;
}
