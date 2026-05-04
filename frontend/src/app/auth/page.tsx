import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { forgotPassword, login, register, resetPassword } from "../../lib/api";

type Mode = "login" | "register" | "forgot" | "reset";

function normalizeNext(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/";
  }
  return next;
}

function getInitialMode(mode: string | null, token: string | null): Mode {
  if (token) return "reset";
  if (mode === "register" || mode === "forgot" || mode === "reset") return mode;
  return "login";
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const next = useMemo(() => normalizeNext(params.get("next")), [params]);
  const token = params.get("token") ?? "";
  const [mode, setMode] = useState<Mode>(getInitialMode(params.get("mode"), params.get("token")));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setMode(getInitialMode(params.get("mode"), params.get("token")));
  }, [params]);

  function switchMode(nextMode: Mode) {
    const nextParams = new URLSearchParams(params);
    if (nextMode === "login") {
      nextParams.delete("mode");
      nextParams.delete("token");
    } else {
      nextParams.set("mode", nextMode);
      if (nextMode !== "reset") {
        nextParams.delete("token");
      }
    }
    setParams(nextParams, { replace: true });
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === "login") {
        await login(email, password);
        navigate(next, { replace: true });
      } else if (mode === "register") {
        await register(email, password);
        navigate(next, { replace: true });
      } else if (mode === "forgot") {
        const result = await forgotPassword(email);
        setNotice(result.message);
      } else {
        if (!token) {
          throw new Error("Reset link is missing or invalid.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        const result = await resetPassword(token, password);
        const nextParams = new URLSearchParams(params);
        nextParams.delete("token");
        nextParams.delete("mode");
        setParams(nextParams, { replace: true });
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setNotice(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const showEmailField = mode !== "reset";
  const showPasswordField = mode !== "forgot";
  const title =
    mode === "login"
      ? "Resume your prep loop"
      : mode === "register"
        ? "Start tracking your practice"
        : mode === "forgot"
          ? "Request a reset link"
          : "Set a new password";
  const eyebrow =
    mode === "login"
      ? "Sign in"
      : mode === "register"
        ? "Create account"
        : mode === "forgot"
          ? "Forgot password"
          : "Reset password";

  return (
    <div className="shell-width auth-page-shell">
      <div className="auth-page-grid auth-page-grid-single">
        <section className="auth-form-shell auth-form-shell-single panel">
          <div className="auth-card-content">
            <div className="auth-toggle-row">
              {(["login", "register"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`auth-toggle-button${mode === item ? " auth-toggle-button-active" : ""}`}
                  onClick={() => switchMode(item)}
                >
                  {item === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            <div className="eyebrow" style={{ marginBottom: "12px" }}>
              {eyebrow}
            </div>
            <h2 className="auth-form-title">{title}</h2>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
              {showEmailField ? (
                <>
                  <label className="eyebrow">email</label>
                  <input
                    className="input-shell"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </>
              ) : null}

              {showPasswordField ? (
                <>
                  <label className="eyebrow">{mode === "reset" ? "new password" : "password"}</label>
                  <input
                    className="input-shell"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                </>
              ) : null}

              {mode === "reset" ? (
                <>
                  <label className="eyebrow">confirm password</label>
                  <input
                    className="input-shell"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </>
              ) : null}

              {mode === "login" ? (
                <button type="button" className="auth-forgot-password" onClick={() => switchMode("forgot")}>
                  Forgot password?
                </button>
              ) : null}

              {notice ? (
                <div
                  className="mono"
                  style={{
                    padding: "12px 14px",
                    border: "1px solid rgba(34, 197, 94, 0.35)",
                    background: "rgba(34, 197, 94, 0.08)",
                    color: "#22c55e",
                    fontSize: "12px",
                  }}
                >
                  {notice}
                </div>
              ) : null}

              {error ? (
                <div
                  className="mono"
                  style={{
                    padding: "12px 14px",
                    border: "1px solid rgba(239, 83, 80, 0.35)",
                    background: "rgba(239, 83, 80, 0.08)",
                    color: "var(--danger)",
                    fontSize: "12px",
                  }}
                >
                  ERROR: {error}
                </div>
              ) : null}

              <button type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: "6px" }}>
                {submitting
                  ? "Processing..."
                  : mode === "login"
                    ? "Unlock Session"
                    : mode === "register"
                      ? "Create Account"
                      : mode === "forgot"
                        ? "Send Reset Link"
                        : "Reset Password"}
              </button>
            </form>

            <div className="auth-switch-row">
              {mode === "forgot" || mode === "reset" ? (
                <button type="button" className="btn-ghost" onClick={() => switchMode("login")}>
                  Back To Sign In
                </button>
              ) : (
                <>
                  <span className="muted auth-switch-copy">
                    {mode === "login" ? "Need an account?" : "Already registered?"}
                  </span>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => switchMode(mode === "login" ? "register" : "login")}
                  >
                    {mode === "login" ? "Register" : "Sign In"}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
