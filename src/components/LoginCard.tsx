import React, { useState } from "react";
import { Briefcase, Lock, User as UserIcon, LogIn } from "lucide-react";
import { User } from "../types";

interface LoginCardProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export default function LoginCard({ users, onLoginSuccess }: LoginCardProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    setTimeout(() => {
      // Find the corresponding user
      const foundUser = users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
      );

      if (foundUser) {
        onLoginSuccess(foundUser);
      } else {
        setErrorMsg("Invalid username or password.");
      }
      setIsLoading(false);
    }, 450);
  };

  return (
    <div
      id="login-container"
      className="flex items-center justify-center min-h-screen w-full relative overflow-hidden bg-[#F8F4ED] dark:bg-[#0B1727]"
    >
      {/* Decorative Blur Spheres */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute w-[400px] h-[400px] rounded-full bg-cyan-400 blur-[80px] -top-10 -left-10" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-amber-400 blur-[80px] -bottom-10 -right-10" />
      </div>

      <div className="login-card w-full max-w-sm p-8 rounded-[36px] bg-white/45 dark:bg-[#122238]/45 border border-[#00537A]/10 dark:border-white/10 backdrop-blur-2xl shadow-2xl relative z-10 transition-all duration-300">
        <div className="login-icon w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-[#00537A] to-cyan-500 rounded-3xl flex items-center justify-center shadow-lg shadow-cyan-600/20">
          <Briefcase className="w-8 h-8 text-white animate-pulse" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[#00537A] to-amber-500 bg-clip-text text-transparent dark:from-[#A8E8F9] dark:to-cyan-400 text-center">
          C&B Portal
        </h2>
        <p className="text-xs text-[#00537A]/40 dark:text-white/30 tracking-widest uppercase font-semibold text-center mb-8 mt-1">
          Secure HR Administration
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5" /> Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., admin"
              className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-white/5 border border-[#00537A]/10 dark:border-white/10 text-sm focus:outline-none focus:border-[#00537A] focus:ring-2 focus:ring-[#00537A]/10 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/10 text-slate-800 dark:text-white transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/70 dark:bg-white/5 border border-[#00537A]/10 dark:border-white/10 text-sm focus:outline-none focus:border-[#00537A] focus:ring-2 focus:ring-[#00537A]/10 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/10 text-slate-800 dark:text-white transition-all placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-[#00537A] to-cyan-600 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:translate-y-[-1px] active:translate-y-0 transition-all hover:shadow-lg hover:shadow-[#00537A]/30 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Login to System
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
