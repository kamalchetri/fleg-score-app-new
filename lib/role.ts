import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export type AppRole = "admin" | "nspg_lead" | "nspg_staff" | "organiser" | "user";

const ROLES = new Set<AppRole>(["admin", "nspg_lead", "nspg_staff", "organiser", "user"]);

function normalizeRole(value: unknown): AppRole {
  return typeof value === "string" && ROLES.has(value as AppRole) ? (value as AppRole) : "user";
}

export function useRole(): { role: AppRole; loading: boolean; canOrganise: boolean; canManageNspg: boolean } {
  const { session, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole>("user");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (authLoading) return () => { active = false; };
    if (!session?.user.id) {
      setRole("user");
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    void supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setRole(normalizeRole((data as { role?: unknown } | null)?.role));
        setLoading(false);
      }, () => {
        if (active) {
          setRole("user");
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [authLoading, session?.user.id]);

  return {
    role,
    loading: authLoading || loading,
    canOrganise: role === "admin" || role === "organiser",
    canManageNspg: role === "admin" || role === "nspg_lead" || role === "nspg_staff",
  };
}
