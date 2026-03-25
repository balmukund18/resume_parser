import { useState } from "react";
import { useLocation } from "wouter";
import { FileText, Loader2, Mail, Lock, User, ArrowRight } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { API_BASE } from "@/lib/queryClient";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();
  const { loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRegister) {
      registerMutation.mutate(
        { email, password, name },
        {
          onSuccess: () => {
            toast({ title: "Account created!", description: "Welcome to Resume Parser" });
            navigate("/");
          },
          onError: (err: Error) => {
            toast({ title: "Registration failed", description: err.message, variant: "destructive" });
          },
        }
      );
    } else {
      loginMutation.mutate(
        { email, password },
        {
          onSuccess: () => {
            toast({ title: "Welcome back!", description: "Logged in successfully" });
            navigate("/");
          },
          onError: (err: Error) => {
            toast({ title: "Login failed", description: err.message, variant: "destructive" });
          },
        }
      );
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const hasGoogleAuth = true; // Button always shown; server handles redirect or 404

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/25">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Resume Parser</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRegister ? "Create your account" : "Sign in to your account"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[hsl(var(--card))] rounded-2xl border shadow-sm p-6">
          {/* Google sign-in */}
          {hasGoogleAuth && (
            <>
              <Button
                variant="outline"
                className="w-full h-11 text-[13px] font-medium gap-2.5"
                onClick={() => {
                  window.location.href = `${API_BASE}/api/auth/google`;
                }}
              >
                <FcGoogle className="h-5 w-5" />
                Continue with Google
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                  <span className="bg-[hsl(var(--card))] px-3 text-muted-foreground font-medium">or</span>
                </div>
              </div>
            </>
          )}

          {/* Email/Password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-[12px] font-medium">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-10 text-[13px]"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-10 text-[13px]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[12px] font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={isRegister ? "Min 6 characters" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-10 text-[13px]"
                  required
                  minLength={isRegister ? 6 : undefined}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-[13px] font-medium gap-2"
              disabled={isPending}
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Please wait...</>
              ) : (
                <>{isRegister ? "Create Account" : "Sign In"} <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <p className="text-[12px] text-muted-foreground">
              {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => {
                  setIsRegister(!isRegister);
                  setName("");
                  setPassword("");
                }}
                className="text-primary font-medium hover:underline"
              >
                {isRegister ? "Sign in" : "Create one"}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Smart resume parsing and analysis
        </p>
      </div>
    </div>
  );
}
