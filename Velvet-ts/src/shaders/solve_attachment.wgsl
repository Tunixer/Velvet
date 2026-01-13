// Solve Attachment Constraints WGSL Shader
// Constrains particles to fixed world positions
// Used to pin cloth in place (e.g., corners of a flag)

struct SimulationParams {
  deltaTime: f32,
  gravity: f32,
  particleDiameter: f32,
  numParticles: u32,
};

struct AttachmentConstraint {
  particleIndex: u32,
  slotIndex: u32,
  distance: f32,
};

@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<storage, read> constraints: array<AttachmentConstraint>;
@group(0) @binding(2) var<storage, read_write> predicted: array<vec3<f32>>;
@group(0) @binding(3) var<storage, read> invMasses: array<f32>;
@group(0) @binding(4) var<storage, read> slotPositions: array<vec3<f32>>;

@compute @workgroup_size(256)
fn solve_attachment_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let id = global_id.x;
  if (id >= arrayLength(&constraints)) {
    return;
  }

  // Force use of params to prevent compiler optimization
  let numParticlesUnused = params.numParticles;

  let constraint = constraints[id];
  let particleIdx = constraint.particleIndex;

  // Get current position
  let p = predicted[particleIdx];

  // Get slot position
  let slotPos = slotPositions[constraint.slotIndex];

  // Calculate constraint violation
  // C(x) = |p - slot_pos| - distance
  let diff = p - slotPos;
  let currentDist = length(diff);

  if (currentDist < 1e-6) {
    return;
  }

  let C = currentDist - constraint.distance;

  // Zero compliance (hard constraint)
  let alpha = 0.0;
  let w = invMasses[particleIdx];

  // Skip if particle is static
  if (w == 0.0) {
    return;
  }

  // Calculate displacement
  let lambda = -C / (alpha + w);
  let grad = diff / currentDist;
  let displacement = grad * lambda * w;

  // Apply correction directly (no delta accumulation for attachments)
  predicted[particleIdx] = p + displacement;
}
