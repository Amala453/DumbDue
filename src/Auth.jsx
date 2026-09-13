import { useEffect, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./Auth.css";

function Auth() {
  const [mode, setMode] = useState(
    window.location.pathname === "/signup"
      ? "signup"
      : "login"
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isLogin = mode === "login";

  useEffect(() => {
    function handlePathChange() {
      setMode(
        window.location.pathname === "/signup"
          ? "signup"
          : "login"
      );
    }

    window.addEventListener(
      "popstate",
      handlePathChange
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePathChange
      );
    };
  }, []);

  function switchMode(nextMode) {
    setMode(nextMode);

    window.history.pushState(
      {},
      "",
      nextMode === "signup"
        ? "/signup"
        : "/login"
    );

    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (
      !isLogin &&
      password !== confirmPassword
    ) {
      setError(
        "Your passwords do not match."
      );
      return;
    }

    if (
      !isLogin &&
      password.length < 6
    ) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const {
          error: signInError,
        } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

        if (signInError) {
          throw signInError;
        }

      } else {
        const {
          data,
          error: signUpError,
        } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              emailRedirectTo:
                window.location.origin,
            },
          });

        if (signUpError) {
          throw signUpError;
        }

        if (!data.session) {
          setMessage(
            "Account created. Check your email to confirm your account, then log in."
          );

          switchMode("login");
          setPassword("");
          setConfirmPassword("");
        }
      }
    } catch (err) {
      setError(
        err?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setMessage("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      setError(
        "Enter your email first so we can send the reset link."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        error: resetError,
      } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo:
              `${window.location.origin}/login`,
          }
        );

      if (resetError) {
        throw resetError;
      }

      setMessage(
        "If that email is registered, a password reset link has been sent."
      );
    } catch (err) {
      setError(
        err?.message ||
          "Unable to send the reset email."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">

      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />

      <div className="auth-shell">

        <div className="auth-brand">

          <div className="auth-brand-mark">
            D
          </div>

          <div>
            <div className="auth-brand-name">
              DumbDue
            </div>

            <div className="auth-brand-subtitle">
              subscription tracker
            </div>
          </div>

        </div>

        <div className="auth-card">

          <div className="auth-card-header">

            <span className="section-kicker">
              {isLogin
                ? "WELCOME BACK"
                : "GET STARTED"}
            </span>

            <h1>
              {isLogin
                ? "Your subscriptions, under control."
                : "Create your DumbDue account."}
            </h1>

            <p>
              {isLogin
                ? "Sign in to continue managing your recurring payments."
                : "Keep your subscriptions synced as DumbDue grows with you."}
            </p>

          </div>

          <div className="auth-tabs">

            <button
              type="button"
              className={
                isLogin
                  ? "active"
                  : ""
              }
              onClick={() =>
                switchMode("login")
              }
            >
              Log in
            </button>

            <button
              type="button"
              className={
                !isLogin
                  ? "active"
                  : ""
              }
              onClick={() =>
                switchMode("signup")
              }
            >
              Sign up
            </button>

          </div>

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >

            <label className="auth-field">

              <span>
                Email
              </span>

              <div className="auth-input-wrap">

                <Mail size={18} />

                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                />

              </div>

            </label>

            <label className="auth-field">

              <span>
                Password
              </span>

              <div className="auth-input-wrap">

                <LockKeyhole
                  size={18}
                />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete={
                    isLogin
                      ? "current-password"
                      : "new-password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                />

                <button
                  type="button"
                  className="auth-eye"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>

            </label>

            {!isLogin && (
              <label className="auth-field">

                <span>
                  Confirm password
                </span>

                <div className="auth-input-wrap">

                  <LockKeyhole
                    size={18}
                  />

                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    placeholder="Enter it again"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value
                      )
                    }
                  />

                  <button
                    type="button"
                    className="auth-eye"
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) =>
                          !current
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>

              </label>
            )}

            {isLogin && (
              <div className="auth-forgot-row">

                <button
                  type="button"
                  className="auth-link"
                  onClick={
                    handleForgotPassword
                  }
                  disabled={loading}
                >
                  Forgot password?
                </button>

              </div>
            )}

            {error && (
              <div className="auth-message auth-message-error">
                {error}
              </div>
            )}

            {message && (
              <div className="auth-message auth-message-success">
                {message}
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >

              {loading
                ? "Please wait..."
                : isLogin
                ? "Log in"
                : "Create account"}

              {!loading && (
                <ArrowRight size={18} />
              )}

            </button>

          </form>

          <p className="auth-footer">

            {isLogin
              ? "New to DumbDue?"
              : "Already have an account?"}

            {" "}

            <button
              type="button"
              className="auth-link"
              onClick={() =>
                switchMode(
                  isLogin
                    ? "signup"
                    : "login"
                )
              }
            >
              {isLogin
                ? "Create an account"
                : "Log in"}
            </button>

          </p>

        </div>
      </div>

    </div>
  );
}

export default Auth;