import { push } from "@/lib/api";

function urlBase64ToBytes(base64: string): BufferSource {
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function notificationsEnabled(): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) !== null;
}

/** Asks permission, subscribes this install, and registers it with the backend. */
export async function enableNotifications(): Promise<void> {
  if (!notificationsSupported()) {
    throw new Error("Notifications are not supported in this browser. On iPhone, add KROVA to your Home Screen first.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");

  const { public_key } = await push.vapidPublicKey();
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(public_key) }));
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("Browser returned an incomplete subscription.");
  await push.subscribe(json.endpoint, { p256dh: json.keys.p256dh, auth: json.keys.auth });
}

export async function disableNotifications(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await push.unsubscribe(sub.endpoint);
  await sub.unsubscribe();
}
