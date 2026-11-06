/**
 * TechnoMarket API Client with Automatic Failover (Primary -> Backup)
 * 
 * PRIMARY API: https://bg-t6dz.onrender.com
 * BACKUP API:  https://bg-1-knxc.onrender.com
 */

export const PRIMARY_API_URL = (
  (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.VITE_PRIMARY_API_URL || import.meta.env.VITE_API_URL)) ||
  "https://bg-t6dz.onrender.com"
).replace(/\/+$/, "");

export const BACKUP_API_URL = (
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKUP_API_URL) ||
  "https://bg-1-knxc.onrender.com"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status = 0, server = "unknown") {
    super(message);
    this.status = status;
    this.server = server;
  }
}

export class UnauthorizedError extends ApiError {}

// Backend xabarlari inglizcha — foydalanuvchiga o'zbekcha ko'rsatamiz
const MESSAGES = {
  "Invalid email or password": "Email yoki parol noto'g'ri",
  "Email already registered": "Bu email allaqachon ro'yxatdan o'tgan",
  "This email is already registered": "Bu email allaqachon ro'yxatdan o'tgan",
  "Email and password are required": "Email va parolni kiriting",
  "Password must contain at least 6 characters": "Parol kamida 6 ta belgidan iborat bo'lishi kerak",
  "Access token required": "Sessiya tugadi, qayta kiring",
  "Invalid or expired access token": "Sessiya tugadi, qayta kiring",
  "You can only edit your own listing": "Faqat o'z e'loningizni tahrirlay olasiz",
  "You can only delete your own listing": "Faqat o'z e'loningizni o'chira olasiz",
  "Product not found": "Mahsulot topilmadi",
  "Invalid product id": "Mahsulot identifikatori noto'g'ri",
  "name (non-empty string) and price (non-negative number) are required": "Nomi va narxini to'g'ri kiriting",
  "minPrice cannot be greater than maxPrice": "Minimal narx maksimaldan katta bo'lmasligi kerak",
  "Server error. Please try again later.": "Serverda xatolik. Keyinroq urinib ko'ring.",
};
export const translateError = (msg) => MESSAGES[msg] || msg;

/**
 * Tasodifiy unikal ID yaratish (Idempotency va so'rov monitoringi uchun)
 */
export function generateRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Circuit Breaker sinfi
 * Primary server nosoz bo'lsa, har bir so'rovni 10 soniya kuttirmasdan,
 * to'g'ridan-to'g'ri Backup serverga yo'naltiradi va vaqti-vaqti bilan
 * Primary tiklanganligini tekshirib turadi.
 */
export class CircuitBreaker {
  constructor({
    primaryUrl = PRIMARY_API_URL,
    backupUrl = BACKUP_API_URL,
    threshold = 2,
    coolDownMs = 30000,
  } = {}) {
    this.primaryUrl = primaryUrl;
    this.backupUrl = backupUrl;
    this.threshold = threshold;
    this.coolDownMs = coolDownMs;

    this.state = "CLOSED"; // "CLOSED" (sog'lom) | "OPEN" (nosoz) | "HALF_OPEN" (sinov)
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.activeServer = "primary"; // "primary" | "backup"
    this.listeners = new Set();
    this.probeTimer = null;
  }

  recordSuccess(server) {
    if (server === "primary") {
      const wasFailing = this.state !== "CLOSED" || this.activeServer !== "primary";
      this.failureCount = 0;
      this.state = "CLOSED";
      this.activeServer = "primary";
      if (wasFailing) {
        console.info(`[API Failover] Primary API tiklandi (${this.primaryUrl}). Asosiy serverga qaytildi.`);
        this.emit("PRIMARY_RECOVERED");
      }
    }
  }

  recordFailure(server, reason = "") {
    if (server === "primary") {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      if (this.failureCount >= this.threshold && this.state !== "OPEN") {
        this.state = "OPEN";
        this.activeServer = "backup";
        console.warn(
          `[API Failover] Primary API da ketma-ket ${this.failureCount} ta infratuzilma xatosi yuz berdi (${reason}). Circuit Breaker OCHILDI. Backup API faollashtirildi: ${this.backupUrl}`
        );
        this.emit("SWITCHED_TO_BACKUP", { reason });
        this.startProbe();
      }
    }
  }

