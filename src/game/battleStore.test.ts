import { afterEach, describe, expect, it } from "vitest";
import { useBattleStore } from "./battleStore";

// Snapshot of the freshly-built store. We restore from this between tests so
// each case starts from a known baseline without recreating the store
// (zustand stores have no built-in "reset to defaults" hook).
const INITIAL_SNAPSHOT = useBattleStore.getState();

afterEach(() => {
  useBattleStore.setState(INITIAL_SNAPSHOT, true);
});

// Helper: put the store into an in-battle state where the action under test
// is allowed to run. Tests can then exercise a single action.
function enterBattle(overrides: Partial<ReturnType<typeof useBattleStore.getState>> = {}) {
  useBattleStore.setState({ ...INITIAL_SNAPSHOT, status: "battle", ...overrides }, true);
}

describe("battleStore.triggerSkill", () => {
  it("does nothing when pressureGauge is below 100", () => {
    enterBattle({ pressureGauge: 80 });
    useBattleStore.getState().triggerSkill();
    const s = useBattleStore.getState();
    expect(s.lastSkillAt).toBe(0);
    expect(s.pressureGauge).toBe(80);
  });

  it("consumes the gauge and queues a skill animation when ready", () => {
    enterBattle({ pressureGauge: 100 });
    const before = useBattleStore.getState().enemyHp;
    useBattleStore.getState().triggerSkill();
    const s = useBattleStore.getState();
    expect(s.pressureGauge).toBe(0);
    // Damage is applied per step via advanceSkillStep, not immediately.
    expect(s.enemyHp).toBe(before);
    expect(s.lastSkillAt).toBeGreaterThan(0);
    expect(s.skillAnimation).not.toBeNull();
    expect(s.skillAnimation?.totalSteps).toBeGreaterThan(0);
    expect(s.skillAnimation?.completedSteps).toBe(0);
  });

  it("steps through the animation, applying damagePerStep each time", () => {
    enterBattle({ pressureGauge: 100 });
    useBattleStore.getState().triggerSkill();
    const before = useBattleStore.getState().enemyHp;
    const anim = useBattleStore.getState().skillAnimation!;
    // Fire one step manually (the PlayerController loop normally drives this).
    useBattleStore.getState().advanceSkillStep();
    const afterOne = useBattleStore.getState().enemyHp;
    expect(before - afterOne).toBe(anim.damagePerStep);
    expect(useBattleStore.getState().skillAnimation?.completedSteps).toBe(1);
  });

  it("clears the animation and locks total damage on the final step", () => {
    enterBattle({ pressureGauge: 100 });
    useBattleStore.getState().triggerSkill();
    const before = useBattleStore.getState().enemyHp;
    const anim = useBattleStore.getState().skillAnimation!;
    for (let i = 0; i < anim.totalSteps; i += 1) {
      useBattleStore.getState().advanceSkillStep();
    }
    const after = useBattleStore.getState().enemyHp;
    expect(before - after).toBe(anim.totalDamage);
    expect(useBattleStore.getState().skillAnimation).toBeNull();
  });

  // Regression: a previous version wrote `lastSkillAt: Date.now()` while the
  // FovController and PlayerController contact-block read it as
  // `performance.now() - lastSkillAt`. The mismatch (epoch ms vs page-uptime
  // ms) made the FOV punch term diverge to billions of degrees and broke the
  // camera permanently on first Q press. Lock that in by asserting the value
  // is in the page-uptime range, not the epoch range.
  it("records lastSkillAt with performance.now() — not Date.now()", () => {
    enterBattle({ pressureGauge: 100 });
    useBattleStore.getState().triggerSkill();
    const { lastSkillAt } = useBattleStore.getState();
    // performance.now() is monotonic from page load; in a freshly-spun test
    // process it stays well below 10^10. Date.now() is ~1.7×10^12 today.
    expect(lastSkillAt).toBeGreaterThan(0);
    expect(lastSkillAt).toBeLessThan(1e10);
  });
});

