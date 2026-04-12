import React from "react"
import { Link, useNavigate } from "react-router-dom"
import GoogleAuthButton from "./ui/GoogleLoginButton"
import { api } from "@/services/api"

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/

export function SignupForm({ ...props }: React.ComponentProps<"div">) {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [name, setName] = React.useState("")
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const navigate = useNavigate()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loading) return

    setError("")
    setSuccess("")

    // ✅ Validation
    if (!email || !password || !confirmPassword || !name) {
      setError("Please fill in all fields")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords must match")
      return
    }

    if (!STRONG_PASSWORD_REGEX.test(password)) {
      setError("Password must be at least 8 characters and include uppercase, lowercase, and a special character")
      return
    }

    try {
      setLoading(true)

      const res = await api.post("/auth/signup", {
        name,
        email,
        password,
      })

      if (res.data?.accessToken) {
        localStorage.setItem("accessToken", res.data.accessToken)
      }

      // ✅ Success
      setSuccess("Account created successfully! Redirecting...")

      setTimeout(() => {
        navigate("/resumes")
      }, 1500)

    } catch (err: any) {
      // ✅ Proper error handling
      if (err.response) {
        setError(err.response.data?.message || "Signup failed")
      } else if (err.request) {
        setError("Server not responding")
      } else {
        setError("Something went wrong")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/google";
  };

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
          Sign up
        </h1>
      </div>

      <form onSubmit={handleSignup} style={{ display: "grid", gap: 10, width: "100%" }}>
        <div style={fieldStyle}>
          <label htmlFor="name" style={labelStyle}>Full Name</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="email" style={labelStyle}>Email</label>
          <input id="email" type="email"  value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="password" style={labelStyle}>Password</label>
          <div style={passwordFieldWrapStyle}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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

        <div style={fieldStyle}>
          <label htmlFor="confirm-password" style={labelStyle}>Confirm Password</label>
          <div style={passwordFieldWrapStyle}>
            <input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ ...inputStyle, paddingRight: 46 }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              style={togglePasswordButtonStyle}
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: "9px 11px", borderRadius: 10, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.18)", color: "#FCA5A5", fontSize: 12.5, lineHeight: 1.45 }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: "9px 11px", borderRadius: 10, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.18)", color: "#86EFAC", fontSize: 12.5, lineHeight: 1.45 }}>
            {success}
          </div>
        )}

        <button type="submit" disabled={loading} style={primaryButtonStyle(loading)}>
          {loading ? "Creating account…" : "Create Account"}
        </button>

        <div style={{ width: "100%" }}>
          <GoogleAuthButton redirectTo="/resumes" />
        </div>

        <p style={{ textAlign: "center", margin: "2px 0 0", color: "#666", fontSize: 12.5 }}>
          Already have an account? <Link to="/login" style={{ color: "#C8F55A", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
        </p>
      </form>
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  width: "100%",
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