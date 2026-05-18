const GUEST_ID_KEY = "lawway_guest_id";

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `guest_${crypto.randomUUID()}`;
  }
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** Stable anonymous id for landing-page chat (persisted in localStorage). */
export function getGuestSessionId(): string {
  if (typeof window === "undefined") return "guest_ssr";
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = randomId();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}
