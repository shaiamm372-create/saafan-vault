/**
 * Hasawi: a white humanoid android bust built from three.js shapes.
 * Head, black face screen, mechanical neck, shoulders and a chest badge with the club emblem.
 */
import * as THREE from "three";

const TEAL = 0x2fb3bd;
const GOLD = 0xc4a666;

export interface Android {
  group: THREE.Group;
  update: (t: number, talking: boolean, pointer: THREE.Vector2) => void;
}

type Track = <T extends { dispose: () => void }>(item: T) => T;

const v2 = (x: number, y: number) => new THREE.Vector2(x, y);

export function buildAndroid(track: Track, emblemUrl: string, onTexture?: () => void): Android {
  const group = new THREE.Group();

  const shell = track(new THREE.MeshPhysicalMaterial({ color: 0xdde4e7, roughness: 0.22, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.06 }));
  // The body is larger and catches more light, so it is a touch greyer and less glossy.
  const body = track(new THREE.MeshPhysicalMaterial({ color: 0xb9c3c8, roughness: 0.35, metalness: 0.1, clearcoat: 0.35, clearcoatRoughness: 0.2, envMapIntensity: 0.5 }));
  const shellShade = track(new THREE.MeshPhysicalMaterial({ color: 0xc9d2d6, roughness: 0.3, metalness: 0.2, clearcoat: 0.8 }));
  const mech = track(new THREE.MeshStandardMaterial({ color: 0x1b2328, roughness: 0.35, metalness: 0.85 }));
  const mechLight = track(new THREE.MeshStandardMaterial({ color: 0x59656b, roughness: 0.3, metalness: 0.9 }));
  const screen = track(new THREE.MeshPhysicalMaterial({ color: 0x030709, roughness: 0.05, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide }));
  const glow = track(new THREE.MeshStandardMaterial({ color: TEAL, emissive: TEAL, emissiveIntensity: 3 }));
  const glowSoft = track(new THREE.MeshStandardMaterial({ color: TEAL, emissive: TEAL, emissiveIntensity: 1.4 }));
  const gold = track(new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.25, metalness: 0.9 }));
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => new THREE.Mesh(track(geometry), material);

  // ── Head ──────────────────────────────────────────────────────────────────
  const head = new THREE.Group();
  head.position.y = 0.05;
  const headScale = new THREE.Group();
  headScale.scale.set(0.9, 1, 1.08);
  head.add(headScale);

  // Profile of a human skull, top to chin, revolved around the vertical axis.
  const profile = [
    v2(0, 1.0), v2(0.22, 0.985), v2(0.4, 0.93), v2(0.52, 0.82), v2(0.59, 0.66), v2(0.61, 0.48),
    v2(0.6, 0.3), v2(0.56, 0.12), v2(0.49, -0.04), v2(0.4, -0.17), v2(0.29, -0.27), v2(0.15, -0.32), v2(0.001, -0.335),
  ];
  const skull = mesh(new THREE.LatheGeometry(profile, 64), shell);
  // Black face screen: the front of the same shape, slightly larger.
  const facePoints = profile.slice(3, 12).map((p) => v2(p.x * 1.025, p.y));
  const face = mesh(new THREE.LatheGeometry(facePoints, 48, -0.92, 1.84), screen);
  // Panel seam across the crown.
  const seam = mesh(new THREE.TorusGeometry(0.6, 0.008, 6, 96), mech);
  seam.rotation.y = Math.PI / 2;
  seam.scale.set(1, 0.98, 1);
  seam.position.y = 0.48;
  headScale.add(skull, face, seam);

  // Eyes and a voice light under the screen.
  const eyeGeometry = new THREE.CapsuleGeometry(0.035, 0.11, 4, 12);
  const eyes = [-0.19, 0.19].map((x) => {
    const eye = mesh(eyeGeometry, glow);
    eye.rotation.z = Math.PI / 2 + (x < 0 ? -0.08 : 0.08);
    eye.position.set(x, 0.45, 0.64);
    head.add(eye);
    return eye;
  });
  const voiceBars = Array.from({ length: 7 }, (_, i) => {
    const bar = mesh(new THREE.BoxGeometry(0.018, 0.035, 0.01), glowSoft);
    bar.position.set((i - 3) * 0.032, 0.14, 0.6);
    head.add(bar);
    return bar;
  });

  // Ears: round mechanical discs with a gold ring and a light.
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(side * 0.55, 0.4, -0.02);
    ear.rotation.z = side * Math.PI / 2;
    const outer = mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.08, 40), shellShade);
    const inner = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 32), mech);
    const ring = mesh(new THREE.TorusGeometry(0.135, 0.012, 8, 48), gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = side * 0.045;
    const light = mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 32), glow);
    light.rotation.x = Math.PI / 2;
    light.position.y = side * 0.055;
    ear.add(outer, inner, ring, light);
    head.add(ear);
  }

  // ── Neck: spine with cables ───────────────────────────────────────────────
  const neck = new THREE.Group();
  neck.position.y = -0.3;
  const spine = mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.6, 20), mech);
  spine.position.y = -0.28;
  neck.add(spine);
  for (let i = 0; i < 4; i++) {
    const disc = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.035, 24), mechLight);
    disc.position.y = -0.08 - i * 0.13;
    neck.add(disc);
  }
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.3;
    const cable = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 8), i % 3 === 0 ? gold : mech);
    cable.position.set(Math.cos(angle) * 0.17, -0.28, Math.sin(angle) * 0.17);
    cable.rotation.set(Math.sin(angle) * 0.12, 0, -Math.cos(angle) * 0.12);
    neck.add(cable);
  }

  // ── Shoulders and chest ───────────────────────────────────────────────────
  const torso = new THREE.Group();
  torso.position.y = -0.9;
  const chestProfile = [
    v2(0.001, 0.05), v2(0.22, 0.05), v2(0.42, 0.0), v2(0.68, -0.12), v2(0.88, -0.3),
    v2(0.97, -0.55), v2(0.96, -0.95), v2(0.88, -1.45), v2(0.7, -1.9), v2(0.001, -1.95),
  ];
  const chest = mesh(new THREE.LatheGeometry(chestProfile, 64), body);
  chest.scale.set(1, 1, 0.56);
  const collar = mesh(new THREE.TorusGeometry(0.24, 0.05, 12, 40), mech);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.04;
  torso.add(chest, collar);

  // Chest panel seams and side light strips.
  for (const [x, y, w, h, r] of [
    [0, -0.95, 0.008, 0.9, 0], [-0.32, -0.55, 0.5, 0.008, 0.25], [0.32, -0.55, 0.5, 0.008, -0.25],
  ] as const) {
    const line = mesh(new THREE.BoxGeometry(w, h, 0.01), mech);
    line.position.set(x, y, 0.535);
    line.rotation.z = r;
    torso.add(line);
  }
  for (const side of [-1, 1]) {
    const strip = mesh(new THREE.BoxGeometry(0.02, 0.32, 0.02), glow);
    strip.position.set(side * 0.62, -0.62, 0.43);
    strip.rotation.y = side * 0.6;
    torso.add(strip);
  }

  // Club badge on the chest.
  const badge = new THREE.Group();
  badge.position.set(-0.36, -0.82, 0.5);
  badge.rotation.y = -0.22;
  const badgeBack = mesh(new THREE.CircleGeometry(0.2, 40), track(new THREE.MeshBasicMaterial({ color: 0xe3eef0, toneMapped: false })));
  const badgeRing = mesh(new THREE.TorusGeometry(0.2, 0.014, 8, 48), glow);
  const emblemTexture = track(new THREE.TextureLoader().load(emblemUrl, onTexture));
  emblemTexture.colorSpace = THREE.SRGBColorSpace;
  const emblem = mesh(new THREE.PlaneGeometry(0.26, 0.32), track(new THREE.MeshBasicMaterial({ map: emblemTexture, transparent: true, toneMapped: false })));
  emblem.position.z = 0.005;
  badge.add(badgeBack, badgeRing, emblem);
  torso.add(badge);

  // Shoulders with a mechanical joint and the top of each arm.
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 1.0, -0.42, 0);
    const cap = mesh(new THREE.SphereGeometry(0.3, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.6), body);
    cap.rotation.z = side * -0.35;
    const joint = mesh(new THREE.SphereGeometry(0.2, 24, 16), mech);
    joint.position.y = -0.12;
    const arm = mesh(new THREE.CapsuleGeometry(0.2, 0.7, 8, 24), body);
    arm.position.set(side * 0.08, -0.62, 0);
    arm.rotation.z = side * 0.1;
    const band = mesh(new THREE.TorusGeometry(0.205, 0.018, 8, 40), gold);
    band.rotation.x = Math.PI / 2;
    band.position.set(side * 0.06, -0.42, 0);
    shoulder.add(joint, cap, arm, band);
    torso.add(shoulder);
  }

  group.add(torso, neck, head);

  let nextBlink = 2;
  const update = (t: number, talking: boolean, pointer: THREE.Vector2) => {
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, pointer.x * 0.4 + Math.sin(t * 0.6) * 0.05, 0.06);
    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -pointer.y * 0.2 + (talking ? Math.sin(t * 5) * 0.02 : 0), 0.06);
    head.rotation.z = Math.sin(t * 0.8) * 0.025;
    torso.rotation.y = head.rotation.y * 0.25;
    group.position.y = Math.sin(t * 1.1) * 0.025;

    voiceBars.forEach((bar, i) => {
      const level = talking ? 0.4 + Math.abs(Math.sin(t * 13 + i * 1.7)) * 1.6 * (1 - Math.abs(i - 3) / 5) : 0.12;
      bar.scale.y = THREE.MathUtils.lerp(bar.scale.y, level, 0.35);
    });
    glow.emissiveIntensity = 2.6 + (talking ? Math.sin(t * 9) * 0.6 : Math.sin(t * 2) * 0.3);

    if (t > nextBlink) {
      const blink = t - nextBlink;
      const open = blink < 0.14 ? Math.abs(1 - blink / 0.07) : 1;
      eyes.forEach((eye) => (eye.scale.x = Math.max(0.1, open)));
      if (blink > 0.14) nextBlink = t + 2.5 + Math.random() * 3;
    }
  };

  return { group, update };
}
