import { useEffect } from "react";
import { PhoneImage, btnPrimary } from "./ui";
import { MAX_QTY } from "../utils";
import { formatPriceWithLang, t } from "../i18n";

export default function CartDrawer({ open, onClose, items, total, onQty, onRemove, onCheckout, lang = "uz" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label={t("cartTitle", lang)}
        className="drawer-in fixed right-0 top-0 z-50 flex h-full w-full sm:w-[min(440px,92vw)] flex-col bg-white shadow-2xl rounded-l-3xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <img
              src="/images/tm-logo.png"
              alt="TM Logo"
              className="h-9 w-9 rounded-xl shadow-xs object-contain"
            />
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{t("cartTitle", lang)}</h2>
              <p className="text-xs text-slate-500">{items.length} {t("cartItemsCount", lang)}</p>
            </div>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            onClick={onClose}
            aria-label={t("close", lang)}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 mb-3">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-slate-800">{t("emptyCartTitle", lang)}</p>
              <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed">
                {t("emptyCartHint", lang)} ✨
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((i) => (
                <div key={i.id || i._id} className="flex gap-3 sm:gap-3.5 py-3.5 sm:py-4 items-center">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-1 flex items-center justify-center">
                    <PhoneImage src={i.image} alt={i.name} className="h-full w-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-slate-900 line-clamp-1">{i.name}</p>
                    <p className="text-xs font-semibold text-indigo-600 mt-0.5">{formatPriceWithLang(i.price, lang)}</p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-90 transition-all cursor-pointer font-bold"
                        onClick={() => onQty(i.id || i._id, -1)}
                        aria-label="Kamaytirish"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-slate-800">{i.qty}</span>
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-90 transition-all cursor-pointer font-bold disabled:opacity-30"
                        disabled={i.qty >= MAX_QTY}
                        onClick={() => onQty(i.id || i._id, 1)}
                        aria-label="Ko'paytirish"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between self-stretch py-1">
                    <button
                      className="cursor-pointer text-slate-300 hover:text-rose-500 transition-colors p-1"
                      onClick={() => onRemove(i.id || i._id)}
                      aria-label={t("remove", lang)}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <span className="text-sm font-extrabold text-slate-900">
                      {formatPriceWithLang(i.price * i.qty, lang)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/50 p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-sm font-medium text-slate-500">{t("orderTotal", lang)}</span>
            <span className="text-xl font-extrabold text-slate-900">{formatPriceWithLang(total, lang)}</span>
          </div>
          <button
            className={`${btnPrimary} w-full !py-3 text-base shadow-md shadow-indigo-500/25`}
            disabled={items.length === 0}
            onClick={onCheckout}
          >
            {t("checkoutButton", lang)}
          </button>
        </div>
      </aside>
    </>
  );
}
