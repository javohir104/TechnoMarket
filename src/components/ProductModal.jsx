import { useEffect, useState } from "react";
import { api } from "../api";
import { formatPrice } from "../utils";
import { Modal, Field, PhoneImage, btn, btnPrimary, input } from "./ui";

const DEFAULT_BRANDS = [
  "Apple", "ASUS", "Lenovo", "Logitech", "Razer", "Redragon",
  "Samsung", "Xiaomi", "HP", "Dell", "Acer", "MSI", "Sony"
];

function Form({ product, brands = [], token, onClose, onSaved }) {
  const editing = !!product;
  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? "");
  const [category, setCategory] = useState(product?.category ?? "phone");
  const [image, setImage] = useState(product?.image ?? "");
  const [stock, setStock] = useState(product?.stock ?? 1);
  const [description, setDescription] = useState(product?.description ?? "");

  // Kategoriyalar
  const [categories, setCategories] = useState([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📦");
  const [catSaving, setCatSaving] = useState(false);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Kategoriyalarni bazadan yuklash
  useEffect(() => {
    api("/categories")
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setCategories(list);
          if (!product && !category && list[0]) {
            setCategory(list[0].slug || list[0].name);
          }
        }
      })
      .catch((err) => console.error("Kategoriyalarni yuklashda xato:", err));
  }, []);

  const allBrands = Array.from(new Set([...DEFAULT_BRANDS, ...brands])).sort();

  // Foyda hisob-kitobi (Yalpi foyda = Sotuv narxi - Kelish narxi)
  const priceNum = Number(price) || 0;
  const costNum = Number(costPrice) || 0;
  const margin = priceNum > 0 && costNum > 0 ? priceNum - costNum : null;
  const marginPercent = priceNum > 0 && costNum > 0 ? Math.round(((priceNum - costNum) / priceNum) * 100) : null;

  // Yangi kategoriya qo'shish
  async function handleAddCategory(e) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatSaving(true);
    try {
      const added = await api("/admin/categories", {
        method: "POST",
        token,
        body: {
          name: newCatName.trim(),
          icon: newCatIcon.trim() || "📦",
        },
      });
      setCategories((prev) => [...prev, added]);
      setCategory(added.slug || added.name);
      setNewCatName("");
      setAddingCategory(false);
    } catch (err) {
      alert(err.message || "Kategoriya qo'shishda xato");
    } finally {
      setCatSaving(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return setError("Sotuv narxini to'g'ri kiriting");
    }

    setBusy(true);
    const body = {
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      type: category.trim(),
      image: image.trim(),
      price: priceNum,
      costPrice: costPrice !== "" && !isNaN(costNum) ? costNum : null,
      description: description.trim(),
      stock: Number(stock),
    };

    try {
      if (editing) {
        await api(`/admin/products/${product._id}`, { method: "PUT", body, token });
      } else {
        await api("/admin/products", { method: "POST", body, token });
      }
      onSaved(editing ? "Mahsulot muvaffaqiyatli yangilandi" : "Yangi mahsulot do'konga qo'shildi");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5 p-5 sm:p-6">
      {/* Header */}
      <div className="sticky top-0 sm:-top-6 mx-0 sm:-mx-6 mt-0 sm:-mt-6 bg-white/95 backdrop-blur-md px-5 sm:px-6 pt-5 pb-3 border-b border-slate-100 z-10">
        <h2 className="text-xl font-bold text-slate-900">
          {editing ? "Mahsulotni tahrirlash" : "Yangi mahsulot qo'shish"}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {editing
            ? "Tovar ma'lumotlarini va narxlarini o'zgartirish"
            : "Do'konga yangi tovar, tannarx va sotuv narxini kiritish"}
        </p>
      </div>

      <Field label="Mahsulot nomi">
        <input
          className={input}
          required
          placeholder="Apple MacBook Air 13 M3 yoki iPhone 16 Pro..."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      {/* Kategoriya va Brend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Field label="Kategoriya">
            <select
              className={`${input} cursor-pointer`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c._id || c.slug} value={c.slug || c.name}>
                  {c.icon || "📦"} {c.name}
                </option>
              ))}
            </select>
          </Field>
          {!addingCategory ? (
            <button
              type="button"
              onClick={() => setAddingCategory(true)}
              className="mt-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
            >
              <span>+</span>
              <span>Yangi kategoriya qo‘shish</span>
            </button>
          ) : (
            <div className="mt-2 p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 text-xs space-y-2">
              <p className="font-bold text-indigo-900 text-[11px]">Yangi kategoriya yaratish</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Kategoriya nomi..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Belgi (icon)"
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="w-12 rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-center text-xs outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setAddingCategory(false)}
                  className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                >
                  Bekor
                </button>
                <button
                  type="button"
                  disabled={catSaving || !newCatName.trim()}
                  onClick={handleAddCategory}
                  className="rounded-lg bg-indigo-600 px-3 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  {catSaving ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </div>
          )}
        </div>

        <Field label="Brend">
          <input
            className={input}
            list="brand-options"
            placeholder="Apple, ASUS, Logitech..."
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
          <datalist id="brand-options">
            {allBrands.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>
      </div>

      {/* 6. MAHSULOT TANNARXI VA SOTUV NARXI (ALOHIDA IKKITA MAYDON) */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-slate-50/70 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span>💰</span> Narxlar va Tannarx
          </p>
          <span className="text-[10px] text-slate-400">Tannarx faqat adminda ko'rinadi</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. Kelish narxi (tannarxi) */}
          <Field label="1. Kelish narxi / Tannarxi (so'm)">
            <input
              className={`${input} font-mono font-bold bg-white`}
              type="number"
              min="0"
              step="1"
              placeholder="Masalan: 2 000 000"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
          </Field>

          {/* 2. Sotuv narxi */}
          <Field label="2. Sotuv narxi (so'm)">
            <input
              className={`${input} font-mono font-bold text-indigo-700 bg-white`}
              type="number"
              min="0"
              step="any"
              required
              placeholder="Masalan: 2 500 000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
        </div>

        {/* Real vaqtda yalpi foyda ko'rsatkichi */}
        {margin !== null && (
          <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-indigo-100 text-xs">
            <span className="font-medium text-slate-600">Bir dona mahsulotdan yalpi foyda:</span>
            <span className={`font-black ${margin >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {margin >= 0 ? "+" : ""}{formatPrice(margin)} {marginPercent !== null ? `(${marginPercent}%)` : ""}
            </span>
          </div>
        )}
      </div>

      {/* Ombordagi qoldiq */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Ombordagi qoldiq (dona)">
          <input
            className={input}
            type="number"
            min="0"
            step="1"
            required
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </Field>
        <Field label="Rasm havolasi (URL)">
          <input
            className={input}
            type="url"
            placeholder="https://..."
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />
        </Field>
      </div>

      {image.trim() && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/80 p-3 flex items-center justify-center">
          <PhoneImage
            src={image.trim()}
            alt="Ko'rinish"
            category={category}
            className="h-28 sm:h-36 w-full object-contain"
          />
        </div>
      )}

      <Field label="Tavsif (xususiyatlari, parametri)">
        <textarea
          className={`${input} resize-y min-h-[70px]`}
          rows={3}
          placeholder="Protsessor, operativ xotira, holati va tavsifi..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      {error && (
        <p className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-xs font-semibold text-rose-600">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 sm:-bottom-6 mx-0 sm:-mx-6 mb-0 sm:-mb-6 bg-white/95 backdrop-blur-md px-5 sm:px-6 py-3.5 border-t border-slate-100 flex justify-end gap-2.5 z-10">
        <button type="button" className={btn} onClick={onClose}>
          Bekor qilish
        </button>
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </div>
    </form>
  );
}

export default function ProductModal({ open, product, ...rest }) {
  return (
    <Modal open={open} onClose={rest.onClose}>
      <Form key={product?._id ?? "new"} product={product} {...rest} />
    </Modal>
  );
}
