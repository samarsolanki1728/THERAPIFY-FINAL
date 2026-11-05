import { API_BASE_URL } from "../lib/api";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Heart, ArrowRight, CheckCircle } from "lucide-react";

const goals = [
  "Manage stress & anxiety",
  "Process grief or loss",
  "Improve sleep",
  "Build emotional resilience",
  "Daily reflection & journaling",
  "Just exploring",
];

export default function Register() {
  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const toggle = (goal) => {
    setSelected((prev) =>
      prev.includes(goal)
        ? prev.filter((item) => item !== goal)
        : [...prev, goal]
    );
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
            role: "client",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed");
        setLoading(false);
        return;
      }

      alert("Account created successfully!");

      navigate("/signin");
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
            Begin your journey
          </h1>

          <p className="text-muted-foreground text-sm">
            Free to start, no credit card needed
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step ? "w-8 bg-primary" : "w-4 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="bg-card rounded-3xl p-8 border border-border shadow-sm">
          {step === 1 ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();

                if (!name || !email || !password) {
                  setError("Please fill in all fields");
                  return;
                }

                if (password.length < 8) {
                  setError("Password must be at least 8 characters");
                  return;
                }

                setError("");
                setStep(2);
              }}
              className="flex flex-col gap-5"
            >
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Your name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What should we call you?"
                  className="w-full bg-input-background rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-input-background rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-input-background rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-full font-medium hover:bg-primary/90 transition-all hover:-translate-y-px mt-1"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="font-display text-lg font-medium text-foreground mb-1">
                  What brings you here?
                </h3>

                <p className="text-sm text-muted-foreground mb-4">
                  Select all that apply — this helps us personalise your
                  experience.
                </p>

                <div className="flex flex-wrap gap-2">
                  {goals.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => toggle(goal)}
                      className={`text-sm px-3.5 py-2 rounded-full border transition-all ${
                        selected.includes(goal)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-foreground hover:border-primary/40"
                      }`}
                    >
                      {selected.includes(goal) && (
                        <CheckCircle className="w-3 h-3 inline mr-1.5" />
                      )}

                      {goal}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleRegister}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-full font-medium hover:bg-primary/90 transition-all hover:-translate-y-px mt-2 disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create my account"}

                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                ← Back
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link
            to="/signin"
            className="text-primary font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground mt-3">
          By continuing you agree to our{" "}
          <Link to="/terms" className="hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}