import { readFileSync } from "fs";
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const files = [
  "Bullpup_2.fbx",
  "AssaultRifle_2.fbx",
  "AssaultRifle2_3.fbx",
  "Shotgun_2.fbx",
  "SniperRifle_3.fbx",
];

const loader = new FBXLoader();
for (const f of files) {
  const buf = readFileSync(`public/models/quaternius-guns/${f}`);
  // FBXLoader expects an ArrayBuffer
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  try {
    const obj = loader.parse(ab, "");
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    console.log(`${f.padEnd(22)} size: x=${size.x.toFixed(3)} y=${size.y.toFixed(3)} z=${size.z.toFixed(3)}  center: x=${center.x.toFixed(2)} y=${center.y.toFixed(2)} z=${center.z.toFixed(2)}`);
  } catch (e) {
    console.log(`${f}: ERROR`, e.message);
  }
}
