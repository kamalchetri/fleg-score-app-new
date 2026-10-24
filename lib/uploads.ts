import { supabase } from "@/lib/supabase";

/** Upload a local file into the private form-uploads bucket. Returns the storage path. */
export async function uploadFormFile(
  localUri: string,
  path: string,
  contentType = "application/octet-stream",
): Promise<string> {
  const response = await fetch(localUri);
  const body = await response.arrayBuffer();
  const { error } = await supabase.storage.from("form-uploads").upload(path, body, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return path;
}

/** Long-lived link for a banner stored in the private bucket. */
export async function signedFormUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("form-uploads").createSignedUrl(path, 60 * 60 * 24 * 365);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not create a banner link.");
  return data.signedUrl;
}

/** Upload the signed-in user's profile photo to the owner-scoped public avatar bucket. */
export async function uploadPlayerAvatar(localUri: string, userId: string, contentType = "image/jpeg"): Promise<string> {
  const response = await fetch(localUri);
  if (!response.ok) throw new Error("Could not read the selected photo from the device.");
  const body = await response.arrayBuffer();
  if (body.byteLength > 1024 * 1024) {
    throw new Error("Choose a photo smaller than 1 MB.");
  }
  // The production bucket intentionally accepts only these formats. Android
  // can report PNG/HEIC for a picked image; reject those before the network
  // request so the user gets a clear, actionable message.
  const normalizedType = contentType === "image/webp" ? "image/webp" : contentType === "image/jpeg" ? "image/jpeg" : null;
  if (!normalizedType) {
    throw new Error("Choose a JPEG or WebP photo.");
  }
  const path = `${userId}/profile.jpg`;
  const { error } = await supabase.storage.from("player-avatars").upload(path, body, {
    contentType: normalizedType,
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("player-avatars").getPublicUrl(path);
  if (!data.publicUrl) throw new Error("Could not create the profile photo URL.");
  return `${data.publicUrl}?v=${Date.now()}`;
}
