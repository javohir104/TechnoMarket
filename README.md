# Techno Market — Frontend (React + Tailwind + Vite)

`telefon_market_backend` API'si uchun frontend.

## Ishga tushirish
```bash
npm install
npm run dev        # http://localhost:5173
```
Backend (`npm start`, port 3000) avval ishlab turishi kerak.
Backend manzili boshqa bo'lsa, `.env` faylida `VITE_API_URL` ni o'zgartiring.

Bazani namuna telefonlar bilan to'ldirish (backend papkasida): `npm run seed:products`

## Production build
```bash
npm run build      # dist/ papkasi
```

## Imkoniyatlar
- Telefonlarni ko'rish va qidirish (kirmasdan ham ishlaydi): nom, brend, tavsif bo'yicha
- Filtrlar: kategoriya (Flagman / Hamyonbop), brend, narx oralig'i, saralash
- Sahifalash va sahifadagi sonni tanlash
- Sevimlilar (♥) va savat — brauzerda (`localStorage`) saqlanadi
- Buyurtma berish (`POST /orders`): ism, telefon, manzil
- Ro'yxatdan o'tish / kirish (JWT `localStorage`da)
- Mahsulot qo'shish / tahrirlash / o'chirish — faqat administrator (vaqtinchalik oyna; to'liq admin panel keyingi bosqichda)
- Buyurtma: viloyat, tuman, yetkazish usuli, buyurtma raqami

## Tuzilma
```
src/
  api.js              fetch wrapper (xabarlar o'zbekchaga o'giriladi)
  hooks.js            useDebounced, useLocalStorage
  utils.js            narx formati, kategoriya nomlari
  App.jsx             asosiy holat va mantiq
  components/
    Filters, ProductCard, Pagination, CartDrawer,
    OrderModal, AuthModal, ProductModal, ui
```
