/**
 * Lọc tự động sau khi đăng bài: từ khóa cấm + heuristics ảnh (placeholder URL, không HTTPS).
 * Có thể mở rộng bằng biến môi trường CONTENT_BLACKLIST (cách nhau bởi dấu phẩy).
 */

const normalizeText = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const DEFAULT_BLACKLIST = [
  "ma tuy",
  "ban ma tuy",
  "ban sung",
  "sung dan",
  "lam gia giay to",
  "lam gcmnd",
  "hack",
  "crack",
  "lau",
  "sex",
  "xxx",
  "casino",
  "co bac",
  "no hu",
];

const evaluateProductContent = ({ title, description, images }) => {
  const reasons = [];
  const extra = (process.env.CONTENT_BLACKLIST || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const blacklist = [...DEFAULT_BLACKLIST, ...extra.map(normalizeText)];

  const blob = normalizeText(`${title} ${description}`);
  for (const word of blacklist) {
    const nw = normalizeText(word);
    if (nw.length >= 2 && blob.includes(nw)) {
      reasons.push(`keyword:${word}`);
    }
  }

  const imgArr = Array.isArray(images) ? images : [];
  for (const raw of imgArr) {
    const u = String(raw || "").trim().toLowerCase();
    if (!u) {
      reasons.push("image:empty_url");
      continue;
    }
    if (!u.startsWith("https://")) {
      reasons.push("image:not_https");
      break;
    }
    try {
      const host = new URL(u).hostname.replace(/^www\./, "");
      if (
        host.includes("placeholder") ||
        host.includes("via.placeholder") ||
        host.includes("fakeimg") ||
        u.includes("spam")
      ) {
        reasons.push("image:suspicious_host");
        break;
      }
    } catch {
      reasons.push("image:invalid_url");
      break;
    }
  }

  const unique = [...new Set(reasons)];
  return { flagged: unique.length > 0, reasons: unique };
};

module.exports = {
  evaluateProductContent,
};
