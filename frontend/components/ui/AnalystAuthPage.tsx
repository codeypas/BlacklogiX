"use client";

import * as React from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Fingerprint,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { setSession } from "@/lib/auth";
import { navigateTo } from "@/lib/navigation";
import SiteFooter from "@/components/ui/SiteFooter";

type AuthMode = "login" | "register";

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            ux_mode?: "popup" | "redirect";
            context?: "signin" | "signup" | "use";
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              type?: "standard" | "icon";
              shape?: "rectangular" | "pill" | "circle" | "square";
              text?:
                | "signin_with"
                | "signup_with"
                | "continue_with"
                | "signin"
                | "signup";
              width?: number;
              logo_alignment?: "left" | "center";
            },
          ) => void;
        };
      };
    };
    __blacklogixGoogleClientId?: string;
    __blacklogixGoogleCallback?: (response: GoogleCredentialResponse) => void;
  }
}

const authCopy = {
  login: {
    title: "Analyst login",
    description:
      "Sign in with your work email and password, or use Google to access your analytics dashboard.",
    buttonLabel: "Login",
    prompt: "Need an account?",
    actionLabel: "Register below",
    actionPath: "/register",
    helperTitle: "Login with Google",
    helperDescription: "Use your Google account for faster access.",
    fields: [
      {
        name: "email",
        label: "Work email",
        placeholder: "analyst@blocklogix.dev",
        type: "email",
        icon: <Mail size={16} />,
      },
      {
        name: "password",
        label: "Password",
        placeholder: "Enter your password",
        type: "password",
        icon: <Lock size={16} />,
      },
    ],
  },
  register: {
    title: "Create analyst account",
    description:
      "Create your analyst account with your details below, or use Google for faster access.",
    buttonLabel: "Register",
    prompt: "Already registered?",
    actionLabel: "Login instead",
    actionPath: "/analyst-login",
    helperTitle: "Register with Google",
    helperDescription: "Use your Google account to create your analyst account faster.",
    fields: [
      {
        name: "name",
        label: "Full name",
        placeholder: "Ava Thompson",
        type: "text",
        icon: <UserRound size={16} />,
      },
      {
        name: "email",
        label: "Work email",
        placeholder: "ava@northstarsecurity.com",
        type: "email",
        icon: <Mail size={16} />,
      },
      {
        name: "organization",
        label: "Organization",
        placeholder: "Northstar Financial",
        type: "text",
        icon: <ShieldCheck size={16} />,
      },
      {
        name: "password",
        label: "Password",
        placeholder: "Create a password",
        type: "password",
        icon: <Lock size={16} />,
      },
    ],
  },
} satisfies Record<
  AuthMode,
  {
    title: string;
    description: string;
    buttonLabel: string;
    prompt: string;
    actionLabel: string;
    actionPath: string;
    helperTitle: string;
    helperDescription: string;
    fields: Array<{
      name: "name" | "email" | "organization" | "password";
      label: string;
      placeholder: string;
      type: string;
      icon: React.ReactNode;
    }>;
  }
>;

const valueCards = [
  {
    title: "Immutable evidence trail",
    description:
      "Every ingested event is hashed and preserved so analysts can trust the original record during investigations.",
    icon: <Fingerprint size={20} />,
  },
  {
    title: "AI anomaly detection",
    description:
      "Suspicious logins, malware indicators, and data egress patterns are surfaced automatically with confidence scoring.",
    icon: <ShieldAlert size={20} />,
  },
  {
    title: "Analyst-first workflows",
    description:
      "Move from alert triage to raw log context to ledger verification without losing investigation continuity.",
    icon: <CheckCircle2 size={20} />,
  },
  {
    title: "Executive-ready proof",
    description:
      "Show compliance, audit, and security leaders the exact evidence chain behind every finding.",
    icon: <ShieldCheck size={20} />,
  },
];

function ValueCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="theme-card-surface rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,#0b1015_0%,#090d12_100%)] p-5">
      <div className="flex items-start gap-4">
        <div className="theme-surface-muted rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sky-300">
          {icon}
        </div>
        <div>
          <h3 className="theme-section-title text-lg font-semibold text-white">{title}</h3>
          <p className="theme-section-copy mt-1 text-sm leading-6 text-zinc-400">{description}</p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  placeholder,
  type,
  icon,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  type: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="theme-input-label mb-2 block text-sm font-medium">{label}</span>
      <div className="theme-input-surface flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-zinc-400">
        {icon}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="theme-input-control text-sm"
        />
      </div>
    </label>
  );
}

export default function AnalystAuthPage({ initialMode }: { initialMode: AuthMode }) {
  const mode = authCopy[initialMode];
  const googleButtonRef = React.useRef<HTMLDivElement | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [formValues, setFormValues] = React.useState({
    name: "",
    email: "",
    organization: "",
    password: "",
  });
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
  const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

  const validateForm = React.useCallback(() => {
    const email = formValues.email.trim();
    const password = formValues.password.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (initialMode === "register" && !formValues.name.trim()) {
      return "Please enter your full name.";
    }

    if (!email) {
      return "Please enter your email address.";
    }

    if (!emailPattern.test(email)) {
      return "Please enter a valid email address.";
    }

    if (initialMode === "register" && !formValues.organization.trim()) {
      return "Please enter your organization name.";
    }

    if (!password) {
      return "Please enter your password.";
    }

    if (initialMode === "register" && password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    return null;
  }, [formValues, initialMode]);

  const updateField = React.useCallback(
    (field: "name" | "email" | "organization" | "password", value: string) => {
      setFormValues((current) => ({ ...current, [field]: value }));
      setError(null);
    },
    [],
  );

  const handlePasswordAuth = React.useCallback(async () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = initialMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body =
        initialMode === "register"
          ? {
              name: formValues.name,
              email: formValues.email,
              organization: formValues.organization,
              password: formValues.password,
            }
          : {
              email: formValues.email,
              password: formValues.password,
            };

      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as {
        token?: string;
        analyst?: {
          id: string;
          name: string;
          email: string;
          organization: string;
          avatarUrl?: string | null;
          authProvider?: string;
        };
        message?: string;
      };

      if (!response.ok || !payload.token || !payload.analyst) {
        throw new Error(payload.message ?? `Unable to ${initialMode}`);
      }

      setSession(payload.token, payload.analyst);
      navigateTo("/dashboard");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : `Unable to ${initialMode}`);
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, formValues, initialMode, validateForm]);

  const handleGoogleCredential = React.useCallback(
    async (credential: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/google`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ credential }),
        });

        const payload = (await response.json()) as {
          token?: string;
          analyst?: {
            id: string;
            name: string;
            email: string;
            organization: string;
            avatarUrl?: string | null;
            authProvider?: string;
          };
          message?: string;
        };

        if (!response.ok || !payload.token || !payload.analyst) {
          throw new Error(payload.message ?? "Unable to complete Google sign-in");
        }

        setSession(payload.token, payload.analyst);
        navigateTo("/dashboard");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to complete Google sign-in",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [apiBaseUrl],
  );

  React.useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return;
    }

    const initializeGoogle = () => {
      if (!window.google || !googleButtonRef.current) {
        return;
      }

      googleButtonRef.current.innerHTML = "";
      window.__blacklogixGoogleCallback = (response) => {
        if (!response.credential) {
          setError("Google did not return a credential");
          return;
        }

        void handleGoogleCredential(response.credential);
      };

      if (window.__blacklogixGoogleClientId !== googleClientId) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => window.__blacklogixGoogleCallback?.(response),
          ux_mode: "popup",
          context: initialMode === "register" ? "signup" : "signin",
        });
        window.__blacklogixGoogleClientId = googleClientId;
      }

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        shape: "pill",
        text: initialMode === "register" ? "signup_with" : "signin_with",
        width: 340,
        logo_alignment: "left",
      });
    };

    if (window.google) {
      initializeGoogle();
      return;
    }

    const existingScript = document.getElementById("google-identity-script");

    if (existingScript) {
      existingScript.addEventListener("load", initializeGoogle);
      return () => existingScript.removeEventListener("load", initializeGoogle);
    }

    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", initializeGoogle);
    document.body.appendChild(script);

    return () => script.removeEventListener("load", initializeGoogle);
  }, [googleClientId, handleGoogleCredential, initialMode]);

  return (
    <div className="theme-page min-h-screen bg-[#030507] text-white">
      <div className="px-5 py-8 md:px-8">
        <div className="mx-auto max-w-[1480px]">
          <button
            type="button"
            onClick={() => navigateTo("/")}
            className="theme-back-link inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition-colors hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to home
          </button>

          <div className="mt-10 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="theme-panel rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,#081018_0%,#05080d_100%)] p-6 md:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/15 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                <ShieldCheck size={14} />
                Analyst Access
              </div>

              <h1 className="theme-page-title mt-5 text-3xl font-semibold tracking-[-0.05em] text-white">
                {mode.title}
              </h1>
              <p className="theme-page-copy mt-3 text-sm leading-6 text-zinc-400">
                {mode.description}
              </p>

              <div className="mt-6 space-y-4">
                {mode.fields.map((field) => (
                  <Field
                    key={field.name}
                    label={field.label}
                    placeholder={field.placeholder}
                    type={field.type}
                    icon={field.icon}
                    value={formValues[field.name]}
                    onChange={(value) => updateField(field.name, value)}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => void handlePasswordAuth()}
                className="theme-primary-button mt-6 w-full rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLoading}
              >
                {isLoading ? "Please wait..." : mode.buttonLabel}
              </button>

              <div className="mt-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  or continue with
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="theme-input-surface mt-6 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                <h2 className="theme-section-title text-base font-semibold text-white">
                  {mode.helperTitle}
                </h2>
                <p className="theme-section-copy mt-2 text-sm leading-6 text-zinc-400">
                  {mode.helperDescription}
                </p>

                <div className="mt-5 min-h-[44px]">
                  {googleClientId ? (
                    <div ref={googleButtonRef} className={isLoading ? "pointer-events-none opacity-70" : ""} />
                  ) : (
                    <div className="theme-card-surface rounded-2xl border border-dashed border-white/12 px-4 py-3 text-sm text-zinc-400">
                      Add <code>VITE_GOOGLE_CLIENT_ID</code> to <code>frontend/.env</code> to
                      enable Google sign-in.
                    </div>
                  )}
                </div>

                {isLoading ? (
                  <p className="theme-page-copy mt-3 text-sm text-zinc-400">
                    Verifying your Google account and opening your dashboard...
                  </p>
                ) : null}

                {error ? (
                  <p className="mt-3 text-sm text-rose-400">{error}</p>
                ) : null}
              </div>

              <p className="theme-page-copy mt-4 text-sm text-zinc-500">
                {mode.prompt}{" "}
                <button
                  type="button"
                  onClick={() => navigateTo(mode.actionPath)}
                  className="theme-link-accent font-medium"
                >
                  {mode.actionLabel}
                </button>
              </p>
            </div>

            <div className="space-y-6">
              <div className="theme-panel rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,#081018_0%,#05080d_100%)] p-6 md:p-8">
                <h2 className="theme-section-title text-2xl font-semibold tracking-[-0.04em] text-white">
                  What analysts get after sign-in
                </h2>
                <p className="theme-section-copy mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                  BlockLogix gives your team one place to review alerts, inspect raw
                  evidence, and prove that critical logs have not been altered.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {valueCards.map((card) => (
                  <ValueCard key={card.title} {...card} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
