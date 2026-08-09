import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../api/axios";

const AuthContext = createContext();

function readStoredUser() {
  const value = localStorage.getItem("user");
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const login = useCallback((token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  const updateUser = useCallback((userData) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...userData };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem("token")) return null;
    const res = await api.get("/api/auth/me");
    updateUser(res.data);
    return res.data;
  }, [updateUser]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    // Refreshing persisted authentication is the synchronization performed by
    // this effect; state changes happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser().catch((error) => {
      if ([401, 403].includes(error.response?.status)) logout();
    });
  }, [logout, refreshUser]);

  useEffect(() => {
    window.addEventListener("app:unauthorized", logout);
    return () => window.removeEventListener("app:unauthorized", logout);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Keep the hook next to its provider so all consumers share one context.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
