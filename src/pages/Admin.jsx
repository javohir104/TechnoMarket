import { useEffect, useMemo, useState } from "react";
import { api, getFailoverStatus, subscribeFailover, resetCircuitBreaker } from "../api";
import { formatPrice } from "../utils";
import { btn, btnPrimary, PhoneImage, Modal, Field, input } from "../components/ui";
import ProductModal from "../components/ProductModal";
import RevenueChart from "../components/RevenueChart";

const EXPENSE_CATEGORIES = [
  { id: "advertising", label: "Reklama xarajati", icon: "📢" },
  { id: "delivery", label: "Yetkazib berish xarajati", icon: "🚚" },
  { id: "rent", label: "Ijara", icon: "🏢" },
  { id: "internet", label: "Internet va aloqa", icon: "🌐" },
  { id: "salary", label: "Ish haqi", icon: "👥" },
  { id: "packaging", label: "Qadoqlash", icon: "📦" },
  { id: "other", label: "Boshqa xarajatlar", icon: "📋" },
];

export default function Admin({ user, token, onBack }) {
  // Bo'limlar: "dashboard" | "products" | "categories" | "orders" | "expenses" | "finance" | "users" | "settings"
  const [activeTab, setActiveTab] = useState("dashboard");

  // Asosiy ma'lumotlar
  const [dashboardStats, setDashboardStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [financeReport, setFinanceReport] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [failoverInfo, setFailoverInfo] = useState(getFailoverStatus());

  useEffect(() => {
    return subscribeFailover(() => {
      setFailoverInfo(getFailoverStatus());
    });
  }, []);

  // Yuklanish holatlari
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [resendingTelegramId, setResendingTelegramId] = useState(null);

  // Modallar va tahrirlash holatlari
  const [editingProduct, setEditingProduct] = useState(undefined);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // Filtrlar
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productCatFilter, setProductCatFilter] = useState("");
  const [expenseCatFilter, setExpenseCatFilter] = useState("");
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

  const [reloadKey, setReloadKey] = useState(0);
  const [adminToast, setAdminToast] = useState("");

  const showToast = (msg) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(""), 3500);
  };

  // 1. Dashboard real statistikasini yuklash
  useEffect(() => {
    if (!token) return;
    api("/admin/finance/dashboard", { token })
      .then((data) => setDashboardStats(data))
      .catch((err) => console.error("Dashboard stats xatosi:", err));
  }, [token, reloadKey]);

  // 2. Mahsulotlar va Brendlarni yuklash
  useEffect(() => {
    if (!token) return;
    api("/admin/products", { token })
      .then((list) => {
        const data = Array.isArray(list) ? list : [];
        setProducts(data);
        setBrands([...new Set(data.map((p) => p.brand).filter(Boolean))].sort());
      })
      .catch((err) => console.error("Mahsulotlarni yuklashda xato:", err));
  }, [token, reloadKey]);

  // 3. Kategoriyalarni yuklash
  useEffect(() => {
    if (!token) return;
    api("/admin/categories", { token })
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Kategoriyalar xatosi:", err));
  }, [token, reloadKey]);

  // 4. Buyurtmalarni yuklash
  useEffect(() => {
    if (!token) return;
    setLoadingOrders(true);
    api("/admin/orders?limit=200", { token })
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Buyurtmalarni yuklashda xato:", err))
      .finally(() => setLoadingOrders(false));
  }, [token, reloadKey]);

  // 5. Xarajatlarni yuklash
  useEffect(() => {
    if (!token) return;
    setLoadingExpenses(true);
    api("/admin/finance/expenses", { token })
      .then((data) => setExpenses(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Xarajatlarni yuklashda xato:", err))
      .finally(() => setLoadingExpenses(false));
  }, [token, reloadKey]);

  // 6. Tanlangan oy bo'yicha moliyaviy hisobotni yuklash
  useEffect(() => {
    if (!token) return;
    const [y, m] = reportMonth.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const from = `${reportMonth}-01`;
    const to = `${reportMonth}-${String(lastDay).padStart(2, "0")}`;

    api(`/admin/finance/report?from=${from}&to=${to}&groupBy=day`, { token })
      .then((rep) => setFinanceReport(rep))
      .catch((err) => console.error("Moliya hisobotida xato:", err));
  }, [token, reportMonth, reloadKey]);

  // 7. Foydalanuvchilarni yuklash
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [busyUserId, setBusyUserId] = useState(null);

  useEffect(() => {
    if (!token) return;
    setLoadingUsers(true);
    api("/admin/users", { token })
      .then((data) => setUsersList(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Foydalanuvchilarni yuklashda xato:", err))
      .finally(() => setLoadingUsers(false));
  }, [token, reloadKey]);

  async function handleToggleUserRole(u) {
    if (busyUserId) return;
    const nextRole = u.role === "admin" ? "user" : "admin";
    const confirmMsg = nextRole === "admin"
      ? `"${u.name || u.email}"ga Administrator huquqini bermoqchimisiz?`
      : `"${u.name || u.email}"ning Administrator huquqini bekor qilmoqchimisiz?`;
    if (!confirm(confirmMsg)) return;

    setBusyUserId(u._id);
    try {
      await api(`/admin/users/${u._id}/role`, {
        method: "PATCH",
        token,
        body: { role: nextRole },
      });
      showToast(`✓ Foydalanuvchi roli "${nextRole}" ga o'zgartirildi`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err.message || "Rolni o'zgartirishda xatolik");
    } finally {
      setBusyUserId(null);
    }
  }

  // Buyurtma holatini o'zgartirish ("Sotildi" yoki "Bekor qilindi")
  async function handleStatusChange(order, nextStatus) {
    if (busyOrderId) return;
    const isSold = nextStatus === "delivered";
    const confirmMsg = isSold
      ? `"${order.customerName}" xaridini tasdiqlaysizmi? Mahsulot rasman "Sotildi" deb belgilanadi va oylik sof daromadga qo'shiladi.`
      : `Buyurtma bekor qilinsinmi? Mahsulot omborga qaytariladi va tushum/tannarx hisobdan chiqariladi.`;

    if (!confirm(confirmMsg)) return;

    setBusyOrderId(order._id);
    try {
      if (order.status === "new" && nextStatus === "delivered") {
        await api(`/admin/orders/${order._id}/status`, {
          method: "PATCH",
          body: { status: "confirmed", note: "Tezkor tasdiqlandi" },
          token,
        });
      }
      await api(`/admin/orders/${order._id}/status`, {
        method: "PATCH",
        body: {
          status: nextStatus,
          note: isSold ? "Mijoz to'lovni amalga oshirdi, tovar yetkazildi" : "Mijoz xaridni bekor qildi",
        },
        token,
      });

      showToast(
        isSold
          ? `✓ Buyurtma #${order.orderNumber} "Sotildi" deb belgilandi! Daromadga qo'shildi ✨`
          : `Buyurtma #${order.orderNumber} bekor qilindi, ombor tiklandi`
      );
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyOrderId(null);
    }
  }

  // Telegram botga qayta yuborish
  async function handleResendTelegram(order) {
    if (resendingTelegramId) return;
    setResendingTelegramId(order._id);
    try {
      const res = await api(`/admin/orders/${order._id}/resend-telegram`, {
        method: "POST",
        token,
      });
      if (res.ok) {
        showToast(`✓ Telegram botga yuborildi!`);
      } else {
        showToast(`⚠️ Xatolik: ${res.error || "Yuborilmadi"}`);
      }
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setResendingTelegramId(null);
    }
  }

  // Mahsulotni o'chirish
  async function removeProduct(p) {
    if (!confirm(`"${p.name}" o'chirilsinmi?`)) return;
    try {
      await api(`/admin/products/${p._id}`, { method: "DELETE", token });
      showToast(`"${p.name}" o'chirildi`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    }
  }

  // Xarajatni o'chirish
  async function removeExpense(id) {
    if (!confirm("Ushbu xarajat o'chirilsinmi? Moliyaviy statistika qayta hisoblanadi.")) return;
    try {
      await api(`/admin/finance/expenses/${id}`, { method: "DELETE", token });
      showToast("Xarajat o'chirildi, sof daromad qayta hisoblandi");
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    }
  }

  // Kategoriyani o'chirish
  async function removeCategory(id, name) {
    if (!confirm(`"${name}" kategoriyasi o'chirilsinmi?`)) return;
    try {
      await api(`/admin/categories/${id}`, { method: "DELETE", token });
      showToast("Kategoriya o'chirildi");
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    }
  }

  // Filtr va qidiruv bo'yicha buyurtmalar
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = orderFilter === "all" ? true : o.status === orderFilter;
      const q = orderSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.phone?.includes(q) ||
        o.items?.some((i) => i.name.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [orders, orderFilter, orderSearch]);

  // Filtr bo'yicha mahsulotlar
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = !productCatFilter || p.category === productCatFilter;
      const q = productSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, productCatFilter, productSearch]);

  // Filtr bo'yicha xarajatlar
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      return !expenseCatFilter || e.category === expenseCatFilter;
    });
  }, [expenses, expenseCatFilter]);

  const newOrdersCount = orders.filter((o) => o.status === "new").length;
  const deliveredOrdersCount = orders.filter((o) => o.status === "delivered").length;

  if (user?.role !== "admin") {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <section className="mt-8 rounded-3xl border border-rose-100 bg-rose-50/50 p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            🔒
          </div>
          <h2 className="text-lg font-bold text-slate-900">Ruxsat cheklangan</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">
            Ushbu boshqaruv markaziga faqat admin huquqiga ega foydalanuvchilar kirishi mumkin.
          </p>
          <button className={btnPrimary} onClick={onBack}>
            Bosh sahifaga qaytish
          </button>
        </section>
      </main>
    );
  }

  // Dashboard KPI ko'rsatkichlari (real DB ma'lumotlaridan)
  const todayRevenue = dashboardStats?.today?.revenue || 0;
  const monthRevenue = dashboardStats?.month?.revenue || 0;
  const totalSales = dashboardStats?.total?.revenue || 0;
  const monthExpenses = dashboardStats?.month?.expenses || 0;
  const monthCogs = dashboardStats?.month?.cogs || 0;
  const monthNetProfit = dashboardStats?.month?.netProfit ?? (monthRevenue - monthCogs - monthExpenses);
  const pendingCount = dashboardStats?.pending?.count || newOrdersCount;
  const deliveredCount = dashboardStats?.total?.count || deliveredOrdersCount;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
      {/* Toast Alert */}
      {adminToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900/95 px-4 py-3 text-sm font-semibold text-white shadow-2xl backdrop-blur-md border border-slate-700 animate-bounce-short">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
          {adminToast}
        </div>
      )}

      {/* Top Header */}
      <div className="my-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-sm">
              TM
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              TechnoMarket Boshqaruv Markazi
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Moliyaviy hisob-kitob, xarajatlar, buyurtmalar, tannarx va mahsulotlar nazorati
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button className={btn} onClick={onBack}>
            ← Saytga qaytish
          </button>
          <button
            className={btnPrimary}
            onClick={() => {
              setActiveTab("products");
              setEditingProduct(null);
            }}
          >
            + Yangi mahsulot
          </button>
        </div>
      </div>

      {/* 10. ADMIN PANEL NAVIGATSIYASI (BARCHA BO'LIMLAR) */}
      <nav className="mb-6 flex items-center gap-1.5 border-b border-slate-200/80 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: "dashboard", label: "Dashboard", icon: "📊" },
          { id: "products", label: "Mahsulotlar", icon: "📱", badge: products.length },
          { id: "categories", label: "Kategoriyalar", icon: "📑", badge: categories.length },
          { id: "orders", label: "Buyurtmalar", icon: "📦", badge: newOrdersCount > 0 ? `${newOrdersCount} yangi` : orders.length },
          { id: "expenses", label: "Xarajatlar", icon: "💸", badge: expenses.length },
          { id: "finance", label: "Moliyaviy hisobot", icon: "📈" },
          { id: "users", label: "Foydalanuvchilar", icon: "👥", badge: usersList.length },
          { id: "settings", label: "Sozlamalar", icon: "⚙️" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    isActive
                      ? "bg-white text-indigo-700"
                      : String(tab.badge).includes("yangi")
                      ? "bg-amber-500 text-white animate-pulse"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ===================== 1. DASHBOARD ===================== */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* 4. ADMIN PANEL — MOLIYAVIY HISOB-KITOB 8 TA STATISTIKA KARTASI */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* 1. Bugungi savdo */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-blue-700 text-xs font-bold uppercase tracking-wider">
                <span>Bugungi savdo</span>
                <span className="text-xl">📅</span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {formatPrice(todayRevenue)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Bugun sotilgan buyurtmalar</p>
            </div>

            {/* 2. Oylik savdo */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-purple-50/40 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-indigo-700 text-xs font-bold uppercase tracking-wider">
                <span>Oylik savdo</span>
                <span className="text-xl">💰</span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-indigo-950 tracking-tight">
                {formatPrice(monthRevenue)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Joriy oyda sotilgan jami tovarlar</p>
            </div>

            {/* 3. Jami sotuvlar */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Jami sotuvlar</span>
                <span className="text-xl">🏛️</span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {formatPrice(totalSales)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Barcha davrdagi umumiy tushum</p>
            </div>

            {/* 4. Oylik xarajatlar */}
            <div className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50/80 to-orange-50/40 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-rose-700 text-xs font-bold uppercase tracking-wider">
                <span>Oylik xarajatlar</span>
                <span className="text-xl">💸</span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-rose-700 tracking-tight">
                {formatPrice(monthExpenses)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Ijara, reklama, oylik va boshqalar</p>
            </div>

            {/* 5. Sotilgan mahsulotlarning tannarxi */}
            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/80 to-yellow-50/40 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase tracking-wider">
                <span>Sotilgan tovarlar tannarxi</span>
                <span className="text-xl">🏷️</span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-amber-950 tracking-tight">
                {formatPrice(monthCogs)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Faqat sotilgan tovarlarning kelish narxi</p>
            </div>

            {/* 6. Sof daromad */}
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <span>Sof daromad (Oylik)</span>
                <span className="text-xl">✨</span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                {formatPrice(monthNetProfit)}
              </p>
              <p className="text-[11px] text-emerald-800/80 mt-1">
                Tushum − Tannarx − Xarajatlar
              </p>
            </div>

            {/* 7. Kutilayotgan buyurtmalar */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-amber-600 text-xs font-bold uppercase tracking-wider">
                <span>Kutilayotgan buyurtmalar</span>
                <span className="text-xl">⏳</span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {pendingCount} ta
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Tasdiqlash kutilayotgan xaridlar</p>
            </div>

            {/* 8. Tugallangan buyurtmalar */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between text-emerald-600 text-xs font-bold uppercase tracking-wider">
                <span>Tugallangan buyurtmalar</span>
                <span className="text-xl">✅</span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {deliveredCount} ta
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Muvaffaqiyatli yakunlangan savdolar</p>
            </div>
          </div>

          {/* Grafiklar: Savdo, Xarajatlar va Sof daromad */}
          <RevenueChart reportData={financeReport} series={financeReport?.series || []} />

          {/* So'nggi Yangi Buyurtmalar */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🔔</span> So'nggi yangi kelgan buyurtmalar
              </h3>
              <button
                onClick={() => {
                  setActiveTab("orders");
                  setOrderFilter("new");
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Barchasini ko'rish →
              </button>
            </div>

            {orders.filter((o) => o.status === "new").length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Hozircha yangi kutilayotgan buyurtma yo'q</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders
                  .filter((o) => o.status === "new")
                  .slice(0, 5)
                  .map((o) => (
                    <div key={o._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {o.orderNumber}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{o.customerName}</span>
                          <a href={`tel:${o.phone}`} className="text-xs text-indigo-600 font-semibold">
                            📞 {o.phone}
                          </a>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          📍 {o.address || "Manzil ko'rsatilmagan"} {o.house ? `(Uy: ${o.house})` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-900 text-sm">{formatPrice(o.total)}</span>
                        <button
                          type="button"
                          disabled={busyOrderId === o._id}
                          onClick={() => handleStatusChange(o, "delivered")}
                          className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                        >
                          ✓ Sotildi
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== 2. MAHSULOTLAR ===================== */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <input
                type="search"
                placeholder="Mahsulot nomi yoki brend bo'yicha qidirish..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs w-full sm:w-64 outline-none focus:bg-white focus:border-indigo-500"
              />
              <select
                value={productCatFilter}
                onChange={(e) => setProductCatFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Barcha kategoriyalar</option>
                {categories.map((c) => (
                  <option key={c._id || c.slug} value={c.slug || c.name}>
                    {c.icon || "📦"} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button className={btnPrimary} onClick={() => setEditingProduct(null)}>
              + Yangi mahsulot qo'shish
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3.5 w-16">Rasm</th>
                    <th className="px-5 py-3.5">Nomi</th>
                    <th className="px-4 py-3.5">Kategoriya</th>
                    <th className="px-4 py-3.5">Tannarxi (Kelish)</th>
                    <th className="px-4 py-3.5">Sotuv narxi</th>
                    <th className="px-4 py-3.5">Yalpi foyda</th>
                    <th className="px-4 py-3.5">Ombor</th>
                    <th className="px-5 py-3.5 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredProducts.map((p) => {
                    const marginVal = typeof p.costPrice === "number" ? p.price - p.costPrice : null;
                    return (
                      <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="h-12 w-12 rounded-xl border border-slate-200 bg-slate-50 p-1 flex items-center justify-center overflow-hidden">
                            <PhoneImage src={p.image} alt={p.name} category={p.category} className="h-full w-full object-contain" />
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          {p.name}
                          {p.brand && <span className="block text-[11px] text-slate-400 font-normal">{p.brand}</span>}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium">
                            {p.category || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-600 font-semibold">
                          {p.costPrice ? formatPrice(p.costPrice) : <span className="text-slate-300">kiritilmagan</span>}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-indigo-700">
                          {formatPrice(p.price)}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold">
                          {marginVal !== null ? (
                            <span className={marginVal >= 0 ? "text-emerald-600" : "text-rose-600"}>
                              {marginVal >= 0 ? "+" : ""}{formatPrice(marginVal)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              p.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${p.stock > 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
                            {p.stock} dona
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            className={`${btn} !py-1 !px-2.5 !text-xs mr-2`}
                            onClick={() => setEditingProduct(p)}
                          >
                            Tahrirlash
                          </button>
                          <button
                            className={`${btn} !py-1 !px-2.5 !text-xs !text-rose-600 hover:!bg-rose-50`}
                            onClick={() => removeProduct(p)}
                          >
                            O'chirish
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== 3. KATEGORIYALAR ===================== */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900">Mahsulot Kategoriyalari</h3>
              <p className="text-xs text-slate-500">
                Saytda va mahsulot qo'shish oynasida avtomatik paydo bo'ladigan kategoriyalar
              </p>
            </div>
            <button
              className={btnPrimary}
              onClick={() => {
                setEditingCategory(null);
                setCategoryModalOpen(true);
              }}
            >
              + Yangi kategoriya qo‘shish
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {categories.map((c) => (
              <div
                key={c._id || c.slug}
                className="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-2xl">
                    {c.icon || "📦"}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">slug: {c.slug}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingCategory(c);
                      setCategoryModalOpen(true);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    title="Tahrirlash"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => removeCategory(c._id, c.name)}
                    className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                    title="O'chirish"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== 4. BUYURTMALAR ===================== */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Controls: Search & Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setOrderFilter("all")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  orderFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Barchasi ({orders.length})
              </button>
              <button
                onClick={() => setOrderFilter("new")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  orderFilter === "new"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                Kutilmoqda / Yangi ({newOrdersCount})
              </button>
              <button
                onClick={() => setOrderFilter("delivered")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  orderFilter === "delivered"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Sotildi ✓ ({deliveredOrdersCount})
              </button>
              <button
                onClick={() => setOrderFilter("cancelled")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  orderFilter === "cancelled" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                Bekor qilingan ({orders.filter((o) => o.status === "cancelled").length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="search"
                placeholder="Buyurtma raqami, ism yoki telefon..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Orders List */}
          {loadingOrders ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-sm text-slate-500">
              Buyurtmalar yuklanmoqda...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
              <div className="mx-auto mb-2 text-3xl">📭</div>
              <p className="font-bold text-slate-800">Buyurtmalar topilmadi</p>
              <p className="text-xs text-slate-500 mt-1">Ushbu filtr bo'yicha buyurtma mavjud emas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const isNew = order.status === "new";
                const isDelivered = order.status === "delivered";
                const isCancelled = order.status === "cancelled";
                const isBusy = busyOrderId === order._id;

                const lat = order.location?.latitude;
                const lng = order.location?.longitude;
                const hasLocation = typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng);

                return (
                  <article
                    key={order._id}
                    className={`rounded-2xl border bg-white p-5 shadow-xs transition-all ${
                      isNew ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200/90"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(order.createdAt).toLocaleString("uz-UZ", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        {/* Telegram Bot holati nishoni va qayta yuborish */}
                        {order.telegramSent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold">
                            <span>🤖</span> Telegramga yetkazildi ✓
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[10px] font-bold">
                              <span>⚠️</span> Telegramga yetkazilmagan
                            </span>
                            <button
                              type="button"
                              disabled={resendingTelegramId === order._id}
                              onClick={() => handleResendTelegram(order)}
                              className="rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              {resendingTelegramId === order._id ? "Yuborilmoqda..." : "Qayta yuborish ↗"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Holat Badge */}
                      <div>
                        {isNew && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
                            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Yangi (Kutilmoqda)
                          </span>
                        )}
                        {order.status === "confirmed" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700">
                            ✓ Tasdiqlangan
                          </span>
                        )}
                        {order.status === "shipped" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-bold text-purple-700">
                            🚚 Yetkazilmoqda
                          </span>
                        )}
                        {isDelivered && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                            ✓ Sotildi (To'langan)
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700">
                            ✕ Bekor qilingan
                          </span>
                        )}
                        {order.status === "returned" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-300 px-3 py-1 text-xs font-bold text-slate-700">
                            ↩️ Qaytarilgan
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Customer & Address Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-3.5">
                      {/* Mijoz va Manzil */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Mijoz va Yetkazib berish
                        </p>
                        <p className="text-base font-bold text-slate-900">{order.customerName}</p>
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${order.phone}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                          >
                            📞 {order.phone}
                          </a>
                        </div>

                        <div className="text-xs text-slate-600 space-y-0.5 pt-1">
                          <p><b>Manzil:</b> {order.address || "—"}</p>
                          {(order.house || order.floor || order.apartment) && (
                            <p className="text-slate-500">
                              {order.house ? `Uy/bino: ${order.house}; ` : ""}
                              {order.floor ? `Qavat: ${order.floor}; ` : ""}
                              {order.apartment ? `Kvartira: ${order.apartment}` : ""}
                            </p>
                          )}
                          {order.landmark && (
                            <p className="text-slate-500"><b>Mo‘ljal:</b> {order.landmark}</p>
                          )}
                          {hasLocation && (
                            <a
                              href={`https://www.google.com/maps?q=${lat},${lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:underline pt-1"
                            >
                              <span>🗺️</span>
                              <span>Google Maps xaritada ko'rish ({lat.toFixed(4)}, {lng.toFixed(4)})</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Mahsulotlar */}
                      <div className="space-y-1.5 md:col-span-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Buyurtma tarkibi
                        </p>
                        <div className="space-y-1.5">
                          {order.items?.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl"
                            >
                              <div className="flex items-center gap-2">
                                {item.image ? (
                                  <img src={item.image} alt="" className="h-8 w-8 object-contain rounded" />
                                ) : (
                                  <span className="text-base">📱</span>
                                )}
                                <span className="font-semibold text-slate-800">
                                  {item.name}{" "}
                                  <span className="font-bold text-indigo-600">× {item.quantity} dona</span>
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-slate-900">{formatPrice(item.unitPrice * item.quantity)}</span>
                                {item.costPrice ? (
                                  <span className="block text-[10px] text-slate-400">
                                    Tannarx: {formatPrice(item.costPrice * item.quantity)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                          <span className="text-xs text-slate-500">Umumiy to'lov:</span>
                          <span className="text-lg font-black text-slate-900">{formatPrice(order.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {(isNew || order.status === "confirmed" || order.status === "shipped") && (
                      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStatusChange(order, "cancelled")}
                          className={`${btn} !py-1.5 !px-3 !text-xs !text-rose-600 hover:!bg-rose-50`}
                        >
                          ✕ Bekor qilish
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStatusChange(order, "delivered")}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:from-emerald-700 hover:to-teal-700 cursor-pointer active:scale-95"
                        >
                          ✓ Sotildi (Daromadga qo'shish)
                        </button>
                      </div>
                    )}
                    {isDelivered && (
                      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStatusChange(order, "returned")}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          ↩️ Qaytarildi (Omborga qaytarish)
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== 5. XARAJATLAR BO'LIMI ===================== */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Do'kon Xarajatlari</h3>
              <p className="text-xs text-slate-500">
                Reklama, yetkazib berish, ijara, ish haqi va boshqa xarajatlarni kiritish va boshqarish
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={expenseCatFilter}
                onChange={(e) => setExpenseCatFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none cursor-pointer"
              >
                <option value="">Barcha kategoriyalar</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>

              <button
                className={btnPrimary}
                onClick={() => {
                  setEditingExpense(null);
                  setExpenseModalOpen(true);
                }}
              >
                + Xarajat kiritish
              </button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Xarajat nomi</th>
                    <th className="px-4 py-3.5">Kategoriya</th>
                    <th className="px-4 py-3.5">Sana</th>
                    <th className="px-4 py-3.5">Summa</th>
                    <th className="px-4 py-3.5">Izoh</th>
                    <th className="px-5 py-3.5 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loadingExpenses ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500">
                        Xarajatlar yuklanmoqda...
                      </td>
                    </tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500">
                        Xarajatlar topilmadi. "+ Xarajat kiritish" tugmasi orqali yangi xarajat qo'shing.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e) => {
                      const catObj = EXPENSE_CATEGORIES.find((c) => c.id === e.category) || { label: e.category, icon: "📋" };
                      return (
                        <tr key={e._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-900">{e.title || "Xarajat"}</td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                              <span>{catObj.icon}</span>
                              <span>{catObj.label}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">
                            {new Date(e.date).toLocaleDateString("uz-UZ")}
                          </td>
                          <td className="px-4 py-3.5 font-mono font-black text-rose-600 text-sm">
                            -{formatPrice(e.amount)}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">
                            {e.note || "—"}
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                setEditingExpense(e);
                                setExpenseModalOpen(true);
                              }}
                              className={`${btn} !py-1 !px-2.5 !text-xs mr-2`}
                            >
                              Tahrirlash
                            </button>
                            <button
                              onClick={() => removeExpense(e._id)}
                              className={`${btn} !py-1 !px-2.5 !text-xs !text-rose-600 hover:!bg-rose-50`}
                            >
                              O'chirish
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== 6. MOLIYAVIY HISOBOT ===================== */}
      {activeTab === "finance" && (
        <div className="space-y-6">
          {/* Oy tanlash filtri */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Oylik Moliyaviy Hisobot</h3>
              <p className="text-xs text-slate-500">
                Formula: Tushum − Sotilgan mahsulotlar tannarxi = Yalpi foyda; Yalpi foyda − Xarajatlar = Sof daromad
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">Hisobot oyi:</label>
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>
          </div>

          {/* 7. FORMULA KO'RSATKICHLARI (ALOHIDA KARTALAR) */}
          {financeReport && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Tushum */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">1. Oylik Tushum</p>
                <p className="mt-1 text-xl font-black text-slate-900">{formatPrice(financeReport.totals?.revenue || 0)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Sotilgan tovarlar puli</p>
              </div>

              {/* Sotilgan tovarlar tannarxi */}
              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">2. Tovarlar tannarxi</p>
                <p className="mt-1 text-xl font-black text-slate-900">{formatPrice(financeReport.totals?.cogs || 0)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Kelish narxlari yig'indisi</p>
              </div>

              {/* Yalpi foyda */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">3. Yalpi foyda</p>
                <p className="mt-1 text-xl font-black text-indigo-950">{formatPrice(financeReport.totals?.grossProfit || 0)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Tushum − Tannarx</p>
              </div>

              {/* Boshqa xarajatlar */}
              <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">4. Boshqa xarajatlar</p>
                <p className="mt-1 text-xl font-black text-rose-700">{formatPrice(financeReport.totals?.expenses || 0)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Do'kon xarajatlari yig'indisi</p>
              </div>

              {/* Sof daromad */}
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 sm:col-span-2 lg:col-span-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">5. Sof daromad</p>
                <p className="mt-1 text-2xl font-black text-emerald-700">{formatPrice(financeReport.totals?.netProfit || 0)}</p>
                <p className="text-[10px] text-emerald-800/80 mt-0.5">Yalpi foyda − Xarajatlar</p>
              </div>
            </div>
          )}

          {/* Oylik grafik */}
          <RevenueChart reportData={financeReport} series={financeReport?.series || []} />

          {/* Eng ko'p sotilgan tovarlar */}
          {financeReport?.topProducts && financeReport.topProducts.length > 0 && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span>🏆</span> Eng ko'p sotilgan mahsulotlar ({reportMonth})
              </h3>
              <div className="divide-y divide-slate-100">
                {financeReport.topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700 text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500">{p.quantity} dona sotildi</span>
                      <span className="font-bold text-slate-900">{formatPrice(p.revenue)}</span>
                      <span className="font-black text-emerald-600">foyda: +{formatPrice(p.profit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== 7. FOYDALANUVCHILAR BO'LIMI ===================== */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>👥</span> Ro'yxatdan o'tgan foydalanuvchilar ({usersList.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mijozlar profillari, rollari va xaridlar statistikasi
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => setUserRoleFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    userRoleFilter === "all" ? "bg-white text-indigo-700 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  Barchasi ({usersList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter("user")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    userRoleFilter === "user" ? "bg-white text-indigo-700 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  Mijozlar ({usersList.filter((u) => u.role === "user").length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserRoleFilter("admin")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    userRoleFilter === "admin" ? "bg-white text-indigo-700 shadow-xs" : "hover:text-slate-900"
                  }`}
                >
                  Adminlar ({usersList.filter((u) => u.role === "admin").length})
                </button>
              </div>

              <input
                type="search"
                placeholder="Ism, email, username yoki telefon..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {loadingUsers ? (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center text-sm text-slate-500">
              Foydalanuvchilar yuklanmoqda...
            </div>
          ) : usersList.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center text-sm text-slate-500">
              Hozircha foydalanuvchilar ro'yxati bo'sh
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5">Foydalanuvchi</th>
                      <th className="px-5 py-3.5">Username</th>
                      <th className="px-5 py-3.5">Telefon</th>
                      <th className="px-5 py-3.5">Rol</th>
                      <th className="px-5 py-3.5">Xaridlar</th>
                      <th className="px-5 py-3.5">Sana</th>
                      <th className="px-5 py-3.5 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList
                      .filter((u) => {
                        if (userRoleFilter !== "all" && u.role !== userRoleFilter) return false;
                        if (userSearch.trim()) {
                          const q = userSearch.toLowerCase();
                          const matchName = (u.name || "").toLowerCase().includes(q);
                          const matchEmail = (u.email || "").toLowerCase().includes(q);
                          const matchUsername = (u.username || "").toLowerCase().includes(q);
                          const matchPhone = (u.phone || "").toLowerCase().includes(q);
                          if (!matchName && !matchEmail && !matchUsername && !matchPhone) return false;
                        }
                        return true;
                      })
                      .map((u) => {
                        const isSuperAdmin = u.email === "admin@test.uz";
                        const isAdminUser = u.role === "admin";
                        const isBusy = busyUserId === u._id;

                        return (
                          <tr key={u._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                {u.picture ? (
                                  <img
                                    src={u.picture}
                                    alt=""
                                    className="h-8 w-8 rounded-full object-cover border border-slate-200"
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-700 text-xs">
                                    {(u.name || u.email || "U").charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-slate-900">{u.name || "Noma'lum"}</p>
                                  <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              {u.username ? (
                                <span className="font-mono text-indigo-700 font-semibold">@{u.username}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              {u.phone ? (
                                <span className="font-mono font-medium text-slate-700">{u.phone}</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              {isAdminUser ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-700 border border-indigo-200">
                                  <span>👑</span> Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                                  <span>👤</span> Mijoz
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <div>
                                <span className="font-bold text-slate-900">{u.ordersCount || 0} ta buyurtma</span>
                                {u.totalSpent ? (
                                  <span className="block text-[11px] text-indigo-600 font-semibold">
                                    {formatPrice(u.totalSpent)}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                              {new Date(u.createdAt).toLocaleDateString("uz-UZ", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              {!isSuperAdmin && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleToggleUserRole(u)}
                                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                                    isAdminUser
                                  ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                                  }`}
                                >
                                  {isBusy
                                    ? "..."
                                    : isAdminUser
                                    ? "Adminlikni olish"
                                    : "Admin qilish"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== 8. SOZLAMALAR ===================== */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>📍</span> Do'kon joylashuvi sozlamalari (Google Maps)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sayt foydalanuvchilariga ko'rinadigan test do'kon manzili va koordinatalari
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-700 block">Koordinatalar:</span>
                <span className="font-mono text-indigo-700">Lat: 41.4225936, Lng: 69.5514713</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-700 block">Google Maps havolasi:</span>
                <a
                  href="https://www.google.com/maps/@41.4225936,69.5514713,16z?entry=ttu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 font-semibold underline truncate block"
                >
                  Xaritada tekshirish ↗
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>🤖</span> Telegram Bot Ulanishi
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Buyurtmalar avtomatik ravishda Telegram botingizga yuborilmoqda. Token va chat ID serverda xavfsiz saqlanadi.
            </p>
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-700">Telegram bot faol holatda</span>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODALLAR ===================== */}

      {/* Mahsulot qo'shish / tahrirlash modali */}
      <ProductModal
        open={editingProduct !== undefined}
        product={editingProduct ?? undefined}
        brands={brands}
        token={token}
        onClose={() => setEditingProduct(undefined)}
        onSaved={(msg) => {
          setEditingProduct(undefined);
          showToast(msg);
          setReloadKey((k) => k + 1);
        }}
      />

      {/* Xarajat kiritish / tahrirlash modali */}
      {expenseModalOpen && (
        <ExpenseModal
          expense={editingExpense}
          token={token}
          onClose={() => {
            setExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          onSaved={(msg) => {
            setExpenseModalOpen(false);
            setEditingExpense(null);
            showToast(msg);
            setReloadKey((k) => k + 1);
          }}
        />
      )}

      {/* Kategoriya qo'shish / tahrirlash modali */}
      {categoryModalOpen && (
        <CategoryManageModal
          category={editingCategory}
          token={token}
          onClose={() => {
            setCategoryModalOpen(false);
            setEditingCategory(null);
          }}
          onSaved={(msg) => {
            setCategoryModalOpen(false);
            setEditingCategory(null);
            showToast(msg);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </main>
  );
}

// Xarajat kiritish / tahrirlash formasi
function ExpenseModal({ expense, token, onClose, onSaved }) {
  const editing = !!expense;
  const [title, setTitle] = useState(expense?.title ?? "");
  const [amount, setAmount] = useState(expense?.amount ?? "");
  const [category, setCategory] = useState(expense?.category ?? "advertising");
  const [date, setDate] = useState(
    expense?.date ? new Date(expense.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState(expense?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError("Xarajat summasini to'g'ri kiriting");

    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        amount: amt,
        category,
        date,
        note: note.trim(),
      };

      if (editing) {
        await api(`/admin/finance/expenses/${expense._id}`, { method: "PUT", body, token });
        onSaved("Xarajat yangilandi");
      } else {
        await api("/admin/finance/expenses", { method: "POST", body, token });
        onSaved("Yangi xarajat qo'shildi, oylik hisobot qayta hisoblandi");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3.5 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-slate-900">
          {editing ? "Xarajatni tahrirlash" : "Yangi xarajat kiritish"}
        </h3>
        <p className="text-xs text-slate-500">
          Kiritilgan summa oylik moliyaviy hisobotda sof daromaddan avtomatik chegiriladi
        </p>

        <Field label="Xarajat nomi">
          <input
            className={input}
            required
            placeholder="Masalan: Instagram Target reklamasi, Ofis ijarasi..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Summasi (so'm)">
            <input
              className={`${input} font-mono font-bold`}
              type="number"
              min="1"
              required
              placeholder="1 000 000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>

          <Field label="Kategoriya">
            <select
              className={`${input} cursor-pointer`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Sana">
          <input
            className={input}
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>

        <Field label="Izoh (ixtiyoriy)">
          <textarea
            className={`${input} resize-y min-h-[60px]`}
            rows={2}
            placeholder="Xarajat haqida qo'shimcha tafsilotlar..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        {error && <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2 rounded-xl">{error}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" className={btn} onClick={onClose}>
            Bekor qilish
          </button>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Kategoriya qo'shish / tahrirlash modali
function CategoryManageModal({ category, token, onClose, onSaved }) {
  const editing = !!category;
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "📦");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Kategoriya nomini kiriting");
    setBusy(true);
    try {
      const body = { name: name.trim(), icon: icon.trim() || "📦" };
      if (editing) {
        await api(`/admin/categories/${category._id}`, { method: "PUT", body, token });
        onSaved("Kategoriya nomi o'zgartirildi");
      } else {
        await api("/admin/categories", { method: "POST", body, token });
        onSaved("Yangi kategoriya qo'shildi");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3.5 p-5 sm:p-6">
        <h3 className="text-lg font-bold text-slate-900">
          {editing ? "Kategoriyani tahrirlash" : "Yangi kategoriya qo'shish"}
        </h3>

        <div className="flex gap-2">
          <Field label="Kategoriya nomi" className="flex-1">
            <input
              className={input}
              required
              placeholder="Masalan: Planshetlar, Soatlar..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Belgi (icon)" className="w-20">
            <input
              className={`${input} text-center text-lg`}
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            />
          </Field>
        </div>

        {error && <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2 rounded-xl">{error}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" className={btn} onClick={onClose}>
            Bekor qilish
          </button>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
