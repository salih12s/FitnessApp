# FitnessApp Code Review

> Son güncelleme: 30 Eylül 2026  
> Durum: İlk kapsamlı statik inceleme tamamlandı; düzeltmeler henüz uygulanmadı.

Bu doküman FitnessApp reposunun güvenlik, backend, frontend, veritabanı, performans, test, CI/CD ve production-readiness açısından sürekli code review çalışma listesidir.

Amaç yalnızca "clean code" yapmak değil; gerçek kullanıcı verisi taşıyabilecek, büyüdüğünde bozulmayacak ve yeni değişikliklerde regresyon üretmeyecek bir sistem elde etmektir.

---

## 1. İncelenen kapsam

### Backend

- NestJS API mimarisi
- Authentication / JWT / refresh token akışı
- Authorization / ownership kontrolleri
- Coach → client erişim modeli
- Exercise / custom exercise işlemleri
- Workout logs
- Workout sessions
- Workout templates
- Reports
- User/account işlemleri
- Demo account üretimi
- Health checks
- Prisma / MariaDB bağlantısı
- Hostinger deployment paketleme süreci

### Frontend

- React uygulama yapısı
- Auth state yönetimi
- Access token kullanımı
- Refresh retry akışı
- TanStack Query cache davranışı
- Router / protected routes
- Form validation yardımcıları
- Büyük page/component dosyaları
- PWA yapılandırması

### Veritabanı

- Prisma modelleri
- Unique/index/foreign key kullanımı
- Ownership ilişkileri
- Session / log / template ilişkileri
- Refresh session saklama yapısı

---

## 2. Öncelik seviyeleri

| Seviye            | Anlamı                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| **P0 — Critical** | Veri kaybı, auth bypass, ciddi güvenlik açığı veya production çökmesi. Hemen çözülmeli.                  |
| **P1 — High**     | Güvenlik, abuse, yetkilendirme veya kritik iş kuralı açısından önemli risk. Production öncesi çözülmeli. |
| **P2 — Medium**   | Ölçeklenme, bakım maliyeti, güvenilirlik veya operasyon tarafında önemli iyileştirme.                    |
| **P3 — Low**      | Kod kalitesi, geliştirici deneyimi veya uzun vadeli temizlik.                                            |

---

# 3. Executive Summary

İlk statik incelemede P0 seviyesinde açık tespit edilmedi.

Özellikle aşağıdaki alanlar güçlü durumda:

- Access token memory'de tutuluyor; `localStorage` kullanılmıyor.
- Refresh token `HttpOnly` cookie ile yönetiliyor.
- Refresh token raw olarak DB'ye yazılmıyor; SHA-256 hash saklanıyor.
- Refresh token rotation uygulanıyor.
- Concurrent refresh yarışında yalnızca bir isteğin kazanmasını sağlayan kontrol bulunuyor.
- Password hashing için Argon2id kullanılıyor.
- Global `ValidationPipe` whitelist + `forbidNonWhitelisted` ile açık.
- Kullanıcı ownership kontrolleri servis seviyesinde büyük ölçüde doğru uygulanmış.
- Coach/client erişiminde ayrı `LinkedClientGuard` bulunuyor.
- Session oluşturma yarışında DB row lock (`FOR UPDATE`) kullanılıyor.
- Kritik create/update işlemlerinde transaction kullanımı genel olarak doğru.
- Prisma şemasında anlamlı unique constraint ve indexler bulunuyor.

Ana riskler:

1. Auth ve özellikle demo endpointlerinde rate limiting bulunmuyor.
2. Backend kritik iş mantığının otomatik testleri yok.
3. GitHub Actions / CI quality gate görünmüyor.
4. `reports/overview` veri büyüdükçe tüm geçmişi belleğe çektiği için ölçeklenme problemi yaratabilir.
5. Production security headers eksik.
6. Environment/config validation daha katı hale getirilmeli.

---

# 4. P1 — Security / Abuse Protection

## [x] P1-01 — Rate limiting ekle

