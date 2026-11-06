import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api";
import { formatPriceWithLang, t } from "../i18n";
import { PHONE_RE } from "../utils";

// Leaflet default marker icon fix
const customMarkerIcon = L.divIcon({
  className: "custom-map-marker",
  html: `
    <div style="position: relative; width: 38px; height: 38px; transform: translate(-50%, -100%);">
      <div style="width: 38px; height: 38px; border-radius: 50% 50% 50% 0; background: linear-gradient(135deg, #4f46e5, #ec4899); transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.45); border: 2px solid #ffffff;">
        <div style="width: 14px; height: 14px; background: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
      </div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});

export default function OrderModal({ open, items = [], total = 0, onClose, onDone, lang = "uz", user, token }) {
  const [customerName, setCustomerName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "+998 ");
  const [address, setAddress] = useState("");
  const [house, setHouse] = useState("");
  const [floor, setFloor] = useState("");
  const [apartment, setApartment] = useState("");
  const [landmark, setLandmark] = useState("");
  const [coords, setCoords] = useState({ lat: 41.311081, lng: 69.240562 }); // Default Toshkent
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const [createdOrder, setCreatedOrder] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (user) {
      if (!customerName && user.name) setCustomerName(user.name);
      if ((!phone || phone === "+998 ") && user.phone) setPhone(user.phone);
    }
  }, [user]);

  // Telefon raqamni to'g'ri formatlash
  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith("+998")) {
      val = "+998 " + val.replace(/\D/g, "");
    }
    // Faqat raqamlar va bo'shliqlarni saqlash
    const digits = val.replace(/\D/g, "");
    let formatted = "+998";
    if (digits.length > 3) formatted += " " + digits.substring(3, 5);
    if (digits.length > 5) formatted += " " + digits.substring(5, 8);
    if (digits.length > 8) formatted += " " + digits.substring(8, 10);
    if (digits.length > 10) formatted += " " + digits.substring(10, 12);
    setPhone(formatted);
  };

  // Reverse geocoding (koordinatadan manzil nomini aniqlash)
  async function fetchAddressFromCoords(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "uz,ru,en" } }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address || {};
        const road = addr.road || addr.street || addr.pedestrian || addr.suburb || addr.neighbourhood || "";
        const city = addr.city || addr.town || addr.county || "Toshkent";
        const cleanAddr = [city, road].filter(Boolean).join(", ");
        if (cleanAddr) {
          setAddress(cleanAddr);
        } else {
          setAddress(data.display_name.split(",").slice(0, 3).join(","));
        }
        if (addr.house_number && !house) {
          setHouse(addr.house_number);
        }
      }
    } catch (_err) {
      // Offline yoki tarmoq xatosi bo'lsa manzil koordinata sifatida qoladi
    }
  }

  // Xarita inicializatsiyasi
  useEffect(() => {
    if (!open || createdOrder || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 15,
        zoomControl: false,
      });

      L.control.zoom({ position: "topright" }).addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([coords.lat, coords.lng], {
        icon: customMarkerIcon,
        draggable: true,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setCoords({ lat: pos.lat, lng: pos.lng });
        fetchAddressFromCoords(pos.lat, pos.lng);
      });

      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCoords({ lat, lng });
        fetchAddressFromCoords(lat, lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Agar manzil hali kiritilmagan bo'lsa, joriy koordinataning manzilini aniqlash
      if (!address) {
        fetchAddressFromCoords(coords.lat, coords.lng);
      }
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [open, createdOrder]);

  // Modal yopilganda xaritani tozalash
  useEffect(() => {
    if (!open && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
  }, [open]);

  // GPS orqali hozirgi joylashuvni aniqlash
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Brauzeringizda geolokatsiya qo'llab-quvvatlanmaydi");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }
        fetchAddressFromCoords(lat, lng);
      },
      (err) => {
        console.warn("GPS xatosi:", err.message);
        alert("Joylashuvni aniqlab bo'lmadi. Iltimos, xaritadan o'zingiz tanlang.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Manzil bo'yicha qidirish
  const handleSearchAddress = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const q = encodeURIComponent(`${searchQuery.trim()}, O'zbekiston`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`, {
        headers: { "Accept-Language": "uz,ru,en" },
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setCoords({ lat, lng });
        setAddress(data[0].display_name.split(",").slice(0, 3).join(","));
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }
      } else {
        alert("Manzil topilmadi. Qidiruv so'zini aniqroq kiriting yoki xaritadan tanlang.");
      }
    } catch (_err) {
      alert("Qidiruvda xatolik yuz berdi. Xaritadan bevosita tanlashingiz mumkin.");
    } finally {
      setSearching(false);
    }
  };

  // Buyurtmani yuborish
  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");

    if (!customerName.trim()) {
      setError(lang === "ru" ? "Введите ваше имя" : "Iltimos, ismingizni kiriting");
      return;
    }

    const cleanPhone = phone.trim();
    if (!PHONE_RE.test(cleanPhone) || cleanPhone.replace(/\D/g, "").length < 9) {
      setError(
        lang === "ru"
          ? "Введите правильный номер телефона (+998 90 123 45 67)"
          : "Telefon raqamini to'g'ri formatda kiriting (+998 90 123 45 67)"
      );
      return;
    }

    if (!address.trim()) {
      setError(lang === "ru" ? "Укажите адрес доставки" : "Yetkazib berish manzilini kiriting yoki xaritadan tanlang");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        phone: cleanPhone,
        address: address.trim(),
        house: house.trim(),
        floor: floor.trim(),
        apartment: apartment.trim(),
        landmark: landmark.trim(),
        location: {
          latitude: coords.lat,
          longitude: coords.lng,
        },
        deliveryMethod: "courier",
        items: items.map((i) => ({ productId: i.id || i._id, quantity: i.qty })),
      };

      const order = await api("/orders", {
        method: "POST",
        token: token || undefined,
        body: payload,
      });

      setCreatedOrder(order);
      if (typeof onDone === "function") {
        onDone();
      }
    } catch (err) {
      setError(err.message || "Buyurtma berishda xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      {/* 2. BUYURTMA QABUL QILINGANI HAQIDAGI MUVAFFAQIYAT EKRANI */}
      {createdOrder ? (
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 sm:p-8 text-center shadow-2xl border border-slate-100 animate-scale-up">
          {/* Animatsiyali yashil checkmark */}
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner ring-8 ring-emerald-50/50">
            <svg
              className="h-10 w-10 animate-bounce-short"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Buyurtmangiz muvaffaqiyatli qabul qilindi!
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
            Tez orada siz bilan bog‘lanamiz.
          </p>

          <div className="my-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Buyurtma raqamingiz</p>
            <p className="mt-1 font-mono text-2xl font-black text-indigo-950 tracking-wider">
              {createdOrder.orderNumber}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-indigo-100/80 pt-2.5 text-xs text-slate-600">
              <span>Yetkazib berish:</span>
              <span className="font-bold text-slate-900">Kuryer orqali eshikkacha</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
              <span>Umumiy to'lov:</span>
              <span className="font-extrabold text-indigo-700">{formatPriceWithLang(total, lang)}</span>
            </div>
          </div>

          <button
            type="button"
            className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:from-indigo-700 hover:to-indigo-800 active:scale-98 transition-all cursor-pointer"
            onClick={onClose}
          >
            Tushundim
          </button>
        </div>
      ) : (
        /* 1. BUYURTMA BERISH VA MANZIL TANLASH OYNASI */
        <div className="relative flex flex-col w-full sm:max-w-4xl h-auto sm:h-[92vh] max-h-[95vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200/90">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white z-20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-black text-base shadow-sm">
                TM
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Yetkazib berish manzilini tanlang
                </h3>
                <p className="text-[11px] text-slate-500">
                  Xaritada joylashuvingizni belgilang yoki manzilni kiriting
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
              title="Yopish"
            >
              ✕
            </button>
          </div>

          {/* Map Area */}
          <div className="relative flex-1 w-full min-h-[260px] bg-slate-100 overflow-hidden">
            <div ref={mapContainerRef} className="h-full w-full z-10" />

            {/* Map Controls: Search & GPS button */}
            <div className="absolute top-3 left-3 right-14 z-20 flex items-center gap-2 max-w-md">
              <form onSubmit={handleSearchAddress} className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ko'cha, mahalla yoki mo'ljal qidiring..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md px-4 py-2.5 pr-10 text-xs sm:text-sm font-medium text-slate-800 shadow-md outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="absolute right-1.5 top-1.5 bottom-1.5 flex items-center justify-center rounded-xl bg-indigo-600 px-2.5 text-white shadow-xs hover:bg-indigo-700 cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
            </div>

            {/* GPS Floating Button */}
            <button
              type="button"
              onClick={handleLocateMe}
              className="absolute bottom-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-md text-indigo-600 shadow-lg border border-slate-200/80 hover:bg-indigo-50 transition-all cursor-pointer group"
              title="Mening joylashuvim"
            >
              <svg className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3m10-10h-3M5 12H2m15.071 7.071l-2.121-2.121M9.05 9.05L6.929 6.929m10.142 0l-2.121 2.121M9.05 14.95l-2.121 2.121M12 17a5 5 0 100-10 5 5 0 000 10z" />
              </svg>
            </button>
          </div>

          {/* Floating Address Form Card (Rasm uslubida, TechnoMarket dizayni) */}
          <form
            onSubmit={handleSubmit}
            className="z-20 bg-white border-t border-slate-200/80 p-4 sm:p-5 shadow-lg max-h-[60vh] sm:max-h-[50vh] overflow-y-auto"
          >
            {/* Customer Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Ism-familiyangiz <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ism va familiyangiz"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Telefon raqami <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+998 90 123 45 67"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs sm:text-sm font-mono font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            {/* Address Field */}
            <div className="mb-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Yetkazib berish manzili <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Shahar, ko'cha, mahalla nomi..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 pl-9 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                <span className="pointer-events-none absolute left-3 top-2.5 text-indigo-500 text-sm">
                  📍
                </span>
              </div>
            </div>

            {/* 3 Columns: House | Floor | Apartment */}
            <div className="grid grid-cols-3 gap-2.5 mb-3">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 truncate">
                  Uy / Bino
                </label>
                <input
                  type="text"
                  placeholder="Masalan: 14"
                  value={house}
                  onChange={(e) => setHouse(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 truncate">
                  Qavat (ixtiyoriy)
                </label>
                <input
                  type="text"
                  placeholder="Masalan: 4"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 truncate">
                  Kvartira (ixtiyoriy)
                </label>
                <input
                  type="text"
                  placeholder="Masalan: 32"
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            {/* Landmark (Mo'ljal) */}
            <div className="mb-3.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Mo‘ljal (Orientir)
              </label>
              <input
                type="text"
                placeholder="Yaqinidagi maktab, metro, do'kon yoki bino..."
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-3 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Bottom Bar: Total & Submit Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <span className="text-xs text-slate-500">Jami ({items.reduce((s, i) => s + i.qty, 0)} dona):</span>
                <span className="text-lg font-black text-slate-900">
                  {formatPriceWithLang(total, lang)}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="flex-1 sm:flex-initial rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Bekor qilish
                </button>

                {/* Pushti / Indigo zamonaviy gradient tugma (Rasmga mos "Подтвердить адрес" / "Buyurtma berish") */}
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 sm:flex-initial rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-pink-500/25 hover:from-pink-600 hover:to-indigo-700 active:scale-98 disabled:opacity-50 cursor-pointer transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Yuborilmoqda...</span>
                    </>
                  ) : (
                    <span>Buyurtma berish</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
