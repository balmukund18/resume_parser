import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Loader2, AlertCircle } from "lucide-react";
import { queryClient, API_BASE, setAuthToken } from "@/lib/queryClient";

export default function AuthCallback() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get("token");

    if (!token) {
      setError("No authentication token found");
      return;
    }

    fetch(`${API_BASE}/api/auth/exchange-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Authentication failed");
        }
        return res.json();
      })
      .then((user) => {
        // Store the bearer token for all future API calls
        if (user.authToken) {
          setAuthToken(user.authToken);
        }
        // Cache user data (without token) so AuthGuard sees it immediately
        const { authToken: _, ...userData } = user;
        queryClient.setQueryData(["/api/auth/user"], userData);
        navigate("/", { replace: true });
      })
      .catch((err) => {
        setError(err.message || "Authentication failed");
      });
  }, [search, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="text-sm text-primary hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
