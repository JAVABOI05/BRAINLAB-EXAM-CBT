/**
 * BrainLab Academy — Client-Side Device Push & Notification Utilities
 * Supports Android Chrome, Desktop Browsers, and iOS PWA web push notifications.
 */

export type DevicePermissionStatus = "granted" | "denied" | "default" | "unsupported";

/**
 * Checks whether Web Notifications and Service Workers are supported on this device.
 */
export function isNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window && "serviceWorker" in navigator;
}

/**
 * Returns the current device notification permission status.
 */
export function getDeviceNotificationPermission(): DevicePermissionStatus {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission as DevicePermissionStatus;
}

/**
 * Requests device notification permission from the learner.
 */
export async function requestDeviceNotificationPermission(): Promise<{
  granted: boolean;
  status: DevicePermissionStatus;
}> {
  if (!isNotificationSupported()) {
    return { granted: false, status: "unsupported" };
  }

  try {
    const permission = await Notification.requestPermission();
    const granted = permission === "granted";

    if (granted) {
      // Save granted timestamp in localStorage
      try {
        localStorage.setItem("brainlab_device_notif_enabled", "true");
        localStorage.setItem("brainlab_device_notif_granted_at", new Date().toISOString());
      } catch {}
    }

    return { granted, status: permission as DevicePermissionStatus };
  } catch (err) {
    console.warn("[clientNotifications] Permission request error:", err);
    return { granted: false, status: getDeviceNotificationPermission() };
  }
}

/**
 * Registers the PWA Service Worker if not already active.
 */
export async function ensureServiceWorkerRegistered(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (err) {
    console.warn("[clientNotifications] Service Worker registration failed:", err);
    return null;
  }
}

/**
 * Triggers a native device notification using the active Service Worker or direct Notification API.
 */
export async function sendDeviceNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    badge?: string;
    url?: string;
    tag?: string;
  }
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  const defaultOptions = {
    body: options?.body || "You have a new alert from BrainLab Academy.",
    icon: options?.icon || "/icon-192.png",
    badge: options?.badge || "/favicon-32x32.png",
    data: { url: options?.url || "/dashboard" },
    tag: options?.tag || "brainlab-alert",
  };

  try {
    const swReg = await ensureServiceWorkerRegistered();
    if (swReg && "showNotification" in swReg) {
      await swReg.showNotification(title, defaultOptions);
      return true;
    }

    // Fallback to Window Notification API
    new Notification(title, defaultOptions);
    return true;
  } catch (err) {
    console.warn("[clientNotifications] Failed to display notification:", err);
    return false;
  }
}

/**
 * Sends a welcome verification notification to the candidate's screen.
 */
export async function sendWelcomeTestAlert(): Promise<boolean> {
  return sendDeviceNotification("🎉 Device Notifications Active!", {
    body: "You will now receive instant alerts when tutors go live and when daily practice streak rescues trigger.",
    url: "/dashboard",
    tag: "brainlab-welcome-alert",
  });
}
