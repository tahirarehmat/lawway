/**
 * Unsigned uploads via one Cloudinary account.
 * Requires `NEXT_PUBLIC_CHAT_CLOUDINARY_CLOUD_NAME` and
 * `NEXT_PUBLIC_CHAT_CLOUDINARY_UPLOAD_PRESET` (.env).
 * In the Cloudinary console, configure that preset so it accepts the file types you use (image / video / raw).
 * API key/secret in .env are for server-side signed uploads only — not used here.
 */

function getChatCloudinaryConfig(): { cloudName: string; uploadPreset: string } {
  const cloudName = (process.env.NEXT_PUBLIC_CHAT_CLOUDINARY_CLOUD_NAME ?? "").trim();
  const uploadPreset =
    (process.env.NEXT_PUBLIC_CHAT_CLOUDINARY_UPLOAD_PRESET ?? "chatimage").trim();

  if (!cloudName) {
    throw new Error(
      "Set NEXT_PUBLIC_CHAT_CLOUDINARY_CLOUD_NAME in .env for ticket uploads.",
    );
  }
  if (!uploadPreset) {
    throw new Error(
      "Set NEXT_PUBLIC_CHAT_CLOUDINARY_UPLOAD_PRESET in .env for ticket uploads.",
    );
  }

  return { cloudName, uploadPreset };
}

async function uploadToCloudinary(
  resourcePath: "image" | "video" | "raw",
  file: File,
  options: Record<string, string>,
): Promise<string> {
  const { cloudName, uploadPreset } = getChatCloudinaryConfig();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  for (const [key, value] of Object.entries(options)) {
    formData.append(key, value);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourcePath}/upload`,
    { method: "POST", body: formData },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${resourcePath} upload failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { secure_url: string };
  return data.secure_url;
}

export async function uploadVideoToCloudinary(file: File): Promise<string> {
  return uploadToCloudinary("video", file, {
    folder: "lawway/tickets/video",
  });
}

export async function uploadImageToCloudinaryDirect(file: File): Promise<string> {
  return uploadToCloudinary("image", file, {
    folder: "lawway/tickets/images",
  });
}

/** PDF / Office docs go through Cloudinary as `raw` */
export async function uploadDocumentToCloudinaryDirect(file: File): Promise<string> {
  return uploadToCloudinary("raw", file, {
    folder: "lawway/tickets/documents",
  });
}

/** Case vault files (PDF / Office / images as raw or image) */
export async function uploadCaseVaultFileToCloudinary(file: File): Promise<string> {
  const isImage = file.type.startsWith("image/");
  return uploadToCloudinary(isImage ? "image" : "raw", file, {
    folder: "lawway/case-documents",
  });
}
