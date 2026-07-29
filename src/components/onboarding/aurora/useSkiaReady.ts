/**
 * useSkiaReady — gate Skia Canvas mounting on Skia readiness.
 *
 * @shopify/react-native-skia loads asynchronously: on web, CanvasKit (WASM) is
 * fetched and initialized on demand; on native cold-start the JSI-backed Skia
 * object can also be `undefined` on the very first render before the bridge
 * resolves. If a component reads `Skia.Path.Make()` (or mounts a `<Canvas>`)
 * during that first paint, it throws `Cannot read properties of undefined
 * (reading 'Path')` and the nearest ErrorBoundary crashes the whole tree.
 *
 * This hook resolves that race cross-platform:
 *   - web:   awaits `LoadSkiaWeb()` (the package's own loader) before ready.
 *   - native: Skia is available synchronously via JSI; resolve immediately.
 *
 * Components should render a non-Skia fallback (or nothing) until `ready`
 * is true, then mount `<Canvas>`. This keeps the redesigned controls (RadialDial,
 * SkiaBloom, the BMI ring) from ever crashing on first mount, on any platform.
 */
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Skia } from "@shopify/react-native-skia";

let webPromise: Promise<void> | null = null;

function loadWebSkia(): Promise<void> {
  if (webPromise) return webPromise;
  // Dynamic import keeps this web-only code out of the native bundle.
  // The `/web` subpath has no type declarations in this Skia version, so the
  // @ts-ignore is intentional — the runtime export `LoadSkiaWeb` exists.
  webPromise = import(
    /* webpackIgnore: true */
    // @ts-expect-error no type declarations for the web subpath
    "@shopify/react-native-skia/web"
  )
    .then((mod: { LoadSkiaWeb: () => Promise<void> }) => mod.LoadSkiaWeb())
    .catch((err) => {
      // If WASM fetch fails, mark ready anyway so the fallback (non-Skia
      // render) can show instead of hanging on a crashed Canvas.
      console.error("[useSkiaReady] LoadSkiaWeb failed — Skia controls will stay in fallback:", err);
      webPromise = null;
      throw err;
    });
  return webPromise;
}

export function useSkiaReady(): boolean {
  const [ready, setReady] = useState<boolean>(() => {
    if (Platform.OS === "web") return false;
    return Boolean(Skia && typeof (Skia as any).Path === "object");
  });

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    if (Platform.OS === "web") {
      loadWebSkia()
        .then(() => {
          if (!cancelled) setReady(true);
        })
        .catch(() => {
          // Skia unavailable; stay not-ready so fallback renders.
        });
    } else {
      // Native: poll a few frames for Skia JSI to resolve, then give up
      // (and let the fallback render) so a permanently-unavailable Skia
      // never blocks the onboarding flow.
      let tries = 0;
      const id = setInterval(() => {
        tries += 1;
        if (Skia && typeof (Skia as any).Path === "object") {
          clearInterval(id);
          if (!cancelled) setReady(true);
        } else if (tries > 20) {
          clearInterval(id);
          console.error("[useSkiaReady] Skia never became available on native — controls will render fallback.");
        }
      }, 50);
      return () => clearInterval(id);
    }
    return () => {
      cancelled = true;
    };
  }, [ready]);

  return ready;
}

export default useSkiaReady;
