import { ResetPasswordForm } from "@/components/resetPassword-form"

export default function Page() {
  return (
    <div style={{ minHeight: "100svh", width: "100%", background: "radial-gradient(circle at top, rgba(200,245,90,0.08), transparent 24%), #09090b", color: "#fafafa", display: "grid", placeItems: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 380, border: "1px solid #3f3f46", borderRadius: 28, padding: 24, background: "rgba(11,11,11,0.96)", boxShadow: "0 30px 100px rgba(0,0,0,0.45)" }}>
        <ResetPasswordForm />
      </div>
    </div>
  )
}

