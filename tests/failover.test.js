import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {
  api,
  ApiError,
  UnauthorizedError,
  CircuitBreaker,
  analyzeResponseForFailover,
} from "../src/api.js";

/**
 * Testlar uchun qulay Mock HTTP Server yaratish
 */
function createMockServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        handler(req, res, body);
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      const url = `http://127.0.0.1:${port}`;
      resolve({
        server,
        url,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

describe("API Failover va Circuit Breaker Testlari (14 ta vaziyat)", () => {
  // 1. Primary API 200 qaytarsa, backup chaqirilmasligi
  test("1. Primary API 200 qaytarsa, backup chaqirilmasligi", async () => {
    let primaryCalled = 0;
    let backupCalled = 0;

    const primary = await createMockServer((req, res) => {
      primaryCalled++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify([{ id: 1, name: "iPhone 15" }]));
    });

    const backup = await createMockServer((req, res) => {
      backupCalled++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify([]));
    });

    const cb = new CircuitBreaker({ primaryUrl: primary.url, backupUrl: backup.url });
    const result = await api("/products", {
      primaryUrl: primary.url,
      backupUrl: backup.url,
      circuitBreaker: cb,
    });

    assert.equal(primaryCalled, 1);
    assert.equal(backupCalled, 0, "Backup chaqirilmasligi kerak edi");
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "iPhone 15");

    await primary.close();
    await backup.close();
  });

  // 2. Primary API 502 qaytarsa, backup chaqirilishi
  test("2. Primary API 502 (Bad Gateway) qaytarsa, backup chaqirilishi", async () => {
    let primaryCalled = 0;
    let backupCalled = 0;

    const primary = await createMockServer((req, res) => {
      primaryCalled++;
      res.writeHead(502, { "Content-Type": "text/html" });
      res.end("<html><body>Bad Gateway</body></html>");
    });

    const backup = await createMockServer((req, res) => {
      backupCalled++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, source: "backup" }));
    });

    const cb = new CircuitBreaker({ primaryUrl: primary.url, backupUrl: backup.url });
    const result = await api("/api/health", {
      primaryUrl: primary.url,
      backupUrl: backup.url,
      circuitBreaker: cb,
    });

    assert.equal(primaryCalled, 1);
    assert.equal(backupCalled, 1);
    assert.equal(result.source, "backup");

    await primary.close();
    await backup.close();
  });

  // 3. Primary API 503 qaytarsa, backup chaqirilishi
  test("3. Primary API 503 (Service Unavailable) qaytarsa, backup chaqirilishi", async () => {
    let primaryCalled = 0;
    let backupCalled = 0;

    const primary = await createMockServer((req, res) => {
      primaryCalled++;
      res.writeHead(503, { "Content-Type": "text/html", "x-render-routing": "suspend-by-user" });
      res.end("<html><title>Service Suspended</title><body>Suspended</body></html>");
    });

    const backup = await createMockServer((req, res) => {
      backupCalled++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, source: "backup-503-handled" }));
    });

    const cb = new CircuitBreaker({ primaryUrl: primary.url, backupUrl: backup.url });
    const result = await api("/test", {
      primaryUrl: primary.url,
      backupUrl: backup.url,
      circuitBreaker: cb,
    });

    assert.equal(primaryCalled, 1);
    assert.equal(backupCalled, 1);
    assert.equal(result.source, "backup-503-handled");

    await primary.close();
    await backup.close();
  });

  // 4. Primary API 504 qaytarsa, backup chaqirilishi
  test("4. Primary API 504 (Gateway Timeout) qaytarsa, backup chaqirilishi", async () => {
    let primaryCalled = 0;
    let backupCalled = 0;

    const primary = await createMockServer((req, res) => {
      primaryCalled++;
      res.writeHead(504, { "Content-Type": "text/plain" });
      res.end("Gateway Timeout");
    });

    const backup = await createMockServer((req, res) => {
      backupCalled++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, source: "backup-504" }));
    });

    const cb = new CircuitBreaker({ primaryUrl: primary.url, backupUrl: backup.url });
    const result = await api("/test", {
      primaryUrl: primary.url,
      backupUrl: backup.url,
      circuitBreaker: cb,
    });

    assert.equal(primaryCalled, 1);
    assert.equal(backupCalled, 1);
    assert.equal(result.source, "backup-504");

    await primary.close();
    await backup.close();
  });

  // 5. Primary API 429 qaytarsa, belgilangan siyosat bo‘yicha backup sinab ko‘rilishi
  test("5. Primary API 429 (Too Many Requests) qaytarsa, backup chaqirilishi", async () => {
    let primaryCalled = 0;
    let backupCalled = 0;

    const primary = await createMockServer((req, res) => {
      primaryCalled++;
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Too many requests" }));
    });

    const backup = await createMockServer((req, res) => {
      backupCalled++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, source: "backup-rate-limit" }));
    });

    const cb = new CircuitBreaker({ primaryUrl: primary.url, backupUrl: backup.url });
    const result = await api("/test", {
      primaryUrl: primary.url,
      backupUrl: backup.url,
      circuitBreaker: cb,
    });

    assert.equal(primaryCalled, 1);
    assert.equal(backupCalled, 1);
    assert.equal(result.source, "backup-rate-limit");

    await primary.close();
    await backup.close();
  });

  // 6. Primary API 404 qaytarsa:
  // a) Render proxy 404 da backup chaqirilishi
  // b) Backend JSON 404 da backup chaqirilmasligi va 404 qaytarilishi
  test("6a. Primary API Render proxy 404 HTML qaytarsa, backup chaqirilishi", async () => {
    let primaryCalled = 0;
    let backupCalled = 0;

    const primary = await createMockServer((req, res) => {
      primaryCalled++;
      res.writeHead(404, { "Content-Type": "text/html", "x-render-routing": "not-found" });
      res.end("<html><title>Render - Not Found</title><body>Service Not Found</body></html>");
    });

    const backup = await createMockServer((req, res) => {
      backupCalled++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, source: "backup-from-render-404" }));
    });

    const cb = new CircuitBreaker({ primaryUrl: primary.url, backupUrl: backup.url });
    const result = await api("/products", {
      primaryUrl: primary.url,
      backupUrl: backup.url,
      circuitBreaker: cb,
    });

    assert.equal(primaryCalled, 1);
    assert.equal(backupCalled, 1);
    assert.equal(result.source, "backup-from-render-404");

    await primary.close();
    await backup.close();
  });

  test("6b. Primary API backend biznes 404 JSON qaytarsa, backup chaqirilmasligi", async () => {
    let primaryCalled = 0;
    let backupCalled = 0;

    const primary = await createMockServer((req, res) => {
      primaryCalled++;
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Product not found" }));
    });

    const backup = await createMockServer((req, res) => {
      backupCalled++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });

    const cb = new CircuitBreaker({ primaryUrl: primary.url, backupUrl: backup.url });

    await assert.rejects(
      async () => {
        await api("/products/999999", {
          primaryUrl: primary.url,
          backupUrl: backup.url,
          circuitBreaker: cb,
        });
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 404);
        assert.equal(err.message, "Mahsulot topilmadi"); // Tarjima qilingan xabar
        return true;
      }
    );

    assert.equal(primaryCalled, 1);
    assert.equal(backupCalled, 0, "Biznes 404 xatosida backup chaqirilmasligi kerak");

    await primary.close();
    await backup.close();
  });

  // 7. Primary API bilan tarmoq aloqasi uzilsa (network error), backup sinab ko‘rilishi
  test("7. Primary API bilan tarmoq aloqasi uzilsa, backup sinab ko‘rilishi", async () => {
    let backupCalled = 0;

    // Mavjud bo'lmagan portga so'rov yuborish (ulanish rad etiladi / connection refused)
    const deadPortUrl = "http://127.0.0.1:54321";

    const backup = await createMockServer((req, res) => {
      backupCalled++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, source: "backup-network-recovered" }));
    });

    const cb = new CircuitBreaker({ primaryUrl: deadPortUrl, backupUrl: backup.url });
    const result = await api("/test", {
      primaryUrl: deadPortUrl,
      backupUrl: backup.url,
      circuitBreaker: cb,
    });

    assert.equal(backupCalled, 1);
    assert.equal(result.source, "backup-network-recovered");

    await backup.close();
  });

  // 8. Primary API timeout bo‘lsa, backup sinab ko‘rilishi
  test("8. Primary API timeout bo‘lsa, backup sinab ko‘rilishi", async () => {
    let primaryCalled = 0;
    let backupCalled = 0;

    const primary = await createMockServer((req, res) => {
      primaryCalled++;
      // Javob qaytarmay kutib turadi
    });

    const backup = await createMockServer((req, res) => {
      backupCalled++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, source: "backup-after-timeout" }));
    });

    const cb = new CircuitBreaker({ primaryUrl: primary.url, backupUrl: backup.url });
    const result = await api("/test", {
      primaryUrl: primary.url,
      backupUrl: backup.url,
      circuitBreaker: cb,
      timeout: 100, // Test uchun 100ms qisqa timeout
    });

    assert.equal(primaryCalled, 1);
    assert.equal(backupCalled, 1);
    assert.equal(result.source, "backup-after-timeout");

    await primary.close();
    await backup.close();
  });

  // 9. Backup API ham ishlamasa, tushunarli xato qaytarilishi
  test("9. Backup API ham ishlamasa, tushunarli xato qaytarilishi", async () => {
    const primary = await createMockServer((req, res) => {
      res.writeHead(503, { "Content-Type": "text/html" });
      res.end("Service Unavailable");
    });

    const backup = await createMockServer((req, res) => {
      res.writeHead(503, { "Content-Type": "text/html" });
      res.end("Backup Also Unavailable");
    });

    const cb = new CircuitBreaker({ primaryUrl: primary.url, backupUrl: backup.url });

    await assert.rejects(
      async () => {
        await api("/test", {
          primaryUrl: primary.url,
          backupUrl: backup.url,
          circuitBreaker: cb,
        });
      },
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.match(err.message, /serverlarga ulanib bo'lmadi/i);
        return true;
      }
    );

    await primary.close();
    await backup.close();
  });

  // 10. Login va autentifikatsiya ishlashi (Authorization headerlar to‘g‘ri uzatilishi)
  test("10. Login va autentifikatsiya ishlashi (Bearer token to‘g‘ri uzatilishi)", async () => {
    let receivedAuth = "";

    const primary = await createMockServer((req, res) => {
      res.writeHead(502);
      res.end("Bad Gateway");
    });

    const backup = await createMockServer((req, res) => {
      receivedAuth = req.headers["authorization"] || "";
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, user: "admin" }));
    });

    const cb = new CircuitBreaker({ primaryUrl: primary.url, backupUrl: backup.url });
    const result = await api("/admin/dashboard", {
      token: "secret-token-xyz-123",
      primaryUrl: primary.url,
      backupUrl: backup.url,
      circuitBreaker: cb,
    });

    assert.equal(receivedAuth, "Bearer secret-token-xyz-123");
    assert.equal(result.user, "admin");

    await primary.close();
    await backup.close();
  });

  // 11. POST so‘rovlari xavfli tarzda takrorlanmasligi, Idempotency-Key va X-Request-Id uzatilishi
  test("11. POST so‘rovlarida Idempotency-Key va X-Request-Id headerlari uzatilishi", async () => {
    let receivedKey = "";
    let receivedReqId = "";
    let receivedBody = "";

    const primary = await createMockServer((req, res) => {
      res.writeHead(503, { "x-render-routing": "deploying" });
      res.end("Deploying");
    });

    const backup = await createMockServer((req, res, body) => {
      receivedKey = req.headers["idempotency-key"] || "";
      receivedReqId = req.headers["x-request-id"] || "";
      receivedBody = body;
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: "order-101", status: "created" }));
    });

    const cb = new CircuitBreaker({ primaryUrl: primary.url, backupUrl: backup.url });
    const result = await api("/orders", {
      method: "POST",
      body: { customerName: "Ali", phone: "+998901234567" },
      idempotencyKey: "idemp-key-9999",
      primaryUrl: primary.url,
      backupUrl: backup.url,
      circuitBreaker: cb,
    });

    assert.equal(receivedKey, "idemp-key-9999");
    assert.ok(receivedReqId.length > 0);
    assert.equal(JSON.parse(receivedBody).customerName, "Ali");
    assert.equal(result.id, "order-101");

    await primary.close();
    await backup.close();
  });

  // 12. Primary API qayta tiklangach, undan foydalanish davom etishi (Circuit Breaker recovery)
  test("12. Primary API qayta tiklangach, undan foydalanish davom etishi (Circuit Breaker)", async () => {
    let primaryHealthy = false;
    let primaryCalls = 0;
    let backupCalls = 0;

    const primary = await createMockServer((req, res) => {
      primaryCalls++;
      if (!primaryHealthy) {
        res.writeHead(503);
        res.end("Primary down");
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ source: "primary-recovered" }));
      }
    });

    const backup = await createMockServer((req, res) => {
      backupCalls++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ source: "backup" }));
    });

    const cb = new CircuitBreaker({
      primaryUrl: primary.url,
      backupUrl: backup.url,
      threshold: 2,
      coolDownMs: 50, // 50ms qisqa sovush vaqti
    });

    // 1-so'rov: Primary 503 -> Failover Backup
    await api("/test", { primaryUrl: primary.url, backupUrl: backup.url, circuitBreaker: cb });
    // 2-so'rov: Primary 503 -> Failover Backup -> Circuit Breaker OPEN bo'ladi
    await api("/test", { primaryUrl: primary.url, backupUrl: backup.url, circuitBreaker: cb });
    assert.equal(cb.state, "OPEN");

    // 3-so'rov (hali cooldown tugamagan): To'g'ridan-to'g'ri Backup'ga ketadi
    await api("/test", { primaryUrl: primary.url, backupUrl: backup.url, circuitBreaker: cb });
    assert.equal(cb.activeServer, "backup");

    // Primary endi tiklandi!
    primaryHealthy = true;

    // Cooldown o'tishini kutamiz (60ms)
    await new Promise((r) => setTimeout(r, 60));

    // 4-so'rov: HALF_OPEN holatida Primary'ni sinab ko'radi va muvaffaqiyatli bo'lsa tiklanadi
    const res = await api("/test", { primaryUrl: primary.url, backupUrl: backup.url, circuitBreaker: cb });
    assert.equal(res.source, "primary-recovered");
    assert.equal(cb.state, "CLOSED");
    assert.equal(cb.activeServer, "primary");

    await primary.close();
    await backup.close();
  });

  // 13. Bir so‘rov bir necha marta cheksiz yuborilmasligi (Aniq 1 marta retry)
  test("13. Bir so‘rov bir necha marta cheksiz yuborilmasligi (Aniq 1 retry: Primary -> Backup)", async () => {
    let primaryAttempts = 0;
    let backupAttempts = 0;

    const primary = await createMockServer((req, res) => {
      primaryAttempts++;
      res.writeHead(502);
      res.end("Bad Gateway");
    });

    const backup = await createMockServer((req, res) => {
      backupAttempts++;
      res.writeHead(502);
      res.end("Backup Bad Gateway");
    });

    const cb = new CircuitBreaker({ primaryUrl: primary.url, backupUrl: backup.url });

    try {
      await api("/test", {
        primaryUrl: primary.url,
        backupUrl: backup.url,
        circuitBreaker: cb,
      });
    } catch (_err) {}

    // Aniq bitta Primary va bitta Backup chaqiruvi bo'lishi kerak, cheksiz loop bo'lmasligi kerak
    assert.equal(primaryAttempts, 1);
    assert.equal(backupAttempts, 1);

    await primary.close();
    await backup.close();
  });

  // 14. Headerlar va request body to‘g‘ri uzatilishi (body birinchi urinishda yo‘qolib qolmasligi)
  test("14. Custom headerlar va murakkab JSON body Backup'ga to'liq yetib borishi", async () => {
    let backupHeaders = null;
    let backupBody = null;

    const primary = await createMockServer((req, res) => {
      res.writeHead(503, { "x-render-routing": "overloaded" });
      res.end("Overloaded");
    });

    const backup = await createMockServer((req, res, body) => {
      backupHeaders = req.headers;
      backupBody = JSON.parse(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });

    const complexPayload = {
      orderNumber: "TM-777",
      items: [{ productId: "p1", quantity: 3, options: { color: "black", warranty: true } }],
      address: { city: "Toshkent", street: "Navoiy 14" },
    };

    const cb = new CircuitBreaker({ primaryUrl: primary.url, backupUrl: backup.url });
    await api("/orders/checkout", {
      method: "POST",
      body: complexPayload,
      headers: { "X-Custom-Client": "TechnoMarket-Web" },
      token: "user-jwt-token",
      primaryUrl: primary.url,
      backupUrl: backup.url,
      circuitBreaker: cb,
    });

    assert.equal(backupHeaders["x-custom-client"], "TechnoMarket-Web");
    assert.equal(backupHeaders["authorization"], "Bearer user-jwt-token");
    assert.equal(backupHeaders["content-type"], "application/json");
    assert.deepEqual(backupBody, complexPayload);

    await primary.close();
    await backup.close();
  });
});
