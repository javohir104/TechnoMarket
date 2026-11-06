// 1 … 4 5 6 … 20 ko'rinishidagi sahifa raqamlari
function pageList(current, total) {
  const set = new Set([1, total, current - 1, current, current + 1]);
  const list = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  list.forEach((n, i) => {
    if (i && n - list[i - 1] > 1) out.push(`dots-${n}`);
    out.push(n);
  });
  return out;
}

const base =
  "h-10 min-w-10 rounded-xl border px-3 text-sm font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 inline-flex items-center justify-center select-none active:scale-95";

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="my-8 flex flex-wrap justify-center items-center gap-2" aria-label="Sahifalar">
      <button
        className={`${base} border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50`}
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="Oldingi sahifa"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {pageList(page, totalPages).map((n) =>
        typeof n === "string" ? (
          <span key={n} className="px-2 text-slate-400 font-bold select-none">
            ···
          </span>
        ) : (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`${base} ${
              n === page
                ? "border-transparent bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25"
                : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50 hover:text-indigo-600"
            }`}
          >
            {n}
          </button>
        )
      )}

      <button
        className={`${base} border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50`}
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Keyingi sahifa"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  );
}
