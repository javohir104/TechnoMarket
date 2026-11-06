import { useState } from "react";
import { Modal, PhoneImage, btn, btnPrimary } from "./ui";
import { formatPriceWithLang, t } from "../i18n";
import { MAX_QTY } from "../utils";

export default function ProductDetailModal({
  product,
  open,
  onClose,
  isFav,
  onToggleFav,
  onAddToCart,
  onBuyNow,
  lang = "uz",
}) {
  const [qty, setQty] = useState(1);

  if (!product) return null;

  const maxStock = Math.min(product.stock || 1, MAX_QTY);

  function handleAdd() {
    onAddToCart?.(product, qty);
    onClose();
  }

  function handleBuyNow() {
    onBuyNow?.(product, qty);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              {t(product.category, lang) || product.category || "Gadjet"}
            </span>
            {product.brand && (
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {product.brand}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer text-sm font-bold"
            title={t("close", lang)}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 flex flex-col gap-5">
          {/* Main Product Image: Fully responsive for phones & desktops */}
          <div className="relative aspect-[4/3] sm:aspect-[16/10] max-h-[220px] sm:max-h-[300px] w-full rounded-2xl bg-gradient-to-b from-slate-50 via-white to-slate-100/70 p-3 sm:p-4 border border-slate-200/70 overflow-hidden flex items-center justify-center">
            <PhoneImage
              src={product.image}
              alt={product.name}
              category={product.category}
              className="max-h-full max-w-full object-contain"
            />

            {/* Favorite toggle button */}
            <button
              type="button"
              onClick={() => onToggleFav?.(product._id)}
              aria-label={t("favorites", lang)}
              className={`absolute right-3.5 top-3.5 grid h-9 w-9 sm:h-10 sm:w-10 cursor-pointer place-items-center rounded-full backdrop-blur-md border text-base shadow-sm transition-all duration-200 hover:scale-110 active:scale-95 ${
                isFav
                  ? "bg-rose-50 border-rose-200 text-rose-500 shadow-rose-500/10"
                  : "bg-white/95 border-slate-200/80 text-slate-400 hover:text-rose-500 hover:bg-white"
              }`}
            >
              <svg
                className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 ${
                  isFav ? "fill-rose-500 scale-110" : "fill-none stroke-current"
                }`}
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                />
              </svg>
            </button>
          </div>

          {/* Title & Price Section */}
          <div className="flex flex-col gap-2">
            <h1 className="text-base sm:text-xl font-extrabold text-slate-900 leading-snug">
              {product.name}
            </h1>

            <div className="flex items-baseline flex-wrap gap-2.5 pt-0.5">
              <span className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {formatPriceWithLang(product.price, lang)}
              </span>
              {product.oldPrice && (
                <s className="text-xs sm:text-sm font-medium text-slate-400">
                  {formatPriceWithLang(product.oldPrice, lang)}
                </s>
              )}
              {product.discountPercent > 0 && (
                <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  −{product.discountPercent}%
                </span>
              )}
            </div>

            {/* Stock status indicator */}
            <div className="flex items-center gap-2 pt-1 text-xs font-semibold">
              <span
                className={`flex h-2 w-2 rounded-full ${
                  product.inStock ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-slate-300"
                }`}
              />
              <span className={product.inStock ? "text-emerald-700" : "text-slate-400"}>
                {product.inStock
                  ? `${t("inStock", lang)}: ${product.stock} ${t("stockAvailable", lang)}`
                  : t("outOfStock", lang)}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">
                {product.condition === "used" ? t("conditionUsed", lang) : t("conditionNew", lang)}
              </span>
            </div>
          </div>

          {/* Quantity Selector */}
          {product.inStock && (
            <div className="flex items-center justify-between rounded-2xl bg-slate-50/90 border border-slate-200/80 p-3">
              <span className="text-xs font-bold text-slate-700">{t("quantity", lang)}:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold text-base transition-colors"
                >
                  −
                </button>
                <span className="w-8 text-center font-bold text-slate-900 text-sm">{qty}</span>
                <button
                  type="button"
                  disabled={qty >= maxStock}
                  onClick={() => setQty((q) => Math.min(maxStock, q + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold text-base transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Description & Specifications (Uzum style) */}
          <div className="flex flex-col gap-2 rounded-2xl bg-white border border-slate-200/80 p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("description", lang)}
            </h3>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {product.description || t("noProductsHint", lang)}
            </div>
          </div>

          {/* Support & Direct Telegram to Javohir Akmalov */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/80 border border-indigo-100 p-3 sm:p-3.5 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">💬</span>
              <div>
                <p className="text-slate-800 font-bold">{t("contactForQuestions", lang)}</p>
                <p className="text-[11px] text-slate-500">{t("telegramManager", lang)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="tel:+998958125012"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                📞 +998 95 812 50 12
              </a>
              <a
                href={`https://t.me/javohir_akmalov?text=${encodeURIComponent(
                  `Assalomu alaykum! Techno Market do'konidagi "${product.name}" mahsuloti bo'yicha ma'lumot olmoqchi edim.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors"
                title="Telegram orqali so'rash"
              >
                ✈️ Telegram
              </a>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer (Uzum-style: Add to Cart & Buy in 1-Click) */}
        <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur-md border-t border-slate-100 p-4 px-5 sm:px-6 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            disabled={!product.inStock}
            onClick={handleAdd}
            className={`${btn} flex-1 !py-3 !text-sm font-bold justify-center border-indigo-600 text-indigo-600 hover:bg-indigo-50 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span>{t("addToCart", lang)}</span>
          </button>

          <button
            type="button"
            disabled={!product.inStock}
            onClick={handleBuyNow}
            className={`${btnPrimary} flex-1 !py-3 !text-sm font-bold justify-center shadow-md shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span>⚡ {t("buyNow", lang)}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
