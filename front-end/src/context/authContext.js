// context/AuthContext.jsx
import { createContext, useState, useContext } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [adminToken, setAdminToken] = useState(localStorage.getItem("adminToken") || null);
  const [userToken,  setUserToken]  = useState(localStorage.getItem("userToken")  || null);

  const loginAdmin = (token) => {
    localStorage.setItem("adminToken", token);
    localStorage.removeItem("userToken");
    setAdminToken(token);
    setUserToken(null);
  };

  const loginUser = (token) => {
    localStorage.setItem("userToken", token);
    localStorage.removeItem("adminToken");
    setUserToken(token);
    setAdminToken(null);
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("userToken");
    localStorage.removeItem("user");
    setAdminToken(null);
    setUserToken(null);
  };

  return (
    <AuthContext.Provider value={{
      adminToken,        // ✅ BUG FIX: was missing from value before
      userToken,
      loginAdmin,
      loginUser,
      logout,
      isAdmin: !!adminToken,
      isUser:  !!userToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}