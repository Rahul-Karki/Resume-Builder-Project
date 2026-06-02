import { BrowserRouter, Routes, Route } from "react-router-dom"
import { lazy, Suspense } from "react"
import { RequireRole } from "./components/auth/RequireRole"
import { ProtectedRoute } from "./components/auth/ProtectedRoute"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { PageSkeleton } from "./components/Skeleton"

// Lazy-loaded route components — loaded only when navigated to
const Login = lazy(() => import("./pages/Login"))
const Signup = lazy(() => import("./pages/Signup"))
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"))
const ForgotPassword = lazy(() => import("./pages/ResetPassword"))
const Home = lazy(() => import("./pages/Home"))
const Templates = lazy(() => import("./pages/Templates"))
const ResumeExportPage = lazy(() => import("./pages/ResumeExportPage"))
const ResumeBuilder = lazy(() => import("./pages/ResumeBuilder"))
const MyResumePage = lazy(() => import("./pages/MyResumePage"))
const AdminLayout = lazy(() => import("./pages/AdminLayout"))
const AdminDashboard = lazy(() => import("./pages/AdminDashboard").then(m => ({ default: m.AdminDashboard })))
const AdminTemplates = lazy(() => import("./pages/AdminTemplates").then(m => ({ default: m.AdminTemplates })))
const Unauthorized = lazy(() => import("./pages/Unauthorized"))
const NotFound = lazy(() => import("./pages/NotFound"))

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error("App-level error:", error, errorInfo);
      }}
    >
      <BrowserRouter>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ForgotPassword />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/resume/export/:jobId" element={<ResumeExportPage />} />
            <Route path="/builder" element={<ProtectedRoute><ResumeBuilder /></ProtectedRoute>} />
            <Route path="/resumes" element={<ProtectedRoute><MyResumePage /></ProtectedRoute>} />
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
              <Route path="analytics" element={<AdminDashboard />} />
              <Route path="system" element={<AdminDashboard />} />
              <Route path="security" element={<AdminDashboard />} />
              <Route path="activity" element={<AdminDashboard />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
