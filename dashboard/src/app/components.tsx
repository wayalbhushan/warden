"use client";

import { useEffect, useRef } from "react";

/* ── HoverRow ── */
export function HoverRow({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const enter = () => { el.style.backgroundColor = "#1c1c1f"; };
    const leave = () => { el.style.backgroundColor = ""; };
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
    };
  }, []);

  return (
    <div ref={ref} className={className} style={{ transition: "background-color 150ms", ...style }}>
      {children}
    </div>
  );
}

/* ── NavLink ── */
export function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || active) return;
    const enter = () => {
      el.style.backgroundColor = "#18181b";
      el.style.color = "#f4f4f5";
    };
    const leave = () => {
      el.style.backgroundColor = "transparent";
      el.style.color = "#a1a1aa";
    };
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
    };
  }, [active]);

  return (
    <a
      ref={ref}
      href={href}
      className="flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium mb-0.5"
      style={{
        backgroundColor: active ? "#27272a" : "transparent",
        color: active ? "#f4f4f5" : "#a1a1aa",
        transition: "background-color 150ms, color 150ms",
        textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}
