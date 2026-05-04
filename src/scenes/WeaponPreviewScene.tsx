import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { WeaponObject, WEAPON_MODEL, weaponModelRotation } from "../entities/WeaponModel";
import { weapons } from "../game/data";
import type { WeaponId } from "../game/types";

// Single-weapon preview scene reachable via `?preview=weapon`. Lets us
// confirm orientation, scale, silhouette, recoil envelope etc. without
// running a full battle. Rotates the weapon around Y unless the user holds
// orbit controls (right click drag).

function WeaponSpinner({
  id,
  rotationKey,
  paused,
}: {
  id: WeaponId;
  rotationKey: number;
  paused: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    startTimeRef.current = performance.now();
  }, [id, rotationKey]);

  useFrame(() => {
    const node = groupRef.current;
    if (!node || paused) return;
    const t = (performance.now() - startTimeRef.current) / 1000;
    node.rotation.y = t * 0.6;
  });

  const baseRotation = useMemo(() => weaponModelRotation(id), [id]);

  return (
    <group ref={groupRef}>
      <group rotation={baseRotation}>
        <WeaponObject id={id} targetSize={2.4} />
      </group>
      {/* Direction indicator: a small red sphere at the muzzle so we can
          immediately confirm the barrel points at -Z (camera-forward). */}
      <mesh position={[0, 0, -1.4]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#ff5577" emissive="#ff5577" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function WeaponPreviewScene() {
  const [selected, setSelected] = useState<WeaponId>("clearSkyGun");
  const [paused, setPaused] = useState(false);
  const [rotationKey, setRotationKey] = useState(0);
  const weapon = weapons.find((w) => w.id === selected) ?? weapons[0];
  const model = WEAPON_MODEL[selected];

  return (
    <main className="weaponPreviewShell">
      <header className="weaponPreviewHeader">
        <h1>WEAPON PREVIEW</h1>
        <small>?preview=weapon · 単体プレビュー</small>
      </header>

      <section className="weaponPreviewCanvas">
        <Canvas camera={{ position: [3.2, 1.4, 3.6], fov: 36 }}>
          <color attach="background" args={["#091421"]} />
          <ambientLight intensity={0.7} />
          <hemisphereLight args={["#bdeeff", "#1c2a36", 0.65]} />
          <directionalLight position={[3, 4, 4]} intensity={2.6} />
          <gridHelper args={[8, 16, "#1c4055", "#0e2030"]} position={[0, -0.6, 0]} />
          <axesHelper args={[1.5]} position={[0, -0.6, 0]} />
          <WeaponSpinner id={selected} rotationKey={rotationKey} paused={paused} />
          <OrbitControls enablePan={false} target={[0, 0, 0]} minDistance={2} maxDistance={8} />
        </Canvas>
      </section>

      <aside className="weaponPreviewControls">
        <div className="weaponPreviewMeta">
          <strong>{weapon.name}</strong>
          <em>{weapon.id}</em>
        </div>
        <ul className="weaponPreviewStats">
          <li><span>damage</span><b>{weapon.damage}</b></li>
          <li><span>maxAmmo</span><b>{weapon.maxAmmo}</b></li>
          <li><span>fireRateMs</span><b>{weapon.fireRateMs}</b></li>
          <li><span>type</span><b>{model.type}</b></li>
          <li><span>rotation</span><b>{model.rotation.map((r) => r.toFixed(2)).join(", ")}</b></li>
          <li><span>specialty</span><b>{weapon.specialtyAgainst.join("/") || "—"}</b></li>
        </ul>
        <p className="weaponPreviewHint">右クリックドラッグで OrbitControls。赤い球は銃口方向の目印。</p>

        <div className="weaponPreviewSwitcher">
          <span>WEAPON</span>
          <div className="weaponPreviewSwitcherButtons">
            {weapons.map((w) => (
              <button
                key={w.id}
                type="button"
                className={w.id === selected ? "selected" : ""}
                onClick={() => setSelected(w.id)}
              >
                {w.name}
              </button>
            ))}
          </div>
        </div>

        <div className="weaponPreviewActions">
          <button type="button" onClick={() => setPaused((v) => !v)}>
            {paused ? "回転開始" : "回転停止"}
          </button>
          <button type="button" onClick={() => setRotationKey((v) => v + 1)}>
            回転リセット
          </button>
          <a className="weaponPreviewExit" href="/">通常ホームへ</a>
        </div>
      </aside>
    </main>
  );
}
