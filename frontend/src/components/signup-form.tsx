import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import React from "react"
import { useNavigate } from "react-router-dom"
import GoogleAuthButton from "./ui/GoogleLoginButton"
import { api } from "@/services/api"

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [name, setName] = React.useState("")
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const navigate = useNavigate()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loading) return

    setError("")
    setSuccess("")

    // ✅ Validation
    if (!email || !password || !confirmPassword || !name) {
      setError("Please fill in all fields")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords must match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    try {
      setLoading(true)

      const res = await api.post("/auth/signup", {
        name,
        email,
        password,
      })

      if (res.data?.accessToken) {
        localStorage.setItem("accessToken", res.data.accessToken)
      }

      // ✅ Success
      setSuccess("Account created successfully! Redirecting...")

      setTimeout(() => {
        navigate("/") // change to "/login" if needed
      }, 1500)

    } catch (err: any) {
      // ✅ Proper error handling
      if (err.response) {
        setError(err.response.data?.message || "Signup failed")
      } else if (err.request) {
        setError("Server not responding")
      } else {
        setError("Something went wrong")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/google";
  };

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSignup}>
          <FieldGroup>

            {/* Name */}
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            {/* Email */}
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <FieldDescription>
                We&apos;ll use this to contact you.
              </FieldDescription>
            </Field>

            {/* Password */}
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>

            {/* Confirm Password */}
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </Field>

            {/* Error Message */}
            {error && (
              <p className="text-red-500 text-sm text-center">
                {error}
              </p>
            )}

            {/* Success Message */}
            {success && (
              <p className="text-green-600 text-sm text-center">
                {success}
              </p>
            )}

            {/* Buttons */}
            <Field>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>

              <GoogleAuthButton/>

              <FieldDescription className="px-6 text-center">
                Already have an account?{" "}
                <a href="/login">Sign in</a>
              </FieldDescription>
            </Field>

          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}