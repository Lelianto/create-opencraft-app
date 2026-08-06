# Rencana Pengembangan OpenCraft

> Status: Draft v2 — 2026-08-05
> Dokumen ini adalah rencana pengembangan monorepo OpenCraft, berdasarkan audit menyeluruh
> terhadap kode saat ini, CI/CD, arsitektur registry, dan riset package npm sejenis.
> Setiap bagian ditandai prioritas (P0/P1/P2) dan fase eksekusi (Fase 1–4).

---

## 1. Visi Produk: Hilangkan Redundansi, Hemat Token AI

### 1.1 Masalah yang ingin dipecahkan

Setiap project baru biasanya memakan banyak siklus yang sama berulang-ulang:

1. Minta AI generate **kode dasar** (config, layout, styling, folder, provider).
2. Minta AI generate **komponen dan halaman** (auth, dashboard, CRUD, upload).
3. Minta AI **menghubungkan** semuanya dan menulis **BE API** ke Supabase/Firebase
   (session, ownership, RLS/Firestore rules, storage, error handling, rate limit).
4. Minta AI setup **deployment** ke Vercel/GCP (env, config, migration, CI/CD).

Hasilnya: setiap project baru membakar puluhan ribu token untuk kode yang 90% identik
dengan project sebelumnya, dan hasil AI sering salah (keamanan, ownership, provider SDK)
karena tidak punya konteks yang teruji.

### 1.2 Solusi OpenCraft

> **Satu-satunya job-to-be-done: "install & jadi".** Pengguna (atau AI codegen) cukup
> meng-install package OpenCraft, produk dasar yang aman dan teruji sudah ada — tidak
> perlu generate ulang, tidak perlu wiring manual, tidak perlu menebak SDK provider.

Konsekuensi desain:

- **Starter = produk dasar yang "jadi"**, bukan skeleton. Setelah `opencraft create`,
  pengguna sudah punya: app shell + auth yang berfungsi + contoh CRUD yang terkoneksi
  ke backend + storage + security headers + config deployment — semua sudah dicolokkan.
- **AI codegen jadi konsumen**, bukan generator ulang. `AGENTS.md` (dan nanti *skills*)
  mengajarkan AI untuk *memakai* modul yang sudah ter-install (`@/components/...`,
  `@/infrastructure/auth`, `@/features/...`) daripada menulis ulang. Ini yang memangkas
  token: AI cukup menulis *business logic*, bukan *infrastruktur*.
- **Setiap produk jadi = komposisi modul yang sudah teruji**, bukan satu template raksasa.
  Satu kombinasi = satu preset (Bagian 1.3).
- **Deployment config menjadi bagian dari paket**, bukan tahap terpisah yang diserahkan
  ke AI. Modul `deploy-vercel`, `deploy-gcp` dsb. menghasilkan config + workflow yang
  benar dari awal.

### 1.3 Preset Produk Jadi (arah utama pengembangan)

Kombinasi modul + config yang langsung menghasilkan produk yang bisa di-deploy:

| Preset | Arsitektur | Backend | Auth | Storage | Modul wajib | Hasil |
|---|---|---|---|---|---|---|
| `saas` | hybrid | supabase | google | supabase | auth, protected-routes, role-permission, user-profile, dashboard, crud-example, data-table, pagination, search-filter, audit-log, error-handling, rate-limit, ssrf-protection, security-headers, api-response, input-validation, confirmation-dialog | App dengan login, dashboard, manajemen user/role, contoh CRUD, audit |
| `firebase-saas` | hybrid | firebase | google | firebase | sama dengan `saas` | SaaS parity di Firebase |
| `admin-tool` | hybrid | supabase | google | supabase | auth, protected-routes, role-permission, user-profile, dashboard, data-table, pagination, search-filter, audit-log, api-response | Backoffice/konsol admin internal |
| `app-mobile-api` | feature | firebase | google | firebase | auth, protected-routes, api-response, crud-example, image-upload, storage | Backend API + web admin untuk mobile app |
| `content` | atomic | none | none | vercel-blob | error-handling, data-table, pagination, confirmation-dialog | Landing + dashboard statis |
| `blog` | atomic | none | none | none | error-handling, security-headers, ssrf-protection | Landing + blog shell |
| `portfolio` | atomic | none | none | none | error-handling, security-headers, ssrf-protection | Landing site personal/bisnis |
| `content` | atomic | none | none | vercel-blob | error-handling, data-table, pagination, confirmation-dialog | Landing + dashboard statis |
| `app-mobile-api` | feature | firebase | google | firebase | auth, protected-routes, api-response, crud-example, image-upload, storage | Backend API + web admin untuk mobile app |
| `blog` | atomic | none | none | none | error-handling, security-headers, ssrf-protection | Landing + blog shell |

