// Finalize Velocities and Positions WGSL Shader
// This is the last step in each XPBD substep
// Updates velocities and positions based on predicted positions and deltas

struct SimulationParams {
  deltaTime: f32,
  gravity: f32,
  particleDiameter: f32,
  numParticles: u32,
};

@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<storage, read> predicted: array<vec3<f32>>;
@group(0) @binding(2) var<storage, read_write> positions: array<vec3<f32>>;
@group(0) @binding(3) var<storage, read_write> velocities: array<vec3<f32>>;
@group(0) @binding(4) var<storage, read> invMasses: array<f32>;

@compute @workgroup_size(256)
fn finalize_velocities_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let id = global_id.x;
  if (id >= params.numParticles) {
    return;
  }

  // Update velocity: v_new = (p_pred - p_old) / dt
  let invMass = invMasses[id];
  if (invMass > 0.0) {
    velocities[id] = (predicted[id] - positions[id]) / params.deltaTime;
  }

  // Update position: p_new = p_pred
  positions[id] = predicted[id];
}
