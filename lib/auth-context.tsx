import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ensurePendingOrganizerProfile } from "@/lib/queries";
import { isReviewBuild } from "@/lib/build-flags";

interface AuthState {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    if (isReviewBuild()) {
      setState({ session: null, loading: false });
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, loading: false });
      if (data.session?.user) {
        void ensurePendingOrganizerProfile(data.session.user).catch(() => {});
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ session, loading: false });
      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        void ensurePendingOrganizerProfile(session.user).catch(() => {});
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
