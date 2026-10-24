import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { canScanAccreditation, canViewAccessLog, isOrganiserRole, normalizeRole } from "@/lib/role-utils";

export type AppRole = "admin" | "nspg_lead" | "nspg_staff" | "organiser" | "organizer" | "volunteer" | "kiosk_volunteer" | "official" | "referee" | "user";

export { isOrganiserRole, normalizeRole } from "@/lib/role-utils";

const SUPER_ADMIN_EMAIL = "alltoolsatwork@gmail.com";

export function useRole(): {
  role: AppRole;
  loading: boolean;
  canOrganise: boolean;
  canManageNspg: boolean;
  canScanAccreditation: boolean;
  canViewAccessLog: boolean;
  isSuperAdmin: boolean;
} {
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
    canOrganise: role === "admin" || isOrganiserRole(role),
    canManageNspg: role === "admin" || role === "nspg_lead" || role === "nspg_staff" || isOrganiserRole(role),
    canScanAccreditation: canScanAccreditation(role),
    canViewAccessLog: canViewAccessLog(role),
    // UI capability only: server-side role checks remain authoritative.
    isSuperAdmin: role === "admin" && session?.user.email?.toLowerCase() === SUPER_ADMIN_EMAIL,
  };
}

export { SUPER_ADMIN_EMAIL };
