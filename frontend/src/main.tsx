import { StrictMode, useState, useEffect } from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { GoogleOAuthProvider } from "@react-oauth/google"
import "./index.css"
import { bootstrapAuthSession } from "./services/api"
import { initializeClientErrorTracking } from "./lib/errorTracking"

initializeClientErrorTracking()

function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-12 w-2 rounded-full bg-zinc-700"
              style={{
                animation: "skeleton-pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function Root() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    bootstrapAuthSession().finally(() => setReady(true))
  }, [])

  if (!ready) {
    return <AppLoading />
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