Setiap preset = satu perintah: `opencraft create --preset saas`. AI codegen kemudian
hanya menambah *fitur bisnis*, dengan semua fondasi sudah terpasang dan teruji.

### 1.4 Metrik keberhasilan (token & kecepatan)

- **Token AI per project baru** turun drastis: fondasi (auth+CRUD+storage+deploy) tidak
  lagi di-generate ulang oleh AI — hanya di-install. Ukur dengan membandingkan jumlah
  token untuk menyelesaikan "buat fitur X" di project dengan vs tanpa OpenCraft.
- **Waktu sampai `pnpm dev` menampilkan produk fungsional** < 2 menit setelah `create`.
- **Zero "AI hallucination" pada lapisan infrastruktur**: tidak ada lagi AI yang menebak
  SDK Supabase/Firebase/Vercel — semua sudah tertulis di modul yang teruji.
- **Satu perintah menuju production**: `vercel deploy` / `gcloud run deploy` bekerja
  tanpa konfigurasi manual tambahan.

---

## 2. Ringkasan Eksekutif (Audit Baseline)

Fondasi OpenCraft sudah kuat: mesin registry berbasis checksum, 24 modul, 3 arsitektur
komponen (atomic/feature/hybrid), keamanan mutation-tested, pipeline publish OIDC.
Kelemahan utama bukan di engine, melainkan di **starter yang belum "jadi"** dan
**celah cakupan test/deployment**.

Tiga hal terpenting untuk dikerjakan:

1. **Starter = produk dasar jadi** (Bagian 4): app shell, auth berfungsi, CRUD
   terkoneksi, storage, config deployment — bukan landing page kosong.
2. **Preset produk jadi** (Bagian 5): kombinasi modul yang langsung bisa di-deploy,
   supaya AI codegen cukup `install` + tulis business logic.
3. **AI codegen sebagai konsumen** (Bagian 6): `AGENTS.md`/skills + kontrak ekspor
   modul sehingga AI tidak menulis ulang infrastruktur.

Prinsip panduan: **semua perubahan backward-compatible** — project yang sudah
ter-generate tidak boleh rusak oleh upgrade tool, dan modul yang sudah ter-install
tidak boleh berubah kontrak file-nya tanpa bump yang jelas.

---

## 3. Audit Kondisi Saat Ini (Baseline)

### 3.1 Fondasi yang sudah kuat

| Area | Status |
|---|---|
| Mesin registry | `loadRegistry` → `resolveModules` (topo-sort, deteksi cycle) → `planInstall` → `applyFiles` |
| Deteksi konflik | Checksum sha256 per file di `opencraft.config.json`; `update`/`remove` menolak file yang di-customisasi |
| Keamanan | 3 file test: `security-invariants` (struktural) + `template-behaviour` (behavioural, mutation-tested) |
| Publish | OIDC trusted publishing, workflow manual `publish.yml`, Node 24 / npm 11+ |
| Verifikasi paket | `pack-check.mjs` (dry-run tarball + scan secret), `validate-registry.mjs` |
| Placeholder | Sistem `{{...}}` untuk path dan isi file, per-arsitektur |
| Build pipeline | Turbo, `templates/` + `registry/` di-copy ke package sebelum pack |

