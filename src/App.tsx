import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";
import AnimatedBackground from "./components/AnimatedBackground";

import Home from "./pages/Home";
import NotesGallery from "./pages/NotesGallery";
import SubjectNotes from "./pages/SubjectNotes";
import PracticeTests from "./pages/PracticeTests";
import Assignments from "./pages/Assignments";
import About from "./pages/About";
import AboutTeam from "./pages/AboutTeam";
import AdminPanel from "./pages/AdminPanel";
import AdminLogin from "./components/AdminLogin";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyAccount from "./pages/VerifyAccount";

import AIChat from "./pages/AIChat";
import Profile from "./pages/Profile";

import { ThemeProvider } from "./context/ThemeContext";
import { DataProvider } from "./context/DataContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

import { supabase } from "./lib/supabaseClient";
import "./App.css";

/* -------------------------------
   🔒 Protected Route
-------------------------------- */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "calc(var(--vh) * 100)" }}>
        <div className="animate-spin h-12 w-12 rounded-full border-t-2 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

/* -------------------------------
   🔄 Recovery Redirect
-------------------------------- */
const RecoveryRedirect: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/reset-password", { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center" style={{ height: "calc(var(--vh) * 100)" }}>
      <div className="animate-spin h-12 w-12 rounded-full border-t-2 border-b-2 border-indigo-600" />
    </div>
  );
};

/* -------------------------------
   🌐 App Routes
-------------------------------- */
function AppRoutes({ isRecoveryMode }: { isRecoveryMode: boolean }) {
  if (isRecoveryMode) {
    return <RecoveryRedirect />;
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{ minHeight: "calc(var(--vh) * 100)" }}
    >
      <AnimatedBackground />

      <div className="relative z-10 flex flex-col min-h-full">
        <Header />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/notes" element={<NotesGallery />} />
            <Route path="/notes/:subject" element={<SubjectNotes />} />
            <Route path="/practice-tests" element={<PracticeTests />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/about" element={<About />} />
            <Route path="/about-team" element={<AboutTeam />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-account" element={<VerifyAccount />} />

            <Route
              path="/ai-chat"
              element={
                <ProtectedRoute>
                  <AIChat />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>

        <Footer />
      </div>
    </div>
  );
}

/* -------------------------------
   🚀 Main App
-------------------------------- */
export default function App() {
  const recoveryHandled = useRef(false);
  const [ready, setReady] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  /* 🔥 REAL VIEWPORT HEIGHT */
  useEffect(() => {
    const setVH = () => {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`
      );
    };
    setVH();
    window.addEventListener("resize", setVH);
    return () => window.removeEventListener("resize", setVH);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;

    if (recoveryHandled.current || !hash.includes("type=recovery")) {
      setReady(true);
      return;
    }

    const params = new URLSearchParams(hash.replace("#", ""));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) {
      setReady(true);
      return;
    }

    recoveryHandled.current = true;

    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsRecoveryMode(true);
      })
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center" style={{ height: "calc(var(--vh) * 100)" }}>
        <div className="animate-spin h-12 w-12 rounded-full border-t-2 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <Router>
            <AppRoutes isRecoveryMode={isRecoveryMode} />
          </Router>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
