import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import ForgotPassword from "./pages/ResetPassword"
import Home from "./pages/Home"
import Templates from "./pages/Templates"
import ResumeBuilder from "./pages/ResumeBuiler"
import MyResumePage from "./pages/MyResumePage"
import { RequireRole } from "./components/auth/RequireRole"
import AdminLayout from "./pages/AdminLayout"
import AdminDashboard from "./pages/AdminDashboard"
import AdminTemplates from "./pages/AdminTemplates"
import Unauthorized from "./pages/Unauthorized"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ForgotPassword />} />
        <Route path ="/templates" element={<Templates />} />
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
      </Routes>
    </BrowserRouter>
  )
}

export default App