### 3.2 Gap yang menghambat visi "install & jadi"

**Starter belum jadi produk (Bagian 4):**
- Landing page tunggal; tidak ada app shell/nav/header/footer.
- Tidak ada dark-mode toggle padahal token `.dark` + `--sidebar-*` sudah disiapkan.
- Auth tidak ter-wire: `google-auth` membuat `GoogleSignIn` tapi tidak ada halaman
  login/logout; tidak ada halaman yang merender tombol itu.
- `dashboard` hanyalah kartu instruksi (inert), bukan shell fungsional.
- Tidak ada contoh CRUD yang terkoneksi di starter (crud-example adalah modul opsional).
- Template kasar: `file-uploader.tsx` (label + input sr-only), warna hardcode
  (`text-zinc-*`, `text-blue-600`), placeholder "replace with requireUser()" di
  image-upload.

**Cakupan test & CI (Bagian 7):**
- Matrix CI hanya hybrid+supabase dan hybrid+firebase; atomic, feature, backend-less,
  storage-supabase tidak pernah di-build sungguhan.
- Perilaku template hanya diuji untuk 3 dari 24 modul (role-permission, audit-log,
  error-handling); upload, auth, storage, crud repository, nonce CSP, safeFetch belum
  dieksekusi.
- Tidak ada test untuk `diff`, `update`, `remove`, `init`, dan `create-opencraft-app`.
- Tidak ada validasi isi `supabase/products.sql` / `firestore.rules`.
- `registry/schemas/module.schema.json` dirujuk CONTRIBUTING.md tapi tidak ada.

**Deployment (Bagian 8):**
- Tidak ada modul deployment sama sekali (tidak ada `deploy-vercel`, `deploy-gcp`,
  docker, CI/CD generated). Ini adalah bagian "redundansi" terbesar yang belum disentuh.

**Produk & tooling:**
- `update` tidak punya three-way merge (konservatif — menjadi pembatas scaling).
- Rate limit hanya in-memory (per-instance).
- Auth hanya Google; `methods` di config schema hardcode `["google"]`.
- `crud-example` hanya supabase/firebase; tidak ada Drizzle/Prisma.
- Tidak ada semver per modul / resolusi range.
- `registry/presets`, `providers`, `schemas` masih kosong.

---

## 4. Strategi Non-Breaking by Construction

1. **Never edit a module's shipped file contract.** Modul baru hanya menambah file;
   perubahan struktur = versi major + path tetap, atau migration di `update`.
2. **Setiap perubahan template harus lolos `registry:validate` + `security-invariants` +
   `template-behaviour`.** Ini regression net yang tidak boleh merah.
3. **Tambah kombinasi ke matrix CI sebelum menambah modul baru.**
4. **Tulis test behavioural dulu untuk modul yang belum dieksekusi**, lalu refactor
   template-nya (bukan sebaliknya).
5. **Perluas `security-invariants` menjadi contract test** — setiap template baru wajib
   memenuhi invarian keamanan secara otomatis.
6. **Bump versioning tool hanya via Changesets**; jangan manual edit version (riwayat
   error 0.2.2 jadi pelajaran).
7. **Starter "jadi" hidup di `templates/nextjs-base` + modul baru, bukan mengubah
   kontrak modul lama.** Project yang sudah ada di-upgrade via modul baru (mis. modul
   `app-shell`), bukan dengan mengubah `nextjs-base` retroaktif.

---

## 5. Bagian A — Starter UI & Produk Dasar yang Jadi (Prioritas Tertinggi, Fase 1)

### 5.1 Tujuan

Hasil `opencraft create` = **produk dasar yang berfungsi**, bukan skeleton:
app shell + navigasi + dark mode + (bila auth dipilih) login/logout yang bekerja +
contoh halaman terkoneksi backend. Pengguna dan AI codegen langsung bisa menulis
fitur bisnis di atasnya.

