import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AUTH_EVENT } from "../lib/auth";
import ImpersonationBanner from "./ImpersonationBanner";
import LoginPage from "./LoginPage";
import "./auth.css";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthGate({ children }) {
  const [state, setState] = useState("loading");
  const [me, setMe] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.status === 401) {
        setMe(null);
        setState("out");
        return;
      }
      if (!response.ok) {
        setMe(null);
        setState("out");
        return;
      }
      const body = await response.json();
      if (body.auth_required === false) {
        setMe(null);
        setState("open");
        return;
      }
      setMe(body);
      setState("in");
    } catch {
      setMe(null);
      setState("out");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onOut = () => {
      setMe(null);
      setState("out");
    };
    window.addEventListener(AUTH_EVENT, onOut);
    return () => window.removeEventListener(AUTH_EVENT, onOut);
  }, []);

  if (state === "loading") {
    return (
      <div className="auth-screen">
        <p className="auth-checking">Checking session...</p>
      </div>
    );
  }
  if (state === "out") {
    return <LoginPage onSuccess={load} />;
  }
  return (
    <AuthContext.Provider value={me}>
      <div className="app-shell">
        {me?.impersonator ? <ImpersonationBanner me={me} /> : null}
        <div className="app-shell__body">{children}</div>
      </div>
    </AuthContext.Provider>
  );
}
