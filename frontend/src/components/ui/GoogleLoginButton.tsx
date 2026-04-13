import { GoogleLogin } from "@react-oauth/google";
import { api } from "@/services/api";

interface GoogleAuthButtonProps {
  redirectTo?: string;
}

const GoogleAuthButton = ({ redirectTo = "/resumes" }: GoogleAuthButtonProps) => {
  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "100%" }}>
        <GoogleLogin
          text="signin"
          size="large"
          shape="rectangular"
          logo_alignment="center"
          onSuccess={async (credentialResponse) => {
            try {
              const res = await api.post("/auth/google-login", {
                token: credentialResponse.credential,
              });

              if (res.data?.accessToken) {
                localStorage.setItem("accessToken", res.data.accessToken);
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