import { useEffect, useState } from "react";
import { Modal, btn, btnPrimary, input } from "./ui";
import { api } from "../api";
import { t, formatPriceWithLang } from "../i18n";

const LANGUAGES = [
  { code: "uz", name: "O'zbekcha", short: "O'zb", flag: "🇺🇿" },
  { code: "ru", name: "Русский", short: "Рус", flag: "🇷🇺" },
  { code: "en", name: "English", short: "Eng", flag: "🇬🇧" },
];

const PRESET_AVATARS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=TM_Tech",
  "https://api.dicebear.com/7.x/bottts/svg?seed=CyberPhone",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
];

export default function ProfileModal({
  open,
  onClose,
  user,
  token,
  onUserUpdated,
  onLogout,
  onOpenAuth,
  lang = "uz",
  onLangChange,
  initialTab = "profile",
  favoritesList = [],
  onRemoveFavorite,
  onAddToCart,
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'profile' | 'orders' | 'favorites' | 'settings' | 'info' | 'contact'
  
  // Tahrirlash holatlari
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [picture, setPicture] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  // Buyurtmalar tarixi
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  // Foydalanuvchi ma'lumotlarini formaga sinxronlash
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setUsername(user.username || "");
      setPhone(user.phone || "");
      setPicture(user.picture || "");
    }
  }, [user]);

  // Initial tab o'zgarganda activeTab ni yangilash
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setSaveSuccess("");
      setSaveError("");
    }
  }, [open, initialTab]);

  // Xaridlar tarixini yuklash
  useEffect(() => {
    if (open && activeTab === "orders" && token) {
      setOrdersLoading(true);
      setOrdersError("");
      api("/orders/my-orders", { token })
        .then((data) => setOrders(Array.isArray(data) ? data : []))
        .catch((err) => setOrdersError(err.message || "Buyurtmalarni yuklab bo'lmadi"))
        .finally(() => setOrdersLoading(false));
    }
  }, [open, activeTab, token]);

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  // Profilni saqlash funksiyasi
  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess("");
    setSaving(true);

    try {
      const res = await api("/auth/profile", {
        method: "PATCH",
        token,
        body: {
          name: name.trim(),
          username: username.trim().toLowerCase(),
          phone: phone.trim(),
          picture: picture.trim(),
        },
      });

      if (res.user) {
        onUserUpdated?.(res.user);
      }
      setSaveSuccess(t("profileUpdated", lang));
      setShowAvatarPicker(false);
      setTimeout(() => setSaveSuccess(""), 3500);
    } catch (err) {
      setSaveError(err.message || "Profilni saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case "delivered":
        return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">✓ {t("orderStatusDelivered", lang)}</span>;
      case "shipped":
        return <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">🚚 {t("orderStatusShipped", lang)}</span>;
      case "confirmed":
        return <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">👍 {t("orderStatusConfirmed", lang)}</span>;
      case "cancelled":
        return <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">✕ {t("orderStatusCancelled", lang)}</span>;
      case "returned":
        return <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">↩ {t("orderStatusReturned", lang)}</span>;
      default:
        return <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 border border-sky-200">⏳ {t("orderStatusNew", lang)}</span>;
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col min-h-[480px]">
        {/* Modal Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100 p-5 sm:p-6 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-blue-500 text-white shadow-md shadow-indigo-500/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {t("profileTitle", lang)}
              </h2>
              <p className="text-xs text-slate-500">{t("profileSubtitle", lang)}</p>
            </div>
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

        {/* Foydalanuvchi kartasi yoki Tizimga kirish taklifi */}
        {user ? (
          <div className="px-5 sm:px-6 pt-4 pb-2">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 p-4 sm:p-5 text-white shadow-lg shadow-indigo-950/15 border border-indigo-900/40">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/20 blur-2xl" />
              <div className="relative z-10 flex items-center gap-4">
                {/* Avatar */}
                <div className="relative group shrink-0">
                  {picture ? (
                    <img
                      src={picture}
                      alt={name || user.email}
                      referrerPolicy="no-referrer"
                      className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl object-cover ring-2 ring-white/30 shadow-md bg-white/10"
                    />
                  ) : (
                    <div className="flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-2xl font-black text-white shadow-md ring-2 ring-white/30">
                      {(name || user.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker((v) => !v)}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer ring-2 ring-slate-900 text-xs"
                    title={t("changeAvatar", lang)}
                  >
                    ✏️
                  </button>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-base sm:text-lg text-white truncate">
                      {name || t("customerRegular", lang)}
                    </h3>
                    {user.role === "admin" && (
                      <span className="rounded-md bg-rose-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                        Admin
                      </span>
                    )}
                  </div>
                  {username && (
                    <p className="text-xs font-semibold text-indigo-300 truncate mt-0.5">
                      @{username}
                    </p>
                  )}
                  <p className="text-xs text-slate-300 truncate mt-0.5">{user.email}</p>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {t("activeAccount", lang)}
                    </span>
                    {user.hasGoogle && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-semibold text-slate-200 border border-white/20">
                        <svg className="w-3 h-3" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                        </svg>
                        Google
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 sm:px-6 pt-4 pb-2">
            <div className="rounded-3xl bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-slate-50 p-5 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">{t("authSubtitleLogin", lang)}</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">{t("authSubtitleRegister", lang)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth?.();
                }}
                className={`${btnPrimary} shrink-0 w-full sm:w-auto`}
              >
                {t("login", lang)}
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation Menu */}
        <div className="px-5 sm:px-6 pt-2">
          <div className="flex border-b border-slate-100 text-xs font-bold overflow-x-auto no-scrollbar gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === "profile"
                  ? "border-indigo-600 text-indigo-600 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>👤</span>
              <span>{t("tabProfile", lang)}</span>
            </button>

            {user && (
              <button
                type="button"
                onClick={() => setActiveTab("orders")}
                className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeTab === "orders"
                    ? "border-indigo-600 text-indigo-600 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>📦</span>
                <span>{t("tabOrders", lang)}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("favorites")}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === "favorites"
                  ? "border-indigo-600 text-indigo-600 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>❤️</span>
              <span>{t("tabFavorites", lang)}</span>
              {favoritesList.length > 0 && (
                <span className="ml-1 rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-black text-white">
                  {favoritesList.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === "settings"
                  ? "border-indigo-600 text-indigo-600 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>⚙️</span>
              <span>{t("tabSettings", lang)}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("contact")}
              className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === "contact"
                  ? "border-indigo-600 text-indigo-600 font-extrabold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>📞</span>
              <span>{t("tabContact", lang)}</span>
            </button>
          </div>
        </div>

        {/* Tab Kontenti */}
        <div className="p-5 sm:p-6 pt-4 flex-1">
          {/* TAB 1: PROFIL VA TAHRIRLASH */}
          {activeTab === "profile" && (
            user ? (
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                {saveSuccess && (
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-xs">
                    <span>✨</span>
                    <span>{saveSuccess}</span>
                  </div>
                )}

                {saveError && (
                  <div className="rounded-2xl bg-rose-50 border border-rose-200/80 p-3 text-xs font-bold text-rose-700 flex items-center gap-2 shadow-xs">
                    <span>⚠️</span>
                    <span>{saveError}</span>
                  </div>
                )}

                {/* Avatar tanlash qismi (ochiladigan) */}
                {showAvatarPicker && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 flex flex-col gap-3 shadow-xs">
                    <span className="text-xs font-bold text-indigo-950">{t("choosePreset", lang)}</span>
                    <div className="flex items-center gap-3 overflow-x-auto pb-1">
                      {PRESET_AVATARS.map((avUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPicture(avUrl)}
                          className={`relative h-12 w-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 bg-white shadow-xs ${
                            picture === avUrl ? "border-indigo-600 scale-105 ring-2 ring-indigo-200" : "border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          <img src={avUrl} alt={`Avatar ${idx}`} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {t("avatarUrlPlaceholder", lang)}
                      </label>
                      <input
                        className={input}
                        type="url"
                        placeholder="https://example.com/avatar.jpg"
                        value={picture}
                        onChange={(e) => setPicture(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {t("fullNameLabel", lang)}
                    </label>
                    <input
                      className={input}
                      type="text"
                      placeholder="Ismingiz"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {t("usernameLabel", lang)}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">@</span>
                      <input
                        className={`${input} pl-7`}
                        type="text"
                        placeholder="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {t("phoneNumber", lang)}
                    </label>
                    <input
                      className={input}
                      type="tel"
                      placeholder="+998 90 123 45 67"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {t("emailAddress", lang)}
                    </label>
                    <input
                      className={`${input} bg-slate-50 text-slate-500 cursor-not-allowed`}
                      type="email"
                      disabled
                      value={user.email}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button type="submit" className={`${btnPrimary} min-w-[140px]`} disabled={saving}>
                    {saving ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>{t("saving", lang)}</span>
                      </span>
                    ) : (
                      t("saveChanges", lang)
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <span className="text-4xl mb-3">🔒</span>
                <h4 className="text-sm font-bold text-slate-800">{t("authSubtitleLogin", lang)}</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">{t("authSubtitleRegister", lang)}</p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth?.();
                  }}
                  className={`${btnPrimary} mt-4`}
                >
                  {t("login", lang)}
                </button>
              </div>
            )
          )}

          {/* TAB 2: XARIDLAR TARIXI */}
          {activeTab === "orders" && (
            <div className="flex flex-col gap-3">
              {ordersLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                  <span className="h-6 w-6 rounded-full border-2 border-indigo-600/30 border-t-indigo-600 animate-spin" />
                  <span className="text-xs font-semibold">{t("waiting", lang)}</span>
                </div>
              ) : ordersError ? (
                <div className="rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200">
                  {ordersError}
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="h-14 w-14 rounded-full bg-indigo-50 flex items-center justify-center text-2xl text-indigo-500 mb-3">
                    📦
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">{t("noOrdersYet", lang)}</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                    {t("noOrdersHint", lang)}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs flex flex-col gap-2.5 transition-all hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-indigo-600">{ord.orderNumber}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(ord.createdAt).toLocaleDateString(lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "uz-UZ")}
                          </span>
                        </div>
                        {getStatusBadge(ord.status)}
                      </div>

                      <div className="flex flex-col gap-1 text-xs">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between text-slate-700">
                            <span className="truncate max-w-[200px]">
                              {it.quantity}x {it.name}
                            </span>
                            <span className="font-semibold">{formatPriceWithLang(it.unitPrice * it.quantity, lang)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-500 font-medium">{t("orderTotal", lang)}:</span>
                        <span className="text-sm font-black text-slate-900">
                          {formatPriceWithLang(ord.total, lang)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SEVIMLILAR */}
          {activeTab === "favorites" && (
            <div className="flex flex-col gap-3">
              {favoritesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="h-14 w-14 rounded-full bg-rose-50 flex items-center justify-center text-2xl text-rose-500 mb-3">
                    ❤️
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">{t("noFavoritesYet", lang)}</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                    {t("noFavoritesHint", lang)}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {favoritesList.map((fav) => (
                    <div
                      key={fav._id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-indigo-200 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {fav.image ? (
                          <img
                            src={fav.image}
                            alt={fav.name}
                            className="h-12 w-12 rounded-xl object-contain bg-slate-50 p-1 border border-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
                            📱
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{fav.name}</h4>
                          <p className="text-xs font-black text-indigo-600 mt-0.5">
                            {formatPriceWithLang(fav.price, lang)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onAddToCart?.(fav)}
                          className="rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer"
                          title={t("addToCart", lang)}
                        >
                          🛒
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveFavorite?.(fav._id)}
                          className="rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 text-xs font-bold transition-all cursor-pointer"
                          title={t("remove", lang)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SOZLAMALAR */}
          {activeTab === "settings" && (
            <div className="flex flex-col gap-4">
              {/* Sayt tili */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🌐</span>
                    <span className="text-xs font-bold text-slate-800">{t("siteLanguage", lang)}</span>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    {currentLang.name}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGES.map((l) => {
                    const isSelected = lang === l.code;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => onLangChange?.(l.code)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-semibold transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20 font-bold"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-sm">{l.flag}</span>
                        <span>{l.short}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Xavfsizlik va status */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col gap-2.5 text-xs">
                <span className="font-bold text-slate-800">{t("accountStatus", lang)}</span>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>{t("authMethod", lang)}</span>
                  <span className="font-semibold text-slate-900">
                    {user?.hasGoogle ? "Google OAuth 2.0" : "Standart (Login/Parol)"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span>{t("security", lang)}</span>
                  <span className="font-semibold text-emerald-600">{t("securityProtected", lang)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 text-slate-600">
                  <span>{t("customerType", lang)}</span>
                  <span className="font-semibold text-slate-900 capitalize">
                    {user?.role === "admin" ? t("customerAdmin", lang) : t("customerRegular", lang)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ALOQA */}
          {activeTab === "contact" && (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                    {t("mainContactCenter", lang)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>

                <a
                  href="tel:+998958125012"
                  className="mt-3 flex items-center gap-3 text-lg sm:text-xl font-black text-slate-900 hover:text-indigo-600 transition-colors"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/30">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </span>
                  <span>+998 95 812 50 12</span>
                </a>

                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <a
                    href="tel:+998958125012"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 px-3 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-all"
                  >
                    <span>{t("callNow", lang)}</span>
                  </a>

                  <a
                    href="https://t.me/javohir_akmalov"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-2.5 px-4 text-xs font-bold text-white shadow-sm shadow-sky-500/25 hover:from-sky-600 hover:to-blue-700 transition-all"
                  >
                    <span>{t("telegramSupport", lang)}</span>
                  </a>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-white/80 border border-slate-200/70 p-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-sky-500 font-bold">@</span>
                    <span className="font-semibold text-slate-800">{t("telegramManagerTag", lang)}</span>
                  </div>
                  <a
                    href="https://t.me/javohir_akmalov"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-sky-600 hover:underline"
                  >
                    t.me/javohir_akmalov →
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span>⏰ {t("workingHours", lang)}</span>
                  <span className="font-semibold text-slate-900">{t("workingHoursVal", lang)}</span>
                </div>
                <div className="flex items-center justify-between py-1 text-slate-600">
                  <span>📍 {t("mainAddress", lang)}</span>
                  <span className="font-semibold text-slate-900">{t("mainAddressVal", lang)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Pastki Qismi (Footer) */}
        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-md border-t border-slate-100 p-4 px-5 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <img src="/images/tm-logo.png" alt="TM" className="h-4 w-4 rounded-sm object-contain" />
            <span className="font-semibold">Techno Market</span>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t("logout", lang)}
              </button>
            )}
            <button type="button" className={btn} onClick={onClose}>
              {t("close", lang)}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
