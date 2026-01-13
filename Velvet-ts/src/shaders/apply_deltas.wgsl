// Apply Deltas WGSL Shader
// Applies accumulated deltas from constraint solvers
// This is the reduction step of Jacobi iteration

struct SimulationParams {
  deltaTime: f32,
  gravity: f32,
  particleDiameter: f32,
  numParticles: u32,
};

@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<storage, read_write> deltas: array<vec3<f32>>;
@group(0) @binding(2) var<storage, read_write> deltaCounts: array<u32>;
@group(0) @binding(3) var<storage, read_write> predicted: array<vec3<f32>>;

@compute @workgroup_size(256)
fn apply_deltas_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let id = global_id.x;
  if (id >= params.numParticles) {
    return;
  }

  let count = deltaCounts[id];

  // Only apply if we have accumulated deltas
  if (count > 0u) {
    // Average the deltas (Jacobi iteration)
    let avgDelta = deltas[id] / f32(count);
    predicted[id] = predicted[id] + avgDelta;
  }

  // Reset for next iteration
  deltas[id] = vec3<f32>(0.0, 0.0, 0.0);
  deltaCounts[id] = 0u;
}
