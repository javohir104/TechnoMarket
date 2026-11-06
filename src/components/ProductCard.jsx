import { PhoneImage, btn, btnPrimary } from "./ui";
import { formatPriceWithLang, t } from "../i18n";

export default function ProductCard({
  product,
  canEdit,
  isFav,
  onToggleFav,
  onAddToCart,
  onView,
  onEdit,
  onDelete,
  lang = "uz",
}) {
  return (
    <article className="group relative w-full min-w-0 flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-200 hover:-translate-y-1.5 transition-all duration-300 max-w-full">
      {/* Product Image & Badges */}
      <div
        className="relative aspect-square w-full bg-gradient-to-b from-slate-50 via-white to-slate-100/60 p-3 sm:p-4 overflow-hidden flex items-center justify-center cursor-pointer select-none rounded-t-3xl"
        onClick={() => onView?.(product)}
      >
        <PhoneImage
          src={product.image}
          alt={product.name}
          category={product.category}
          className="transition-transform duration-500 group-hover:scale-105"
        />

        {/* Category Badge */}
        <span className="absolute left-3 top-3 rounded-full backdrop-blur-md bg-white/90 border border-slate-200/80 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-slate-700 shadow-xs">
          {t(product.category, lang) || product.category || "Gadjet"}
        </span>

        {/* Discount Badge */}
        {product.discountPercent > 0 && (
          <span className="absolute left-3 bottom-3 rounded-full bg-gradient-to-r from-rose-500 to-red-600 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-white shadow-sm shadow-rose-500/20">
            −{product.discountPercent}%
          </span>
        )}

        {/* Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav(product._id);
          }}
          aria-pressed={isFav}
          aria-label={isFav ? "Sevimlilardan olib tashlash" : "Sevimlilarga qo'shish"}
          className={`absolute right-3 top-3 grid h-9 w-9 cursor-pointer place-items-center rounded-2xl backdrop-blur-md border shadow-xs transition-all duration-200 hover:scale-110 active:scale-95 ${
            isFav
              ? "bg-rose-50/95 border-rose-200 text-rose-500 shadow-rose-500/15"
              : "bg-white/90 border-slate-200/80 text-slate-400 hover:text-rose-500 hover:bg-white"
          }`}
        >
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${
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

      {/* Content */}
      <div className="flex flex-1 flex-col p-3 sm:p-4 pt-3 gap-2">
        {product.brand && (
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-indigo-600">
            {product.brand}
          </p>
        )}

        <h3
          onClick={() => onView?.(product)}
          className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[36px] sm:min-h-[40px] cursor-pointer leading-snug"
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Pricing */}
        <div className="mt-auto pt-1 flex items-baseline flex-wrap gap-2">
          <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {formatPriceWithLang(product.price, lang)}
          </span>
          {product.oldPrice && (
            <s className="text-xs font-semibold text-slate-400">
              {formatPriceWithLang(product.oldPrice, lang)}
            </s>
          )}
        </div>

        {/* Stock & Status */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <span className="font-semibold text-slate-600">
            {product.condition === "used" ? t("conditionUsed", lang) : t("conditionNew", lang)}
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold">
            <span
              className={`h-2 w-2 rounded-full ${
                product.inStock ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
            {product.inStock
              ? `${product.stock} ${t("stockAvailable", lang)}`
              : t("outOfStock", lang)}
          </span>
        </div>

        {/* Cart Button */}
        <button
          className={`${btnPrimary} mt-2 w-full !py-2.5 text-xs sm:text-sm`}
          disabled={!product.inStock}
          onClick={() => onAddToCart(product)}
        >
          {product.inStock ? (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>{t("addToCart", lang)}</span>
            </>
          ) : (
            t("outOfStock", lang)
          )}
        </button>

        {/* Admin Actions */}
        {canEdit && (
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              className={`${btn} flex-1 !py-1.5 !text-xs`}
              onClick={() => onEdit(product)}
            >
              {t("edit", lang)}
            </button>
            <button
              className={`${btn} flex-1 !py-1.5 !text-xs !text-rose-600 hover:!border-rose-200 hover:!bg-rose-50`}
              onClick={() => onDelete(product)}
            >
              {t("delete", lang)}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
