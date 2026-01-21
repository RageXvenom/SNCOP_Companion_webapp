// =======================================
// AuthContext.tsx – FIXED SESSION PERSISTENCE + PROFILE PICTURE SUPPORT
// =======================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase, Profile } from "../lib/supabaseClient";
import { Session, User } from "@supabase/supabase-js";
import { postJSON } from "../services/api";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: Error | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null; data?: any }>;
  signOut: () => Promise<void>;
  updateProfile: (fullName: string, avatarUrl?: string) => Promise<{ error: Error | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Detect Supabase recovery mode
function isRecoveryFlow(): boolean {
  return window.location.hash.includes("type=recovery");
}

// Robust check for whether a Supabase user is verified
function isVerifiedUser(user?: User | null): boolean {
  if (!user) return false;
  const u: any = user as any;
  return Boolean(
    (typeof u.email_confirmed_at === "string" && u.email_confirmed_at.trim() !== "") ||
      (typeof u.confirmed_at === "string" && u.confirmed_at.trim() !== "") ||
      u.user_metadata?.email_verified === true
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // ==========================================================
  // FETCH PROFILE
  // ==========================================================
  const fetchProfile = useCallback(async (id: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      setProfile(data ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================
  // INITIAL SESSION LOAD + LISTENER
  // ==========================================================
  useEffect(() => {
    // ✅ Initial session check - will restore from localStorage
    supabase.auth.getSession().then(({ data: { session } }) => {
      const recovery = isRecoveryFlow();
      const verified = isVerifiedUser(session?.user ?? null);

      // Only reject unverified users who aren't in recovery flow
      if (session?.user && !verified && !recovery) {
        console.log("⚠️ Unverified user detected, signing out");
        supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setSession(null);
        setLoading(false);
        return;
      }

      // ✅ Restore session if valid
      if (session?.user && (verified || recovery)) {
        console.log("✅ Session restored from storage");
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // ✅ Listen for auth state changes
    const { data } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔄 Auth state changed:", event);
        
        const recovery = isRecoveryFlow();
        const verified = isVerifiedUser(session?.user ?? null);

        // Only reject unverified users who aren't in recovery flow
        if (session?.user && !verified && !recovery) {
          console.log("⚠️ Unverified user detected in state change");
          supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setSession(null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user?.id) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      if (data && data.subscription) {
        data.subscription.unsubscribe();
      }
    };
  }, [fetchProfile]);

  // ==========================================================
  // SIGN UP
  // ==========================================================
  const signUp = useCallback(async (email, password, fullName) => {
    try {
      const res = await postJSON("/api/register", {
        email,
        password,
        fullName,
      });

      if (!res.success)
        return { error: new Error(res.message || "Registration failed") };

      // Clear any existing session after registration
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, []);

  // ==========================================================
  // SIGN IN
  // ==========================================================
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await postJSON("/api/login", { email, password });

        if (!res.success)
          return { error: new Error(res.message || "Login failed") };

        const { access_token, refresh_token } = res;

        // ✅ Set session - this will persist to localStorage automatically
        await supabase.auth.setSession({
          access_token,
          refresh_token: refresh_token ?? null,
        });

        // ✅ Get the session that was just set
        const { data } = await supabase.auth.getSession();
        const currentUser = data?.session?.user ?? null;

        const verified = isVerifiedUser(currentUser);

        if (!verified) {
          await supabase.auth.signOut();
          return {
            error: new Error("Please verify your email before logging in."),
          };
        }

        console.log("✅ User logged in successfully");
        setUser(currentUser);
        setSession(data?.session ?? null);

        if (currentUser) fetchProfile(currentUser.id);

        return { error: null, data: currentUser };
      } catch (err: any) {
        return { error: new Error(err.message || "Login failed") };
      }
    },
    [fetchProfile]
  );

  // ==========================================================
  // SIGN OUT
  // ==========================================================
  const signOut = useCallback(async () => {
    try {
      // ✅ Sign out will clear localStorage automatically
      await supabase.auth.signOut({ scope: "local" });
      console.log("✅ User signed out");
    } catch (err) {
      console.error("Sign out error:", err);
    }

    localStorage.removeItem("recovery_done");
    setUser(null);
    setProfile(null);
    setSession(null);
  }, []);

  // ==========================================================
  // UPDATE PROFILE (NOW SUPPORTS AVATAR URL)
  // ==========================================================
  const updateProfile = useCallback(
    async (fullName: string, avatarUrl?: string) => {
      try {
        if (!user) throw new Error("Not logged in");

        // Prepare update object
        const updates: any = {
          full_name: fullName,
          updated_at: new Date().toISOString(),
        };

        // Only include avatar_url if it's explicitly provided
        if (avatarUrl !== undefined) {
          updates.avatar_url = avatarUrl;
        }

        // Update in Supabase
        const { error } = await supabase
          .from("profiles")
          .update(updates)
          .eq("id", user.id);

        if (error) throw error;

        // Update local state
        setProfile((p) => {
          if (!p) return p;
          const updated = { ...p, full_name: fullName };
          if (avatarUrl !== undefined) {
            updated.avatar_url = avatarUrl;
          }
          return updated;
        });

        // Refresh profile to ensure sync
        await fetchProfile(user.id);

        return { error: null };
      } catch (err: any) {
        console.error("Update profile error:", err);
        return { error: err };
      }
    },
    [user, fetchProfile]
  );

  // ==========================================================
  // UPDATE EMAIL
  // ==========================================================
  const updateEmail = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error("Update email error:", err);
      return { error: err };
    }
  }, []);

  // ==========================================================
  // UPDATE PASSWORD
  // ==========================================================
  const updatePassword = useCallback(async (pw: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error("Update password error:", err);
      return { error: err };
    }
  }, []);

  // ==========================================================
  // REQUEST PASSWORD RESET
  // ==========================================================
  const requestPasswordReset = async (email: string) => {
    try {
      const res = await postJSON("/api/forgot-password", { email });
      if (!res.success) return { error: new Error(res.message) };
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // ==========================================================
  // PROVIDER
  // ==========================================================
  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        updateEmail,
        updatePassword,
        requestPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
