import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type PanelUser = {
  id: string;
  username: string;
  globalName: string;
  avatarUrl: string | null;
  email: string;
  role: "user" | "admin" | "owner";
};

const STORAGE_KEY = "flexozy-session";

/**
 * DEMO SESSION LAYER
 * -------------------------------------------------------------------------
 * ที่นี่คือจุดเดียวที่ต้องแก้เมื่อเชื่อม Discord OAuth ของจริง:
 *  - signIn()  -> เปลี่ยนเป็น redirect ไป https://discord.com/oauth2/authorize?...
 *  - user      -> โหลดจาก /api/me (session cookie) แทน localStorage
 *  - signOut() -> เรียก /api/logout
 * ส่วน UI ทั้งหมดอ่านค่าจาก useAuth() เท่านั้น จึงไม่ต้องแก้หน้าอื่น
 */
const demoUser: PanelUser = {
  id: "284712994422915073",
  username: "thanakrit",
  globalName: "Thanakrit",
  avatarUrl: null,
  email: "owner@flexozy.online",
  role: "owner",
};

type AuthValue = {
  user: PanelUser | null;
  ready: boolean;
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PanelUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as PanelUser);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const signIn = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, signIn, signOut }), [user, ready, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
