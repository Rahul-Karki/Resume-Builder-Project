import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

const GoogleAuthButton = () => {
  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        try {
          const res = await axios.post(
            "http://localhost:5000/api/auth/google-login",
            {
              token: credentialResponse.credential,
            },
            { withCredentials: true }
          );

          console.log(res.data);

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