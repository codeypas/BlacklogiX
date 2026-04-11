"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { UserRound } from "lucide-react";
import { twMerge } from "tailwind-merge";

export const Circle = ({
  className,
  idx,
  style,
}: {
  className?: string;
  idx: number;
  style?: React.CSSProperties;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: idx * 0.08, duration: 0.2 }}
      style={style}
      className={twMerge(
        "absolute inset-0 left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-neutral-200/20",
        className,
      )}
    />
  );
};

export const Radar = ({ className }: { className?: string }) => {
  const circles = new Array(8).fill(1);

  return (
    <div
      className={twMerge(
        "relative flex h-20 w-20 items-center justify-center rounded-full",
        className,
      )}
    >
      <style>{`
        @keyframes radar-spin {
          from { transform: rotate(20deg); }
          to { transform: rotate(380deg); }
        }

        .animate-radar-spin {
          animation: radar-spin 10s linear infinite;
        }
      `}</style>

      <div
        style={{ transformOrigin: "right center" }}
        className="animate-radar-spin absolute right-1/2 top-1/2 z-40 flex h-[5px] w-[400px] items-end justify-center overflow-hidden bg-transparent"
      >
        <div className="relative z-40 h-[1px] w-full bg-gradient-to-r from-transparent via-sky-500 to-transparent" />
      </div>

      {circles.map((_, idx) => (
        <Circle
          key={`circle-${idx}`}
          idx={idx}
          style={{
            height: `${(idx + 1) * 5}rem`,
            width: `${(idx + 1) * 5}rem`,
            border: `1px solid rgba(71, 85, 105, ${1 - (idx + 1) * 0.1})`,
          }}
        />
      ))}
    </div>
  );
};

interface IconContainerProps {
  icon?: React.ReactNode;
  text: string;
  subtitle?: string;
  delay?: number;
  active?: boolean;
  onClick?: () => void;
  avatarSrc?: string;
}

export const IconContainer = ({
  icon,
  text,
  subtitle,
  delay,
  active = false,
  onClick,
  avatarSrc,
}: IconContainerProps) => {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: delay ?? 0 }}
      onClick={onClick}
      className={twMerge(
        "theme-testimonial-card relative z-50 flex min-w-[132px] flex-col items-center justify-center space-y-2 rounded-2xl border px-3 py-3 text-center transition-all",
        active
          ? "border-sky-400/60 bg-slate-900 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
          : "border-slate-800 bg-slate-950/90 hover:border-slate-700 hover:bg-slate-900",
      )}
    >
      <div className="theme-testimonial-avatar flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-inner">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={text}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : icon ? (
          icon
        ) : (
          <UserRound className="h-7 w-7 text-slate-500" />
        )}
      </div>

      <div className="rounded-md px-2 py-1">
        <div className="theme-testimonial-name text-center text-xs font-bold text-slate-200">{text}</div>
        {subtitle ? <div className="theme-testimonial-role mt-1 text-[11px] text-slate-500">{subtitle}</div> : null}
      </div>
    </motion.button>
  );
};
