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

// All three pilots share Quaternius' Spacesuit mesh. The mesh has a
// dedicated `SciFi_Light_Accent` material that the original artist isolated
// for team-color use — recolour it to the pilot's accent and the suit reads
// as a clean colour variant. Other materials (`SciFi_Main`, `MainDark`,
// `Grey`, `SciFi_Light`) keep their dark teal base so the silhouette stays
// stable across pilots. A very subtle emissive rim is layered on every
// material so the accent reads even in shadowed scenes.
export function tintCharacterMaterials(object: Object3D, accent: string, intensity = 0.05) {
  object.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const apply = (mat: MeshStandardMaterial) => {
      const tintable = mat as { clone?: () => MeshStandardMaterial; emissive?: Color; name?: string };
      if (!mat || !mat.color || typeof tintable.clone !== "function") return undefined;
      const tinted = tintable.clone!();
      const isAccentSlot = (tintable.name ?? "").toLowerCase().includes("accent");
      if (isAccentSlot && tinted.color) {
        tinted.color.set(accent);
        if (tinted.emissive) {
          tinted.emissive.set(accent);
          tinted.emissiveIntensity = Math.max(intensity, 0.18);
        }
      } else if (tinted.emissive) {
        tinted.emissive.set(accent);
        tinted.emissiveIntensity = intensity;
      }
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
