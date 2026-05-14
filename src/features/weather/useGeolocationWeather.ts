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

export function useGeolocationWeather() {
  const enabled = useBattleStore((state) => state.locationEnabled);
  const setGpsStatus = useBattleStore((state) => state.setGpsStatus);
  const setCurrentWeather = useBattleStore((state) => state.setCurrentWeather);

  useEffect(() => {
    if (!enabled) {
      setCurrentWeather(null, null);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      useBattleStore.setState({
        locationEnabled: false,
        gpsStatus: "error",
        currentWeatherEnemyId: null,
        currentWeatherCode: null,
      });
      return;
    }
    setGpsStatus("loading");
    let cancelled = false;
    const controller = new AbortController();

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (cancelled) {
          return;
        }
        try {
          const { latitude, longitude } = position.coords;
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(3)}&longitude=${longitude.toFixed(3)}&current=weather_code,temperature_2m`;
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) {
            useBattleStore.setState({
              locationEnabled: false,
              gpsStatus: "error",
              currentWeatherEnemyId: null,
              currentWeatherCode: null,
            });
            return;
          }
          const json: { current?: { weather_code?: number } } = await response.json();
          const weatherCode = json.current?.weather_code ?? null;
          const enemyId = codeToEnemy(weatherCode);
          if (cancelled) {
            return;
          }
          setCurrentWeather(enemyId, weatherCode);
          setGpsStatus("ready");
        } catch (error) {
          if (cancelled || (error instanceof DOMException && error.name === "AbortError")) {
            return;
          }
          setGpsStatus("error");
        }
      },
      (error) => {
        if (!cancelled) {
          const status = error.code === error.PERMISSION_DENIED
            ? "denied"
            : error.code === error.TIMEOUT
              ? "timeout"
              : "error";
          useBattleStore.setState({
            locationEnabled: false,
            gpsStatus: status,
            currentWeatherEnemyId: null,
            currentWeatherCode: null,
          });
        }
      },
      { timeout: 10000, maximumAge: 600000 },
    );

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, setCurrentWeather, setGpsStatus]);
}