### 5.2 Perubahan di `templates/nextjs-base`

**A1. App shell + navigasi (P0)**
- `SiteHeader` (logo, nav, dark-toggle, menu user), `SiteFooter`, `Sidebar` opsional
  (token `--sidebar-*` sudah ada).
- `next-themes` + `ThemeProvider` (tercatat di `docs/research/verified-apis.md`).
- Layout segment `src/app/(app)/layout.tsx`: halaman dashboard/profil/crud otomatis
  memakai shell; landing tetap tanpa shell.
- Tambah primitives shadcn yang hilang: `sidebar`, `sheet`, `tabs`, `switch`,
  `checkbox`, `tooltip`, `breadcrumb`, `sonner` (toast).

**A2. Landing page diperkaya (P0)**
- Hero + CTA + fitur + footer; render data modul yang ter-install (dinamis).
- Assertion di `security-invariants`: tidak ada token `{{...}}` bocor ke render.

**A3. Auth berfungsi di starter (P0)**
- Saat preset memilih auth: hasil generate sudah berisi halaman login (merender
  `GoogleSignIn`), callback, sign-out, dan route yang di-protect — bukan sekadar tombol.
- `user-profile` menampilkan user nyata dari `requireUser()` + tombol logout yang bekerja.

**A4. Dashboard module → shell fungsional (P1)**
- Stat cards, aktivitas terbaru, placeholder widget; backend-agnostic; tidak membuat
  keputusan auth (jaga kontrak yang didokumentasikan).

**A5. Contoh CRUD terkoneksi di starter (P1)**
- Untuk preset dengan backend, hasil generate sudah punya satu contoh
  `products` yang bisa hidup/mati dengan Supabase/Firebase (bukan hanya sebagai modul
  opsional). Ini jadi "referensi" bagi AI codegen: AI bisa menyalin pola `repository` +
  `route` + `form` untuk fitur baru.

**A6. Bersihkan template kasar (P2)**
- `file-uploader.tsx` → shadcn-style; hapus warna hardcode; wire `requireUser()`
  pada image-upload route (hapus placeholder).

**A7. SEO & metadata (P2)**
- `generateMetadata` default, `metadataBase` dari env, `sitemap.ts` + `robots.ts`
  opsional.

---

## 6. Bagian B — Preset Produk Jadi (Fase 1–2)

### 6.1 Kenapa preset

Visi "install & jadi" tidak bisa dipenuhi oleh satu starter. Berbagai jenis produk
membutuhkan kombinasi modul berbeda. Preset = kombinasi modul + arsitektur + backend +
storage + config yang tervalidasi dan langsung di-deploy.

### 6.2 Implementasi

**B1. Format preset (P0)**
- `registry/presets/<name>.json` (folder sudah ada): `{ architecture, backend, storage,
  modules[], description }`.
- Validasi: preset harus lolos aturan kombinasi yang sama dengan `create` interaktif
  (backend/storage/arch must match modul yang dipilih).
- CLI: `opencraft create --preset saas` + `--preset list`.

**B2. Preset awal (P1)** — sesuai tabel di Bagian 1.3: `saas`, `content`, `app-mobile-api`,
`blog`, `firebase-saas`, `admin-tool`, `portfolio`.

**B3. Preset sebagai "produk jadi" yang diuji (P0)**
- Setiap preset menjadi kombinasi di matrix CI `generated-apps` (Bagian 7.1), jadi
  setiap perubahan modul tidak bisa merusak preset tanpa terdeteksi.

### 6.3 Kontrak modul untuk AI (mendukung penghematan token)

**B4. `AGENTS.md` diperkuat + skills (P0)**
- Saat ini `AGENTS.md` di-generate. Perluas menjadi panduan yang bisa dibaca AI agents
  (Cursor/v0/Claude): daftar `@/` exports yang tersedia per modul, pola repository/route
  yang harus ditiru, aturan "jangan tulis ulang infra, gunakan modul".
- Nanti: format *skills* ala shadcn/skills (context layer untuk AI agents).

