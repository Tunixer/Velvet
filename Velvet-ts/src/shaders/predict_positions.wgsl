// Predict Positions WGSL Shader
// This is the first step in XPBD simulation
// Predicts particle positions based on velocities and external forces

struct SimulationParams {
  deltaTime: f32,
  gravity: f32,
  particleDiameter: f32,
  numParticles: u32,
};

@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<storage, read> positions: array<vec3<f32>>;
@group(0) @binding(2) var<storage, read> velocities: array<vec3<f32>>;
@group(0) @binding(3) var<storage, read_write> predicted: array<vec3<f32>>;

@compute @workgroup_size(256)
fn predict_positions_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let id = global_id.x;
  if (id >= params.numParticles) {
    return;
  }

  // Simple Euler integration: p_new = p_old + v * dt
  let gravity = vec3<f32>(0.0, -9.81, 0.0) * params.gravity;
  predicted[id] = positions[id] + velocities[id] * params.deltaTime + gravity * params.deltaTime;
}
