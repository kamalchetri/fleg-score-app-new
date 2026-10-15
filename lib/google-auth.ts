import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { router, type Href } from "expo-router";
import { supabase } from "@/lib/supabase";
import { ensurePendingOrganizerProfile, fetchOrganizerProfile } from "@/lib/queries";

WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_OAUTH_REDIRECT_PATH = "auth-callback";

export function googleOAuthRedirectUri(): string {
  return Linking.createURL(GOOGLE_OAUTH_REDIRECT_PATH);
}

interface OAuthCallbackParams {
  code?: string;
  access_token?: string;
  refresh_token?: string;
  error?: string;
}

function parseOAuthCallbackUrl(url: string): OAuthCallbackParams {
  const normalized = url.includes("#") ? url.replace("#", "?") : url;
  try {
    const parsed = new URL(normalized);
    return {
      code: parsed.searchParams.get("code") ?? undefined,
      access_token: parsed.searchParams.get("access_token") ?? undefined,
      refresh_token: parsed.searchParams.get("refresh_token") ?? undefined,
      error:
        parsed.searchParams.get("error_description") ??
        parsed.searchParams.get("error") ??
        undefined,
    };
  } catch {
    const { queryParams } = Linking.parse(url);
    const qp = queryParams ?? {};
    const str = (key: string) => {
      const value = qp[key];
      return typeof value === "string" ? value : undefined;
    };
    return {
      code: str("code"),
      access_token: str("access_token"),
      refresh_token: str("refresh_token"),
      error: str("error_description") ?? str("error"),
    };
  }
}

/** Exchange OAuth callback URL for a Supabase session (PKCE or implicit). */
export async function completeOAuthFromUrl(url: string): Promise<void> {
  const params = parseOAuthCallbackUrl(url);
  if (params.error) {
    throw new Error(params.error);
  }

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw new Error(error.message);
    return;
  }

  if (params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw new Error(error.message);
    return;
  }

  throw new Error("No auth credentials in OAuth callback.");
}

export async function signInWithGoogleOAuth(): Promise<void> {
  const redirectTo = googleOAuthRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw new Error(error.message);
  if (!data.url) throw new Error("Google sign-in could not start.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") {
    throw new Error("Google sign-in was cancelled.");
  }

  await completeOAuthFromUrl(result.url);
}

/** Route after any successful auth (email or Google). */
export async function routeAfterAuth(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    router.replace("/login");
    return;
  }

  await ensurePendingOrganizerProfile(user);
  const profile = await fetchOrganizerProfile(user.id).catch(() => null);
  router.replace((profile ? "/home" : "/onboarding") as Href);
}
