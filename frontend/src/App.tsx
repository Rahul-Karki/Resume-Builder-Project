import { BrowserRouter, Routes, Route } from "react-router-dom"
import { lazy, Suspense } from "react"
import { RequireRole } from "./components/auth/RequireRole"
import { ErrorBoundary } from "./components/ErrorBoundary"

// Lazy-loaded route components — loaded only when navigated to
const Login = lazy(() => import("./pages/Login"))
const Signup = lazy(() => import("./pages/Signup"))
const ForgotPassword = lazy(() => import("./pages/ResetPassword"))
const Home = lazy(() => import("./pages/Home"))
const Templates = lazy(() => import("./pages/Templates"))
const ResumeBuilder = lazy(() => import("./pages/ResumeBuilder"))
const MyResumePage = lazy(() => import("./pages/MyResumePage"))
const AdminLayout = lazy(() => import("./pages/AdminLayout"))
const AdminDashboard = lazy(() => import("./pages/AdminDashboard").then(m => ({ default: m.AdminDashboard })))
const AdminTemplates = lazy(() => import("./pages/AdminTemplates").then(m => ({ default: m.AdminTemplates })))
const Unauthorized = lazy(() => import("./pages/Unauthorized"))
const NotFound = lazy(() => import("./pages/NotFound"))

const PageLoading = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0A0A0A", color: "#888", fontFamily: "sans-serif" }}>
    Loading...
  </div>
)

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error("App-level error:", error, errorInfo);
      }}
    >
      <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ForgotPassword />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/builder" element={<ResumeBuilder />} />
            <Route path="/resumes" element={<MyResumePage />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route
              path="/admin"
              element={
                <RequireRole allowedRoles={["admin"]}>
                  <AdminLayout />
                </RequireRole>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="templates" element={<AdminTemplates />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
