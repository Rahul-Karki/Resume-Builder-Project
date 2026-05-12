import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { GoogleOAuthProvider } from "@react-oauth/google"
import "./index.css"
import { bootstrapAuthSession } from "./services/api"
import { initializeClientErrorTracking } from "./lib/errorTracking"

const renderApp = () => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </GoogleOAuthProvider>
  )
}

renderApp()

initializeClientErrorTracking()

// Run auth bootstrap in the background so public routes render immediately.
void bootstrapAuthSession()

