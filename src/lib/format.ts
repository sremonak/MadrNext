/** Shared formatting helpers (client-safe). */

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Convert ASCII digits to Bengali numerals for display. */
export function bnDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

export function formatTaka(paisa: number): string {
  const taka = paisa / 100;
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: taka % 1 === 0 ? 0 : 2,
  }).format(taka);
  return `৳${bnDigits(formatted)}`;
}

export function formatNumberBn(value: number): string {
  return bnDigits(new Intl.NumberFormat("en-IN").format(value));
}

export function formatDurationBn(minutes: number): string {
  if (minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${bnDigits(h)} ঘণ্টা ${bnDigits(m)} মি`;
  if (h) return `${bnDigits(h)} ঘণ্টা`;
  return `${bnDigits(m)} মিনিট`;
}

export function formatSecondsBn(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${bnDigits(m)}:${bnDigits(String(s).padStart(2, "0"))}`;
}

const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

export function formatDateBn(date: Date | string | number): string {
  const d = new Date(date);
  return `${bnDigits(d.getDate())} ${BN_MONTHS[d.getMonth()]}, ${bnDigits(d.getFullYear())}`;
}

export function formatDateTimeBn(date: Date | string | number): string {
  const d = new Date(date);
  const hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ampm = hh < 12 ? "AM" : "PM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${formatDateBn(d)}, ${bnDigits(h12)}:${bnDigits(mm)} ${ampm}`;
}

export function relativeTimeBn(date: Date | string | number): string {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "এই মুহূর্তে";
  if (min < 60) return `${bnDigits(min)} মিনিট আগে`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${bnDigits(hr)} ঘণ্টা আগে`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${bnDigits(day)} দিন আগে`;
  return formatDateBn(date);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("");
}
