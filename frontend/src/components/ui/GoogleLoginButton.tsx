import { GoogleLogin } from "@react-oauth/google";
import { api } from "@/services/api";

const GoogleAuthButton = () => {
  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        try {
          const res = await api.post("/auth/google-login", {
            token: credentialResponse.credential,
          });

          if (res.data?.accessToken) {
            localStorage.setItem("accessToken", res.data.accessToken);
          }

          // redirect after login
          window.location.href = "/";
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