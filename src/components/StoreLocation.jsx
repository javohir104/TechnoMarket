import { useMemo } from "react";

// Do'kon sozlamalari (kelajakda o'zgartirish juda oson)
export const STORE_LOCATION_CONFIG = {
  name: "TechnoMarket Flagship Store",
  lat: 41.4225936,
  lng: 69.5514713,
  address: "Toshkent shahri, TechnoMarket bosh ofisi va do'koni",
  phone: "+998 95 812 50 12",
  hours: "Dushanba - Yakshanba: 09:00 - 21:00 (dam olish kunlarisiz)",
  telegram: "https://t.me/javohir_akmalov",
  googleMapsUrl: "https://www.google.com/maps/@41.4225936,69.5514713,16z?entry=ttu",
  directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=41.4225936,69.5514713",
};

export default function StoreLocation({ lang = "uz" }) {
  const mapEmbedUrl = useMemo(() => {
    const { lat, lng } = STORE_LOCATION_CONFIG;
    return `https://maps.google.com/maps?q=${lat},${lng}&hl=uz&z=16&output=embed`;
  }, []);

  return (
    <section id="store-location" className="my-10 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm max-w-full w-full min-h-[600px] sm:min-h-[700px] pb-10 sm:pb-12">
      <div className="grid w-full min-h-[600px] sm:min-h-[700px] grid-cols-1 gap-6 md:gap-8 md:grid-cols-12 items-stretch">
        {/* Do'kon ma'lumotlari */}
        <div className="col-span-full flex flex-col justify-between p-6 sm:p-8 lg:col-span-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md border border-white/10 mb-3">
              <span>📍</span>
              <span>{lang === "ru" ? "Наш магазин" : lang === "en" ? "Our Store" : "Bizning do‘konimiz"}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {STORE_LOCATION_CONFIG.name}
            </h3>

            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Do'konimizga tashrif buyurib, istalgan noutbuk, smartfon va aksessuarlarni joyida ko'rib, tekshirib xarid qilishingiz mumkin.
            </p>

            <div className="mt-6 space-y-4 text-xs sm:text-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-base shrink-0">
                  🏢
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Manzil</p>
                  <p className="font-semibold text-slate-200 mt-0.5">{STORE_LOCATION_CONFIG.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-base shrink-0">
                  ⏰
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ish vaqti</p>
                  <p className="font-semibold text-slate-200 mt-0.5">{STORE_LOCATION_CONFIG.hours}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-base shrink-0">
                  📞
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Aloqa telefoni</p>
                  <a
                    href={`tel:${STORE_LOCATION_CONFIG.phone.replace(/\s+/g, "")}`}
                    className="font-bold text-white hover:text-indigo-300 transition-colors mt-0.5 block"
                  >
                    {STORE_LOCATION_CONFIG.phone}
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-3">
            <a
              href={STORE_LOCATION_CONFIG.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700 active:scale-95 transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A2 2 0 013 15.488V5.512a2 2 0 011.553-1.954L9 2m0 18l6 3m-6-3V2m6 21l5.447-2.724A2 2 0 0021 18.488V8.512a2 2 0 00-1.553-1.954L15 5m0 18V5m0 0L9 2" />
              </svg>
              <span>Google Maps orqali yo‘lni ko‘rish</span>
            </a>

            <a
              href={STORE_LOCATION_CONFIG.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-3.5 py-2.5 text-xs font-bold text-white transition-colors"
            >
              Xaritada ochish ↗
            </a>
          </div>
        </div>

        {/* Google Maps Interactive Iframe */}
        <div className="col-span-full relative overflow-hidden lg:col-span-7">
          <iframe
            title="TechnoMarket do'koni xaritada"
            src={mapEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    </section>
  );
}
