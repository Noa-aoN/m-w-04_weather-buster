import { Box3, Vector3 } from "three";
import type { Color, Mesh, MeshStandardMaterial, Object3D } from "three";

export function fitObjectToHeight(object: Object3D, targetHeight: number) {
  object.updateMatrixWorld(true);
  const box = new Box3().setFromObject(object);
  const size = new Vector3();
  box.getSize(size);
  const factor = targetHeight / Math.max(size.y, 0.001);
  object.scale.setScalar(factor);
  const center = new Vector3();
  box.getCenter(center);
  object.position.x = -center.x * factor;
  object.position.z = -center.z * factor;
  object.position.y = -box.min.y * factor;
}

export function fitObjectToSize(object: Object3D, targetSize: number) {
  object.updateMatrixWorld(true);
  const box = new Box3().setFromObject(object);
  const size = new Vector3();
  box.getSize(size);
  const longest = Math.max(size.x, size.y, size.z, 0.001);
  const factor = targetSize / longest;
  object.scale.setScalar(factor);
  const center = new Vector3();
  box.getCenter(center);
  object.position.x = -center.x * factor;
  object.position.y = -center.y * factor;
  object.position.z = -center.z * factor;
}

// Clone materials so the tint stays unique to this instance (preventing accent
// bleed between simultaneous renders) and apply a subtle accent emissive to
// give the otherwise grey Quaternius soldier models a colorful, character-
// specific glow.
export function tintCharacterMaterials(object: Object3D, accent: string, intensity = 0.22) {
  object.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const apply = (mat: MeshStandardMaterial) => {
      const tintable = mat as { clone?: () => MeshStandardMaterial; emissive?: Color };
      if (!mat || !mat.color || typeof tintable.clone !== "function") return undefined;
      const tinted = tintable.clone!();
      if (tinted.emissive) {
        tinted.emissive.set(accent);
        tinted.emissiveIntensity = intensity;
      }
      tinted.metalness = Math.max(tinted.metalness ?? 0, 0.16);
      tinted.roughness = Math.min(tinted.roughness ?? 0.8, 0.62);
      return tinted;
    };
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => apply(m as MeshStandardMaterial) ?? m);
    } else {
      const tinted = apply(mesh.material as MeshStandardMaterial);
      if (tinted) mesh.material = tinted;
    }
  });
}
