import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { apiFetch } from "../lib/http";

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  country?: string;
  faceit_level?: number;
  faceit_username?: string;
  in_game_role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        setUser(null);
      } else {
        const data = await res.json().catch(() => null);
        setUser(data?.user ?? null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = (userData: User) => setUser(userData);

  const logout = async () => {
    await apiFetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refreshUser: fetchMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
