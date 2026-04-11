import * as React from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Check,
  Sparkles,
} from "lucide-react";

import { navigateTo } from "@/lib/navigation";
import SiteFooter from "@/components/ui/SiteFooter";

interface PricingCardProps {
  planName: string;
  description: string;
  price: string;
  priceDescription: string;
  features: string[];
  icon: React.ReactNode;
  iconBgClass: string;
  isPopular: boolean;
  buttonText: string;
}

const plans: PricingCardProps[] = [
  {
    planName: "Pilot",
    description: "For first security evaluations",
    price: "$0",
    priceDescription: "trial",
    icon: <Sparkles className="h-6 w-6 text-emerald-400" />,
    iconBgClass: "from-emerald-500/20 to-teal-500/20",
    features: [
      "Ingest a small set of Windows and application logs",
      "Immutable hashes for every seeded event",
      "Baseline AI anomaly scoring",
      "Analyst dashboard with proof-of-integrity views",
    ],
    buttonText: "Start Pilot",
    isPopular: false,
  },
  {
    planName: "SOC Team",
    description: "For active detection and response teams",
    price: "$99",
    priceDescription: "/ month",
    icon: <BriefcaseBusiness className="h-6 w-6 text-blue-400" />,
    iconBgClass: "from-blue-500/20 to-cyan-500/20",
    features: [
      "Everything in Pilot",
      "Continuous ingestion across servers, networks, and apps",
      "AI detections for suspicious logins and malware patterns",
      "Collaborative investigations and priority support",
    ],
    buttonText: "Start Team Plan",
    isPopular: true,
  },
  {
    planName: "Enterprise",
    description: "For regulated and high-scale environments",
    price: "Custom",
    priceDescription: "pricing",
    icon: <Building2 className="h-6 w-6 text-purple-400" />,
    iconBgClass: "from-purple-500/20 to-indigo-500/20",
    features: [
      "Everything in SOC Team",
      "Private deployment and custom retention controls",
      "Dedicated success and incident response workflows",
      "Custom integrations for SIEM, SOAR, and compliance reporting",
    ],
    buttonText: "Contact Sales",
    isPopular: false,
  },
];

function PricingCard({
  planName,
  description,
  price,
  priceDescription,
  features,
  icon,
  iconBgClass,
  isPopular,
  buttonText,
}: PricingCardProps) {
  const cardStyle: React.CSSProperties = {
    width: "19rem",
    backgroundColor: "hsla(240, 15%, 9%, 1)",
    backgroundImage:
      "radial-gradient(at 88% 40%, hsla(240, 15%, 9%, 1) 0px, transparent 85%)," +
      " radial-gradient(at 49% 30%, hsla(240, 15%, 9%, 1) 0px, transparent 85%)," +
      " radial-gradient(at 14% 26%, hsla(240, 15%, 9%, 1) 0px, transparent 85%)," +
      " radial-gradient(at 0% 64%, hsla(263, 93%, 56%, 1) 0px, transparent 85%)," +
      " radial-gradient(at 41% 94%, hsla(284, 100%, 84%, 1) 0px, transparent 85%)," +
      " radial-gradient(at 100% 99%, hsla(306, 100%, 57%, 1) 0px, transparent 85%)",
    boxShadow: "0px -16px 24px 0px rgba(255, 255, 255, 0.25) inset",
  };

  const borderContainerStyle: React.CSSProperties = {
    overflow: "hidden",
    pointerEvents: "none",
    position: "absolute",
    zIndex: -10,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "calc(100% + 2px)",
    height: "calc(100% + 2px)",
    backgroundImage:
      "linear-gradient(0deg, hsl(0, 0%, 100%) -50%, hsl(0, 0%, 40%) 100%)",
    borderRadius: "1rem",
  };

  const rotatingBorderStyle: React.CSSProperties = {
    pointerEvents: "none",
    position: "fixed",
    zIndex: 200,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(0deg)",
    transformOrigin: "left",
    width: "200%",
    height: "10rem",
    backgroundImage:
      "linear-gradient(0deg, hsla(0, 0%, 100%, 0) 0%, hsl(277, 95%, 60%) 40%, hsl(277, 95%, 60%) 60%, hsla(0, 0%, 40%, 0) 100%)",
    animation: "pricing-rotate 8s linear infinite",
  };

  return (
    <div
      className="pricing-card group relative flex w-full max-w-[19rem] flex-col rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.04]"
      style={cardStyle}
    >
      <style>{`@keyframes pricing-rotate { to { transform: translate(-50%, -50%) rotate(360deg); } }`}</style>

      {isPopular ? (
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <span className="theme-pricing-badge rounded-full bg-purple-600 px-4 py-1 text-xs font-semibold text-white">
            MOST POPULAR
          </span>
        </div>
      ) : null}

      <div className="flex-grow">
        <div className="pricing-card-border" style={borderContainerStyle}>
          <div className="pricing-card-rotating-border" style={rotatingBorderStyle} />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-gradient-to-br ${iconBgClass}`}
            >
              {icon}
            </div>
            <div>
              <h3 className="theme-pricing-title text-xl font-medium tracking-tight text-white">
                {planName}
              </h3>
              <p className="theme-pricing-copy text-xs text-neutral-500">{description}</p>
            </div>
          </div>
          <div className="h-5 w-5 rounded-full border-2 border-white/30" />
        </div>

        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <span className="theme-pricing-title text-4xl font-semibold tracking-tight text-white">
              {price}
            </span>
            <span className="theme-pricing-copy text-sm text-neutral-400">{priceDescription}</span>
          </div>
          <p className="theme-pricing-copy mt-1 text-xs text-neutral-500">
            Guided onboarding available
          </p>
        </div>

        <ul className="theme-pricing-features space-y-3 text-sm text-neutral-300">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-500">
                <Check className="h-3 w-3 text-[#141421]" strokeWidth={3} />
              </div>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <button className="theme-primary-button h-12 w-full rounded-lg bg-white font-bold text-neutral-900 transition-colors hover:bg-neutral-200">
          {buttonText}
        </button>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <div className="theme-page min-h-screen w-full bg-neutral-950">
      <div className="px-6 py-8 md:px-10">
        <div className="mx-auto max-w-7xl">
          <a
            href="/"
            onClick={(event) => {
              event.preventDefault();
              navigateTo("/");
            }}
            className="theme-back-link inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </a>

          <div className="mb-16 mt-10 text-center">
            <h1 className="theme-page-title text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Pricing for tamper-proof security analytics
            </h1>
            <p className="theme-page-copy mt-4 text-lg text-neutral-400">
              Start with a pilot, then scale to full log integrity and AI-driven
              detection across your environment.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-8 lg:flex-row lg:items-stretch">
            {plans.map((plan) => (
              <PricingCard key={plan.planName} {...plan} />
            ))}
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
