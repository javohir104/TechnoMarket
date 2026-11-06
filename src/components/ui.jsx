import { useEffect, useRef, useState } from "react";

export const btn =
  "rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer inline-flex items-center justify-center gap-2 select-none";

export const btnPrimary =
  "rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 hover:from-blue-700 hover:to-indigo-800 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer inline-flex items-center justify-center gap-2 select-none";

export const input =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100/80 shadow-2xs";

export function Field({ label, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1.5 text-xs font-bold text-slate-700 ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

// Native <dialog> wrapper with soft backdrop and scroll support
export function Modal({ open, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto my-auto w-full sm:w-[min(520px,92vw)] max-h-[95vh] sm:max-h-[90vh] rounded-3xl p-0 shadow-2xl border border-slate-100 bg-white overflow-hidden backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm outline-none transition-all"
    >
      <div className="max-h-[90vh] overflow-y-auto overscroll-contain">
        {open && children}
      </div>
    </dialog>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-2xl backdrop-blur-xl bg-slate-900/90 px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-2xl shadow-slate-950/30 border border-slate-700/60 flex items-center gap-2.5 animate-bounce-short"
    >
      <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
      <span>{message}</span>
    </div>
  );
}

// Rasm yo'q yoki yuklanmasa — kategoriya bo'yicha mos gadjet belgisi ko'rsatiladi
export function PhoneImage({ src, alt, category, className = "" }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  const ok = typeof src === "string" && /^https?:\/\//i.test(src.trim()) && !failed;
  if (!ok) {
    const icon =
      category === "laptop"
        ? "💻"
        : category === "keyboard"
        ? "⌨️"
        : category === "mouse"
        ? "🖱️"
        : category === "accessory"
        ? "🎧"
        : "📱";

    return (
      <div
        role="img"
        aria-label={alt}
        className={`grid place-items-center bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/40 text-4xl sm:text-5xl select-none h-full w-full rounded-2xl ${className}`}
      >
        <span className="drop-shadow-sm transition-transform duration-300 group-hover:scale-110">{icon}</span>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-2">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 animate-pulse rounded-2xl">
          <span className="text-xs text-slate-400 font-bold">TechnoMarket</span>
        </div>
      )}
      <img
        src={src.trim()}
        alt={alt || "Mahsulot rasmi"}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`max-h-full max-w-full object-contain drop-shadow-sm transition-all duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${className}`}
      />
    </div>
  );
}
