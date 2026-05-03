import { useEffect } from "react";
import { useBattleStore } from "../../game/battleStore";
import type { WeatherEnemyId } from "../../game/types";

const codeToEnemy = (code: number | null | undefined): WeatherEnemyId | null => {
  if (code === undefined || code === null) return null;
  if (code === 0) return null;
  if (code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "cloudy";
  if (code >= 51 && code <= 67) return "heavyRain";
  if (code >= 71 && code <= 77) return "blizzard";
  if (code >= 80 && code <= 82) return "heavyRain";
  if (code >= 85 && code <= 86) return "blizzard";
  if (code >= 95) return "thunderstorm";
  return null;
};

export const weatherCodeLabel = (code: number | null): string => {
  if (code === null) return "計測中";
  if (code === 0) return "快晴";
  if (code <= 3) return "曇り";
  if (code === 45 || code === 48) return "霧";
  if (code >= 51 && code <= 67) return "雨";
  if (code >= 71 && code <= 77) return "雪";
  if (code >= 80 && code <= 82) return "強雨";
  if (code >= 85 && code <= 86) return "降雪";
  if (code >= 95) return "雷雨";
  return "未確認";
};

export function useGeolocationWeather() {
  const enabled = useBattleStore((state) => state.locationEnabled);
  const setCurrentWeather = useBattleStore((state) => state.setCurrentWeather);
  const selectEnemy = useBattleStore((state) => state.selectEnemy);

  useEffect(() => {
    if (!enabled) {
      setCurrentWeather(null, null);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      useBattleStore.getState().setLocationEnabled(false);
      return;
    }
    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (cancelled) {
          return;
        }
        try {
          const { latitude, longitude } = position.coords;
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(3)}&longitude=${longitude.toFixed(3)}&current=weather_code,temperature_2m`;
          const response = await fetch(url);
          if (!response.ok) {
            return;
          }
          const json: { current?: { weather_code?: number } } = await response.json();
          const weatherCode = json.current?.weather_code ?? null;
          const enemyId = codeToEnemy(weatherCode);
          if (cancelled) {
            return;
          }
          setCurrentWeather(enemyId, weatherCode);
          if (enemyId) {
            selectEnemy(enemyId);
          }
        } catch {
          // network error: leave state as-is
        }
      },
      () => {
        if (!cancelled) {
          useBattleStore.getState().setLocationEnabled(false);
        }
      },
      { timeout: 10000, maximumAge: 600000 },
    );

    return () => {
      cancelled = true;
    };
  }, [enabled, setCurrentWeather, selectEnemy]);
}
