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
    <div className="shell-width auth-page-shell">
      <div className="auth-page-grid">
        <section className="auth-stage panel">
          <div className="eyebrow landing-eyebrow-large" style={{ marginBottom: "16px" }}>
            Access gateway
          </div>
          <h1 className="auth-stage-title">
            Save the sessions
            <br />
            worth keeping
          </h1>
          <p className="auth-stage-copy">
            Sign in to turn one-off practice into a real prep archive. Keep scored answers, revisit weak spots, and
            continue rounds without losing context.
          </p>

          <div className="auth-stage-rail" aria-hidden="true">
            <div className="auth-stage-rail-line" />
          </div>

          <div className="auth-stage-list">
            {[
              ["01", "Persist every scored attempt by role and level."],
              ["02", "Track progress across saved answer history."],
              ["03", "Unlock AI coach feedback tied to completed submissions."],
            ].map(([tag, text]) => (
              <div key={tag} className="auth-stage-item">
                <span className="mono auth-stage-item-tag">{tag}</span>
                <div className="auth-stage-item-copy">{text}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-form-shell panel">
          <div className="auth-card-content">
            <div className="auth-toggle-row">
              {(["login", "register"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`auth-toggle-button${mode === item ? " auth-toggle-button-active" : ""}`}
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

            <div className="eyebrow" style={{ marginBottom: "12px" }}>
              {mode === "login" ? "Sign in" : "Create account"}
            </div>
            <h2 className="auth-form-title">{mode === "login" ? "Resume your prep loop" : "Start tracking your practice"}</h2>

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
