import { useState } from "react"
import { api } from "@/services/api"
import GoogleAuthButton from "./ui/GoogleLoginButton"

export function LoginForm({
  ...props
}: React.ComponentProps<"div">) {
  const redirectTo = "/resumes"

  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [timer, setTimer] = useState(0)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!email || !password) {
    setMessage("Please enter email and password")
    return
  }

  try {
    setLoading(true)

    const res = await api.post("/auth/login", {
      email,
      password,
    })

    if (res.data?.accessToken) {
      localStorage.setItem("accessToken", res.data.accessToken)
    }

    setMessage("Login successful")

    window.location.href = redirectTo

  } catch (err: any) {
    setMessage(err.response?.data?.message || "Invalid credentials")
  } finally {
    setLoading(false)
  }
}

  // ⏱ Timer Logic
  const startTimer = () => {
    setTimer(60)
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // 📩 Forgot Password Click
  const handleForgotPassword = async () => {
    if (!email) {
      setMessage("Please enter your email first")
      return
    }

    try {
      setLoading(true)

      await api.post("/auth/forgot-password", {
        email,
      })

      setMessage("Check your email for reset link")
      startTimer()

    } catch (err:any) {
      setMessage(err.response?.data?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }
  return (
    <div
      {...props}
      style={{
        width: "100%",
        display: "grid",
        gap: 12,
        gridTemplateColumns: "minmax(0, 1fr)",
        justifyItems: "center",
        ...((props as React.ComponentProps<"div">).style ?? {}),
      }}
    >
      <div style={{ marginBottom: 2, textAlign: "center", width: "100%" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 300, letterSpacing: "-0.8px", color: "#F0EFE8", margin: 0, lineHeight: 1.08 }}>
          Login
        </h1>
      </div>

      <form onSubmit={handleLogin} style={{ display: "grid", gap: 10, width: "100%" }}>
        <div style={fieldStyle}>
          <label htmlFor="email" style={labelStyle}>Email</label>
          <input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading || timer > 0}
              style={forgotStyle(loading || timer > 0)}
            >
              {timer > 0 ? `Resend in ${timer}s` : "Forgot your password?"}
            </button>
          </div>

          <div style={passwordFieldWrapStyle}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: 46 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={togglePasswordButtonStyle}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {message && (
          <div style={{ padding: "9px 11px", borderRadius: 10, background: message.toLowerCase().includes("success") ? "rgba(74,222,128,0.12)" : "rgba(200,245,90,0.08)", border: "1px solid rgba(200,245,90,0.16)", color: message.toLowerCase().includes("success") ? "#86EFAC" : "#C8F55A", fontSize: 12.5, lineHeight: 1.45 }}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={primaryButtonStyle(loading)}
        >
          {loading ? "Signing in…" : "Login"}
        </button>

        <div style={{ width: "100%" }}>
          <GoogleAuthButton redirectTo={redirectTo} />
        </div>

        <p style={{ textAlign: "center", margin: "2px 0 0", color: "#666", fontSize: 12.5, width: "100%" }}>
          Don&apos;t have an account? <a href="/signup" style={{ color: "#C8F55A", fontWeight: 700, textDecoration: "none" }}>Sign up</a>
        </p>
      </form>
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  color: "#C8C7C0",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid #232323",
  background: "rgba(8,8,8,0.72)",
  color: "#F0EFE8",
  padding: "11px 13px",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const primaryButtonStyle = (disabled: boolean): React.CSSProperties => ({
  width: "100%",
  border: "none",
  borderRadius: 14,
  background: disabled ? "rgba(200,245,90,0.55)" : "#C8F55A",
  color: "#0E0E0E",
  fontSize: 13,
  fontWeight: 800,
  padding: "11px 16px",
  cursor: disabled ? "wait" : "pointer",
  transition: "transform 0.15s ease, opacity 0.15s ease",
});

const forgotStyle = (disabled: boolean): React.CSSProperties => ({
  marginLeft: "auto",
  border: "none",
  background: "transparent",
  color: disabled ? "#444" : "#8AA0FF",
  fontSize: 11.5,
  cursor: disabled ? "not-allowed" : "pointer",
  padding: 0,
});

const passwordFieldWrapStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
};

const togglePasswordButtonStyle: React.CSSProperties = {
  position: "absolute",
  right: 14,
  top: "50%",
  transform: "translateY(-50%)",
  border: "none",
  background: "transparent",
  color: "#8AA0FF",
  cursor: "pointer",
  padding: 0,
  width: 18,
  height: 18,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a21.77 21.77 0 0 1 5.08-6.22" />
      <path d="M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a21.53 21.53 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}