/**
 * A night-time 3D Al-Ahsa for the booth tour: the palm oasis with an AI drone,
 * a date factory with a smart sorting gate, Al-Qarah mountain, the university
 * and a city network. Hasawi rides along with the camera as the narrator.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const TEAL = 0x2fb3bd;
const GOLD = 0xc4a666;
const NIGHT = 0x08151b;

/** Where the camera stands for each part of the tour. */
export type StopId = "welcome" | "oasis" | "factory" | "qarah" | "university" | "city" | "challenge";
type RobotPose = "center" | "corner";

/** Hasawi stands in the centre at the start and end, and at the side during the tour. */
export const robotPoseFor = (stop: StopId): RobotPose => STOPS[stop].robot;

const STOPS: Record<StopId, { camera: [number, number, number]; target: [number, number, number]; robot: RobotPose }> = {
  welcome: { camera: [0, 9, 34], target: [0, 1, -12], robot: "center" },
  oasis: { camera: [-3, 10, 12], target: [-18, 3, -8], robot: "corner" },
  factory: { camera: [15, 5.5, -1], target: [7, 1.2, -12.5], robot: "corner" },
  qarah: { camera: [-12, 10, -15], target: [-7, 3, -35], robot: "corner" },
  university: { camera: [33, 11, -12], target: [18, 4.5, -37], robot: "corner" },
  city: { camera: [4, 30, 14], target: [3, 0, -20], robot: "corner" },
  challenge: { camera: [0, 9, 34], target: [0, 1, -12], robot: "center" },
};

export interface TourControls {
  goTo: (stop: StopId) => void;
  dispose: () => void;
}

const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Small deterministic random so the world looks the same every visit. */
function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function textSprite(text: string, color: string, track: <T extends { dispose: () => void }>(i: T) => T) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(8,21,27,0.75)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 144, 40);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#eef6f7";
  ctx.font = "600 64px 'Plex Arabic', 'IBM Plex Sans Arabic', sans-serif";
  ctx.textAlign = "center";
  ctx.direction = /[\u0600-\u06FF]/.test(text) ? "rtl" : "ltr";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 84);
  const texture = track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })));
  sprite.scale.set(3.2, 1, 1);
  return sprite;
}

