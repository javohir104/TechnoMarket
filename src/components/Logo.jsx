export default function Logo({
  onClick,
  showTagline = true,
  tagline,
  className = "",
  size = "md",
  iconOnly = false,
}) {
  const sizeClasses = {
    sm: "h-9 w-9",
    md: "h-10 w-10 sm:h-11 sm:w-11",
    lg: "h-12 w-12 sm:h-14 sm:w-14",
  };

  const textClasses = {
    sm: "text-lg",
    md: "text-xl sm:text-2xl",
    lg: "text-2xl sm:text-3xl",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-2.5 sm:gap-3 text-left cursor-pointer select-none transition-transform duration-200 active:scale-[0.98] ${className}`}
      aria-label="Techno Market bosh sahifa"
    >
      {/* Brand Icon: TM Official Badge with glow & polish */}
      <div
        className={`relative ${
          sizeClasses[size] || sizeClasses.md
        } shrink-0 rounded-2xl p-0.5 bg-gradient-to-br from-blue-500/30 to-indigo-600/30 shadow-md shadow-blue-500/20 group-hover:shadow-lg group-hover:shadow-blue-500/35 transition-all duration-300 group-hover:scale-105`}
      >
        <img
          src="/images/tm-logo.png"
          alt="TechnoMarket TM Logo"
          className="h-full w-full rounded-[14px] object-contain select-none"
          loading="eager"
        />

        {/* Soft glowing status pill */}
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-500 ring-2 ring-white"></span>
        </span>
      </div>

      {/* Typography */}
      {!iconOnly && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`${
                textClasses[size] || textClasses.md
              } font-black tracking-tight text-slate-900 group-hover:text-blue-950 transition-colors`}
            >
              Techno
            </span>
            <span
              className={`${
                textClasses[size] || textClasses.md
              } font-black tracking-tight bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 bg-clip-text text-transparent`}
            >
              Market
            </span>
            <span className="hidden sm:inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-100 shadow-2xs">
              Tech Store
            </span>
          </div>
          {showTagline && (
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider uppercase mt-1">
              {tagline || "TEXNOLOGIYA SIZ UCHUN"}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
