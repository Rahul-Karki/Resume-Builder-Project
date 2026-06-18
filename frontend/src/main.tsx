import { StrictMode, useState, useEffect } from "react"
import ReactDOM from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import App from "./App"
import { GoogleOAuthProvider } from "@react-oauth/google"
import "./index.css"
import { bootstrapAuthSession } from "./services/api"
import { initializeClientErrorTracking } from "./lib/errorTracking"
import { initMetricsReporter } from "./lib/metricsReporter"
import { logger } from "./utils/logger"
import { queryClient } from "./lib/queryClient"

initializeClientErrorTracking()
initMetricsReporter()
logger.logUserAction("app_start", { url: location.href })

function AppLoading() {
  return (
    <div style={{display:"flex",minHeight:"100vh",alignItems:"center",justifyContent:"center",background:"#09090b"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
          <div style={{display:"flex",gap:4}}>
            {[0,0.15,0.3,0.45,0.6].map((d,i) => (
              <div key={i} style={{height:48,width:8,borderRadius:4,background:"#27272a",animation:"skeleton-pulse 1.5s ease-in-out infinite",animationDelay:`${d}s`}} />
            ))}
          </div>
          <p style={{color:"#52525b",fontSize:13,margin:0}}>Waking up server, one moment...</p>
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
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </StrictMode>
    </GoogleOAuthProvider>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />)

