"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

/** Native-wrapper startup only — no-op in the browser/PWA, matching the
 * theme color already set for the web install prompt (see layout.tsx's
 * viewport.themeColor and manifest.ts). */
export function CapacitorInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: "#173C31" });
    // The web view starts loading therealbirdscore.com immediately, so the
    // native splash can come down as soon as this mounts rather than
    // waiting on a fixed timeout.
    SplashScreen.hide();
  }, []);

  return null;
}