**B5. Kontrak ekspor per modul (P1)**
- `module.json` menambah `exports` (public API modul: path + fungsi/komponen utama).
- `doctor` + `list --json` menampilkan exports; AI agents membaca ini tanpa perlu
  membaca isi semua file (hemat token).

---

## 7. Bagian C — Scaling Tanpa Mengganggu Fungsi yang Ada (Fase 1–2)

### 7.1 Perluas cakupan CI

**C1. Matrix `generated-apps` diperluas (P0)**

| Kombinasi | architecture | backend | storage | auth | modul |
|---|---|---|---|---|---|
| hybrid supabase (ada) | hybrid | supabase | vercel-blob | google | image-upload, dashboard, crud-example, confirmation-dialog |
| hybrid firebase (ada) | hybrid | firebase | firebase | google | image-upload, dashboard |
| atomic standalone | atomic | none | none | none | dashboard, data-table |
| feature firebase | feature | firebase | firebase | google | crud-example, image-upload |
| hybrid supabase-storage | hybrid | supabase | supabase | google | file-upload, user-profile |
| preset `saas` (penuh) | hybrid | supabase | supabase | google | semua modul saas |

Ini menjamin semua arsitektur + backend + storage + preset di-build sungguhan.

**C2. Test behavioural untuk modul inti (P0)**
`safeFetch` (SSRF), nonce CSP, `rate-limit`, crud repository (supabase/firebase),
storage adapter, auth adapters (ganti stub dengan double realistis).

**C3. Test CLI command (P1)**
`diff`, `update`, `remove`, `init`, dan `create-opencraft-app`.

**C4. Validator provider rules (P1)**
`supabase/products.sql` (RLS + `auth.uid()`), `firestore.rules` (allowlist + owner).

### 7.2 Infrastruktur release

**C5. `registry/schemas/module.schema.json` (P1)** — buat yang dirujuk CONTRIBUTING.md.
**C6. Sinkronkan `validate-registry.mjs` dengan `manifestSchema` Zod (P1)** — satu sumber
kebenaran, hindari dua validasi bertabrakan.

### 7.3 Update & konflik

**C7. `update --apply` (three-way merge) (P2)**
- Default tetap konservatif; `--apply` opt-in dengan conflict markers
  (pola `shadcn add --apply` / `git rebase`). Base = checksum-recorded.

**C8. Semver per modul + remote registry (P2)** — resolusi range `^x.y.z` terhadap
`module.json` version; update modul tanpa update mesin.

### 7.4 Performance

**C9. Test skala (P2)** — `loadRegistry`/`planInstall` linier pada project besar
(100+ modul simulasi). Batch pembaruan checksum, hindari baca/tulis per-file.

---

## 8. Bagian D — Deployment sebagai Bagian dari Paket (Fase 2, gap terbesar)

Ini area redundancy terbesar yang belum disentuh. Deployment ke Vercel/GCP/docker selalu
diserahkan ke AI per project; padahal bisa jadi modul yang menghasilkan config teruji.

### 8.1 Modul deployment baru

| Modul | Menghasilkan | Target |
|---|---|---|
| `deploy-vercel` | `vercel.json`, env mapping, migration seed hook, GitHub Actions untuk preview/prod | Vercel |
| `deploy-gcp` | `Dockerfile`, `cloudbuild.yaml` / Cloud Run service, `app.yaml`, secret env dari Secret Manager, migration startup | GCP Cloud Run/App Engine |
| `deploy-docker` | `Dockerfile` multi-stage, `docker-compose.yml`, healthcheck | VPS/self-host |
| `deploy-github-pages` (opsional) | workflow untuk static export | GitHub Pages |

### 8.2 Prinsip desain

- **Config deployment membaca `opencraft.config.json`** (backend/storage/auth) untuk
  menulis env vars + migration yang benar — tidak perlu input ulang.
