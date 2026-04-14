import { GoogleLogin } from "@react-oauth/google";
import { api } from "@/services/api";

interface GoogleAuthButtonProps {
  redirectTo?: string;
}

const GoogleAuthButton = ({ redirectTo = "/resumes" }: GoogleAuthButtonProps) => {
  return (
    <div style={{ width: "100%", display: "grid", gap: 12 }}>
      {/* Divider */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
        <div style={{ height: 1, background: "rgba(200,245,90,0.15)" }} />
        <span style={{ color: "#666", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>or</span>
        <div style={{ height: 1, background: "rgba(200,245,90,0.15)" }} />
      </div>

      {/* Google Button Container */}
      <div style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        borderRadius: 12,
        padding: "2px 0",
      }}>
        <GoogleLogin
          type="standard"
          text="signin_with"
          size="large"
          shape="rectangular"
          width="320"
          logo_alignment="center"
          theme="filled_black"
          onSuccess={async (credentialResponse) => {
            try {
              const res = await api.post("/auth/google-login", {
                token: credentialResponse.credential,
              });

              if (res.status === 200) {
                localStorage.setItem("accessToken", "session");
              }

              window.location.href = redirectTo;
            } catch (err:any) {
              alert(err);
              console.error(err);
            }
          }}
          onError={() => {
            console.log("Login Failed");
          }}
        />
      </div>
    </div>
  );
};

export default GoogleAuthButton;