> Uygulandı (30 Eylül 2026). `@nestjs/throttler` global guard + auth endpointlerinde `@Throttle`; `TRUST_PROXY_HOPS`; demo için eşzamanlı istek sınırı. Limitler `apps/api/src/auth/auth.constants.ts` içinde.
> **Canlıya almadan önce:** Hostinger'da `TRUST_PROXY_HOPS` gerçek hop sayısına ayarlanmalı (bkz. P1-04).

### Etkilenen alanlar

- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/main.ts`
- `apps/api/package.json`

### Problem

Aşağıdaki public endpointlerde request throttling/rate limiting bulunmuyor:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/demo`
- `POST /api/auth/refresh`

Login endpointi brute-force saldırılarına açık kalıyor.

`/auth/demo` daha kritik çünkü her çağrıda:

- Argon2 hashing,
- transaction,
- birden fazla user,
- workout history,
- templates,
- logs,
- measurements,
- coach/client ilişkileri

oluşturuluyor.

Demo kullanıcı sayısının sınırlanmış olması CPU/DB abuse riskini tamamen çözmüyor.

### Önerilen çözüm

`@nestjs/throttler` veya eşdeğer bir rate-limit çözümü ekle.

Örnek politika:

- Global API: makul genel limit
- Login: IP bazında sıkı limit
- Register: daha sıkı limit
- Demo: çok sıkı limit
- Refresh: normal kullanımda sorun yaratmayacak limit

### Kabul kriterleri

