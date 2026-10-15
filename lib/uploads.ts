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
