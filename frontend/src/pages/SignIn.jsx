import { API_BASE_URL } from "../lib/api";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Heart, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function SignIn() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const handleSignIn = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/signin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Sign in failed");
        setLoading(false);
        return;
      }

      // Save login information
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      alert("Signed in successfully!");

      const destination = location.state?.from;
      navigate(typeof destination === "string" && /^\/(dashboard|events)(\?|$)/.test(destination) ? destination : "/", { replace: true });
    } catch (error) {
      console.error(error);
      setError("Unable to connect to the server");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
      <div className="absolute top-20 right-10 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="absolute bottom-10 left-10 w-64 h-64 rounded-full bg-accent/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>

          <h1 className="font-display text-3xl font-medium text-foreground mb-2">
            Welcome back
          </h1>

          <p className="text-muted-foreground text-sm">
            Sign in to continue your wellness journey
          </p>
        </div>

        <div className="bg-card rounded-3xl p-8 border border-border shadow-sm">
          <form
            onSubmit={handleSignIn}
            className="flex flex-col gap-5"
          >
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-input-background rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Password
              </label>

              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  className="w-full bg-input-background rounded-xl px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />

                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {show ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="text-right mt-1.5">
                <a
                  href="#"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-full font-medium hover:bg-primary/90 transition-all hover:-translate-y-px mt-1 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}

              {!loading && (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </form>

        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-primary font-medium hover:underline"
          >
            Get started free
          </Link>
        </p>
      </div>
    </div>
  );
}
