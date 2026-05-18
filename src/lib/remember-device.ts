export const REMEMBER_DEVICE_KEY = "lawway_remember_device";
export const REMEMBERED_EMAIL_KEY = "lawway_remembered_email";

export type RememberedDevice = {
  remember: boolean;
  email: string;
};

export function getRememberedDevice(): RememberedDevice | null {
  if (typeof window === "undefined") return null;
  if (localStorage.getItem(REMEMBER_DEVICE_KEY) !== "true") return null;

  const email = localStorage.getItem(REMEMBERED_EMAIL_KEY)?.trim();
  if (!email) return null;

  return { remember: true, email };
}

export function saveRememberedDevice(email: string) {
  localStorage.setItem(REMEMBER_DEVICE_KEY, "true");
  localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase());
}

export function clearRememberedDevice() {
  localStorage.removeItem(REMEMBER_DEVICE_KEY);
  localStorage.removeItem(REMEMBERED_EMAIL_KEY);
}