- **Ikut serta dalam matrix CI**: setiap kombinasi di-build dan (opsional) di-deploy
  preview, jadi config deployment terbukti bekerja, bukan "kelihatan benar".
- **Dokumentasi per-target di `docs/`** sehingga AI codegen tidak perlu riset ulang.

### 8.3 Prioritas

- **D1. `deploy-vercel` (P0)** — mayoritas pengguna Next.js.
- **D2. `deploy-docker` (P1)** — dasar untuk semua target lain (GCP pakai Dockerfile).
- **D3. `deploy-gcp` (P1)**.
- **D4. Integrasi preset: preset `saas` sudah termasuk modul deploy (P1).**

---

## 9. Bagian E — Adopsi dari Package NPM Sejenis (Fase 2–3)

Riset package sejenis (2026) menghasilkan pola yang layak diadopsi:

### 9.1 Layak diadopsi

| Pola | Dari | Penerapan |
|---|---|---|
| **Presets** (`init --preset`) | shadcn CLI v4, VForge | `registry/presets/` + `opencraft create --preset` (Bagian 6) |
| **Registry HTTP / URL install** | shadcn `add <url>` / `@namespace/item` | `opencraft add <url>` dari registry remote |
| **`--dry-run` + `--diff` universal** | shadcn CLI v4, cyanideui | perluas ke `update` & `remove` |
| **Wrapper pattern** (`components/custom`) | stow.build, openstatus | `src/components/custom` + `patterns` agar `update` tidak menimpa bisnis logic |
| **`shadcn/skills`** (AI context) | shadcn | perluas `AGENTS.md` → skills (Bagian 6.3) |
| **`packages/ui` monorepo output** | create-notils | preset `--monorepo` untuk pengguna monorepo |
| **Installers map** | create-t3-app | sudah setara `resolveModules`; jadikan referensi desain modul baru |
| **Auto-wrapped providers di layout** | devstart-cli | modul yang butuh provider (theme/toast/query) menambah `Providers` di layout |
| **Token/design extraction** | @sarveshsea/memoire | opsional: `doctor --design` (riset dulu) |

### 9.2 Sengaja TIDAK diadopsi

| Hal | Alasan |
|---|---|
| Full boilerplate 30+ integrasi (VForge, samrose) | Filosofi beda: modular, bukan giant preset |
| Copy-paste library besar (Duckit, cyanideui) | `pack:check` + "add only what you use" adalah nilai jual |
| AI codegen engine (siza-gen, ai-code-gen) | Keluar scope; AI hanya konsumen via skills |
| Migrasi Biome/Bun (create-notils) | Merusak ekosistem ESLint/Prettier/pnpm yang ada |
| `v0`-style theme gallery | cukup dark/light + beberapa preset token |

### 9.3 Perlu riset lebih dalam

- **`@duckit/registry` + shadcn Registry API**: kompatibilitas ekspor modul ke format
  shadcn (`npx shadcn add` bisa memakai modul OpenCraft). Layak sebagai *export opsional*.
- **`@shadregistry/cli`**: publikasi registry via SaaS — untuk registry remote.
- **`memi tokens` (W3C DTCG)**: ekspor token desain untuk konsumen non-Tailwind.
- **Pola `--apply` three-way merge shadcn**: pelajari sebelum menulis C7.

---

## 10. Product Roadmap (Fase 1–4)

### Fase 1 (stabilkan fondasi + starter jadi produk) — sekarang → 2 sprint
- [x] A1 App shell + ThemeProvider + dark toggle di `nextjs-base`
- [x] A2 Landing page diperkaya
- [ ] A3 Auth berfungsi di starter (login/logout + protected)
- [ ] A4 Dashboard jadi shell fungsional
- [x] B1 Format preset + `create --preset` + `--preset list`
- [ ] B4 `AGENTS.md` diperkuat (kontrak AI)
- [x] C1 Perluas matrix CI (atomic, feature, backend-less, storage-supabase)
- [x] C2 Test behavioural safeFetch, rate-limit, crud repository, storage, auth
- [x] C4 Validator provider rules (products.sql + firestore.rules)
- [x] C5 `registry/schemas/module.schema.json`
- [ ] A6 Bersihkan file-uploader/image-upload + warna hardcode

