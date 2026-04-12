import { GoogleLogin } from "@react-oauth/google";
import { api } from "@/services/api";

interface GoogleAuthButtonProps {
  redirectTo?: string;
}

const GoogleAuthButton = ({ redirectTo = "/resumes" }: GoogleAuthButtonProps) => {
  return (
    <GoogleLogin
      shape="pill"
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
  );
};

export default GoogleAuthButton;