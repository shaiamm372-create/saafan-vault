/**
 * The club robot, built from simple shapes in three.js.
 * startRobotScene() draws it into a canvas and returns controls plus a cleanup function.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

const TEAL = 0x2fb3bd;
const GOLD = 0xc4a666;
const NAVY = 0x09171d;

export interface RobotControls {
  setTalking: (talking: boolean) => void;
  wave: () => void;
  dispose: () => void;
}

interface Part {
  object: THREE.Object3D;
  target: THREE.Vector3;
  start: THREE.Vector3;
  scale: THREE.Vector3;
  delay: number;
}

const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export function startRobotScene(canvas: HTMLCanvasElement, emblemUrl: string, reduceMotion: boolean): RobotControls {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.setClearColor(NAVY, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(NAVY, 0.075);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  const lookAt = new THREE.Vector3(0, -0.15, 0);

  // Lights: soft key light plus teal and gold rims from the club colors.
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(2, 4, 5);
  scene.add(key);
  const rimTeal = new THREE.PointLight(TEAL, 18, 12);
  rimTeal.position.set(-3, 1.5, -1.5);
  scene.add(rimTeal);
  const rimGold = new THREE.PointLight(GOLD, 14, 12);
  rimGold.position.set(3, -0.5, -1.2);
  scene.add(rimGold);

  const disposables: { dispose: () => void }[] = [pmrem, envTexture];
  const track = <T extends { dispose: () => void }>(item: T) => (disposables.push(item), item);

  // Materials.
  const shell = track(new THREE.MeshPhysicalMaterial({ color: 0xe6ecee, roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08 }));
  const joint = track(new THREE.MeshStandardMaterial({ color: 0x1a2c33, roughness: 0.35, metalness: 0.7 }));
  const visor = track(new THREE.MeshPhysicalMaterial({ color: 0x050b0e, roughness: 0.08, metalness: 0.4, clearcoat: 1, side: THREE.DoubleSide }));
  const glowTeal = track(new THREE.MeshStandardMaterial({ color: TEAL, emissive: TEAL, emissiveIntensity: 2.6 }));
  const glowGold = track(new THREE.MeshStandardMaterial({ color: GOLD, emissive: GOLD, emissiveIntensity: 1.8 }));
  const gold = track(new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.3, metalness: 0.85 }));

  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => new THREE.Mesh(track(geometry), material);

  // ── Robot ────────────────────────────────────────────────────────────────
  const robot = new THREE.Group();
  scene.add(robot);

  const torso = mesh(new THREE.CapsuleGeometry(0.62, 0.5, 10, 32), shell);
  torso.scale.set(1, 1, 0.74);
  torso.position.set(0, -0.62, 0);

  // Chest panel carrying the club emblem.
  const chest = new THREE.Group();
  chest.position.set(0, -0.5, 0.47);
  const plateMaterial = track(new THREE.MeshBasicMaterial({ color: 0xdfeef0, toneMapped: false }));
  const plate = mesh(new THREE.CircleGeometry(0.34, 48), plateMaterial);
  const plateRing = mesh(new THREE.TorusGeometry(0.34, 0.018, 12, 64), glowTeal);
  let renderStill = () => {};
  const emblemTexture = track(new THREE.TextureLoader().load(emblemUrl, () => reduceMotion && renderStill()));
  emblemTexture.colorSpace = THREE.SRGBColorSpace;
  const emblemMaterial = track(new THREE.MeshBasicMaterial({ map: emblemTexture, transparent: true, toneMapped: false }));
  const emblem = mesh(new THREE.PlaneGeometry(0.4, 0.49), emblemMaterial);
  emblem.position.z = 0.01;
  chest.add(plate, plateRing, emblem);

  const neck = mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.28, 24), joint);
  neck.position.set(0, 0.18, 0);

  const head = new THREE.Group();
  head.position.set(0, 0.78, 0);
  const skull = mesh(new THREE.SphereGeometry(0.6, 48, 32), shell);
  skull.scale.set(1.1, 0.94, 1);
  const face = mesh(new THREE.SphereGeometry(0.615, 48, 32, Math.PI / 2 - 0.95, 1.9, 0.98, 0.95), visor);
  face.scale.set(1.1, 0.94, 1.02);
  const eyeGeometry = new THREE.CapsuleGeometry(0.055, 0.13, 6, 16);
  const eyes = [-0.21, 0.21].map((x) => {
    const eye = mesh(eyeGeometry, glowTeal);
    eye.rotation.z = Math.PI / 2;
    eye.position.set(x, 0.06, 0.6);
    return eye;
  });
  const mouth = mesh(new THREE.BoxGeometry(0.2, 0.026, 0.02), glowTeal);
  mouth.position.set(0, -0.15, 0.6);
  const ears = [-1, 1].map((side) => {
    const ear = new THREE.Group();
    const disc = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 32), shell);
    disc.rotation.z = Math.PI / 2;
    const ring = mesh(new THREE.TorusGeometry(0.12, 0.022, 10, 40), gold);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = side * 0.055;
    ear.add(disc, ring);
    ear.position.set(side * 0.66, 0, 0);
    return ear;
  });
  const antenna = mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.26, 12), joint);
  antenna.position.set(0, 0.66, 0);
  const antennaTip = mesh(new THREE.SphereGeometry(0.06, 20, 16), glowGold);
  antennaTip.position.set(0, 0.81, 0);
  head.add(skull, face, ...eyes, mouth, ...ears, antenna, antennaTip);

  const makeArm = (side: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.74, -0.3, 0);
    const ball = mesh(new THREE.SphereGeometry(0.19, 24, 16), joint);
    const upper = mesh(new THREE.CapsuleGeometry(0.13, 0.42, 8, 20), shell);
    upper.position.y = -0.36;
    const hand = mesh(new THREE.SphereGeometry(0.16, 24, 16), shell);
    hand.position.y = -0.74;
    const cuff = mesh(new THREE.TorusGeometry(0.13, 0.025, 10, 32), gold);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.6;
    shoulder.add(ball, upper, cuff, hand);
    shoulder.rotation.z = side * 0.18;
    return shoulder;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Hover base: glowing ring and a soft light beam.
  const base = new THREE.Group();
  base.position.set(0, -1.62, 0);
  const baseRing = mesh(new THREE.TorusGeometry(0.55, 0.03, 12, 80), glowTeal);
  baseRing.rotation.x = Math.PI / 2;
  const beamMaterial = track(new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const beam = mesh(new THREE.CylinderGeometry(0.5, 0.75, 0.5, 48, 1, true), beamMaterial);
  beam.position.y = 0.2;
  base.add(baseRing, beam);

  robot.add(torso, chest, neck, head, leftArm, rightArm, base);

  // Assembly: every part flies in from a scattered position.
  const parts: Part[] = robot.children.map((object, index) => {
    const target = object.position.clone();
    const direction = new THREE.Vector3(Math.sin(index * 2.4), Math.cos(index * 1.7) * 0.8, Math.sin(index * 3.1) * 0.6 + 0.4).normalize();
    return { object, target, scale: object.scale.clone(), start: target.clone().add(direction.multiplyScalar(4.5)), delay: 0.35 + index * 0.13 };
  });

  // Rings orbiting the robot.
  const orbitA = mesh(new THREE.TorusGeometry(1.55, 0.008, 8, 160), glowTeal);
  orbitA.rotation.set(Math.PI / 2.3, 0, 0.3);
  const orbitB = mesh(new THREE.TorusGeometry(1.85, 0.006, 8, 160), glowGold);
  orbitB.rotation.set(Math.PI / 1.8, 0.4, -0.2);
  scene.add(orbitA, orbitB);

  // Scan plane that sweeps down while the robot assembles.
  const scanMaterial = track(new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const scan = mesh(new THREE.PlaneGeometry(3.2, 0.03), scanMaterial);
  scene.add(scan);

  // ── Environment ──────────────────────────────────────────────────────────
  const grid = new THREE.GridHelper(40, 80, TEAL, 0x16424a);
  grid.position.y = -1.9;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.45;
  track(grid.geometry);
  track(grid.material as THREE.Material);
  scene.add(grid);

  const particleCount = 700;
  const particlePositions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 22;
    particlePositions[i * 3 + 1] = Math.random() * 10 - 2;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 18 - 3;
  }
  const particleGeometry = track(new THREE.BufferGeometry());
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = track(new THREE.PointsMaterial({ color: TEAL, size: 0.035, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(new THREE.Points(particleGeometry, particleMaterial));

  // Rising data streaks.
  const streakGeometry = track(new THREE.PlaneGeometry(0.012, 1.4));
  const streaks = Array.from({ length: 46 }, (_, i) => {
    const material = track(new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? GOLD : TEAL, transparent: true, opacity: 0.35 + Math.random() * 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
    const streak = new THREE.Mesh(streakGeometry, material);
    streak.position.set((Math.random() - 0.5) * 16, Math.random() * 8 - 3, -2 - Math.random() * 9);
    streak.userData.speed = 0.6 + Math.random() * 1.8;
    scene.add(streak);
    return streak;
  });

  // ── Bloom glow ───────────────────────────────────────────────────────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.4, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  disposables.push(composer, bloom);

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    // Pull the camera back on narrow screens so the whole robot fits.
    const portrait = width / height < 0.8;
    camera.position.set(0, portrait ? 0.4 : 0.5, portrait ? 12.5 : 9);
    lookAt.set(0, portrait ? -1.35 : -0.95, 0);
    camera.lookAt(lookAt);
    camera.updateProjectionMatrix();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  const pointer = new THREE.Vector2();
  const onPointer = (event: PointerEvent) => {
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  };
  window.addEventListener("pointermove", onPointer);

  let talking = false;
  let waveStart = -10;
  let nextBlink = 2.5;
  const clock = new THREE.Clock();
  let frame = 0;

  const render = () => {
    const t = reduceMotion ? 3 : clock.getElapsedTime();

    // Assembly.
    for (const part of parts) {
      const progress = THREE.MathUtils.clamp((t - part.delay) / 0.9, 0, 1);
      const eased = easeOutBack(progress);
      part.object.position.lerpVectors(part.start, part.target, eased);
      part.object.scale.copy(part.scale).multiplyScalar(Math.max(0.0001, Math.min(1, progress * 1.4)));
    }
    const assembled = t > 1.9;
    scan.position.y = THREE.MathUtils.lerp(1.8, -1.9, THREE.MathUtils.clamp((t - 0.3) / 1.9, 0, 1));
    scanMaterial.opacity = t < 2.3 ? 0.9 : Math.max(0, 0.9 - (t - 2.3) * 2);

    // Idle float and head tracking the pointer.
    robot.position.y = assembled ? Math.sin(t * 1.3) * 0.06 : 0;
    robot.rotation.y = THREE.MathUtils.lerp(robot.rotation.y, pointer.x * 0.25, 0.04);
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, pointer.x * 0.35, 0.08);
    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -pointer.y * 0.18, 0.08);

    // Talking mouth and occasional blink.
    mouth.scale.y = talking ? 1 + Math.abs(Math.sin(t * 17)) * 1.6 + Math.abs(Math.sin(t * 7.3)) * 0.8 : THREE.MathUtils.lerp(mouth.scale.y, 1, 0.2);
    mouth.scale.x = talking ? 0.8 + Math.abs(Math.sin(t * 9)) * 0.35 : 1;
    if (t > nextBlink) {
      const blink = t - nextBlink;
      const open = blink < 0.14 ? Math.abs(1 - blink / 0.07) : 1;
      eyes.forEach((eye) => (eye.scale.x = Math.max(0.08, open)));
      if (blink > 0.14) nextBlink = t + 2.4 + Math.random() * 2.5;
    }
    glowGold.emissiveIntensity = 1.4 + Math.sin(t * 4) * 0.6;
    glowTeal.emissiveIntensity = talking ? 2.6 + Math.sin(t * 12) * 0.5 : 2.6;

    // Wave with the right arm after assembling, and whenever asked.
    const waveTime = t - waveStart;
    rightArm.rotation.z = waveTime >= 0 && waveTime < 2.2
      ? 2.5 + Math.sin(waveTime * 11) * 0.35
      : THREE.MathUtils.lerp(rightArm.rotation.z, 0.18 + Math.sin(t * 1.3) * 0.04, 0.08);
    leftArm.rotation.z = -0.18 - Math.sin(t * 1.3 + 1) * 0.04;
    if (waveStart < 0 && t > 2.1) waveStart = t;

    orbitA.rotation.z += 0.0035;
    orbitB.rotation.z -= 0.0025;
    baseRing.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
    for (const streak of streaks) {
      streak.position.y += streak.userData.speed * 0.016;
      if (streak.position.y > 6) streak.position.y = -4;
    }

    composer.render();
    if (!reduceMotion) frame = requestAnimationFrame(render);
  };
  renderStill = render;
  render();

  return {
    setTalking: (value) => (talking = value),
    wave: () => (waveStart = clock.getElapsedTime()),
    dispose: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
    },
  };
}
