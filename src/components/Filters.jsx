import { useEffect, useState } from "react";
import { Field, btn, btnPrimary, input } from "./ui";
import { api } from "../api";
import { t } from "../i18n";

export default function Filters({
  filters,
  setFilter,
  brands = [],
  categories: propCategories,
  favCount = 0,
  onReset,
  onAdd,
  lang = "uz",
}) {
  const [categoriesList, setCategoriesList] = useState(propCategories || []);

  useEffect(() => {
    if (propCategories && propCategories.length > 0) {
      setCategoriesList(propCategories);
      return;
    }
    api("/categories")
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setCategoriesList(list);
        }
      })
      .catch((err) => console.error("Kategoriyalarni yuklashda xato:", err));
  }, [propCategories]);

  return (
    <div className="my-5 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-md p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-md hover:shadow-indigo-500/5">
      {/* Quick Category Navigation Pills (Dinamik bazadan olingan kategoriyalar) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 border-b border-slate-100 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilter("category", "")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
            !filters.category
              ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm shadow-indigo-500/25"
              : "bg-slate-100/90 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
          }`}
        >
          <span>🔥</span>
          <span>{lang === "ru" ? "Все" : lang === "en" ? "All" : "Barchasi"}</span>
        </button>

        {categoriesList.map((cat) => {
          const val = cat.slug || cat.name;
          const isActive = filters.category === val;
          return (
            <button
              key={cat._id || val}
              type="button"
              onClick={() => setFilter("category", val)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                isActive
                  ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm shadow-indigo-500/25"
                  : "bg-slate-100/90 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              <span className="text-sm">{cat.icon || "📦"}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3 sm:gap-4">
        {/* Kategoriya Dropdown */}
        <Field label={t("category", lang)} className="flex-1 min-w-[150px]">
          <select
            className={`${input} cursor-pointer`}
            value={filters.category}
            onChange={(e) => setFilter("category", e.target.value)}
          >
            <option value="">{t("allCategories", lang)}</option>
            {categoriesList.map((cat) => {
              const val = cat.slug || cat.name;
              return (
                <option key={cat._id || val} value={val}>
                  {cat.icon || "📦"} {cat.name}
                </option>
              );
            })}
          </select>
        </Field>

        {/* Brend */}
        <Field label={t("brand", lang)} className="flex-1 min-w-[130px]">
          <select
            className={`${input} cursor-pointer`}
            value={filters.brand}
            onChange={(e) => setFilter("brand", e.target.value)}
          >
            <option value="">{t("allBrands", lang)}</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>

        {/* Narx oralig'i */}
        <div className="flex items-end gap-2">
          <Field label={t("priceFrom", lang)} className="w-20 sm:w-28">
            <input
              className={input}
              type="number"
              min="0"
              placeholder="0"
              value={filters.minPrice}
              onChange={(e) => setFilter("minPrice", e.target.value)}
            />
          </Field>
          <span className="mb-2.5 text-slate-300 font-bold">—</span>
          <Field label={t("priceTo", lang)} className="w-20 sm:w-28">
            <input
              className={input}
              type="number"
              min="0"
              placeholder="∞"
              value={filters.maxPrice}
              onChange={(e) => setFilter("maxPrice", e.target.value)}
            />
          </Field>
        </div>

        {/* Saralash */}
        <Field label={t("sorting", lang)} className="flex-1 min-w-[150px]">
          <select
            className={`${input} cursor-pointer`}
            value={filters.sort}
            onChange={(e) => setFilter("sort", e.target.value)}
          >
            <option value="">{t("sortNewest", lang)}</option>
            <option value="price_asc">{t("sortPriceAsc", lang)}</option>
            <option value="price_desc">{t("sortPriceDesc", lang)}</option>
          </select>
        </Field>

        {/* Sahifada */}
        <Field label={t("showLimit", lang)} className="w-24">
          <select
            className={`${input} cursor-pointer`}
            value={filters.limit}
            onChange={(e) => setFilter("limit", e.target.value)}
          >
            {[4, 8, 12, 24].map((n) => (
              <option key={n} value={n}>
                {n} {t("perPage", lang)}
              </option>
            ))}
          </select>
        </Field>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            className={`${btn} ${
              filters.onlyFavs
                ? "!border-rose-300 !bg-rose-50 !text-rose-600 shadow-sm shadow-rose-500/10"
                : "hover:border-rose-200 hover:text-rose-600"
            }`}
            aria-pressed={filters.onlyFavs}
            onClick={() => setFilter("onlyFavs", !filters.onlyFavs)}
          >
            <svg
              className={`h-4 w-4 ${filters.onlyFavs ? "fill-rose-500" : "fill-none stroke-current"}`}
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
              />
            </svg>
            <span>{t("favorites", lang)}</span>
            {favCount > 0 && (
              <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
                {favCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`${btn} text-slate-500 hover:text-slate-800`}
            onClick={onReset}
            title={t("clearFilters", lang)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{t("clearFilters", lang)}</span>
          </button>

          {onAdd && (
            <button className={`${btnPrimary} ml-auto`} onClick={onAdd}>
              {t("addProduct", lang)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