- [x] Aynı IP kısa sürede yüzlerce login isteği atamıyor. (Yerelde doğrulandı: 10/dk sonrası 429, `Retry-After` başlığı var.)
- [x] `/auth/demo` burst abuse ile DB/CPU tüketemiyor. (IP limiti 5/10 dk + en fazla 2 eşzamanlı demo. **Sadece kod incelemesi; eşzamanlı cap gerçek DB ile denenmedi.**)
- [x] Normal frontend kullanımı rate-limit yüzünden bozulmuyor. (Genel limit 300/dk, refresh 30/dk; 429/503 için Türkçe mesaj eklendi. Tarayıcıda uçtan uca denenmedi.)
- [ ] 429 response davranışı otomatik test ediliyor. (Şimdilik elle curl ile doğrulandı; API test runner'ı P1-02 ile gelince otomatikleşecek.)

---

## [ ] P1-02 — Backend security testleri ekle

### Etkilenen alan

`apps/api`

### Problem

Frontend'de Vitest tabanlı testler bulunmasına rağmen API paketinde test scripti ve backend test suite'i görünmüyor.

Bu özellikle aşağıdaki güvenlik ve iş kuralları için riskli:

- access token validation
- refresh rotation
- concurrent refresh
- user ownership
- coach/client authorization
- log ownership
- template ownership
- account deletion
- session concurrency

### İlk yazılacak güvenlik testleri

#### IDOR testi

1. User A kayıt olur.
2. User A workout log oluşturur.
3. User B kayıt olur.
4. User B, User A'nın log UUID'si ile `PATCH /api/logs/:id` çağırır.
5. Response 404 olmalı.
6. User A'nın logu değişmemeli.

#### Coach authorization testi

1. Coach A → Client X bağlı.
2. Coach B → Client X bağlı değil.
3. Coach B `/api/coach/clients/:clientId/...` çağrısı yapar.
4. 404 dönmeli.

#### Refresh rotation testi

Aynı refresh token paralel iki request ile gönderildiğinde yalnızca biri başarılı olmalı.

### Kabul kriterleri

- [x] API için test runner var. (Node yerleşik `node --test` + `tsx`, yeni bağımlılık yok; şimdilik yalnızca saf fonksiyon testleri: `exercise-search.test.ts`. HTTP/DB entegrasyon testleri hâlâ eksik.)
- [ ] Auth integration testleri var.
- [ ] Ownership/IDOR testleri var.
- [ ] Coach authorization testleri var.
- [ ] Transaction/rollback testleri var.
- [x] `npm test` root seviyesinde backend testlerini de çalıştırıyor.

## [ ] P1-04 — Rate limit için `trust proxy` değerini canlıda doğrula

### Problem

Uygulama Hostinger proxy/CDN arkasında çalışıyor. `TRUST_PROXY_HOPS` ayarlanmazsa `req.ip` herkes için proxy IP'si olur ve **bütün ziyaretçiler tek rate-limit kovasına** girer (biri demo spam yaparsa herkes 429 alır). Gereğinden fazla hop verilirse istemci `X-Forwarded-For` ile IP taklit edip limiti aşabilir.

### Çözüm

Canlıda gerçek hop sayısı ölçülüp `TRUST_PROXY_HOPS` env'ine yazılmalı (varsayılan 0 = proxy güvenilmez).

### Kabul kriterleri

- [ ] Canlıda iki farklı IP'den yapılan istekler ayrı kovalarda sayılıyor.
- [ ] `X-Forwarded-For` başlığıyla sahte IP verilerek limit aşılamıyor.

---

## [ ] P2-05 — Login'de timing farkı (kullanıcı adı numaralandırma)

### Etkilenen dosya

- `apps/api/src/auth/auth.service.ts` (`login`)

### Problem

Kullanıcı yoksa `argon2.verify` hiç çalışmıyor; yanıt süresi kullanıcı varsa çok daha uzun. Süre farkından hangi kullanıcı adlarının kayıtlı olduğu anlaşılabilir.

### Çözüm

Kullanıcı bulunamadığında da sabit bir sahte hash'e karşı `argon2.verify` çalıştır.

### Kabul kriterleri

- [ ] Var olan/olmayan kullanıcı için yanıt süreleri istatistiksel olarak ayırt edilemiyor.

---

## [ ] P2-06 — Demo hesap tavanı meşru ziyaretçinin demo'sunu silebilir

### Etkilenen dosya

- `apps/api/src/demo/demo.service.ts` (`removeOldAccounts`)

### Problem

Demo hesap sayısı 300'ü aşınca en eskiler siliniyor. Saldırgan demo spam yaparak başkasının açık demo oturumunu 401'e düşürebilir. Ayrıca her demo çağrısı `removeOldAccounts()` (2 sorgu + silme) çalıştırıyor.

### Çözüm

Rate limit (P1-01) riski azalttı. Ek olarak temizliği her istekte değil periyodik/fırsat bazlı yapmak ve tavan doluyken yeni demo'yu reddetmek (eskiyi silmek yerine) değerlendirilmeli.

### Kabul kriterleri

- [ ] Demo spam'i mevcut demo oturumlarını düşürmüyor.

---

# 5. P2 — Production Security Hardening

## [ ] P2-01 — Security headers / Helmet ekle

### Etkilenen dosya

- `apps/api/src/main.ts`

### Problem

Validation ve CORS yapılandırması mevcut ancak production security header middleware'i görünmüyor.

### Önerilen çözüm

`helmet` eklenerek en azından aşağıdaki başlıklar değerlendirilmelidir:

- Content-Security-Policy
- X-Content-Type-Options
- Referrer-Policy
- frame protection
- HSTS

PWA/static frontend davranışı test edilerek CSP kontrollü şekilde sıkılaştırılmalı.

### Kabul kriterleri

- [ ] Helmet aktif.
- [ ] Uygulama login/register/dashboard akışı bozulmuyor.
- [ ] PWA/static asset yüklemeleri çalışıyor.
- [ ] Production'da HSTS politikası bilinçli olarak ayarlanmış.

---

## [ ] P2-02 — Production environment validation ekle

### Etkilenen alanlar

- `apps/api/src/app.module.ts`
- `apps/api/src/auth/auth.config.ts`
- `apps/api/src/prisma/prisma.service.ts`

### Problem

Auth tarafında environment validation iyi seviyede olmasına rağmen config doğrulaması merkezi değil.

> Not: `AuthConfig` JWT, TTL ve cookie değişkenlerini zaten doğruluyor. Asıl iş sıfırdan eklemek değil, **merkezileştirmek** ve eksik olanları (`DATABASE_URL`, `FRONTEND_URL`, `PORT`, `TRUST_PROXY_HOPS`) eklemek. `FRONTEND_URL` yoksa CORS sessizce `http://localhost:3005` varsayılanına düşüyor.

Örneğin `DATABASE_URL` yoksa Prisma client `null` bırakılabiliyor ve uygulama yine process olarak ayağa kalkabiliyor.

Production'da yanlış environment değerleri mümkün olduğunca startup sırasında yakalanmalı.

### Önerilen çözüm

Merkezi environment schema/validator oluştur.

Kontrol edilmesi gerekenler:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_TTL_SECONDS`
- `REFRESH_TOKEN_TTL_DAYS`
- `REFRESH_COOKIE_SECURE`
- `FRONTEND_URL`
- `PORT`
- `NODE_ENV`

Production kuralı:

- `DATABASE_URL` zorunlu.
- JWT secret minimum uzunluk zorunlu.
- `REFRESH_COOKIE_SECURE=true` zorunlu olmalı (aynı origin HTTPS production senaryosunda).

### Kabul kriterleri

- [ ] Hatalı environment ile uygulama startup'ta anlaşılır mesajla kapanıyor.
- [ ] Production config yanlışlıkları runtime sırasında ilk requestte ortaya çıkmıyor.

---

## [ ] P2-03 — Expired refresh-session cleanup

### Etkilenen alan

- `RefreshSession`
- Auth/maintenance logic

### Problem

Expired refresh sessionlar sadece tekrar kullanılırsa veya ilgili kullanıcı/account işlemleri sırasında temizleniyor.

Uzun vadede hiç tekrar kullanılmayan expired session kayıtları birikebilir.

### Önerilen çözüm

Periyodik veya fırsat bazlı cleanup:

```ts
prisma.refreshSession.deleteMany({
  where: { expiresAt: { lt: new Date() } },
});
```

> Ham SQL'de `NOW()` kullanma: MariaDB'de `NOW()` sunucu yerel saatidir, Prisma UTC yazar. Prisma ile `new Date()` (veya SQL'de `UTC_TIMESTAMP()`) kullan.

Shared hosting koşullarına göre:

- cron,
- scheduled job,
- düşük frekanslı application cleanup

seçilebilir.

### Kabul kriterleri

- [ ] Expired sessionlar sınırsız büyümüyor.
- [ ] Cleanup aktif refresh sessionlara dokunmuyor.

---

# 6. P2 — Performance

## [ ] P2-04 — `reports/overview` sorgusunu ölçeklenebilir hale getir

### Etkilenen dosya

- `apps/api/src/reports/reports.service.ts`

### Problem

`findOverview()` kullanıcının bütün workout geçmişini ve setlerini çekip aşağıdaki hesapları Node.js tarafında yapıyor:

- last 7 days
- previous 7 days
- streak
- muscle volume
- personal records

Kullanıcı geçmişi büyüdükçe endpointin:

- DB'den çektiği satır sayısı,
- JSON/driver transferi,
- backend memory kullanımı,
- JS loop süresi

artar.

### Önerilen çözüm

Hesaplamaları amaçlarına göre ayır:

#### Son 14 günlük istatistik

Tarih filtreli sorgu kullan.

#### Muscle totals

Mümkün olduğunca DB aggregate/grouping kullan.

#### Weekly streak

Sadece gerekli tarih/week bilgilerini çek.

#### Recent personal records

Tüm geçmişi her dashboard açılışında parse etmek yerine daha kontrollü query veya ayrı hesaplama stratejisi kullan.

### Kabul kriterleri

- [ ] 3 yıllık workout geçmişinde endpoint tüm kayıtları belleğe çekmiyor.
- [ ] Response formatı frontend açısından değişmeden kalıyor veya versionlanıyor.
- [ ] Query sayısı ve süre ölçülüyor.

---

## [ ] P3-01 — Coach client summary'de O(client × logs) filter döngüsünü kaldır

### Etkilenen dosya

- `apps/api/src/coach/coach.service.ts`

### Problem

`listClients()` içinde her client için `recentLogs.filter(...)` çalıştırılıyor.

Az kullanıcıda önemsiz; client/log sayısı arttığında gereksiz tekrar tarama yaratıyor.

### Önerilen çözüm

Önce logları tek seferde:

```ts
Map<userId, Log[]>;
```

şeklinde grupla.

Sonra client başına O(1) lookup yap.

### Kabul kriterleri

- [ ] Aynı sonuç üretiliyor.
- [ ] `recentLogs` her client için baştan sona taranmıyor.

---

# 7. P1/P2 — CI/CD Quality Gate

## [ ] P1-03 — GitHub Actions CI ekle

> Workflow yazıldı (`.github/workflows/ci.yml`) ve komutlar yerelde geçti; **GitHub'da ilk çalışması henüz görülmedi**, bu yüzden kutular açık. Merge engelleme için repo ayarlarında branch protection gerekir.

### Problem

Repo root scriptleri kalite kontrollerine uygun olsa da `.github/workflows` altında otomatik quality gate görünmüyor.

### Önerilen workflow

Her PR/push için:

1. `npm ci`
2. `npm run prisma:validate`
3. `npm run lint`
4. `npm run typecheck`
5. `npm run test`
6. `npm run build`

Backend test altyapısı eklendikten sonra bu pipeline her iki workspace'i korumalı.

### Kabul kriterleri

- [ ] Kırık typecheck merge edilemiyor.
- [ ] Lint hatası CI'ı kırıyor.
- [ ] Test failure CI'ı kırıyor.
- [ ] Build failure CI'ı kırıyor.
- [ ] Prisma schema validation CI'da çalışıyor.

---

# 8. P3 — Frontend Maintainability

## [ ] P3-02 — Büyük page/component dosyalarını kontrollü parçala

### Aday dosyalar

- `apps/web/src/pages/reports-page.tsx`
- `apps/web/src/pages/program-editor-page.tsx`
- `apps/web/src/pages/programs-page.tsx`
- `apps/web/src/components/profile/coaching-section.tsx`
- `apps/web/src/components/profile/measurements-section.tsx`
- `apps/web/src/components/sessions/active-session-bar.tsx`

### Problem

Bazı dosyalar birden fazla sorumluluğu aynı yerde taşımaya başladı:

- data fetching
- local form state
- validation
- mutation
- navigation
- rendering
- alt UI parçaları

Şu an kritik problem değil ancak yeni feature'larla bakım maliyeti artabilir.

### Önerilen yaklaşım

Örneğin:

```text
ProgramEditorPage
 ├── ProgramForm
 ├── ExercisePicker
 ├── ProgramExerciseRow
 ├── useProgramForm
 └── validation helpers
```

Ancak sırf satır azaltmak için gereksiz abstraction yapılmamalı.

### Kabul kriterleri

- [ ] Page dosyası orchestration ağırlıklı kalıyor.
- [ ] İş kuralı helpers test edilebilir durumda.
- [ ] Gereksiz prop drilling veya abstraction oluşmuyor.

---

# 9. Doğrulanan güçlü noktalar

Bunlar şu an değiştirilmesi gereken sorunlar değil; korunması gereken tasarım kararlarıdır.

## [x] Access token localStorage'da tutulmuyor

Access token memory'deki auth session üzerinden kullanılıyor.

## [x] Refresh token HttpOnly cookie kullanıyor

Refresh cookie:

- HttpOnly
- configurable Secure
- SameSite=Lax
- `/api/auth` path

özelliklerine sahip.

## [x] Refresh token DB'de hash olarak tutuluyor

Raw refresh token yerine SHA-256 hash saklanıyor.

## [x] Refresh rotation var

Her başarılı refresh sonrası token değişiyor.

## [x] Concurrent refresh koruması var

Backend token-hash eşleşmesini atomik sayılabilecek `updateMany` kontrolüyle doğruluyor; frontend de paralel refreshleri tek promise altında birleştiriyor.

## [x] Argon2id password hashing

Passwordlar Argon2id ile hashleniyor.

## [x] Global DTO whitelist

Global ValidationPipe:

- whitelist
- forbidNonWhitelisted
- transform

aktif.

## [x] Workout input sınırları backend'de doğrulanıyor

Set/reps/weight sınırları yalnızca frontend'e bırakılmamış.

## [x] Ownership kontrolleri servis seviyesinde bulunuyor

Log/session/template gibi kullanıcı verilerinde `userId` query koşullarına dahil ediliyor.

## [x] Coach/client guard bulunuyor

Koçun client verisine erişimi yalnızca access token'a değil gerçek ilişki kaydına bağlı.

## [x] Unauthorized client access 404 ile gizleniyor

Client ID enumeration riskini azaltan yaklaşım mevcut.

## [x] Session create concurrency düşünülmüş

Aynı kullanıcı için concurrent session start işlemleri row lock ile serialize ediliyor.

## [x] Transaction kullanımı mevcut

Özellikle log replacement, password change, session creation ve template operasyonlarında transaction kullanılıyor.

## [x] React Query cache user değişiminde temizleniyor

User değiştiğinde cached account data'nın diğer kullanıcıya görünmesini önlemek için query cache temizleniyor.

## [x] Refresh request frontend'de deduplicate ediliyor

Aynı anda birden fazla 401 durumunda birden fazla refresh request yarışması engelleniyor.

## [x] DB indexleri temel kullanım senaryolarını destekliyor

Özellikle:

- user + performedAt
- user + exercise + performedAt
- refresh expiry
- session/template ilişkileri

üzerinde anlamlı indexler bulunuyor.

---

# 10. İlk uygulanacak çalışma sırası

## Sprint 1 — Security hardening

- [x] P1-01 Rate limiting
- [ ] P1-04 `TRUST_PROXY_HOPS` canlıda doğrula
- [ ] P2-01 Helmet/security headers
- [ ] P2-02 Environment validation

## Sprint 2 — Backend test foundation

- [ ] API test runner
- [ ] Auth tests
- [ ] Refresh rotation/concurrency tests
- [ ] IDOR tests
- [ ] Coach/client authorization tests
- [ ] Session concurrency test
- [ ] Transaction rollback tests

## Sprint 3 — CI

- [ ] GitHub Actions workflow
- [ ] lint
- [ ] typecheck
- [ ] test
- [ ] build
- [ ] prisma validate

## Sprint 4 — Performance

- [ ] Reports overview optimization
- [ ] Coach summary grouping optimization
- [ ] Query timing / benchmark

## Sprint 5 — Maintenance

- [ ] Refresh-session cleanup
- [ ] Large frontend component refactor
- [ ] Dead code / duplicate code scan
- [ ] Dependency audit

---

# 11. Verification commands

Değişikliklerden sonra root'ta çalıştırılacak temel kontroller:

```bash
npm ci
npm run prisma:validate
npm run lint
npm run typecheck
npm run test
npm run build
```

> Not: İlk review sırasında kaynak kod GitHub üzerinden statik olarak incelendi. Bağımsız çalışma ortamında GitHub clone/DNS erişimi olmadığı için mevcut master branch için bu komutların başarılı olduğu bağımsız olarak doğrulanmadı. CI eklendiğinde bu belirsizlik ortadan kalkacak.

---

# 12. Review çalışma kuralı

Yeni bulunan her sorun bu dosyaya aşağıdaki formatta eklenmelidir:

```text
[P1/P2/P3] Başlık

Dosya:
...

Problem:
...

Risk:
...

Çözüm:
...

Kabul kriterleri:
- [ ] ...
```

Bir task tamamlandığında checkbox `[x]` yapılmalı ve gerekiyorsa ilgili commit/PR numarası yanına eklenmelidir.

---

# 13. Sonraki derin review alanları

İlk turdan sonra ayrıca detaylandırılacak alanlar:

- [ ] Dependency vulnerability audit
- [ ] Error handling consistency
- [ ] API response contract consistency
- [ ] Pagination sınırları
- [ ] N+1 query taraması
- [ ] Büyük DB query taraması
- [ ] Race-condition taraması
- [ ] Date/timezone edge-case taraması
- [ ] PWA cache/update davranışı
- [ ] Accessibility review
- [ ] Mobile performance review
- [ ] Logging / observability
- [ ] Backup / migration / rollback planı
- [ ] Production incident readiness

Bu dosya statik bir rapor değil; proje geliştikçe güncellenecek yaşayan bir mühendislik backlog'udur.
