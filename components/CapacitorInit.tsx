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
    // The real fix for content crowding into the notch/Dynamic Island —
    // env(safe-area-inset-top) proved unreliable inside this embedded
    // WKWebView (confirmed live: the CSS was deployed and correct, but
    // content still rendered flush against the status bar). Telling the
    // native layer outright not to let the webview extend under the
    // status bar sidesteps that entirely — UIKit reserves the space
    // itself, so the page never needs to know the inset amount at all.
    StatusBar.setOverlaysWebView({ overlay: false });
    // The web view starts loading therealbirdscore.com immediately, so the
    // native splash can come down as soon as this mounts rather than
    // waiting on a fixed timeout.
    SplashScreen.hide();
  }, []);

  return null;
}
