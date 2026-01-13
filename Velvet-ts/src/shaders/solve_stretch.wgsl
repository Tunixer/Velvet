// Solve Stretch Constraints WGSL Shader
// Implements distance constraints between particles
// Uses Jacobi iteration for GPU parallelization

struct SimulationParams {
  deltaTime: f32,
  gravity: f32,
  particleDiameter: f32,
  numParticles: u32,
};

struct StretchConstraint {
  idx1: u32,
  idx2: u32,
  distance: f32,
  compliance: f32,
};

@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<storage, read> constraints: array<StretchConstraint>;
@group(0) @binding(2) var<storage, read_write> predicted: array<vec3<f32>>;
@group(0) @binding(3) var<storage, read> invMasses: array<f32>;
@group(0) @binding(4) var<storage, read_write> deltas: array<vec3<f32>>;
@group(0) @binding(5) var<storage, read_write> deltaCounts: array<u32>;

@compute @workgroup_size(256)
fn solve_stretch_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let id = global_id.x;
  if (id >= arrayLength(&constraints)) {
    return;
  }

  // Force use of params to prevent compiler optimization
  let numParticlesUnused = params.numParticles;

  let constraint = constraints[id];

  // Get current positions
  let p1 = predicted[constraint.idx1];
  let p2 = predicted[constraint.idx2];

  // Get inverse masses
  let w1 = invMasses[constraint.idx1];
  let w2 = invMasses[constraint.idx2];

  // Skip if both particles have infinite mass (static)
  if (w1 == 0.0 && w2 == 0.0) {
    return;
  }

  // Calculate current distance
  let diff = p1 - p2;
  let currentDist = length(diff);

  // Avoid division by zero
  if (currentDist < 1e-6) {
    return;
  }

  // Calculate constraint correction
  // XPBD formula: Δλ = -C(x) / (α + ∇C·M^-1·∇C^T)
  // For distance constraint: C(x) = |p1 - p2| - rest_distance

  let C = currentDist - constraint.distance;

  // Force use of params to prevent compiler optimization
  let dt = params.deltaTime;
  let alpha = constraint.compliance / (dt * dt);

  let denom = alpha + w1 + w2;

  let lambda = -C / denom;

  // Calculate gradient ∇C = (p1 - p2) / |p1 - p2|
  let grad = diff / currentDist;

  // Calculate displacement
  let displacement = grad * lambda;

  // Accumulate deltas for Jacobi iteration
  if (w1 > 0.0) {
    let delta1 = displacement * w1;
    deltas[constraint.idx1] = deltas[constraint.idx1] + delta1;
    deltaCounts[constraint.idx1] = deltaCounts[constraint.idx1] + 1u;
  }

  if (w2 > 0.0) {
    let delta2 = -displacement * w2;
    deltas[constraint.idx2] = deltas[constraint.idx2] + delta2;
    deltaCounts[constraint.idx2] = deltaCounts[constraint.idx2] + 1u;
  }
}
