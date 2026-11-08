/**
 * Hasawi: a humanoid robot (rigged 3D model in /public/tour/robot.glb) restyled
 * in the club colours, with a black face screen, glowing eyes and the club badge.
 * Drawn on its own transparent canvas so photos and videos can sit behind it.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const TEAL = 0x2fb3bd;
const GOLD = 0xc4a666;

export type RobotPose = "gate" | "center" | "corner";

export interface RobotControls {
  setPose: (pose: RobotPose) => void;
  setTalking: (talking: boolean) => void;
  dispose: () => void;
}

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function startRobot(canvas: HTMLCanvasElement, modelUrl: string, emblemUrl: string, reduceMotion: boolean): RobotControls {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T) => (disposables.push(item), item);

  const scene = new THREE.Scene();
  const pmrem = track(new THREE.PMREMGenerator(renderer));
  scene.environment = track(pmrem.fromScene(new RoomEnvironment(), 0.04).texture);
  scene.environmentIntensity = 0.8;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  scene.add(new THREE.HemisphereLight(0xdff4f6, 0x23313a, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(1.5, 3, 3);
  const rimTeal = new THREE.DirectionalLight(TEAL, 2.4);
  rimTeal.position.set(-3, 2, -2);
  const rimGold = new THREE.DirectionalLight(GOLD, 1.6);
  rimGold.position.set(3, 1, -2.5);
  scene.add(key, rimTeal, rimGold);

  const robot = new THREE.Group();
  scene.add(robot);

  // Materials for the model and the parts added on top of it.
  const shell = track(new THREE.MeshPhysicalMaterial({ color: 0xeef2f4, roughness: 0.2, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05 }));
  const joints = track(new THREE.MeshStandardMaterial({ color: 0x1e272c, roughness: 0.3, metalness: 0.85 }));
  const screen = track(new THREE.MeshPhysicalMaterial({ color: 0x020507, roughness: 0.04, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide }));
  const glow = track(new THREE.MeshBasicMaterial({ color: 0x7ff3f8, toneMapped: false }));
  const glowSoft = track(new THREE.MeshBasicMaterial({ color: TEAL, toneMapped: false }));
  const gold = track(new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.25, metalness: 0.9 }));
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => new THREE.Mesh(track(geometry), material);

  let mixer: THREE.AnimationMixer | null = null;
  let head: THREE.Object3D | null = null;
  let neck: THREE.Object3D | null = null;
  let spine: THREE.Object3D | null = null;
  let rightArm: THREE.Object3D | null = null;
  let rightForeArm: THREE.Object3D | null = null;
  let eyes: THREE.Mesh[] = [];
  let voiceBars: THREE.Mesh[] = [];
  let loaded = false;

  const emblemTexture = track(new THREE.TextureLoader().load(emblemUrl));
  emblemTexture.colorSpace = THREE.SRGBColorSpace;

  new GLTFLoader().load(modelUrl, (gltf) => {
    const model = gltf.scene;
    model.traverse((object) => {
      const item = object as THREE.Mesh;
      if (!item.isMesh) return;
      item.frustumCulled = false;
      item.material = item.name.includes("Joints") ? joints : shell;
      track(item.geometry);
    });
    head = model.getObjectByName("mixamorigHead") ?? null;
    neck = model.getObjectByName("mixamorigNeck") ?? null;
    spine = model.getObjectByName("mixamorigSpine2") ?? null;
    rightArm = model.getObjectByName("mixamorigRightArm") ?? null;
    rightForeArm = model.getObjectByName("mixamorigRightForeArm") ?? null;

    // Bones are in centimetres; build add-ons in metres and scale them up.
    if (head) {
      const face = new THREE.Group();
      face.scale.setScalar(100);
      face.position.set(0, 8.6, 1.2);
      const visor = mesh(new THREE.SphereGeometry(0.118, 48, 32, Math.PI / 2 - 0.9, 1.8, 1.0, 0.95), screen);
      visor.scale.set(0.98, 1.08, 1.06);
      face.add(visor);
      const eyeGeometry = new THREE.CapsuleGeometry(0.009, 0.026, 4, 10);
      eyes = [-0.036, 0.036].map((x) => {
        const eye = mesh(eyeGeometry, glow);
        eye.rotation.z = Math.PI / 2 + (x < 0 ? -0.1 : 0.1);
        eye.position.set(x, 0.018, 0.128);
        face.add(eye);
        return eye;
      });
      voiceBars = Array.from({ length: 9 }, (_, i) => {
        const bar = mesh(new THREE.BoxGeometry(0.0045, 0.012, 0.002), glowSoft);
        bar.position.set((i - 4) * 0.008, -0.035, 0.124);
        face.add(bar);
        return bar;
      });
      // Ear lights.
      for (const side of [-1, 1]) {
        const ring = mesh(new THREE.TorusGeometry(0.028, 0.004, 8, 32), gold);
        ring.rotation.y = Math.PI / 2;
        ring.position.set(side * 0.1, 0.005, -0.005);
        const light = mesh(new THREE.TorusGeometry(0.016, 0.003, 8, 24), glowSoft);
        light.rotation.y = Math.PI / 2;
        light.position.set(side * 0.102, 0.005, -0.005);
        face.add(ring, light);
      }
      head.add(face);
    }
    if (spine) {
      const badge = new THREE.Group();
      badge.scale.setScalar(100);
      badge.position.set(-7, 10, 13.5);
      badge.rotation.set(-0.12, -0.25, 0);
      const back = mesh(new THREE.CircleGeometry(0.042, 40), track(new THREE.MeshBasicMaterial({ color: 0xe8f2f4, toneMapped: false })));
      const ring = mesh(new THREE.TorusGeometry(0.042, 0.003, 8, 48), glowSoft);
      const emblem = mesh(new THREE.PlaneGeometry(0.055, 0.067), track(new THREE.MeshBasicMaterial({ map: emblemTexture, transparent: true, toneMapped: false })));
      emblem.position.z = 0.001;
      badge.add(back, ring, emblem);
      spine.add(badge);
    }

    mixer = new THREE.AnimationMixer(model);
    const idle = gltf.animations.find((clip) => clip.name === "idle");
    if (idle) mixer.clipAction(idle).play();
    robot.add(model);
    loaded = true;
    if (reduceMotion) render();
  });

  // Framing: close-up in the centre, smaller at the side during the tour.
  const poses = {
    gate: { distance: 2.9, x: 0, y: 0 },
    center: { distance: 2.55, x: 0, y: 0 },
    corner: { distance: 4.6, x: 0, y: 0 },
  };
  let pose: RobotPose = "gate";
  let from = { ...poses.gate };
  let poseStart = -10;

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const portrait = camera.aspect < 0.8;
    const halfH = (d: number) => d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    poses.center.distance = portrait ? 3.4 : 2.55;
    poses.center.y = portrait ? -0.12 : -0.05;
    poses.gate.distance = portrait ? 4.8 : 2.9;
    poses.gate.x = portrait ? 0 : -halfH(2.9) * camera.aspect * 0.42;
    poses.gate.y = portrait ? 0.62 : -0.12;
    poses.corner.distance = portrait ? 6.2 : 4.6;
    const cornerHalfW = halfH(poses.corner.distance) * camera.aspect;
    poses.corner.x = portrait ? cornerHalfW - 0.38 : -cornerHalfW + 0.55;
    poses.corner.y = portrait ? -halfH(poses.corner.distance) * 0.42 : -halfH(poses.corner.distance) * 0.05;
    if (reduceMotion) render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const pointer = new THREE.Vector2();
  const onPointer = (event: PointerEvent) => pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  window.addEventListener("pointermove", onPointer);

  let talking = false;
  let talkAmount = 0;
  let nextBlink = 2;
  const clock = new THREE.Clock();
  let frame = 0;
  const now = () => (reduceMotion ? 1000 : clock.getElapsedTime());

  function render() {
    const t = now();
    const delta = reduceMotion ? 0 : Math.min(clock.getDelta(), 0.05);
    mixer?.update(delta);

    // Camera framing between poses.
    const k = easeInOut(THREE.MathUtils.clamp((t - poseStart) / 1.3, 0, 1));
    const target = poses[pose];
    const distance = THREE.MathUtils.lerp(from.distance, target.distance, k);
    const x = THREE.MathUtils.lerp(from.x, target.x, k);
    const y = THREE.MathUtils.lerp(from.y, target.y, k);
    camera.position.set(-x, 1.38 - y, distance);
    camera.lookAt(-x, 1.3 - y, 0);

    // Talking: nod, gesture with the right hand, voice light on the face.
    talkAmount = THREE.MathUtils.lerp(talkAmount, talking ? 1 : 0, 0.08);
    if (head && neck && spine) {
      head.rotation.y += THREE.MathUtils.clamp(pointer.x * 0.5, -0.5, 0.5) + Math.sin(t * 0.7) * 0.06;
      head.rotation.x += -pointer.y * 0.15 + talkAmount * (Math.sin(t * 6.5) * 0.05 + Math.sin(t * 2.3) * 0.04);
      head.rotation.z += Math.sin(t * 1.1) * 0.03 * talkAmount;
      spine.rotation.y += Math.sin(t * 0.9) * 0.06 * talkAmount;
    }
    if (rightArm && rightForeArm) {
      rightArm.rotation.x += -0.35 * talkAmount + Math.sin(t * 1.8) * 0.1 * talkAmount;
      rightForeArm.rotation.z += 0.45 * talkAmount + Math.sin(t * 3.1) * 0.15 * talkAmount;
    }
    voiceBars.forEach((bar, i) => {
      const level = talking ? 0.5 + Math.abs(Math.sin(t * 14 + i * 1.9)) * 2.4 * (1 - Math.abs(i - 4) / 6) : 0.3;
      bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, level, 0.35);
    });
    if (t > nextBlink) {
      const blink = t - nextBlink;
      const open = blink < 0.14 ? Math.abs(1 - blink / 0.07) : 1;
      eyes.forEach((eye) => (eye.scale.x = Math.max(0.1, open)));
      if (blink > 0.14) nextBlink = t + 2.5 + Math.random() * 3;
    }
    robot.position.y = Math.sin(t * 1.2) * 0.008;

    if (loaded) renderer.render(scene, camera);
    if (!reduceMotion) frame = requestAnimationFrame(render);
  }
  render();

  return {
    setPose: (next) => {
      if (next === pose) return;
      const k = easeInOut(THREE.MathUtils.clamp((now() - poseStart) / 1.3, 0, 1));
      from = {
        distance: THREE.MathUtils.lerp(from.distance, poses[pose].distance, k),
        x: THREE.MathUtils.lerp(from.x, poses[pose].x, k),
        y: THREE.MathUtils.lerp(from.y, poses[pose].y, k),
      };
      pose = next;
      poseStart = now();
      if (reduceMotion) render();
    },
    setTalking: (value) => (talking = value),
    dispose: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
    },
  };
}
