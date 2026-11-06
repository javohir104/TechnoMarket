import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { useDebounced, useLocalStorage } from "./hooks";
import { MAX_QTY } from "./utils";
import AuthModal from "./components/AuthModal";
import ProfileModal from "./components/ProfileModal";
import ProductModal from "./components/ProductModal";
import ProductDetailModal from "./components/ProductDetailModal";
import CartDrawer from "./components/CartDrawer";
import OrderModal from "./components/OrderModal";
import Filters from "./components/Filters";
import StoreLocation from "./components/StoreLocation";
import ProductCard from "./components/ProductCard";
import Pagination from "./components/Pagination";
import Logo from "./components/Logo";
import { Toast, btn, btnPrimary, input } from "./components/ui";
import Admin from "./pages/Admin";
import { t, formatPriceWithLang } from "./i18n";

const EMPTY_FILTERS = { category: "", brand: "", minPrice: "", maxPrice: "", sort: "", limit: "8", onlyFavs: false };

export default function App() {
  const [route, setRoute] = useState(() => {
    const path = window.location.pathname.replace(/\/+$/, "").toLowerCase();
    return path.startsWith("/admin") ? "admin" : "home";
  });

  // --- auth & profile ---
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState("profile");
  const [lang, setLang] = useLocalStorage("tm_lang", "uz");
  const [viewingProduct, setViewingProduct] = useState(null);

  // --- mahsulotlar ---
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api("/categories")
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch((err) => console.error("Kategoriyalarni yuklash xatosi:", err));
  }, [reloadKey]);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  // --- savat va sevimlilar ---
  const [cart, setCart] = useLocalStorage("tm_cart", [], Array.isArray);
  const [favorites, setFavorites] = useLocalStorage("tm_favorites", [], Array.isArray);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);

  const [editing, setEditing] = useState(undefined);
  const [toast, setToast] = useState("");
  const toastTimer = useRef();

  const debouncedSearch = useDebounced(search, 350);
  const debouncedMin = useDebounced(filters.minPrice, 450);
  const debouncedMax = useDebounced(filters.maxPrice, 450);
  const priceError = debouncedMin !== "" && debouncedMax !== "" && Number(debouncedMin) > Number(debouncedMax);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  const handleError = useCallback(
    (err) => {
      if (err.status === 401) logout();
      showToast(err.message);
    },
    [logout, showToast]
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api("/auth/me", { token })
      .then((u) => !cancelled && setUser(u))
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401 || err.status === 404) logout();
        else showToast(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [token, logout, showToast]);

  useEffect(() => {
    if (priceError) return;
    const ctrl = new AbortController();
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (debouncedMin !== "") params.set("minPrice", debouncedMin);
    if (debouncedMax !== "") params.set("maxPrice", debouncedMax);
    if (filters.sort) params.set("sort", filters.sort);

    setLoading(true);
    setLoadError("");
    api(`/products?${params}`, { signal: ctrl.signal })
      .then((list) => {
        const data = Array.isArray(list) ? list : [];
        setProducts(data);
        setBrands((prev) => [...new Set([...prev, ...data.map((p) => p.brand).filter(Boolean)])].sort());
        const byId = new Map(data.map((p) => [p._id, p]));
        setCart((prev) => {
          let changed = false;
          const next = prev.map((i) => {
            const p = byId.get(i.id);
            if (!p || (p.price === i.price && p.name === i.name && p.image === i.image)) return i;
            changed = true;
            return { ...i, name: p.name, price: p.price, image: p.image };
          });
          return changed ? next : prev;
        });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setLoadError(err.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [debouncedSearch, debouncedMin, debouncedMax, filters.sort, priceError, reloadKey, setCart]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedMin, debouncedMax]);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const resetFilters = () => {
    setSearch("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (!filters.category || p.category === filters.category) &&
          (!filters.brand || p.brand === filters.brand) &&
          (!filters.onlyFavs || favorites.includes(p._id))
      ),
    [products, filters.category, filters.brand, filters.onlyFavs, favorites]
  );
  const limit = Number(filters.limit);
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * limit, currentPage * limit);

  const isAdmin = user?.role === "admin";

  const cartCount = cart.reduce((n, i) => n + i.qty, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  function addToCart(p, addQty = 1) {
    if (!p.inStock) return showToast(t("outOfStock", lang));
    const existing = cart.find((i) => i.id === p._id);
    const count = addQty || 1;
    if (existing && existing.qty + count > MAX_QTY) {
      return showToast(
        lang === "ru"
          ? `Максимум ${MAX_QTY} шт.`
          : lang === "en"
          ? `Maximum ${MAX_QTY} items`
          : `Ko'pi bilan ${MAX_QTY} ta olish mumkin`
      );
    }
    setCart(
      existing
        ? cart.map((i) => (i.id === p._id ? { ...i, qty: Math.min(MAX_QTY, i.qty + count) } : i))
        : [...cart, { id: p._id, name: p.name, price: p.price, image: p.image, qty: count }]
    );
    showToast(t("addedToCart", lang));
  }

  function handleBuyNow(p, qty = 1) {
    addToCart(p, qty);
    setCartOpen(false);
    setOrderOpen(true);
  }

  const changeQty = (id, delta) =>
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: Math.min(MAX_QTY, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    );
  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const toggleFav = (id) =>
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  function changePage(n) {
    setPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    setRoute("home");
    window.history.pushState({}, "", "/");
  }

  function goAdmin() {
    if (!isAdmin) return;
    setRoute("admin");
    window.history.pushState({}, "", "/admin");
  }

  const statusLine = priceError ? (
    <span className="text-rose-600 font-semibold">{t("priceError", lang)}</span>
  ) : loading && products.length === 0 ? (
    lang === "ru" ? "Загрузка товаров..." : lang === "en" ? "Loading products..." : "Mahsulotlar yuklanmoqda..."
  ) : filtered.length ? (
    <span>
      {lang === "ru" ? "Всего" : lang === "en" ? "Total" : "Jami"} <b>{filtered.length}</b> {t("perPage", lang)} · <span className="text-slate-400">{currentPage}/{totalPages}</span>
    </span>
  ) : (
    t("noProductsFound", lang)
  );

  if (route === "admin") {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:py-3.5">
            <Logo onClick={goHome} showTagline={false} />
            <div className="flex items-center gap-2.5 whitespace-nowrap text-sm">
              <button className={btn} onClick={goHome}>
                Bosh sahifa
              </button>
              {user && (
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 text-xs text-slate-700 transition-colors cursor-pointer"
                  title="Profilni ochish"
                >
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || user.email}
                      referrerPolicy="no-referrer"
                      className="h-5 w-5 rounded-full object-cover border border-slate-200"
                    />
                  ) : null}
                  <span className="font-semibold max-w-[130px] truncate">{user.name || user.email}</span>
                  <span className="font-bold text-indigo-600">(admin)</span>
                </button>
              )}
              <button
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/90 hover:bg-rose-100 hover:border-rose-300 px-3 py-1.5 text-xs font-bold text-rose-600 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                onClick={logout}
              >
                Chiqish
              </button>
            </div>
          </div>
        </header>

        <Admin user={user} token={token} onBack={goHome} />

        <footer className="mt-auto border-t border-slate-200/80 bg-white/70 backdrop-blur-md py-6 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Logo onClick={goHome} showTagline={false} />
            <p>© {new Date().getFullYear()} Techno Market. Barcha huquqlar himoyalangan.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 selection:bg-indigo-100 selection:text-indigo-800">
      {/* Modern Soft Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3.5 px-4 py-3 sm:py-3.5">
          <Logo onClick={goHome} tagline={t("siteTagline", lang)} />

          {/* Soft Modern Search Bar */}
          <div className="relative flex-1 basis-64 order-3 sm:order-2">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              className={`${input} !pl-10 !pr-8 !py-2.5 bg-slate-50/80 hover:bg-slate-50 focus:bg-white text-sm`}
              placeholder={t("searchPlaceholder", lang)}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
                title="Tozalash"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Buttons: Responsive & Fully Accessible (Chiqish tugmasi har doim ko'rinadi) */}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 text-sm order-2 sm:order-3">
            {/* Language Switcher (100% sayt tili: O'zb / Рус / Eng) */}
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200/70 shrink-0">
              {[
                { code: "uz", label: "O'zb" },
                { code: "ru", label: "Рус" },
                { code: "en", label: "Eng" },
              ].map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setLang(item.code);
                    showToast(
                      item.code === "ru"
                        ? "Язык: Русский ✨"
                        : item.code === "en"
                        ? "Language: English ✨"
                        : "Til: O'zbekcha ✨"
                    );
                  }}
                  className={`px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    lang === item.code
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Info / Contact Button (Dashboard) */}
            <button
              type="button"
              onClick={() => {
                setProfileTab("info");
                setProfileOpen(true);
              }}
              className={`${btn} !px-2.5 !py-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 shrink-0`}
              title={t("info", lang)}
            >
              <span>ℹ️</span>
              <span className="hidden lg:inline">{t("info", lang)}</span>
            </button>

            {/* Do'konimiz (Google Maps) */}
            <button
              type="button"
              onClick={() => document.getElementById("store-location")?.scrollIntoView({ behavior: "smooth" })}
              className={`${btn} !px-2.5 !py-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 shrink-0 hidden md:inline-flex items-center gap-1.5`}
              title="Bizning do'konimiz"
            >
              <span>📍</span>
              <span className="hidden lg:inline">{lang === "ru" ? "Наш магазин" : "Do'konimiz"}</span>
            </button>

            {/* Telegram Direct Contact to Javohir Akmalov */}
            <a
              href="https://t.me/javohir_akmalov"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-2.5 sm:px-3 py-2 text-xs font-bold text-white shadow-xs hover:from-sky-600 hover:to-blue-700 active:scale-95 transition-all shrink-0"
              title="Telegram: @javohir_akmalov"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-white" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
              <span className="hidden sm:inline">Telegram</span>
            </a>

            {/* Cart Button */}
            <button
              className={`${btn} !px-2.5 !py-2 text-xs group hover:border-indigo-200 hover:text-indigo-600 shrink-0`}
              onClick={() => setCartOpen(true)}
              aria-label={t("cart", lang)}
            >
              <svg className="h-4 w-4 text-slate-500 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="hidden sm:inline">{t("cart", lang)}</span>
              {cartCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-1.5 text-xs font-bold text-white shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>

            {user ? (
              <>
                {isAdmin && (
                  <button className={`${btnPrimary} !px-2.5 sm:!px-3 !py-2 text-xs shrink-0`} onClick={goAdmin}>
                    <span>⚙️</span>
                    <span className="hidden sm:inline">{t("adminPanel", lang)}</span>
                    <span className="sm:hidden">Admin</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setProfileTab("profile");
                    setProfileOpen(true);
                  }}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-slate-100/90 hover:bg-indigo-50/80 hover:border-indigo-200 border border-slate-200/60 px-2 sm:px-2.5 py-1.5 text-xs text-slate-700 transition-all cursor-pointer group shadow-2xs shrink-0"
                  title={t("profile", lang)}
                >
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || user.email}
                      referrerPolicy="no-referrer"
                      className="h-5 w-5 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="max-w-[80px] sm:max-w-[130px] truncate font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {user.name || (user.username ? `@${user.username}` : user.email)}
                  </span>
                  <svg className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Chiqish (Logout) — aniq, qizil, ko'zga tashlanadigan va har doim ko'rinib turadigan tugma */}
                <button
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/90 hover:bg-rose-100 hover:border-rose-300 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-rose-600 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                  onClick={logout}
                  title={t("logout", lang)}
                >
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>{t("logout", lang)}</span>
                </button>
              </>
            ) : token ? (
              <span className="text-slate-400 text-xs">...</span>
            ) : (
              <button
                className={btnPrimary}
                onClick={() => {
                  setAuthNotice("");
                  setAuthOpen(true);
                }}
              >
                {t("login", lang)}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 sm:px-4 py-2">
        {/* Modern & Professional Hero Banner */}
        <section className="relative my-3 sm:my-5 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-5 sm:p-8 md:p-10 text-white shadow-xl shadow-indigo-950/20 border border-indigo-900/40">
          {/* Subtle Background Glows */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
            <div className="flex-1 text-center md:text-left">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-indigo-200 border border-white/10 mb-3 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {t("heroBadge", lang)}
              </span>
              <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight sm:leading-snug">
                {t("heroTitle", lang)}
              </h1>
              <p className="mt-2.5 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                {t("heroSubtitle", lang)}
              </p>

              {/* Action Buttons */}
              <div className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="rounded-xl bg-white px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 shadow-md hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                >
                  {t("heroShopBtn", lang)} ↓
                </button>
                <a
                  href="https://t.me/javohir_akmalov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-sky-500/30 hover:from-sky-600 hover:to-blue-700 active:scale-95 transition-all"
                >
                  <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                  <span>{t("heroTelegramBtn", lang)}</span>
                </a>
              </div>
            </div>

            {/* Hero Visual Badges: Responsive for mobile and desktop */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <div className="flex h-20 w-20 sm:h-28 sm:w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600/30 via-slate-800/40 to-indigo-600/30 backdrop-blur-md border border-white/20 p-2 sm:p-2.5 shadow-xl shadow-blue-500/25 transition-transform hover:scale-105">
                <img
                  src="/images/tm-logo.png"
                  alt="TechnoMarket Official Badge"
                  className="h-full w-full object-contain rounded-2xl drop-shadow-md select-none"
                />
              </div>
              <div className="flex flex-col gap-2.5 sm:gap-3">
                <div className="flex h-10 w-10 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xl sm:text-2xl shadow-sm transition-transform hover:scale-105">
                  📱
                </div>
                <div className="flex h-10 w-10 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xl sm:text-2xl shadow-sm transition-transform hover:scale-105">
                  💻
                </div>
              </div>
            </div>
          </div>

          {/* 4 Professional Trust Pillars */}
          <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-white/15 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs">
            <div className="flex items-start gap-2 sm:gap-2.5">
              <span className="text-lg sm:text-xl">🚀</span>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">{t("featureDelivery", lang)}</h4>
                <p className="text-[10px] sm:text-[11px] text-slate-300">{t("featureDeliveryDesc", lang)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 sm:gap-2.5">
              <span className="text-lg sm:text-xl">🛡️</span>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">{t("featureOriginal", lang)}</h4>
                <p className="text-[10px] sm:text-[11px] text-slate-300">{t("featureOriginalDesc", lang)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 sm:gap-2.5">
              <span className="text-lg sm:text-xl">✨</span>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">{t("featureWarranty", lang)}</h4>
                <p className="text-[10px] sm:text-[11px] text-slate-300">{t("featureWarrantyDesc", lang)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 sm:gap-2.5">
              <span className="text-lg sm:text-xl">💬</span>
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm">{t("featureSupport", lang)}</h4>
                <a
                  href="https://t.me/javohir_akmalov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] sm:text-[11px] text-sky-300 hover:underline font-semibold block"
                >
                  {t("featureSupportDesc", lang)}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Catalog Anchor */}
        <div id="catalog-section" className="scroll-mt-20">
          {/* Filters */}
          <Filters
            filters={filters}
            setFilter={setFilter}
            brands={brands}
            categories={categories}
            favCount={favorites.length}
            onReset={resetFilters}
            onAdd={undefined}
            lang={lang}
          />
        </div>

        {/* Status Line */}
        <div className="mb-4 flex items-center justify-between text-xs text-slate-500 px-1">
          <div>{statusLine}</div>
          {filtered.length > 0 && (
            <span className="hidden sm:inline-block text-slate-400">
              {t("reliableStore", lang)}
            </span>
          )}
        </div>

        {/* Error or Product Grid */}
        {loadError && products.length === 0 ? (
          <section className="rounded-3xl border border-rose-100 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-2xl text-rose-500">
              ⚠️
            </div>
            <p className="mb-3 text-sm font-semibold text-rose-600">{loadError}</p>
            <button className={btnPrimary} onClick={() => setReloadKey((k) => k + 1)}>
              {lang === "ru" ? "Повторить" : lang === "en" ? "Retry" : "Qayta urinib ko'rish"}
            </button>
          </section>
        ) : filtered.length === 0 && !loading ? (
          <section className="rounded-3xl border border-slate-200/80 bg-white p-16 text-center shadow-xs">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
              🔍
            </div>
            <h3 className="text-lg font-bold text-slate-800">{t("noProductsFound", lang)}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {t("noProductsHint", lang)}
            </p>
            <button className={`${btn} mt-4`} onClick={resetFilters}>
              {t("clearFilters", lang)}
            </button>
          </section>
        ) : (
          <>
            {/* Responsive Grid: 2 columns on mobile, 3 on tablet, 4 on desktop */}
            <div
              className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-5 transition-opacity duration-300 overflow-x-hidden ${
                loading ? "opacity-60" : "opacity-100"
              }`}
            >
              {pageItems.map((p) => (
                <ProductCard
                  key={p._id}
                  product={p}
                  canEdit={false}
                  isFav={favorites.includes(p._id)}
                  onToggleFav={toggleFav}
                  onAddToCart={addToCart}
                  onView={(prod) => setViewingProduct(prod)}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  lang={lang}
                />
              ))}
            </div>

            <Pagination page={currentPage} totalPages={totalPages} onChange={changePage} />
          </>
        )}

        {/* 9. BIZNING DO'KONIMIZ — GOOGLE MAPS */}
        <StoreLocation lang={lang} />
      </main>

      {/* Modern & Professional Footer */}
      <footer className="mt-16 border-t border-slate-200/80 bg-white/80 backdrop-blur-md pt-10 pb-8 text-xs text-slate-600">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-8 border-b border-slate-100">
            {/* 1. Do'kon haqida */}
            <div className="flex flex-col gap-3">
              <Logo onClick={goHome} tagline={t("siteTagline", lang)} />
              <p className="text-slate-500 leading-relaxed mt-1 text-xs">
                {t("aboutStoreDesc", lang)}
              </p>
              <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 w-fit">
                <span>✓</span>
                <span>{t("genuineGoodsTitle", lang)}</span>
              </div>
            </div>

            {/* 2. Tezkor toifalar (Bazadagi dinamik kategoriyalar) */}
            <div className="flex flex-col gap-2.5">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                {t("category", lang)}
              </h4>
              <ul className="flex flex-col gap-2 text-slate-600">
                {(categories.length > 0
                  ? categories
                  : [
                      { slug: "phone", name: "Smartfonlar", icon: "📱" },
                      { slug: "laptop", name: "Noutbuklar", icon: "💻" },
                      { slug: "keyboard", name: "Klaviaturalar", icon: "⌨️" },
                      { slug: "mouse", name: "Sichqonchalar", icon: "🖱️" },
                      { slug: "accessory", name: "Aksessuarlar", icon: "🎧" },
                    ]
                )
                  .slice(0, 8)
                  .map((cat) => {
                    const val = cat.slug || cat.name;
                    return (
                      <li key={cat._id || val}>
                        <button
                          type="button"
                          onClick={() => {
                            setFilter("category", val);
                            document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="hover:text-indigo-600 transition-colors cursor-pointer text-left inline-flex items-center gap-1.5"
                        >
                          <span>{cat.icon || "📦"}</span>
                          <span>{cat.name}</span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>

            {/* 3. Yagona aloqa markazi (Telegram @javohir_akmalov & Telefon) */}
            <div className="flex flex-col gap-2.5">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                {t("mainContactCenter", lang)}
              </h4>
              <p className="text-slate-500">
                {t("workingHours", lang)}: <b className="text-slate-700">{t("workingHoursVal", lang)}</b>
              </p>
              <a
                href="tel:+998958125012"
                className="flex items-center gap-2 font-black text-slate-900 hover:text-indigo-600 text-sm transition-colors"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">📞</span>
                <span>+998 95 812 50 12</span>
              </a>
              <a
                href="https://t.me/javohir_akmalov"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-3.5 py-2 text-white font-bold hover:from-sky-600 hover:to-blue-700 transition-all shadow-xs w-fit"
              >
                <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
                <span>Telegram: @javohir_akmalov</span>
              </a>
            </div>

            {/* 4. To'lov usullari va Kafolat */}
            <div className="flex flex-col gap-2.5">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                {t("paymentMethodsLabel", lang)}
              </h4>
              <p className="text-slate-500">
                {t("paymentMethodsDesc", lang)}
              </p>
              {/* Payment badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                {["Click", "Payme", "Uzcard", "Humo"].map((method) => (
                  <span
                    key={method}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-2xs"
                  >
                    💳 {method}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <p>© {new Date().getFullYear()} <strong>Techno Market</strong>. {t("allRightsReserved", lang)}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setProfileTab("info");
                  setProfileOpen(true);
                }}
                className="hover:text-slate-700 transition-colors cursor-pointer"
              >
                {t("info", lang)} & {t("siteLanguage", lang)}
              </button>
              <span>•</span>
              <a
                href="https://t.me/javohir_akmalov"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-600 transition-colors font-semibold"
              >
                Telegram @javohir_akmalov
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ProductDetailModal
        product={viewingProduct}
        open={viewingProduct !== null}
        onClose={() => setViewingProduct(null)}
        isFav={viewingProduct ? favorites.includes(viewingProduct._id) : false}
        onToggleFav={toggleFav}
        onAddToCart={addToCart}
        onBuyNow={handleBuyNow}
        lang={lang}
      />
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        token={token}
        onUserUpdated={(updatedUser) => setUser(updatedUser)}
        favoritesList={products.filter((p) => favorites.includes(p._id))}
        onRemoveFavorite={(id) => setFavorites((prev) => prev.filter((favId) => favId !== id))}
        onAddToCart={(p) => {
          addToCart(p);
          showToast(t("addedToCart", lang));
        }}
        initialTab={profileTab}
        onLogout={() => {
          logout();
          showToast(
            lang === "ru"
              ? "Вы вышли из своего аккаунта 👋"
              : lang === "en"
              ? "Logged out successfully 👋"
              : "Hisobingizdan muvaffaqiyatli chiqdingiz 👋"
          );
        }}
        onOpenAuth={() => setAuthOpen(true)}
        lang={lang}
        onLangChange={(l) => {
          setLang(l);
          showToast(
            l === "ru"
              ? "Язык: Русский ✨"
              : l === "en"
              ? "Language: English ✨"
              : "Sayt tili: O'zbekcha ✨"
          );
        }}
      />
      <AuthModal
        open={authOpen}
        notice={authNotice}
        onClose={() => setAuthOpen(false)}
        lang={lang}
        onLoggedIn={(t, userObj) => {
          localStorage.setItem("token", t);
          setToken(t);
          if (userObj) setUser(userObj);
          setAuthOpen(false);
          showToast(
            lang === "ru"
              ? "Вы успешно вошли в систему ✨"
              : lang === "en"
              ? "Logged in successfully ✨"
              : "Tizimga muvaffaqiyatli kirdingiz ✨"
          );
        }}
      />
      <ProductModal
        open={editing !== undefined}
        product={editing ?? undefined}
        brands={brands}
        token={token}
        onClose={() => setEditing(undefined)}
        onSaved={(msg) => {
          setEditing(undefined);
          showToast(msg);
          setPage(1);
          setReloadKey((k) => k + 1);
        }}
      />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        total={cartTotal}
        onQty={changeQty}
        onRemove={removeFromCart}
        onCheckout={() => {
          setCartOpen(false);
          setOrderOpen(true);
        }}
        lang={lang}
      />
      <OrderModal
        open={orderOpen}
        items={cart}
        total={cartTotal}
        onClose={() => setOrderOpen(false)}
        lang={lang}
        user={user}
        token={token}
        onDone={() => {
          setCart([]);
          setReloadKey((k) => k + 1);
        }}
      />
      <Toast message={toast} />
    </div>
  );
}
