import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });

  const login = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const updateUser = (userData) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...userData };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  };

  const refreshUser = async () => {
    if (!localStorage.getItem("token")) return null;
    const res = await api.get("/api/auth/me");
    updateUser(res.data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    refreshUser().catch(() => logout());
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
