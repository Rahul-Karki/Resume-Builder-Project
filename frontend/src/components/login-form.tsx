import { useState } from "react"
import { cn } from "@/lib/utils"
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
import axios from "axios"
import GoogleAuthButton from "./ui/GoogleLoginButton"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {

  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [timer, setTimer] = useState(0)
  const [password, setPassword] = useState("")
  

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!email || !password) {
    setMessage("Please enter email and password")
    return
  }

  try {
    setLoading(true)

    const res = await axios.post("http://localhost:5000/api/auth/login", {
      email,
      password,
    })

    setMessage("Login successful")

    // 🔥 redirect to home
    window.location.href = "/"

  } catch (err: any) {
    setMessage(err.response?.data?.message || "Invalid credentials")
  } finally {
    setLoading(false)
  }
}

  // ⏱ Timer Logic
  const startTimer = () => {
    setTimer(60)
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // 📩 Forgot Password Click
  const handleForgotPassword = async () => {
    if (!email) {
      setMessage("Please enter your email first")
      return
    }

    try {
      setLoading(true)

      await axios.post("http://localhost:5000/api/auth/forgot-password", {
        email,
      })

      setMessage("Check your email for reset link")
      startTimer()

    } catch (err:any) {
      setMessage(err.response?.data?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/google";
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin}>
            <FieldGroup>

              {/* EMAIL */}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              {/* PASSWORD */}
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>

                  {/* 🔥 UPDATED BUTTON */}
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading || timer > 0}
                    className="ml-auto text-sm text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {timer > 0
                      ? `Resend in ${timer}s`
                      : "Forgot your password?"}
                  </button>

                </div>

                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>

              {/* MESSAGE */}
              {message && (
                <p className="text-sm text-green-600 text-center">
                  {message}
                </p>
              )}

              {/* BUTTONS */}
              <Field>
                <Button type="submit">Login</Button>

                <GoogleAuthButton />

                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="/signup">Sign up</a>
                </FieldDescription>
              </Field>

            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}