describe("battleStore.shoot", () => {
  it("records a hit, decrements ammo, and updates lastShotAt", () => {
    enterBattle({ ammo: 10 });
    useBattleStore.getState().shoot(true, false);
    const s = useBattleStore.getState();
    expect(s.ammo).toBe(9);
    expect(s.shotsFired).toBe(1);
    expect(s.shotsHit).toBe(1);
    expect(s.lastShotHit).toBe(true);
    expect(s.lastShotAt).toBeGreaterThan(0);
  });

  it("counts a miss but still decrements ammo", () => {
    enterBattle({ ammo: 10 });
    useBattleStore.getState().shoot(false, false);
    const s = useBattleStore.getState();
    expect(s.ammo).toBe(9);
    expect(s.shotsFired).toBe(1);
    expect(s.shotsHit).toBe(0);
    expect(s.lastShotHit).toBe(false);
  });

  it("does nothing when ammo is empty", () => {
    enterBattle({ ammo: 0, selectedWeaponId: "weatherGun" });
    useBattleStore.getState().shoot(true, false);
    const s = useBattleStore.getState();
    expect(s.ammo).toBe(0);
    expect(s.shotsFired).toBe(0);
    expect(s.lastShotAt).toBe(0);
  });
});

describe("battleStore.knockback", () => {
  it("accumulates velocity via applyKnockback and drains via consumeKnockback", () => {
    enterBattle();
    useBattleStore.getState().applyKnockback(3, 4);
    expect(useBattleStore.getState().knockbackVx).toBe(3);
    expect(useBattleStore.getState().knockbackVz).toBe(4);
    const consumed = useBattleStore.getState().consumeKnockback();
    expect(consumed.vx).toBe(3);
    expect(consumed.vz).toBe(4);
    // After consumption velocity decays toward zero (decay factor < 1)
    const s = useBattleStore.getState();
    expect(Math.abs(s.knockbackVx)).toBeLessThan(3);
    expect(Math.abs(s.knockbackVz)).toBeLessThan(4);
  });
});

describe("battleStore.location", () => {
  it("clears synced weather when location is disabled", () => {
    useBattleStore.setState({
      ...INITIAL_SNAPSHOT,
      locationEnabled: true,
      gpsStatus: "ready",
      currentWeatherEnemyId: "heavyRain",
      currentWeatherCode: 63,
    }, true);
    useBattleStore.getState().setLocationEnabled(false);
    const s = useBattleStore.getState();
    expect(s.locationEnabled).toBe(false);
    expect(s.gpsStatus).toBe("off");
    expect(s.currentWeatherEnemyId).toBeNull();
    expect(s.currentWeatherCode).toBeNull();
  });

  it("enters loading state when location is enabled", () => {
    useBattleStore.setState({ ...INITIAL_SNAPSHOT, locationEnabled: false, gpsStatus: "off" }, true);
    useBattleStore.getState().setLocationEnabled(true);
    const s = useBattleStore.getState();
    expect(s.locationEnabled).toBe(true);
    expect(s.gpsStatus).toBe("loading");
  });

  it("snapshots the active weather category when battle starts", () => {
    useBattleStore.setState({
      ...INITIAL_SNAPSHOT,
      locationEnabled: true,
      gpsStatus: "ready",
      currentWeatherCode: 63,
    }, true);
    useBattleStore.getState().start();
    const s = useBattleStore.getState();
    expect(s.status).toBe("battle");
    expect(s.activeWeatherCategory).toBe("rain");
  });

  it("keeps the battle snapshot even if GPS is turned off after sortie", () => {
    useBattleStore.setState({
      ...INITIAL_SNAPSHOT,
      status: "battle",
      locationEnabled: true,
      gpsStatus: "ready",
      currentWeatherCode: 95,
      activeWeatherCategory: "thunder",
    }, true);
    useBattleStore.getState().setLocationEnabled(false);
    const s = useBattleStore.getState();
    expect(s.locationEnabled).toBe(false);
    expect(s.activeWeatherCategory).toBe("thunder");
  });
});

describe("battleStore.lightning queue", () => {
  it("keeps markers sorted by trigger time and consumes only ready entries", () => {
    enterBattle();
    useBattleStore.getState().spawnLightning({
      id: 2,
      x: 0,
      z: 0,
      triggersAt: 300,
      spawnAt: 0,
      fromX: 0,
      fromY: 1,
      fromZ: 0,
      radius: 1,
      damage: 1,
      color: "#fff",
      trailGlow: 1,
      kind: "arc",
      enemyId: "cloudy",
    });
    useBattleStore.getState().spawnLightning({
      id: 1,
      x: 0,
      z: 0,
      triggersAt: 100,
      spawnAt: 0,
      fromX: 0,
      fromY: 1,
      fromZ: 0,
      radius: 1,
      damage: 1,
      color: "#fff",
      trailGlow: 1,
      kind: "arc",
      enemyId: "cloudy",
    });
    const ready = useBattleStore.getState().consumeReadyLightning(150);
    expect(ready.map((marker) => marker.id)).toEqual([1]);
    expect(useBattleStore.getState().lightningMarkers.map((marker) => marker.id)).toEqual([2]);
  });
});
