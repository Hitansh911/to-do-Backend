"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { Mail, Lock, Activity } from "lucide-react";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetchApi("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (err) {
      setError("An error occurred during registration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen items-center justify-center bg-[#060D1F] overflow-hidden font-sans">
      {/* Background amorphous blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-[#0A1A45] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#0A1A45] rounded-full blur-[100px] pointer-events-none" />
      
      {/* Small decorative spheres */}
      <div className="absolute top-[12%] left-[8%] w-28 h-28 rounded-full bg-gradient-to-br from-[#1C75FF] to-[#0A2E7A] shadow-2xl" />
      <div className="absolute top-[8%] right-[32%] w-6 h-6 rounded-full bg-gradient-to-br from-[#408CFF] to-[#0C3B9E]" />
      <div className="absolute bottom-[15%] right-[22%] w-20 h-20 rounded-full bg-gradient-to-br from-[#1C75FF] to-[#0A2E7A] shadow-2xl" />
      <div className="absolute bottom-[25%] right-[18%] w-10 h-10 rounded-full bg-gradient-to-br from-[#1C75FF] to-[#0A2E7A] shadow-xl" />
      <div className="absolute bottom-[18%] left-[20%] w-5 h-5 rounded-full bg-gradient-to-br from-[#408CFF] to-[#0C3B9E]" />

      {/* Register Card */}
      <div className="relative z-10 w-full max-w-[400px] p-10 bg-[#164CA6] backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center">
        <h1 className="text-[28px] font-bold text-white mb-8 tracking-tight">Notes + To-Do</h1>
        
        <form className="w-full space-y-4" onSubmit={handleSubmit}>
          {/* Username Input */}
          <div className="relative flex items-center w-full">
            <div className="absolute left-4 text-[#A8C6FA]">
              <Mail size={16} />
            </div>
            <input 
              id="username"
              name="username"
              autoComplete="username"
              type="text" 
              placeholder="Username or Email" 
              className="w-full bg-[#205DC8] border border-white/10 rounded-full py-3.5 pl-12 pr-4 text-sm text-white placeholder-[#A8C6FA] focus:outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-inner"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          {/* Password Input */}
          <div className="relative flex items-center w-full">
            <div className="absolute left-4 text-[#A8C6FA]">
              <Lock size={16} />
            </div>
            <input 
              id="password"
              name="password"
              autoComplete="new-password"
              type="password" 
              placeholder="Password" 
              className="w-full bg-[#205DC8] border border-white/10 rounded-full py-3.5 pl-12 pr-4 text-sm text-white placeholder-[#A8C6FA] focus:outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-inner"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-red-300 text-xs text-center pt-1 font-medium">{error}</p>}
          {success && <p className="text-green-300 text-xs text-center pt-1 font-medium">Account created! Redirecting...</p>}
          
          {/* Main Button */}
          <div className="pt-2">
            <button 
              type="submit"
              disabled={isLoading || success}
              className="w-full bg-[#3684F6] hover:bg-[#2B73DF] text-white rounded-full py-3.5 text-sm font-bold shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </div>
          
          {/* Social Buttons */}
          <div className="flex items-center space-x-3 pt-3">
            <button 
              type="button"
              className="flex-1 flex items-center justify-center space-x-2 bg-[#205DC8]/60 hover:bg-[#205DC8] border border-white/10 text-[#E0E7FF] rounded-full py-2.5 text-[11px] font-medium transition-colors"
            >
              <Activity size={12} />
              <span>Or continue with</span>
            </button>
            <button 
              type="button"
              className="flex-1 flex items-center justify-center space-x-2 bg-[#205DC8]/60 hover:bg-[#205DC8] border border-white/10 text-[#E0E7FF] rounded-full py-2.5 text-[11px] font-medium transition-colors"
            >
              <Lock size={12} />
              <span>Google</span>
            </button>
          </div>
          
          {/* Terms text */}
          <div className="text-center pt-2">
            <p className="text-[11px] text-[#A8C6FA]">
              By continuing, you agree to our Terms of Service.
            </p>
          </div>
        </form>
      </div>
      
      {/* Bottom Texts */}
      <div className="absolute bottom-16 w-full text-center pointer-events-none">
        <p className="text-[11px] text-[#8BA1CC]">
          Already have an account?{" "}
          <Link href="/login" className="text-white cursor-pointer pointer-events-auto hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
      <div className="absolute bottom-6 right-8 text-[11px] text-[#8BA1CC] flex items-center space-x-1 cursor-pointer hover:text-white transition-colors">
        <Link href="/login">Sign in</Link>
        <div className="w-3.5 h-3.5 rounded-full border border-[#8BA1CC] flex items-center justify-center text-[8px] font-bold">
          ?
        </div>
      </div>
    </div>
  );
}
