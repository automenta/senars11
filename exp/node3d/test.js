const node3d = require('3d-core-raub');
const THREE = require('three');  // three.js for scenes

const { init, addThreeHelpers } = node3d;
const { gl, loop, Screen } = init({
  title: 'Node3D Test - Rotating Crate',
  width: 800,
  height: 600,
  isGles3: true,   // GLES3 for better compat (or false for GLES2)
  vsync: true,
  autoEsc: true
});

// Hook three.js into the GL context
addThreeHelpers(THREE, gl);

// Create a Screen (handles camera, renderer, etc.)
const screen = new Screen({
  three: THREE,
  fov: 70,
  z: 2
});

// Simple green cube (no external files needed)
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const mesh = new THREE.Mesh(geometry, material);
screen.scene.add(mesh);

// Add after the cube setup
/*const buttonGeometry = new THREE.PlaneGeometry(1.5, 0.5);  // Width, height
const buttonMaterial = new THREE.MeshBasicMaterial({ 
  color: 0x3498db,
  transparent: true,
  opacity: 0.9
});
const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
button.position.set(0, 0, -1);  // In front of the cube
screen.scene.add(button);
*/

// Optional: Add text (using three.js text? Or SDF later)

// Render loop: Animate and draw
loop((now) => {
  // Rotate the object
  mesh.rotation.x = now * 0.0005;
  mesh.rotation.y = now * 0.001;

  // Draw the scene (key for visibility!)
  screen.draw();
});

console.log('Window open! You should see a rotating green cube. Close with ESC.');