  getTargetServer() {
    if (this.state === "CLOSED") {
      return "primary";
    }
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.coolDownMs) {
        this.state = "HALF_OPEN";
        return "primary"; // Sovush vaqti o'tdi, birlamchi serverni sinab ko'ramiz
      }
      return "backup";
    }
    // HALF_OPEN holatida ham primary sinovdan o'tkaziladi
    return "primary";
  }

  reset() {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.activeServer = "primary";
    this.emit("RESET");
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event, data = {}) {
    for (const listener of this.listeners) {
      try {
        listener({
          event,
          state: this.state,
          activeServer: this.activeServer,
          primaryUrl: this.primaryUrl,
          backupUrl: this.backupUrl,
          failureCount: this.failureCount,
          ...data,
        });
      } catch (_e) {}
    }
  }

  startProbe() {
    if (this.probeTimer || typeof window === "undefined") return;
    this.probeTimer = setInterval(async () => {
      if (this.state === "CLOSED") {
        clearInterval(this.probeTimer);
        this.probeTimer = null;
        return;
      }
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(`${this.primaryUrl}/api/health`, {
          method: "GET",
          signal: ctrl.signal,
        }).catch(() => null);
        clearTimeout(t);

        if (res && res.status >= 200 && res.status < 400) {
          this.recordSuccess("primary");
          clearInterval(this.probeTimer);
          this.probeTimer = null;
        }
      } catch (_err) {}
    }, 25000);
  }
}

// Global Circuit Breaker nusxasi
export const globalCircuitBreaker = new CircuitBreaker();

/**
 * Xato javobini tahlil qilib, uning Render yoki infratuzilma xatosi ekanligini aniqlash.
 * 
 * 1. HTTP 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout) -> HAR DOIM FAILOVER
 * 2. HTTP 429 (Too Many Requests) -> Primary rate-limited bo'lsa, zaxiraga o'tiladi
 * 3. HTTP 404:
 *    - Agar Render proxy sarlavhasi (x-render-routing) yoki Render HTML xato sahifasi bo'lsa -> FAILOVER
 *    - Agar bizning Express JSON javobimiz bo'lsa (masalan { error: "Product not found" }) -> FAILOVER QILINMAYDI
 * 4. HTTP 400, 401, 403, 409, 422 -> Biznes xatoliklar, FAILOVER QILINMAYDI
 */
export async function analyzeResponseForFailover(res) {
  // 502, 503, 504: Infratuzilma va gateway xatolari
  if ([502, 503, 504].includes(res.status)) {
    return {
      shouldFailover: true,
      reason: `HTTP ${res.status} (${res.statusText || "Infratuzilma nosozligi"})`,
    };
  }

  // 429: Too Many Requests (Platform yoki IP rate limit)
  if (res.status === 429) {
    return {
      shouldFailover: true,
      reason: "HTTP 429 (Primary serverda so'rovlar chegarasi to'ldi)",
    };
  }

  // 404: Faqat Render platformasidan kelgan bo'lsa failover
  if (res.status === 404) {
    // 1) Render proxy sarlavhasi tekshiruvi
    const renderRouting = res.headers.get("x-render-routing");
    if (renderRouting) {
      return {
        shouldFailover: true,
        reason: `Render proxy 404 marshrut xatosi (x-render-routing: ${renderRouting})`,
      };
    }

    // 2) Content-Type tekshiruvi: Render xato sahifalari text/html formatida keladi
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      try {
        const text = await res.clone().text();
        const lower = text.toLowerCase();
        const isRenderHtml =
          lower.includes("<title>render") ||
          lower.includes("not found") ||
          lower.includes("service not found") ||
          lower.includes("this service has been suspended");
        if (isRenderHtml) {
          return {
            shouldFailover: true,
            reason: "Render platformasi 404 HTML xato sahifasi",
          };
        }
      } catch (_e) {}
    }

    // Agar application/json bo'lsa, bu backendning o'zidan qaytgan normal 404 (Mahsulot topilmadi)
    return { shouldFailover: false };
  }

  // Boshqa barcha statuslar (200-299, 400, 401, 403, 409) failover talab qilmaydi
  return { shouldFailover: false };
}

