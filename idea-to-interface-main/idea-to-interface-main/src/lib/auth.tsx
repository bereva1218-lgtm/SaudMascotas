import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useUserRole } from "./UserRoleContext";
import { User } from "./types";
import * as api from "./api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const { setRole } = useUserRole();

  useEffect(() => {
    const saved = localStorage.getItem("auth");
    if (saved) {
      const obj = JSON.parse(saved);
      setUser(obj.user);
      setToken(obj.token);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem("auth", JSON.stringify(response));
    setRole(response.user.role as any);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
