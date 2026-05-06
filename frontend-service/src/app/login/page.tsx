"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { User, Lock } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

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
      const response = await fetchApi("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        login(data.data.token);
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      setError("An error occurred during login. Please try again.");
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

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[400px] p-10 bg-[#162D60]/80 backdrop-blur-2xl rounded-[3rem] border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center">
        <h1 className="text-[28px] font-bold text-white mb-10 tracking-tight">Notes + To-Do</h1>
        
        <form className="w-full space-y-4" onSubmit={handleSubmit}>
          {/* Username Input */}
          <div className="relative flex items-center w-full">
            <div className="absolute left-4 text-[#8BA1CC]">
              <User size={16} />
            </div>
            <input 
              id="username"
              name="username"
              autoComplete="username"
              type="text" 
              placeholder="Welcome back" 
              className="w-full bg-[#1E3B7D] border-none rounded-full py-3.5 pl-12 pr-4 text-sm text-white placeholder-[#8BA1CC] focus:outline-none focus:ring-2 focus:ring-[#1C75FF] transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          {/* Password Input */}
          <div className="relative flex items-center w-full">
            <div className="absolute left-4 text-[#8BA1CC]">
              <Lock size={16} />
            </div>
            <input 
              id="password"
              name="password"
              autoComplete="current-password"
              type="password" 
              placeholder="Enter your details. Stay focused." 
              className="w-full bg-[#1E3B7D] border-none rounded-full py-3.5 pl-12 pr-4 text-sm text-white placeholder-[#8BA1CC] focus:outline-none focus:ring-2 focus:ring-[#1C75FF] transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-red-400 text-xs text-center pt-2">{error}</p>}
          
          {/* Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            <button 
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-[#2C7BFF] hover:bg-[#1A62E0] text-white rounded-full py-3.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
            <button 
              type="button"
              onClick={() => router.push('/register')}
              className="flex-1 bg-[#264A9D] hover:bg-[#1F3E86] text-white rounded-full py-3.5 text-sm font-medium transition-colors"
            >
              Create account
            </button>
          </div>
          
          {/* Forgot Password */}
          <div className="text-center pt-3">
            <Link href="#" className="text-xs text-[#8BA1CC] hover:text-white transition-colors">
              Or forgot password?
            </Link>
          </div>
        </form>
      </div>
      
      {/* Bottom Texts */}
      <div className="absolute bottom-16 w-full text-center space-y-6 pointer-events-none">
        <p className="text-[11px] text-[#8BA1CC]">Or don't have an account to continue.</p>
        <p className="text-[11px] text-[#8BA1CC]">
          Don't have an account for notes? -{" "}
          <Link href="/register" className="text-white cursor-pointer pointer-events-auto hover:underline">
            Sign up
          </Link>
        </p>
      </div>
      <div className="absolute bottom-6 right-8 text-[11px] text-[#8BA1CC] flex items-center space-x-1 cursor-pointer hover:text-white transition-colors">
        <Link href="/register">Sign up</Link>
        <div className="w-3.5 h-3.5 rounded-full border border-[#8BA1CC] flex items-center justify-center text-[8px] font-bold">
          ?
        </div>
      </div>
    </div>
  );
}