/**
 * Xato obyektini tahlil qilish (Tarmoq uzilishi, CORS preflight rad etilishi, Timeout)
 */
export function analyzeErrorForFailover(err, externalSignal) {
  // Agar foydalanuvchi/komponent o'zi so'rovni bekor qilgan bo'lsa (masalan qidiruv maydoni tez o'zgarsa)
  if (externalSignal && externalSignal.aborted) {
    return { shouldFailover: false, isUserAbort: true };
  }

  // Bizning ichki timeout sababli AbortError bo'lsa
  if (err.name === "AbortError" || err.message?.includes("timeout")) {
    return {
      shouldFailover: true,
      reason: "Primary API so'rov timeout (10s ichida javob bermadi)",
    };
  }

  // TypeError: Failed to fetch (DNS xatosi, ulanish rad etildi, CORS preflight 503)
  if (err instanceof TypeError || err.message?.toLowerCase().includes("fetch")) {
    return {
      shouldFailover: true,
      reason: `Tarmoq aloqasi xatosi (${err.message || "Ulanib bo'lmadi"})`,
    };
  }

  return {
    shouldFailover: true,
    reason: err.message || "Noma'lum tarmoq xatosi",
  };
}

/**
 * Yagona HTTP so'rovini bajarish (Timeout va AbortController bilan)
 */
async function executeSingleFetch(baseUrl, path, {
  method = "GET",
  headers = {},
  serializedBody,
  signal: externalSignal,
  timeout = 10000,
}) {
  const ctrl = new AbortController();
  let timer = null;

  if (timeout > 0) {
    timer = setTimeout(() => {
      ctrl.abort(new Error("Timeout"));
    }, timeout);
  }

  const handleExternalAbort = () => {
    ctrl.abort(externalSignal.reason || "External abort");
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      if (timer) clearTimeout(timer);
      throw new DOMException("Aborted", "AbortError");
    }
    externalSignal.addEventListener("abort", handleExternalAbort);
  }

  try {
    const res = await fetch(baseUrl + path, {
      method,
      headers,
      body: serializedBody,
      signal: ctrl.signal,
    });
    return res;
  } finally {
    if (timer) clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", handleExternalAbort);
    }
  }
}

/**
 * Asosiy API funktsiyasi (Failover, Circuit Breaker va Idempotency bilan)
 * 
 * @param {string} path - Masalan '/products' yoki '/orders'
 * @param {object} options
 * @param {string} [options.method='GET']
 * @param {any} [options.body]
 * @param {string} [options.token]
 * @param {AbortSignal} [options.signal]
 * @param {number} [options.timeout=10000]
 * @param {string} [options.idempotencyKey]
 * @param {CircuitBreaker} [options.circuitBreaker]
 */
