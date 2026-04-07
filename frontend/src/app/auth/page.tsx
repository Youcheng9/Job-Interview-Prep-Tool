import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  const [mode, setMode] = useState<Mode>((params.get("mode") === "register" ? "register" : "login"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
      }}
    >
      <div
        className="panel animate-fade-up"
        style={{
          width: "100%",
          maxWidth: "620px",
          padding: "36px",
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: "13px",
            letterSpacing: "0.18em",
            color: "var(--cyan)",
            marginBottom: "12px",
          }}
        >
          AUTH://ACCESS_GATE
        </div>
        <h1 style={{ fontSize: "42px", marginBottom: "12px" }}>
          {mode === "login" ? "Sign In" : "Create Account"}
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: "28px", lineHeight: 1.7, fontSize: "18px" }}>
          Sign in to score answers and sync your session history with the backend.
        </p>

        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {(["login", "register"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={mode === item ? "btn-primary" : "btn-ghost"}
              onClick={() => {
                setMode(item);
                setError(null);
              }}
              style={{ flex: 1, fontSize: "15px" }}
            >
              {item === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <label
            style={{
              display: "block",
              fontFamily: "var(--font-head)",
              fontSize: "13px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: "8px",
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{
              width: "100%",
              marginBottom: "16px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              padding: "16px 18px",
              fontFamily: "var(--font-body)",
              fontSize: "17px",
            }}
          />

          <label
            style={{
              display: "block",
              fontFamily: "var(--font-head)",
              fontSize: "13px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: "8px",
            }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            style={{
              width: "100%",
              marginBottom: "18px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              padding: "16px 18px",
              fontFamily: "var(--font-body)",
              fontSize: "17px",
            }}
          />

          {error && (
            <div
              style={{
                marginBottom: "16px",
                padding: "10px 12px",
                borderLeft: "2px solid var(--red)",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.24)",
                color: "#fca5a5",
                fontSize: "15px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{
              width: "100%",
              fontSize: "16px",
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? "wait" : "pointer",
            }}
          >
            {submitting
              ? "Processing..."
              : mode === "login"
              ? "Unlock Session"
              : "Create Account"}
          </button>
        </form>

        <div
          style={{
            marginTop: "18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <span style={{ color: "var(--muted)", fontSize: "15px" }}>
            {mode === "login" ? "Need an account?" : "Already registered?"}
          </span>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            style={{ fontSize: "13px" }}
          >
            {mode === "login" ? "Register" : "Sign In"}
          </button>
        </div>

        <div style={{ marginTop: "18px", textAlign: "center" }}>
          <Link
            to={next}
            style={{
              color: "var(--muted)",
              textDecoration: "none",
              fontSize: "14px",
            }}
          >
            Continue without signing in
          </Link>
        </div>
      </div>
    </div>
  );
}
