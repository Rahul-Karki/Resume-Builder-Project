import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "@/services/api"

const MAX_OTP_ATTEMPTS = 3

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [otpInput, setOtpInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [otpAttempts, setOtpAttempts] = useState(0)
  const [otpExhausted, setOtpExhausted] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  const handleSubmit = async () => {
    if (otpInput.length !== 6 || !email || loading || otpExhausted) return
    setLoading(true)
    try {
      const res = await api.post("/auth/verify-email", { email, otp: otpInput })
      if (res.status === 200) {
        navigate("/resumes")
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Invalid verification code"
      const newAttempts = otpAttempts + 1
      setOtpAttempts(newAttempts)
      setOtpInput("")

      if (msg.includes("Too many") || newAttempts >= MAX_OTP_ATTEMPTS) {
        setOtpExhausted(true)
        setMessage("Too many failed attempts. Request a new code below.")
      } else {
        const remaining = MAX_OTP_ATTEMPTS - newAttempts
        setMessage(`Invalid code. ${remaining} attempt(s) remaining.`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendLoading) return
    setResendLoading(true)
    setMessage("")
    try {
      await api.post("/auth/resend-verification", { email })
      setOtpAttempts(0)
      setOtpExhausted(false)
      setOtpInput("")
      setMessage("")
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Failed to resend code")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100svh", width: "100%", background: "radial-gradient(circle at top, rgba(200,245,90,0.08), transparent 24%), #09090b", color: "#fafafa", display: "grid", placeItems: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420, border: "1px solid #3f3f46", borderRadius: 28, padding: 32, background: "rgba(11,11,11,0.96)", boxShadow: "0 30px 100px rgba(0,0,0,0.45)", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 300, color: "#F0EFE8", margin: "0 0 8px" }}>Enter verification code</h1>
        <p style={{ color: "#a1a1aa", fontSize: 13, margin: "0 0 16px" }}>
          Enter the 6-digit code sent to your email.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          style={{
            width: "100%",
            maxWidth: 280,
            borderRadius: 14,
            border: "1px solid #3f3f46",
            background: "#18181b",
            color: "#fafafa",
            padding: "11px 13px",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
            margin: "0 auto 10px",
            textAlign: "center",
          }}
        />
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={otpInput}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 6)
            setOtpInput(val)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && otpInput.length === 6) handleSubmit()
          }}
          placeholder="000000"
          style={{
            width: "100%",
            maxWidth: 200,
            borderRadius: 14,
            border: "1px solid #3f3f46",
            background: "#18181b",
            color: "#fafafa",
            padding: "14px 16px",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 8,
            textAlign: "center",
            outline: "none",
            boxSizing: "border-box",
            margin: "0 auto",
          }}
        />
        {message && (
          <p style={{ color: "#FCA5A5", fontSize: 12, marginTop: 12, lineHeight: 1.5 }}>{message}</p>
        )}
        {otpExhausted ? (
          <p style={{ color: "#FCA5A5", fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
            You've used all attempts. Request a new code below.
          </p>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={otpInput.length !== 6 || !email || loading}
            style={{
              width: "100%",
              maxWidth: 200,
              border: "none",
              borderRadius: 14,
              background: otpInput.length === 6 && email && !loading ? "#C8F55A" : "rgba(200,245,90,0.35)",
              color: "#0E0E0E",
              fontSize: 13,
              fontWeight: 800,
              padding: "11px 16px",
              cursor: otpInput.length === 6 && email && !loading ? "pointer" : "not-allowed",
              marginTop: 12,
            }}
          >
            {loading ? "Verifying…" : "Verify"}
          </button>
        )}
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            style={{
              background: "none",
              border: "none",
              color: resendLoading ? "#71717a" : "#C8F55A",
              fontWeight: 700,
              fontSize: 12,
              cursor: resendLoading ? "wait" : "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            {resendLoading ? "Sending…" : "Resend code"}
          </button>
        </div>
      </div>
    </div>
  )
}