export async function api(
  path,
  {
    method = "GET",
    body,
    token,
    signal,
    timeout = 10000,
    idempotencyKey,
    headers: customHeaders = {},
    circuitBreaker = globalCircuitBreaker,
    primaryUrl = PRIMARY_API_URL,
    backupUrl = BACKUP_API_URL,
  } = {}
) {
  const normMethod = method.toUpperCase();
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(normMethod);

  // Body ni bir marta xavfsiz serializatsiya qilish (ikkala urinishda yo'qolib ketmasligi uchun)
  let serializedBody;
  const headers = { ...customHeaders };

  if (body !== undefined) {
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      serializedBody = body; // FormData brauzer tomonidan boundary bilan yuboriladi
    } else if (typeof body === "string") {
      serializedBody = body;
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    } else {
      serializedBody = JSON.stringify(body);
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    }
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Takroriy bajarilishdan himoyalanish uchun idempotency va x-request-id
  if (isMutation) {
    const reqId = idempotencyKey || generateRequestId();
    headers["X-Request-Id"] = reqId;
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
  }

  // Circuit Breaker holatiga ko'ra birinchi serverni aniqlaymiz
  const firstTarget = circuitBreaker.getTargetServer();
  const firstUrl = firstTarget === "primary" ? primaryUrl : backupUrl;
  const secondUrl = firstTarget === "primary" ? backupUrl : primaryUrl;
  const secondTarget = firstTarget === "primary" ? "backup" : "primary";

  let firstRes = null;
  let firstFailReason = null;

  try {
    firstRes = await executeSingleFetch(firstUrl, path, {
      method: normMethod,
      headers,
      serializedBody,
      signal,
      timeout,
    });
  } catch (err) {
    const errAnalysis = analyzeErrorForFailover(err, signal);
    if (errAnalysis.isUserAbort) {
      throw err; // Foydalanuvchi bekor qilgan bo'lsa, qayta yuborilmaydi
    }
    if (errAnalysis.shouldFailover) {
      firstFailReason = errAnalysis.reason;
    } else {
      throw new ApiError(err.message, 0, firstTarget);
    }
  }

  // Agar so'rov serverga yetib borgan bo'lsa, status va javobni tahlil qilamiz
  if (firstRes) {
    const check = await analyzeResponseForFailover(firstRes);
    if (check.shouldFailover) {
      firstFailReason = check.reason;
    } else {
      // Muvaffaqiyatli (2xx) yoki normal biznes xatoligi (400, 401, 403, 404, 409)
      // Bu holda failover qilinmaydi va to'g'ridan-to'g'ri chaqiruvchiga javob qaytariladi
      circuitBreaker.recordSuccess(firstTarget);
      return await parseAndHandleResponse(firstRes, token, firstTarget);
    }
  }

  // ==================== ZAXIRA SERVERGA O'TISH (FAILOVER) ====================
  circuitBreaker.recordFailure(firstTarget, firstFailReason);
  console.warn(
    `[API Failover] ${firstTarget.toUpperCase()} server ishlamadi (${firstFailReason}). So'rov zaxira serverga yuborilmoqda: ${secondUrl}${path}`
  );

  try {
    const secondRes = await executeSingleFetch(secondUrl, path, {
      method: normMethod,
      headers,
      serializedBody,
      signal,
      timeout,
    });

    // Backup server javob berdi
    console.info(`[API Failover] Zaxira (${secondTarget.toUpperCase()}) server muvaffaqiyatli javob berdi.`);
    return await parseAndHandleResponse(secondRes, token, secondTarget);
  } catch (secondErr) {
    if (signal && signal.aborted) {
      throw secondErr;
    }
    console.error(
      `[API Failover] Zaxira server ham javob bermadi (${secondErr.message}). Barcha serverlar ishlamayapti.`
    );
    throw new ApiError(
      "Asosiy va zaxira serverlarga ulanib bo'lmadi. Internet aloqasini tekshiring yoki birozdan so'ng qayta urinib ko'ring.",
      0,
      "all_failed"
    );
  }
}

/**
 * Javobni o'qish, JSON ga aylantirish va xatoliklarni qayta ishlash
 */
async function parseAndHandleResponse(res, token, server) {
  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (res.status === 401 && token) {
    throw new UnauthorizedError("Sessiya tugadi, qayta kiring", 401, server);
  }

  if (!res.ok) {
    const errMsg = translateError(data && (data.error || data.message)) || `Server xatosi (${res.status})`;
    throw new ApiError(errMsg, res.status, server);
  }

  return data;
}

// Holatni kuzatish uchun qulay funksiyalar
export function getFailoverStatus() {
  return {
    state: globalCircuitBreaker.state,
    activeServer: globalCircuitBreaker.activeServer,
    primaryUrl: PRIMARY_API_URL,
    backupUrl: BACKUP_API_URL,
    failureCount: globalCircuitBreaker.failureCount,
  };
}

export function subscribeFailover(listener) {
  return globalCircuitBreaker.subscribe(listener);
}

export function resetCircuitBreaker() {
  globalCircuitBreaker.reset();
}
