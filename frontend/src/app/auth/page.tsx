import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { login, register } from "../../lib/api";

type Mode = "login" | "register";

function normalizeNext(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/";
  }
  return next;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = useMemo(() => normalizeNext(params.get("next")), [params]);
  const [mode, setMode] = useState<Mode>(params.get("mode") === "register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordHelp, setPasswordHelp] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="shell-width" style={{ padding: "56px 0 0" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 0.95fr) minmax(340px, 0.8fr)",
          gap: "28px",
          alignItems: "stretch",
        }}
      >
        <section className="panel" style={{ padding: "36px" }}>
          <div className="eyebrow" style={{ marginBottom: "14px" }}>
            // access gateway
          </div>
          <h1 style={{ fontSize: "clamp(42px, 5vw, 76px)", lineHeight: 0.9, marginBottom: "14px" }}>
            Enter the
            <br />
            scoring loop
          </h1>
          <p className="muted" style={{ fontSize: "17px", maxWidth: "36rem", marginBottom: "28px" }}>
            Authentication unlocks score persistence, answer history, and AI coach feedback tied to saved attempts
          </p>

          <div style={{ display: "grid", gap: "14px" }}>
            {[
              ["[01]", "Save every scored attempt by role and level"],
              ["[02]", "Resume practice flows without losing answered questions"],
              ["[03]", "Trigger optional AI coach feedback from saved submissions"],
            ].map(([tag, text]) => (
              <div key={tag} className="surface-strip" style={{ padding: "16px 18px", display: "flex", gap: "14px" }}>
                <span className="mono" style={{ fontSize: "11px", color: "var(--acid)", minWidth: "44px" }}>{tag}</span>
                <span style={{ color: "var(--muted)" }}>{text}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="terminal-window auth-card">
          <div className="auth-card-content">
            <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
              {(["login", "register"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={mode === item ? "btn-primary" : "btn-ghost"}
                  style={{ flex: 1 }}
                  onClick={() => {
                    setMode(item);
                    setError(null);
                    setPasswordHelp(null);
                  }}
                >
                  {item === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
              <label className="eyebrow">email</label>
              <input className="input-shell" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />

              <label className="eyebrow">password</label>
              <input
                className="input-shell"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              {mode === "login" ? (
                <button
                  type="button"
                  className="auth-forgot-password"
                  onClick={() => setPasswordHelp("Password reset is not available yet. Please contact the project owner or create a new account.")}
                >
                  Forgot password?
                </button>
              ) : null}
              {passwordHelp ? (
                <div className="auth-help-message">
                  {passwordHelp}
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
                {submitting ? "Processing..." : mode === "login" ? "Unlock Session" : "Create Account"}
              </button>
            </form>

            <div className="auth-switch-row">
              <span className="muted auth-switch-copy">
                {mode === "login" ? "Need an account?" : "Already registered?"}
              </span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError(null);
                  setPasswordHelp(null);
                }}
              >
                {mode === "login" ? "Register" : "Sign In"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
