import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { api } from "@/services/api"

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No verification token provided.")
      return
    }

    const verify = async () => {
      try {
        const res = await api.post("/auth/verify-email", { token })
        if (res.status === 200) {
          setStatus("success")
          setMessage(res.data?.message || "Email verified successfully!")
        }
      } catch (err: any) {
        setStatus("error")
        setMessage(err.response?.data?.message || "Verification failed. The link may be invalid or expired.")
      }
    }

    verify()
  }, [token])

  return (
    <div style={{ minHeight: "100svh", width: "100%", background: "radial-gradient(circle at top, rgba(200,245,90,0.08), transparent 24%), #09090b", color: "#fafafa", display: "grid", placeItems: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420, border: "1px solid #3f3f46", borderRadius: 28, padding: 32, background: "rgba(11,11,11,0.96)", boxShadow: "0 30px 100px rgba(0,0,0,0.45)", textAlign: "center" }}>
        {status === "verifying" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 300, color: "#F0EFE8", margin: "0 0 8px" }}>Verifying your email...</h1>
            <p style={{ color: "#a1a1aa", fontSize: 13 }}>Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 300, color: "#F0EFE8", margin: "0 0 8px" }}>Email Verified!</h1>
            <p style={{ color: "#86EFAC", fontSize: 13, margin: "0 0 20px" }}>{message}</p>
            <Link to="/login" style={{ display: "inline-block", color: "#C8F55A", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
              Go to Sign In
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>❌</div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 300, color: "#F0EFE8", margin: "0 0 8px" }}>Verification Failed</h1>
            <p style={{ color: "#FCA5A5", fontSize: 13, margin: "0 0 20px" }}>{message}</p>
            <Link to="/login" style={{ color: "#C8F55A", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
              Go to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  )
}