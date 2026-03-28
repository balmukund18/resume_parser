import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn, setAuthToken, clearAuthToken } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  googleId: string | null;
  authToken?: string;
}

function handleAuthResponse(user: AuthUser) {
  if (user.authToken) {
    setAuthToken(user.authToken);
  }
  // Strip token before caching (no need to keep it in React Query state)
  const { authToken: _, ...userData } = user;
  queryClient.setQueryData(["/api/auth/user"], userData);
}

export function useAuth() {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<AuthUser | null>({ on401: "returnNull" }),
    staleTime: Infinity,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return res.json() as Promise<AuthUser>;
    },
    onSuccess: handleAuthResponse,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json() as Promise<AuthUser>;
    },
    onSuccess: handleAuthResponse,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      clearAuthToken();
      queryClient.clear();
      window.location.href = "/login";
    },
  });

  return {
    user: user ?? null,
    isLoading,
    error,
    loginMutation,
    registerMutation,
    logoutMutation,
  };
}
