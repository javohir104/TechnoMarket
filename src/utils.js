const fmt = new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 });

export const formatPrice = (n) => `${fmt.format(Number(n) || 0)} so'm`;

export const CATEGORY_LABELS = {
  laptop: "Noutbuklar",
  phone: "Smartfonlar",
  keyboard: "Klaviaturalar",
  mouse: "Sichqonchalar",
  accessory: "Aksessuarlar",
  flagship: "Smartfonlar",
  budget: "Smartfonlar",
};

export const CATEGORIES = [
  { id: "", label: "Barchasi", icon: "✨" },
  { id: "laptop", label: "Noutbuklar", icon: "💻" },
  { id: "phone", label: "Smartfonlar", icon: "📱" },
  { id: "keyboard", label: "Klaviaturalar", icon: "⌨️" },
  { id: "mouse", label: "Sichqonchalar", icon: "🖱️" },
  { id: "accessory", label: "Aksessuarlar", icon: "🎧" },
];

export const MAX_QTY = 20; // backend ham shuncha ruxsat beradi
export const PHONE_RE = /^\+?[0-9\s()-]{9,24}$/; // backend bilan bir xil

export const CONDITION_LABELS = { new: "Yangi", used: "Ishlatilgan" };
