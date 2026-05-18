export async function logoutUser() {
  const response = await fetch("/api/signout", { method: "POST" });

  if (!response.ok) {
    throw new Error("Failed to log out.");
  }
}
