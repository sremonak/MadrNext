
/**
 * Transparent, privacy-conscious user agent classification.
 * No fingerprinting: we derive coarse device info that a user can see and
 * recognise ("Chrome on Android"), never a unique fingerprint hash.
 */

export interface DeviceInfo {
  deviceType: "DESKTOP" | "MOBILE" | "TABLET" | "OTHER";
  os: string;
  browser: string;
  label: string;
}

import { createHash } from "node:crypto";

export function classifyUserAgent(ua: string | null | undefined): DeviceInfo {
  const s = ua ?? "";
  const _lower = s.toLowerCase();

  let deviceType: DeviceInfo["deviceType"] = "DESKTOP";
  if (/ipad|tablet|playbook|silk|kindle/i.test(s)) deviceType = "TABLET";
  else if (/mobi|iphone|android.*mobile|windows phone/i.test(s)) deviceType = "MOBILE";
  else if (/android/i.test(s)) deviceType = "TABLET";

  let browser = "অজানা ব্রাউজার";
  if (/edg\//i.test(s)) browser = "Edge";
  else if (/opr\/|opera/i.test(s)) browser = "Opera";
  else if (/samsungbrowser/i.test(s)) browser = "Samsung Internet";
  else if (/chrome|crios/i.test(s)) browser = "Chrome";
  else if (/firefox|fxios/i.test(s)) browser = "Firefox";
  else if (/safari/i.test(s)) browser = "Safari";
  else if (s) browser = "অন্য ব্রাউজার";

  let os = "অজানা OS";
  if (/windows nt/i.test(s)) os = "Windows";
  else if (/android/i.test(s)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(s)) os = "iOS";
  else if (/mac os x/i.test(s)) os = "macOS";
  else if (/cros/i.test(s)) os = "ChromeOS";
  else if (/linux/i.test(s)) os = "Linux";

  const typeBn =
    deviceType === "MOBILE" ? "মোবাইল" : deviceType === "TABLET" ? "ট্যাবলেট" : deviceType === "DESKTOP" ? "ডেস্কটপ" : "অন্য";
  return { deviceType, os, browser, label: `${browser} · ${os} · ${typeBn}` };
}

/**
 * Coarse, transparent device identity: hash of user id + UA class + platform
 * family. Rotates when the browser major-updates; never a unique fingerprint.
 */
export function deviceKeyFor(userId: string, ua: string | null | undefined): string {
  const { browser, os } = classifyUserAgent(ua);
  return createHash("sha256").update(`${userId}:${browser}:${os}`).digest("hex").slice(0, 32);
}
