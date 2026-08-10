import { Capacitor } from "@capacitor/core";

/** True only inside the native iOS wrapper — never in Safari/Chrome, even
 * on an iPhone, and never in the installed PWA (Capacitor.isNativePlatform()
 * is false for both). Gates anything that would violate App Store review
 * guideline 3.1.1 (in-app digital purchases must go through StoreKit) —
 * see SaveGamePrompt.tsx, the only purchase entry point in the app. */
export function isNativeIOS(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}
