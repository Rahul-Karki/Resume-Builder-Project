import { StrictMode, useState, useEffect } from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { GoogleOAuthProvider } from "@react-oauth/google"
import "./index.css"
import { bootstrapAuthSession } from "./services/api"
import { initializeClientErrorTracking } from "./lib/errorTracking"

initializeClientErrorTracking()

function Root() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    bootstrapAuthSession().finally(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0A0A0A", color: "#888", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 24, height: 24, border: "2px solid #333", borderTopColor: "#C8F55A", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <StrictMode>
        <App />
      </StrictMode>
    </GoogleOAuthProvider>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />)

