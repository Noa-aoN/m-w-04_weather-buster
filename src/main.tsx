import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useFBX, useGLTF } from "@react-three/drei";
import { App } from "./app/App";
import { CHARACTER_MODEL_URL } from "./entities/CharacterModel";
import { WEAPON_MODEL } from "./entities/WeaponModel";
import "./styles.css";

// Preload every character FBX and every weapon model the moment the JS bundle
// runs. Without this, the first time the player enters a battle (or switches
// to a character whose FBX hasn't been seen yet) the Canvas's default Suspense
// boundary unmounts its children for one frame — which breaks the pointer
// lock that we just requested at the end of the countdown. Preloading is
// fire-and-forget, so this just warms drei's cache.
Object.values(CHARACTER_MODEL_URL).forEach((url) => {
  useFBX.preload(url);
});
Object.values(WEAPON_MODEL).forEach((model) => {
  if (model.type === "fbx") {
    useFBX.preload(model.url);
  } else {
    useGLTF.preload(model.url);
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