function windowTexture(track: <T extends { dispose: () => void }>(i: T) => T, random: () => number) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0d1b21";
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const lit = random();
      ctx.fillStyle = lit > 0.55 ? (lit > 0.85 ? "#e8d29b" : "#7fe0e6") : "#132a31";
      ctx.fillRect(x * 16 + 4, y * 16 + 5, 8, 8);
    }
  }
  const texture = track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function startTour(canvas: HTMLCanvasElement, emblemUrl: string, reduceMotion: boolean): TourControls {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(NIGHT, 1);

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T) => (disposables.push(item), item);
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => new THREE.Mesh(track(geometry), material);
  const random = seeded(1448);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(NIGHT, 0.018);
  const pmrem = track(new THREE.PMREMGenerator(renderer));
  scene.environment = track(pmrem.fromScene(new RoomEnvironment(), 0.04).texture);
  scene.environmentIntensity = 0.6;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  scene.add(camera);

  // Night lighting: cool moon, warm ground bounce, plus lights at each landmark.
  scene.add(new THREE.HemisphereLight(0x5a8a99, 0x3a2a18, 0.9));
  const moon = new THREE.DirectionalLight(0xbfd8ff, 1.1);
  moon.position.set(-20, 40, 20);
  scene.add(moon);
  for (const [x, y, z, color, power] of [
    [-18, 6, -6, TEAL, 120], [8, 5, -10, GOLD, 90], [-6, 8, -30, GOLD, 120], [20, 8, -32, TEAL, 120],
  ] as const) {
    const light = new THREE.PointLight(color, power, 30, 1.6);
    light.position.set(x, y, z);
    scene.add(light);
  }

  // ── Sky ────────────────────────────────────────────────────────────────────
  const starCount = 1400;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = random() * Math.PI * 2;
    const phi = random() * Math.PI * 0.45;
    const r = 180;
    starPositions.set([Math.cos(theta) * Math.sin(phi) * r, Math.cos(phi) * r * 0.6 + 10, Math.sin(theta) * Math.sin(phi) * r - 20], i * 3);
  }
  const starGeometry = track(new THREE.BufferGeometry());
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(starGeometry, track(new THREE.PointsMaterial({ color: 0xcfe9ee, size: 0.6, sizeAttenuation: true, fog: false }))));
  const moonDisc = mesh(new THREE.CircleGeometry(5, 48), track(new THREE.MeshBasicMaterial({ color: 0xf3ead2, fog: false })));
  moonDisc.position.set(-60, 55, -150);
  scene.add(moonDisc);

  // ── Ground: sand dunes with a faint digital grid ──────────────────────────
  const groundGeometry = new THREE.PlaneGeometry(260, 260, 160, 160);
  groundGeometry.rotateX(-Math.PI / 2);
  const groundPositions = groundGeometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < groundPositions.count; i++) {
    const x = groundPositions.getX(i);
    const z = groundPositions.getZ(i);
    const distance = Math.hypot(x, z + 15);
    const dunes = Math.sin(x * 0.08) * Math.cos(z * 0.06) * 1.6 + Math.sin(x * 0.21 + z * 0.13) * 0.5;
    groundPositions.setY(i, dunes * THREE.MathUtils.smoothstep(distance, 38, 70));
  }
  groundGeometry.computeVertexNormals();
  const ground = mesh(groundGeometry, track(new THREE.MeshStandardMaterial({ color: 0x5e4a33, roughness: 0.95 })));
  ground.position.z = -15;
  scene.add(ground);
  const grid = new THREE.GridHelper(160, 160, TEAL, TEAL);
  const gridMaterial = grid.material as THREE.LineBasicMaterial;
  gridMaterial.transparent = true;
  gridMaterial.opacity = 0.08;
  grid.position.set(0, 0.03, -15);
  track(grid.geometry);
  track(gridMaterial);
  scene.add(grid);

  // ── Palm trees (instanced) ────────────────────────────────────────────────
  const trunkGeometry = track(new THREE.CylinderGeometry(0.13, 0.22, 4.2, 7, 8).translate(0, 2.1, 0));
  const frondParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 11; i++) {
    const frond = new THREE.PlaneGeometry(2.3, 0.42, 10, 1).translate(1.15, 0, 0);
    const p = frond.attributes.position as THREE.BufferAttribute;
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j);
      const k = x / 2.3;
      p.setZ(j, p.getY(j) * (1 - k * 0.7));
      p.setY(j, 0.55 * k - 1.25 * k * k + Math.abs(p.getZ(j)) * 0.4);
    }
    frond.rotateY((i / 11) * Math.PI * 2 + (i % 2) * 0.2);
    frondParts.push(frond);
  }
  const crownGeometry = track(mergeGeometries(frondParts).translate(0, 4.15, 0));
  frondParts.forEach((g) => g.dispose());
  const trunkMaterial = track(new THREE.MeshStandardMaterial({ color: 0x6b5238, roughness: 0.9, flatShading: true }));
  const crownMaterial = track(new THREE.MeshStandardMaterial({ color: 0x3f7a45, roughness: 0.7, side: THREE.DoubleSide }));

  const palmSpots: THREE.Vector3[] = [];
  const addPalms = (cx: number, cz: number, radius: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2;
      const r = Math.sqrt(random()) * radius;
      palmSpots.push(new THREE.Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r));
    }
  };
  addPalms(-19, -8, 11, 230);
  addPalms(-34, -22, 12, 120);
  addPalms(-3, 5, 5, 20);
  addPalms(30, -10, 8, 40);
  const palmMatrix = new THREE.Matrix4();
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, palmSpots.length);
  const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, palmSpots.length);
  palmSpots.forEach((spot, i) => {
    const scale = 0.75 + random() * 0.55;
    palmMatrix.compose(spot, new THREE.Quaternion().setFromEuler(new THREE.Euler((random() - 0.5) * 0.12, random() * 6.28, (random() - 0.5) * 0.12)), new THREE.Vector3(scale, scale, scale));
    trunks.setMatrixAt(i, palmMatrix);
    crowns.setMatrixAt(i, palmMatrix);
  });
  scene.add(trunks, crowns);

  // ── Oasis: AI drone scanning palms for the red palm weevil ────────────────
  const glowTeal = track(new THREE.MeshStandardMaterial({ color: TEAL, emissive: TEAL, emissiveIntensity: 3 }));
  const glowGold = track(new THREE.MeshStandardMaterial({ color: GOLD, emissive: GOLD, emissiveIntensity: 2.4 }));
  const glowRed = track(new THREE.MeshStandardMaterial({ color: 0xff4d4d, emissive: 0xff3030, emissiveIntensity: 3 }));
  const darkMetal = track(new THREE.MeshStandardMaterial({ color: 0x1d262b, roughness: 0.4, metalness: 0.8 }));

  const drone = new THREE.Group();
  const droneBody = mesh(new THREE.BoxGeometry(0.6, 0.16, 0.6), darkMetal);
  drone.add(droneBody);
  const rotors: THREE.Mesh[] = [];
  for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) {
    const arm = mesh(new THREE.BoxGeometry(0.5, 0.04, 0.06), darkMetal);
    arm.position.set(x / 2, 0, z / 2);
    arm.rotation.y = Math.atan2(z, x);
    const rotor = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.01, 20), track(new THREE.MeshBasicMaterial({ color: 0x9fd9de, transparent: true, opacity: 0.35 })));
    rotor.position.set(x, 0.08, z);
    rotors.push(rotor);
    drone.add(arm, rotor);
  }
  const droneEye = mesh(new THREE.SphereGeometry(0.07, 12, 8), glowTeal);
  droneEye.position.y = -0.1;
  const beamMaterial = track(new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const droneBeam = mesh(new THREE.ConeGeometry(1.6, 5, 32, 1, true).translate(0, -2.5, 0), beamMaterial);
  drone.add(droneEye, droneBeam);
  scene.add(drone);

  // One palm flagged as infected, the rest marked healthy.
  const flagged = palmSpots.reduce((best, spot) => (spot.distanceTo(new THREE.Vector3(-17, 0, -6)) < best.distanceTo(new THREE.Vector3(-17, 0, -6)) ? spot : best));
  const alert = new THREE.Group();
  alert.position.copy(flagged).add(new THREE.Vector3(0, 6.3, 0));
  const alertRing = mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 40), glowRed);
  const alertDot = mesh(new THREE.OctahedronGeometry(0.25), glowRed);
  alertDot.position.y = 0.9;
  alert.add(alertRing, alertDot);
  const alertLabel = textSprite("سوسة النخيل!", "#ff5b5b", track);
  alertLabel.position.y = 2;
  alert.add(alertLabel);
  scene.add(alert);
  const scanRing = mesh(new THREE.TorusGeometry(0.55, 0.03, 8, 40), glowRed);
  scanRing.rotation.x = Math.PI / 2;
  scanRing.position.copy(flagged);
  scene.add(scanRing);
  const healthy = palmSpots
    .filter((spot) => spot !== flagged && spot.distanceTo(flagged) < 7 && spot.distanceTo(flagged) > 1.5)
    .slice(0, 6)
    .map((spot) => {
      const tick = mesh(new THREE.TorusGeometry(0.28, 0.035, 8, 32), glowTeal);
      tick.position.copy(spot).add(new THREE.Vector3(0, 5.9, 0));
      scene.add(tick);
      return tick;
    });

  // ── Date factory with a smart sorting gate ────────────────────────────────
  const factory = new THREE.Group();
  factory.position.set(8, 0, -14);
  const hallMaterial = track(new THREE.MeshStandardMaterial({ color: 0x223640, roughness: 0.6, metalness: 0.3 }));
  const hall = mesh(new THREE.BoxGeometry(8, 3.4, 5), hallMaterial);
  hall.position.y = 1.7;
  const hallEdges = new THREE.LineSegments(track(new THREE.EdgesGeometry(hall.geometry)), track(new THREE.LineBasicMaterial({ color: TEAL })));
  hallEdges.position.copy(hall.position);
  const sign = textSprite("مصنع التمور", "#c4a666", track);
  sign.position.set(0, 4.4, 0);
  const belt = mesh(new THREE.BoxGeometry(12, 0.25, 1.1), darkMetal);
  belt.position.set(0, 0.7, 3.6);
  const legs = [-5, -2, 1, 4].map((x) => {
    const leg = mesh(new THREE.BoxGeometry(0.12, 0.6, 1), darkMetal);
    leg.position.set(x, 0.3, 3.6);
    return leg;
  });
  const gate = mesh(new THREE.TorusGeometry(1, 0.06, 10, 48, Math.PI), glowTeal);
  gate.position.set(0, 0.8, 3.6);
  const gateCamera = mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), darkMetal);
  gateCamera.position.set(0, 1.85, 3.6);
  const gateLens = mesh(new THREE.SphereGeometry(0.07, 12, 8), glowTeal);
  gateLens.position.set(0, 1.72, 3.6);
  factory.add(hall, hallEdges, sign, belt, ...legs, gate, gateCamera, gateLens);
  const dateCount = 26;
  const dates = new THREE.InstancedMesh(track(new THREE.SphereGeometry(0.16, 12, 8).scale(1.5, 0.8, 0.8)), track(new THREE.MeshStandardMaterial({ roughness: 0.4 })), dateCount);
  const dateColor = new THREE.Color();
  factory.add(dates);
  scene.add(factory);

  // ── Al-Qarah mountain with a multilingual guide ───────────────────────────
  const qarah = new THREE.Group();
  qarah.position.set(-7, 0, -35);
  const rockMaterial = track(new THREE.MeshStandardMaterial({ color: 0x9b7650, roughness: 0.95, flatShading: true }));
  for (let i = 0; i < 9; i++) {
    // Flat-topped rock pillars like the mesa of Al-Qarah.
    const radius = 2.2 + random() * 1.8;
    const rock = new THREE.IcosahedronGeometry(radius, 2);
    const p = rock.attributes.position as THREE.BufferAttribute;
    for (let j = 0; j < p.count; j++) {
      const jitter = 0.88 + random() * 0.24;
      p.setXYZ(j, p.getX(j) * jitter, Math.min(p.getY(j), radius * 0.55), p.getZ(j) * jitter);
    }
    rock.computeVertexNormals();
    const piece = mesh(rock, rockMaterial);
    piece.position.set((random() - 0.5) * 9, 1.6 + random() * 2.2, (random() - 0.5) * 5);
    piece.scale.set(1, 1.2 + random() * 0.5, 1);
    qarah.add(piece);
  }
  const greetings = ["مرحبا", "Hello", "Bonjour", "你好", "Hola", "नमस्ते"].map((word, i) => {
    const sprite = textSprite(word, i % 2 ? "#2fb3bd" : "#c4a666", track);
    sprite.scale.set(2.2, 0.7, 1);
    qarah.add(sprite);
    return sprite;
  });
  scene.add(qarah);

  // ── University campus with the club's emblem ──────────────────────────────
  const campus = new THREE.Group();
  campus.position.set(19, 0, -37);
  const windows = windowTexture(track, random);
  for (const [x, z, w, h, d] of [[0, 0, 6, 5, 4], [-6, 2, 4, 3.2, 4], [6, 1.5, 4, 3.8, 3.5], [0, 6, 9, 2.2, 2.5]] as const) {
    const texture = windows.clone();
    texture.repeat.set(w / 2, h / 2);
    texture.needsUpdate = true;
    track(texture);
    const building = mesh(new THREE.BoxGeometry(w, h, d), track(new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.6 })));
    building.position.set(x, h / 2, z);
    campus.add(building);
  }
  const emblemTexture = track(new THREE.TextureLoader().load(emblemUrl));
  emblemTexture.colorSpace = THREE.SRGBColorSpace;
  const holo = new THREE.Group();
  holo.position.set(0, 8.2, 0);
  const holoBack = mesh(new THREE.CircleGeometry(1.25, 48), track(new THREE.MeshBasicMaterial({ color: 0xe3eef0, transparent: true, opacity: 0.92, toneMapped: false, side: THREE.DoubleSide })));
  const holoEmblem = mesh(new THREE.PlaneGeometry(1.55, 1.9), track(new THREE.MeshBasicMaterial({ map: emblemTexture, transparent: true, toneMapped: false, side: THREE.DoubleSide })));
  holoEmblem.position.z = 0.02;
  const holoRings = [1.45, 1.75].map((r, i) => {
    const ring = mesh(new THREE.TorusGeometry(r, 0.03, 8, 64), i ? glowGold : glowTeal);
    holo.add(ring);
    return ring;
  });
  const holoBeam = mesh(new THREE.CylinderGeometry(0.4, 1.6, 3.2, 32, 1, true), beamMaterial);
  holoBeam.position.y = -2.4;
  holo.add(holoBack, holoEmblem, holoBeam);
  campus.add(holo);
  scene.add(campus);

  // ── City: houses and an AI network linking every landmark ─────────────────
  const houseCount = 140;
  const houses = new THREE.InstancedMesh(track(new THREE.BoxGeometry(1, 1, 1)), track(new THREE.MeshStandardMaterial({ color: 0xb8a07a, roughness: 0.9 })), houseCount);
  for (let i = 0; i < houseCount; i++) {
    const w = 1 + random() * 1.6;
    const h = 0.8 + random() * 1.8;
    const x = 7 + (random() - 0.5) * 16;
    const z = -24 + (random() - 0.5) * 9;
    palmMatrix.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, 1 + random() * 1.4));
    houses.setMatrixAt(i, palmMatrix);
  }
  scene.add(houses);

  const hubs = [new THREE.Vector3(-19, 1, -8), new THREE.Vector3(8, 4, -14), new THREE.Vector3(-7, 6, -35), new THREE.Vector3(19, 6, -37), new THREE.Vector3(7, 2, -24)];
  const links: THREE.QuadraticBezierCurve3[] = [];
  for (let i = 0; i < hubs.length; i++) {
    for (let j = i + 1; j < hubs.length; j++) {
      if ((i + j) % 3 === 0 && i !== 4 && j !== 4) continue;
      const mid = hubs[i].clone().lerp(hubs[j], 0.5).add(new THREE.Vector3(0, 7 + hubs[i].distanceTo(hubs[j]) * 0.18, 0));
      links.push(new THREE.QuadraticBezierCurve3(hubs[i], mid, hubs[j]));
    }
  }
  const linkMaterial = track(new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  links.forEach((curve) => scene.add(mesh(new THREE.TubeGeometry(curve, 48, 0.035, 6), linkMaterial)));
  const pulseGeometry = track(new THREE.SphereGeometry(0.16, 12, 8));
  const pulses = links.flatMap((curve, i) => [0, 0.5].map((offset) => {
    const pulse = new THREE.Mesh(pulseGeometry, i % 2 ? glowGold : glowTeal);
    pulse.userData = { curve, offset: offset + i * 0.13 };
    scene.add(pulse);
    return pulse;
  }));

  // Floating dust in the air.
  const dustCount = 900;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) dustPositions.set([(random() - 0.5) * 90, random() * 18, (random() - 0.5) * 80 - 15], i * 3);
  const dustGeometry = track(new THREE.BufferGeometry());
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, track(new THREE.PointsMaterial({ color: TEAL, size: 0.09, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })));
  scene.add(dust);

  let renderStill = () => {};

  // ── Post-processing ───────────────────────────────────────────────────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.75, 0.45, 1.0);
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
    camera.updateProjectionMatrix();
    const portrait = camera.aspect < 0.8;
    // Narrow screens see less sideways, so stand further back from each landmark.
    distanceFactor = portrait ? 1.7 : camera.aspect < 1.2 ? 1.25 : 1;
    if (reduceMotion) renderStill();
  };
  let distanceFactor = 1;
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  // Camera motion between stops.
  const cameraFrom = new THREE.Vector3(...STOPS.welcome.camera).add(new THREE.Vector3(0, 14, 30));
  const cameraTo = new THREE.Vector3(...STOPS.welcome.camera);
  const targetFrom = new THREE.Vector3(...STOPS.welcome.target);
  const targetTo = targetFrom.clone();
  const target = targetFrom.clone();
  let moveStart = 0;
  let moveDuration = 3.2;

  const clock = new THREE.Clock();
  const now = () => (reduceMotion ? 1000 : clock.getElapsedTime());

  const goTo = (stop: StopId) => {
    const t = now();
    cameraFrom.copy(camera.position);
    targetFrom.copy(target);
    targetTo.set(...STOPS[stop].target);
    cameraTo.set(...STOPS[stop].camera).sub(targetTo).multiplyScalar(distanceFactor).add(targetTo);
    moveStart = t;
    moveDuration = Math.min(4, 2 + cameraFrom.distanceTo(cameraTo) * 0.05);
    if (reduceMotion) renderStill();
  };


  let frame = 0;
  const render = () => {
    const t = now();

    // Fly the camera with a gentle arc, then drift slightly at the stop.
    const k = easeInOut(THREE.MathUtils.clamp((t - moveStart) / moveDuration, 0, 1));
    camera.position.lerpVectors(cameraFrom, cameraTo, k);
    camera.position.y += Math.sin(k * Math.PI) * Math.min(8, cameraFrom.distanceTo(cameraTo) * 0.15);
    target.lerpVectors(targetFrom, targetTo, k);
    camera.position.x += Math.sin(t * 0.25) * 0.35;
    camera.position.y += Math.sin(t * 0.33) * 0.15;
    camera.lookAt(target);


    // Oasis.
    drone.position.set(-17 + Math.cos(t * 0.45) * 4.5, 7.4 + Math.sin(t * 1.3) * 0.25, -6 + Math.sin(t * 0.45) * 4.5);
    drone.rotation.y = -t * 0.45;
    rotors.forEach((rotor) => (rotor.rotation.y += 0.9));
    alert.rotation.y = t * 1.5;
    alertDot.position.y = 0.9 + Math.sin(t * 3) * 0.15;
    glowRed.emissiveIntensity = 2 + Math.abs(Math.sin(t * 4)) * 2.5;
    scanRing.position.y = 2.6 + Math.sin(t * 2.2) * 2.4;
    healthy.forEach((tick, i) => (tick.rotation.y = t * 2 + i));

    // Factory belt: dates pass the camera gate and get sorted by quality.
    for (let i = 0; i < dateCount; i++) {
      const x = ((t * 1.1 + i * (12 / dateCount)) % 12) - 6;
      palmMatrix.compose(new THREE.Vector3(x, 0.92, 3.6 + (x > 0 && i % 5 === 0 ? -0.3 : 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, i, 0)), new THREE.Vector3(1, 1, 1));
      dates.setMatrixAt(i, palmMatrix);
      dates.setColorAt(i, x < 0 ? dateColor.set(0x5a2e14) : i % 5 === 0 ? dateColor.set(0xff4d4d) : dateColor.set(GOLD));
    }
    dates.instanceMatrix.needsUpdate = true;
    if (dates.instanceColor) dates.instanceColor.needsUpdate = true;
    glowTeal.emissiveIntensity = 2.6 + Math.sin(t * 6) * 0.4;

    // Al-Qarah greetings orbit the mountain.
    greetings.forEach((sprite, i) => {
      const a = t * 0.35 + (i / greetings.length) * Math.PI * 2;
      sprite.position.set(Math.cos(a) * 7, 6.5 + Math.sin(t + i) * 0.6, Math.sin(a) * 5);
    });

    // Campus hologram.
    holo.rotation.y = Math.sin(t * 0.6) * 0.5;
    holoRings[0].rotation.x = t * 0.8;
    holoRings[1].rotation.y = t * 0.6;

    // Network pulses.
    for (const pulse of pulses) {
      const { curve, offset } = pulse.userData as { curve: THREE.QuadraticBezierCurve3; offset: number };
      curve.getPointAt((t * 0.18 + offset) % 1, pulse.position);
    }
    dust.rotation.y = t * 0.01;

    composer.render();
    if (!reduceMotion) frame = requestAnimationFrame(render);
  };
  renderStill = render;
  render();

  return {
    goTo,
    dispose: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
    },
  };
}
