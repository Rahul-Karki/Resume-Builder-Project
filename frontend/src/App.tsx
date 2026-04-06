import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import ForgotPassword from "./pages/ResetPassword"
import Home from "./pages/Home"
import Templates from "./pages/Templates"
import ResumeBuilder from "./pages/ResumeBuiler"

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
      </Routes>
    </BrowserRouter>
  )
}

export default App