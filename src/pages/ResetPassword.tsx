import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { postJSON } from "../services/api";
import { motion } from "framer-motion";
import { Loader, Lock, Eye, EyeOff, KeyRound, AlertCircle, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// Helper hook to extract query parameters
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ResetPassword: React.FC = () => {
  const query = useQuery();
  const navigate = useNavigate();

  // Backend token param (from email link)
  const token = query.get("jwt") || query.get("token") || null;

  const [status, setStatus] = useState<
    "checking" | "ok" | "invalid" | "supabase"
  >("checking");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ---------------------------------------------------
      VALIDATE TOKEN / DETECT SUPABASE RECOVERY LINK
     --------------------------------------------------- */
  useEffect(() => {
    const handle = async () => {
      const hash = window.location.hash;
      const fullUrl = window.location.href;

      // Enhanced debug logging
      console.log("🔍 Reset Page Full URL:", fullUrl);
      console.log("🔍 Hash:", hash);
      console.log("🔍 Search:", window.location.search);
      console.log("🔍 Token:", token);
      console.log("🔍 Pathname:", window.location.pathname);

      // FIX #1 - If no token AND not a Supabase recovery hash → invalid link
      if (!token && !hash.includes("type=recovery")) {
        console.log("❌ No token found → Invalid reset URL.");
        setStatus("invalid");
        return;
      }

      // Supabase recovery link (#type=recovery)
      if (hash.includes("type=recovery")) {
        console.log("⚡ Supabase recovery mode detected.");
        setStatus("supabase");
        return;
      }

      // Our backend reset link using JWT
      if (token) {
        console.log("🔑 Validating backend reset token...");

        try {
          const res = await postJSON("/api/reset-password", {
            token,
            validateOnly: true,
          });

          if (res?.success) {
            console.log("✅ Backend token valid");
            setStatus("ok");
          } else {
            console.log("❌ Invalid backend token");
            setStatus("invalid");
          }
        } catch (e) {
          console.error("❌ Token validation error:", e);
          setStatus("invalid");
        }

        return;
      }

      // Nothing matched → invalid
      setStatus("invalid");
    };

    handle();
  }, [token]); // Add token as dependency

  /* ---------------------------------------------------
                     SUBMIT NEW PASSWORD
     --------------------------------------------------- */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      /* ----------------------
         SUPABASE RECOVERY FLOW
         ---------------------- */
      if (status === "supabase") {
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
          setError("Failed to update password: " + error.message);
          return;
        }

        navigate("/login", {
          state: { message: "Password updated successfully. Please log in." },
        });

        return;
      }

      /* ----------------------
        BACKEND TOKEN FLOW
         ---------------------- */
      if (token) {
        const res = await postJSON("/api/reset-password", {
          token,
          password,
          validateOnly: false,
        });

        setLoading(false);

        if (!res?.success) {
          setError(res?.message ?? "Failed to reset password.");
          return;
        }

        navigate("/login", {
          state: { message: "Password reset successful. Please log in." },
        });

        return;
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Reset failed.");
      setLoading(false);
    }
  };

  /* ---------------------------------------------------
                     UI STATES
     --------------------------------------------------- */

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Loader className="animate-spin h-12 w-12 mx-auto mb-4 text-indigo-600" />
          <p className="text-high-contrast opacity-70">Validating reset link...</p>
        </motion.div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="glass-effect rounded-3xl p-8 enhanced-shadow">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="text-center mb-6"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gradient neon-glow mb-2">Invalid Reset Link</h2>
              <p className="text-high-contrast opacity-70">
                This password reset link is invalid or has expired.
              </p>
            </motion.div>

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => navigate("/forgot-password")}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold hover-scale transition-all shimmer-effect flex items-center justify-center mb-3"
            >
              Request New Link
            </motion.button>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              onClick={() => navigate("/login")}
              className="w-full py-3 rounded-xl border-2 border-red-500 text-red-500 font-semibold hover-scale transition-all flex items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Login
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ---------------------------------------------------
                MAIN RESET PASSWORD FORM
     --------------------------------------------------- */

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="glass-effect rounded-3xl p-8 enhanced-shadow">
          
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white mb-4">
              <KeyRound className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-gradient neon-glow mb-2">Set New Password</h1>
            <p className="text-high-contrast opacity-70 text-sm">
              Enter your new password below
            </p>
          </motion.div>

          <form onSubmit={submit} className="space-y-5">
            
            {/* PASSWORD FIELD */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-sm font-medium text-high-contrast mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 glass-effect rounded-xl text-high-contrast focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </motion.div>

            {/* CONFIRM PASSWORD FIELD */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-sm font-medium text-high-contrast mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 glass-effect rounded-xl text-high-contrast focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </motion.div>

            {/* ERROR MESSAGE */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* SUBMIT BUTTON */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              disabled={loading}
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover-scale disabled:opacity-50 disabled:cursor-not-allowed transition-all shimmer-effect flex items-center justify-center"
            >
              {loading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <KeyRound className="h-5 w-5 mr-2" />
                  Reset Password
                </>
              )}
            </motion.button>
          </form>

          {/* BACK TO LOGIN */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center space-y-3"
          >
            <p className="text-high-contrast opacity-70">
              Remember your password?
            </p>
            <button
              onClick={() => navigate("/login")}
              className="block w-full py-3 rounded-xl border-2 border-purple-500 text-purple-500 font-semibold hover-scale transition-all"
            >
              Back to Login
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