### Fase 2 (integrasi & deployment) — 2–4 sprint
- [ ] B2 Preset awal: `saas`, `content`, `app-mobile-api`, `blog`
- [ ] B3 Preset masuk matrix CI
- [ ] D1 `deploy-vercel`, D2 `deploy-docker`, D3 `deploy-gcp`
- [ ] A5 Contoh CRUD terkoneksi di starter
- [ ] A7 SEO/metadata default
- [ ] C3 Test CLI command (diff/update/remove/init/create-opencraft-app)
- [ ] C4 Validator provider rules
- [ ] C6 Sinkronkan dua validator registry
- [ ] URL install (`opencraft add <url>`)
- [ ] `--diff`/`--dry-run` untuk update & remove
- [ ] Rate limit Redis/Upstash adapter

### Fase 3 (scaling lanjutan) — 2–3 sprint
- [ ] B5 Kontrak ekspor per modul (AI-readable)
- [ ] C7 `update --apply` three-way merge
- [ ] Auth email OTP / passkeys (perluas `methods` schema)
- [ ] Drizzle & Prisma variants untuk crud-example (prefix `drizzle/`/`prisma/` sudah siap)
- [ ] C8 Semver per modul + remote registry
- [ ] Compat shadcn Registry API (export opsional)
- [ ] Wrapper pattern `src/components/custom` + `patterns`
- [ ] Preset `--monorepo` (output `packages/ui`)

### Fase 4 (ekosistem & visibilitas) — 2 sprint
- [ ] `apps/docs` documentation site (roadmap README lama)
- [ ] Skills/AGENTS.md untuk AI agents (formal)
- [ ] `doctor --design` (token audit) — opsional
- [ ] Modul deployment `deploy-github-pages` (opsional)

---

## 11. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Starter diubah → project lama rusak | `update` gagal / file ditimpa | Perubahan starter hanya untuk generate baru (`templates/nextjs-base`); upgrade project lama via modul baru (mis. `app-shell`) |
| Preset menambah permukaan dukungan | Scope melebar | Preset = kombinasi valid saja; validator menolak kombinasi invalid |
| Matrix CI meluas → build time naik | CI lambat | Paralel; batasi ke kombinasi yang benar-benar beda |
| Three-way merge menghasilkan kode salah | Bisnis logic rusak | Default konservatif; `--apply` opt-in + conflict markers + test |
| Deployment config ternyata salah di produksi | Pengguna stuck | Matrix CI + preview deploy membuktikan config, bukan sekadar terlihat benar |
| Adopsi shadcn Registry API setengah jadi | Dua format mengambang | Export opsional (publish), bukan import wajib; `module.json` tetap sumber kebenaran |
| Versioning modul manual | Regresi release (0.2.2 terulang) | Rule: version modul di-bump via changeset; validator wajib di CI |

---

## 12. Metrik Keberhasilan (diupdate dari visi)

- **Token AI per project baru turun signifikan**: fondasi tidak di-generate AI lagi —
  diukur dengan benchmark "buat fitur X" dengan vs tanpa OpenCraft.
- **Waktu sampai produk fungsional** (`pnpm dev` menampilkan app shell + auth + CRUD
  terkoneksi) < 2 menit setelah `create`.
- **100% kombinasi arsitektur × backend × preset di-build sungguhan di CI.**
- **100% modul dengan template logic punya test behavioural yang mengeksekusi source.**
- **Satu perintah menuju production**: config deployment dari modul `deploy-*` bekerja
  tanpa edit manual di Vercel/GCP.
- **`update --apply` mempertahankan ≥90% resolusi otomatis** pada dataset uji.
- **Waktu dari "ide modul" sampai "modul ter-publish" < 1 hari** (schema + validator +
  CI + pack:check + release OIDC).
