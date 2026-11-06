import { useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { api } from "../api";
import { Modal, btn, btnPrimary, input } from "./ui";
import { t } from "../i18n";

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

function Form({ notice, onClose, onLoggedIn, lang = "uz" }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isLogin = mode === "login";

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (isLogin) {
        // Login: Email, Username yoki Telefon orqali
        const data = await api("/auth/login", {
          method: "POST",
          body: {
            identifier: identifier.trim(),
            password,
          },
        });
        onLoggedIn(data.accessToken, data.user);
      } else {
        // Register: Email, Parol va ixtiyoriy ma'lumotlar
        await api("/auth/register", {
          method: "POST",
          body: {
            email: email.trim().toLowerCase(),
            password,
            name: name.trim() || undefined,
            username: username.trim().toLowerCase() || undefined,
            phone: phone.trim() || undefined,
          },
        });

        // Ro'yxatdan o'tgandan so'ng avtomatik login
        const loginData = await api("/auth/login", {
          method: "POST",
          body: {
            identifier: email.trim().toLowerCase(),
            password,
          },
        });
        onLoggedIn(loginData.accessToken, loginData.user);
      }
    } catch (err) {
      setError(err.message || "Xatolik yuz berdi. Qayta urinib ko'ring.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    setError("");
    setBusy(true);
    try {
      const rawToken = credentialResponse?.credential;
      if (!rawToken) throw new Error("Google hisobidan token olinmadi");
      const data = await api("/auth/google", {
        method: "POST",
        body: { credential: rawToken },
      });
      onLoggedIn(data.accessToken, data.user);
    } catch (err) {
      setError(err.message || "Google orqali kirishda xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  function handleGoogleError() {
    setError("Google orqali kirish bekor qilindi yoki xatolik yuz berdi");
  }

  return (
    <div className="flex flex-col p-6 sm:p-7">
      {/* Modal Header */}
      <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 mb-2.5">
          <img
            src="/images/tm-logo.png"
            alt="TechnoMarket Logo"
            className="h-10 w-10 rounded-2xl shadow-md shadow-blue-500/20 object-contain ring-1 ring-slate-200/60"
          />
          <div className="flex items-center text-2xl font-black tracking-tight">
            <span className="text-slate-900">Techno</span>
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">Market</span>
          </div>
        </div>

        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          {isLogin ? t("authLoginTitle", lang) : t("authRegisterTitle", lang)}
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
          {isLogin ? t("authSubtitleLogin", lang) : t("authSubtitleRegister", lang)}
        </p>

        {/* Tab switcher */}
        <div className="mt-4 flex w-full max-w-xs p-1 rounded-2xl bg-slate-100/80 border border-slate-200/60 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
              isLogin
                ? "bg-white text-indigo-600 shadow-sm shadow-slate-200 font-extrabold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {t("enterButton", lang)}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
              !isLogin
                ? "bg-white text-indigo-600 shadow-sm shadow-slate-200 font-extrabold"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {t("registerButton", lang)}
          </button>
        </div>
      </div>

      {notice && (
        <div className="mt-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 p-3.5 text-xs font-semibold text-indigo-900 shadow-xs flex items-center gap-2">
          <span>ℹ️</span>
          <span>{notice}</span>
        </div>
      )}

      {/* Google OAuth Tugmasi (Asosiy, rasmiy va oson kirish) */}
      <div className="mt-5 flex flex-col items-center">
        {GOOGLE_CLIENT_ID ? (
          <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div className="w-full flex justify-center min-h-[44px]">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                shape="pill"
                text={isLogin ? "signin_with" : "signup_with"}
                width="260"
                locale={lang}
              />
            </div>
          </GoogleOAuthProvider>
        ) : (
          <div className="w-full p-3 rounded-2xl bg-amber-50 border border-amber-200/70 text-[11px] text-amber-800 text-center font-medium">
            Google Client ID sozlanmagan. Iltimos, `.env` faylida tekshiring.
          </div>
        )}
      </div>

      {/* Ajratuvchi chiziq (Divider) */}
      <div className="relative flex items-center justify-center my-4">
        <div className="w-full border-t border-slate-200/80"></div>
        <span className="absolute bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {t("orWithEmail", lang)}
        </span>
      </div>

      {/* Forma */}
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        {isLogin ? (
          /* Login identifikatori (Email, Username yoki Telefon) */
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t("loginIdentifier", lang)}
            </label>
            <div className="relative">
              <input
                className={`${input} pl-9`}
                type="text"
                required
                placeholder={t("loginIdentifierPlaceholder", lang)}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                autoFocus
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                👤
              </span>
            </div>
          </div>
        ) : (
          /* Ro'yxatdan o'tish maydonlari */
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t("emailAddress", lang)} <span className="text-rose-500">*</span>
              </label>
              <input
                className={input}
                type="email"
                required
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t("fullNameLabel", lang)}
                </label>
                <input
                  className={input}
                  type="text"
                  placeholder="Ism Familiya"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t("usernameLabel", lang)}
                </label>
                <input
                  className={input}
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
                  autoComplete="username"
                />
              </div>
            </div>

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
                autoComplete="tel"
              />
            </div>
          </>
        )}

        {/* Parol maydoni */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            {t("password", lang)} <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              className={`${input} pr-10`}
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-semibold select-none"
              tabIndex={-1}
            >
              {showPassword ? "🔒" : "👁️"}
            </button>
          </div>
          {!isLogin && (
            <p className="mt-1 text-[11px] text-slate-400">
              {t("passwordHint", lang)}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200/80 p-3 text-xs font-semibold text-rose-700 flex items-start gap-2 shadow-xs">
            <span className="shrink-0 text-rose-500">⚠️</span>
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Tugmalar */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button type="button" className={btn} onClick={onClose} disabled={busy}>
            {t("cancel", lang)}
          </button>
          <button type="submit" className={`${btnPrimary} min-w-[110px]`} disabled={busy}>
            {busy ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>{t("waiting", lang)}</span>
              </span>
            ) : isLogin ? (
              t("enterButton", lang)
            ) : (
              t("registerButton", lang)
            )}
          </button>
        </div>

        {/* Pastki o'tish havolasi */}
        <button
          type="button"
          className="cursor-pointer text-center text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors pt-2 select-none"
          onClick={() => {
            setMode(isLogin ? "register" : "login");
            setError("");
          }}
        >
          {isLogin ? t("noAccountRegister", lang) : t("haveAccountLogin", lang)}
        </button>
      </form>
    </div>
  );
}

export default function AuthModal({ open, ...rest }) {
  return (
    <Modal open={open} onClose={rest.onClose}>
      <Form {...rest} />
    </Modal>
  );
}
