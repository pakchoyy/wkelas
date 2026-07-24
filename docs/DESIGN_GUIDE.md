# Bantu Guru Yuk — Design Guide

> Dokumentasi desain sistem aplikasi **Bantu Guru Yuk | Jadwal Pelajaran**  
> Versi: 1.0 — Framework: Next.js 14+ (App Router) — CSS: Tailwind CSS

---

## 1. Design Philosophy

### Karakter Desain
- **Modern & Friendly** — warna teal hangat, sudut membulat, bayangan lembut
- **Professional** — tipografi bersih, spacing rapi, hierarki jelas
- **Education-Oriented** — ikon Lucide, bahasa Indonesia, tone suportif

### Nuansa
- Tenang, terpercaya, tidak berisik
- Gradien teal-to-cyan sebagai identitas utama
- Background abu-abu kebiruan () — memberi kesan ruang kerja bersih
- Card putih dengan border tipis — kontras tinggi, fokus ke konten

### Target Pengguna
- Guru SMP/MTs (user utama)
- Tenaga administrasi sekolah
- Operator jadwal
- Cocok untuk jenjang SD, SMP, SMA (mendukung education level)

---

## 2. Layout

### Diagram Layout Desktop

```
+-------------------------------------------------------+
| HEADER (sticky, h-48px, bg-gradient teal)             |
+----------+--------------------------------------------+
|          |                                            |
| SIDEBAR  |  CONTENT AREA (flex-1, overflow-auto)      |
| w-64     |                                            |
| fixed    |  +--------------------------------------+  |
| left     |  |  Action Bar (buttons, search)        |  |
|          |  +--------------------------------------+  |
|          |  +--------------------------------------+  |
|          |  |  Table / Card Grid / Form            |  |
|          |  |                                      |  |
|          |  |                                      |  |
|          |  +--------------------------------------+  |
|          |  +--------------------------------------+  |
|          |  |  Footer count / Pagination           |  |
|          |  +--------------------------------------+  |
|          |                                            |
+----------+--------------------------------------------+
| RUNNING TEXT (bottom ticker, auto-scroll)              |
+-------------------------------------------------------+
```

### Diagram Layout Mobile

```
+------------------+
| HEADER (h-48px)  |
+------------------+
|                  |
| CONTENT AREA     |
|                  |
|                  |
|                  |
+------------------+
| BOTTOM NAV       |
| (5 icon tabs)    |
+------------------+
```

### Header
- **Sticky** di atas layar (`position: sticky, top: 0`)
- Tinggi konsisten `48px`
- Background `bg-gradient-bgy` (teal gradient)
- Content: Logo + brand name di kiri, dark mode toggle + hamburger di kanan
- `z-index: 300`
- Shadow: `0 2px 10px rgba(0,0,0,.18)`

### Sidebar
- **Desktop**: sticky, lebar `256px` (`w-64`), tampil selalu
- **Mobile**: off-canvas (slide from left), backdrop transparan
- Background `var(--card-bg)`, border kanan `var(--border)`
- Pemisah section: Menu, lalu bottom section (Tentang, Kontak)
- Footer: copyright + social link (TikTok)
- Setiap nav item: icon + label, active state teal highlight
- Transition: `transform 300ms ease-in-out`

### Dashboard
- Grid section: DraftCard → Quick Actions → Alert → Guide → Stats → Quick Links
- Stats menggunakan grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Setiap stat card: icon di kanan (warna sesuai kategori), value besar, label kecil

### Content
- Padding: `p-4 md:p-6`
- Max width container opsional (`max-w-4xl`)
- Background abu-abu (`var(--bg)` = )
- Animasi masuk: `animate-slide-up` (0.3s ease-out)

### Footer
- Tidak ada footer tradisional
- Digantikan **RunningText** component di bottom (auto-scroll ticker)
- Sidebar memiliki copyright di bagian bawah

---

## 3. Color System

### Primary (Teal Gradient — Brand Identity)

| Token | HEX | Usage |
|-------|-----|-------|
| Primary | `#0ea5a0` | Button utama, active link, icon, stats card icon |
| Primary Light | `rgba(14,165,160,0.08)` | Background highlight, info box |
| Primary Medium | `rgba(14,165,160,0.1)` | Sidebar active item bg |
| Primary Dark | `#0d7a8a` | Gradien komponen |
| Primary Deep | `#2d6a7f` | Gradien komponen |
| Gradient | `#0ea5a0 → #0d7a8a → #2d6a7f` | Header, LoadingScreen, Button primary |

### Secondary

| Token | HEX | Usage |
|-------|-----|-------|
| Secondary Bg | `var(--input-bg)` = | Button secondary bg |
| Secondary Border | `var(--border)` = | Button secondary border |
| Secondary Icon | `#64748b` (slate-500) | Text muted |

### Success

| Token | HEX | Usage |
|-------|-----|-------|
| Success | `#16a34a` / green-600 | Button success, alert icon |
| Success Light | `#f0fdf4` / green-50 | Alert background |
| Success Border | `#bbf7d0` / green-200 | Alert border |
| Success Text | `#166534` / green-800 | Alert text |
| Success Icon Bg | `#dcfce7` / green-100 | Stats card icon |

### Warning

| Token | HEX | Usage |
|-------|-----|-------|
| Warning | `#d97706` / amber-600 | Alert icon |
| Warning Light | `#fffbeb` / amber-50 | Alert bg, timer bg |
| Warning Border | `#fde68a` / amber-200 | Alert border |
| Warning Text | `#92400e` / amber-800 | Alert text |
| Warning Icon Bg | `#fef3c7` / amber-100 | Stats card, status badge |

### Danger

| Token | HEX | Usage |
|-------|-----|-------|
| Danger | `#dc2626` / red-600 | Button danger, delete action |
| Danger Light | `#fef2f2` / red-50 | Alert background |
| Danger Border | `#fecaca` / red-200 | Alert border |
| Danger Text | `#991b1b` / red-800 | Alert text |
| Danger Icon Bg | `#fee2e2` / red-100 | ConfirmDialog icon bg |

### Background

| Token | HEX | Usage |
|-------|-----|-------|
| Page Bg | `var(--bg)` = | Halaman utama |
| Card Bg | `var(--card-bg)` = | Card, table, sidebar |
| Input Bg | `var(--input-bg)` = | Input field bg |
| Highlight | `rgba(14,165,160,0.08)` | Info box, highlight section |
| Blue Light | `#eff6ff` / blue-50 | Tips box |

### Border

| Token | HEX | Usage |
|-------|-----|-------|
| Border | `var(--border)` = | Container border, table divider |

### Text

| Token | HEX | Usage |
|-------|-----|-------|
| Primary Text | `var(--text)` = | Body text |
| Light Text | `var(--text-light)` = | Secondary text, metadata |
| White | `#ffffff` | Text on gradient |
| Gray-900 | `#111827` | Heading, table cell |
| Gray-700 | `#374151` | Form label |
| Gray-500 | `#6b7280` | Placeholder, muted |
| Gray-400 | `#9ca3af` | Icon muted |

### Hover / Active / Disabled

| State | Style |
|-------|-------|
| Hover link | `hover:bg-gray-100` atau `hover:text-[#0ea5a0]` |
| Button hover | `hover:shadow-md`, `hover:opacity-90` |
| Button active | `active:scale-[0.98]` |
| Button disabled | `disabled:opacity-50`, `disabled:cursor-not-allowed` |
| Input disabled | `disabled:bg-gray-100` |

---

## 4. Typography

### Font Family

```css
font-family: 'Segoe UI', system-ui, sans-serif;
```

### Font Sizes & Weights

| Element | Size | Weight | Class |
|---------|------|--------|-------|
| Header Brand | `0.95rem` | 800 (extrabold) | — |
| Sidebar Menu Title | `0.6rem` | 700 (bold) | `uppercase tracking-[0.8px]` |
| Sidebar Item | `0.875rem` (text-sm) | 600 (semibold) | — |
| Dashboard Heading | `1.25rem` (text-xl) | 700 (bold) | — |
| Dashboard Card Value | `1.5rem` (text-2xl) | 700 (bold) | — |
| Modal Title | `0.875rem` (text-sm) | 700 (bold) | — |
| Table Header | `0.75rem` (text-xs) | 500 (medium) | `uppercase tracking-wider` |
| Table Cell | `0.875rem` (text-sm) | 500 (medium) | — |
| Button Text | `0.875rem` (text-sm) | 600 (semibold) | — |
| Label | `0.875rem` (text-sm) | 500 (medium) | `text-gray-700` |
| Body | `0.875rem` (text-sm) | 400 (normal) | — |
| Small | `0.75rem` (text-xs) | 400-500 | — |
| Caption | `10-11px` | 400 | Kompak |

### Heading Hierarchy

- `h1`: text-2xl + font-extrabold (loading screen)
- `h2`: text-xl + font-bold (section title)
- `h3`: text-sm + font-bold (modal title)
- `h4`: text-sm + font-semibold

---

## 5. Spacing System

### Padding

| Konteks | Padding |
|---------|---------|
| Page wrapper | `p-4 md:p-6` |
| Card | `p-6` |
| Modal content | `p-4` |
| Modal with title | `px-4 py-2` (header), `p-4` (body) |
| Table cell | `px-6 py-4` |
| Sidebar item | `px-3 py-2.5` |
| Button | `sm: px-3 py-1.5`, `md: px-4 py-2.5`, `lg: px-6 py-3` |

### Margin

| Konteks | Margin |
|---------|--------|
| Section spacing | `mb-6` |
| Card stack | `mb-4` atau `gap-4 md:gap-6` |
| Button group | `space-x-3`, `gap-4` |
| Form field | `space-y-4` |
| List item | `space-y-1` |

### Gap (Grid/Flex)

| Konteks | Gap |
|---------|-----|
| Dashboard grid | `gap-4 md:gap-6` |
| Button group | `gap-3` |
| Icon & text | `gap-2`, `gap-3` |

### Container

| Komponen | Max Width |
|----------|-----------|
| Modal | `sm: max-w-sm`, `md: max-w-md`, `lg: max-w-lg`, `xl: max-w-xl` |
| Generate page | `max-w-4xl` |
| Confirm dialog | `max-w-md` |
| Bottom nav (mobile) | `max-w-[420px]` |

### Radius

| Level | Value | Usage |
|-------|-------|-------|
| `--radius` | `12px` | Card, button |
| rounded-lg | `8px` | Input, modal, sidebar item |
| rounded-xl | `12px` | Card container |
| rounded-2xl | `16px` | Modal body |
| rounded-3xl | `24px` | Special card |
| rounded-full | `50%` | Badge, avatar |
| `rounded-[8px]` | `8px` | Logo header |
| `rounded-[18px]` | `18px` | Loading screen logo |

### Shadow

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow` | `0 2px 12px rgba(0,0,0,0.08)` | Card |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.13)` | Modal |
| `shadow-sm` | Tailwind sm | Draft card |
| `shadow-lg` | Tailwind lg | QRIS image |
| `shadow-xl` | Tailwind xl | Confirm dialog |
| `shadow-2xl` | Tailwind 2xl | Modal wrapper |
| Header shadow | `0 2px 10px rgba(0,0,0,.18)` | Header |
| Bottom nav shadow | `0 -2px 12px rgba(0,0,0,.08)` | Mobile |
| Button hover | `hover:shadow-md` | Button |

---

## 6. Component Inventory

### Library UI Components (`/components/ui/`)

| Component | File | Fungsi |
|-----------|------|--------|
| **Button** | `Button.tsx` | Aksi utama. Variants: `primary`, `secondary`, `danger`, `success`. Sizes: `sm`, `md`, `lg`. Support loading state. |
| **Input** | `Input.tsx` | Form input dengan label, helperText, error, required. |
| **Select** | `Select.tsx` | Dropdown select dengan label, helperText, error, placeholder, required. |
| **Modal** | `Modal.tsx` | Overlay modal dengan backdrop blur, title, close button, close on Escape. Sizes: `sm`, `md`, `lg`, `xl`. |
| **Alert** | `Alert.tsx` | Notifikasi dismissable. Types: `success`, `error`, `warning`, `info`. Auto-close 5s. |
| **ConfirmDialog** | `ConfirmDialog.tsx` | Modal konfirmasi dengan icon warning, title, message, warning box, cancel/confirm buttons. Support `danger` dan `primary` variant. |
| **LoadingSpinner** | `LoadingSpinner.tsx` | Spinner animasi. Sizes: `sm`, `md`, `lg`. Warna teal. |
| **LoadingScreen** | `LoadingScreen.tsx` | Full-screen branded loading dengan logo, title, message, spinner. Gradient background. |
| **SaveIndicator** | `SaveIndicator.tsx` | Floating bottom-right toast: saving/saved/error status dari auto-save system. |
| **DownloadNotification** | `DownloadNotification.tsx` | Toast notifikasi untuk download. |

### Layout Components (`/components/layout/`)

| Component | File | Fungsi |
|-----------|------|--------|
| **Header** | `Header.tsx` | Sticky top bar. Logo + brand name, dark mode toggle, hamburger menu toggle. |
| **Sidebar** | `Sidebar.tsx` | Navigasi utama (9 menu navigasi, 2 menu info). Desktop sticky, mobile off-canvas. |
| **BottomNav** | `BottomNav.tsx` | Mobile-only bottom navigation (5 tabs). Fixed bottom, max-w-[420px]. |
| **ClientLayout** | `ClientLayout.tsx` | Layout wrapper: Header + Sidebar + Main + RunningText. Juga handle cross-tab sync via StorageEvent. |
| **RunningText** | `RunningText.tsx` | Auto-scroll ticker di bagian bawah halaman. |
| **HamburgerMenu** | `HamburgerMenu.tsx` | Mobile sidebar toggle button. |
| **TentangModal** | `TentangModal.tsx` | Modal tentang aplikasi (sekarang dialihkan ke `/about`). |
| **KontakModal** | `KontakModal.tsx` | Modal kontak (sekarang dialihkan ke `/contact`). |

### Dashboard Components

| Component | File | Fungsi |
|-----------|------|--------|
| **DraftCard** | `DraftCard.tsx` | Project status card — menampilkan proyek terakhir, data snapshot, tombol lanjutkan. Juga empty state ketika belum ada proyek. |

### Payment Components (`/components/payment/`)

| Component | File | Fungsi |
|-----------|------|--------|
| **PaymentModal** | `PaymentModal.tsx` | Multi-step payment flow (amount → qris → success/error). |
| **PaymentAmountSelector** | `PaymentAmountSelector.tsx` | Donation amount selection UI. |
| **QRISDisplay** | `QRISDisplay.tsx` | QRIS image + countdown + polling payment status. |
| **PaymentSuccess** | `PaymentSuccess.tsx` | Success animation setelah donasi berhasil. |
| **PaymentError** | `PaymentError.tsx` | Error screen dengan retry option. |
| **PaymentProvider** | `PaymentProvider.tsx` | Provider wrapping payment flow. |
| **StaticQrisProvider** | `StaticQrisProvider.tsx` | QRIS fallback provider (no Mayar). |
| **MayarProvider** | `MayarProvider.tsx` | Mayar payment provider. |

### Pages (`/app/`)

| Page | Route | Fungsi |
|------|-------|--------|
| Dashboard | `/` | Landing page. Stats, quick actions, guide steps, seed/clear data. |
| Schools | `/schools` | CRUD sekolah. |
| Classes | `/classes` | CRUD kelas. Import Excel + download template. |
| Teachers | `/teachers` | CRUD guru. Import Excel + download template. |
| Subjects | `/subjects` | CRUD mata pelajaran. Import Excel + download template. |
| Time Slots | `/time-slots` | CRUD slot waktu per hari. Import Excel + download template. |
| Teaching Alloc. | `/teaching-allocations` | CRUD alokasi mengajar (guru-mapel-kelas-jam). Import + template. |
| Generate | `/generate` | Generate jadwal otomatis dengan 3 mode (spread/compact/block). |
| Schedules | `/schedules` | Lihat jadwal (all/teacher/class). Export PDF & Excel. Payment flow. |
| About | `/about` | Halaman tentang aplikasi. |
| Contact | `/contact` | Halaman kontak. |

---

## 7. Dashboard Pattern

### Struktur Dashboard

```
+-- DraftCard (project status / empty state) -----------+
|   [Project Name, School Level, Stats, Continue btn]   |
+-------------------------------------------------------+
+-- Quick Actions --------------------------------------+
|   [Seed Data] [Clear All]                             |
+-------------------------------------------------------+
+-- Alert (conditional) --------------------------------+
|   Success/error notification                          |
+-------------------------------------------------------+
+-- Guide (7 steps) ------------------------------------+
|   Step 1-7: ikon + title + description               |
+-------------------------------------------------------+
+-- Stats Grid (3 kolom desktop) -----------------------+
|   School | Classes | Teachers                         |
|   Subjects | TimeSlots | Allocations                  |
+-------------------------------------------------------+
+-- Quick Links (4 kolom) ------------------------------+
|   [Kelas] [Guru] [Mapel] [Alokasi]                   |
+-------------------------------------------------------+
```

### Prinsip Dashboard
- **One-screen overview** — semua informasi penting di satu layar tanpa scroll berlebihan
- **Action-oriented** — quick actions langsung di atas
- **Guidance for new users** — step-by-step guide selalu ada
- **Data-driven** — stat card menunjukkan kondisi database
- **Consistency**: setiap icon stat card menggunakan warna yang berbeda-beda (blue, green, purple, yellow, red, indigo)

---

## 8. CRUD Pattern

### Layout CRUD (setiap halaman master data mengikuti pola yang sama)

```
+-- Action Bar (flex wrap, center) ---------------------+
|   [Tambah Data]  [Download Template]  [Import Excel]  |
+-------------------------------------------------------+
+-- Search Bar -----------------------------------------+
|   Input: Cari [entity]...                            |
+-------------------------------------------------------+
+-- Table (bg-white, rounded, shadow-sm) --------------+
|   Header row (gray-50 bg, uppercase label)           |
|   Data rows (striped: white / gray-50)               |
|   Tiap baris: data cells + action buttons (Edit/Hapus)|
+-------------------------------------------------------+
+-- Footer ---------------------------------------------+
|   Total: N [entity]                                   |
+-------------------------------------------------------+
+-- Modal Form (create/edit) ---------------------------+
|   Input fields sesuai entity                          |
|   [Batal] [Simpan]                                   |
+-------------------------------------------------------+
+-- ConfirmDialog (delete) -----------------------------+
|   Warning icon + pesan konfirmasi                     |
|   [Batal] [Hapus]                                    |
+-------------------------------------------------------+
+-- Modal Hasil Import ---------------------------------+
|   Berhasil: N | Gagal: M                             |
|   List error per baris                               |
+-------------------------------------------------------+
```

### Pola Konsisten
- Setiap halaman CRUD menggunakan **import yang sama** dari `@/components/ui/Button`, `Modal`, `Input`, `Select`, `Alert`, `ConfirmDialog`
- Setiap halaman memiliki **state yang identik**: `entities`, `filteredEntities`, `searchTerm`, `isModalOpen`, `editingEntity`, `formData`, `alert`, `isSubmitting`, `deleteDialog`, `importResult`, dll
- Setiap halaman memiliki **4 fungsi utama**: `handleCreate`, `handleEdit`, `handleSubmit`, `handleDelete`
- **Filter by search** menggunakan `filterBySearch(entities, searchTerm, fields)`

---

## 9. Responsive

### Breakpoints

| Breakpoint | Tailwind | Target |
|------------|----------|--------|
| Mobile | `< 768px` (`< md`) | Smartphone |
| Tablet | `≥ 768px` (`md`) | Tablet |
| Desktop | `≥ 1024px` (`lg`) | Laptop/PC |
| Wide | `≥ 1280px` (`xl`) | Monitor lebar |

### Layout Perubahan

| Elemen | Mobile | Desktop |
|--------|--------|---------|
| Header | Sticky, logo + hamburger | Sticky, logo + dark mode toggle |
| Sidebar | Off-canvas (slide, backdrop) | Sticky, always visible (`w-64`) |
| Bottom Nav | 5 tabs fixed bottom | Hidden |
| Content Grid | 1 kolom | 2-3 kolom sesuai section |
| Table | Horizontal scroll | Normal |
| Card Grid | `grid-cols-1` | `md:grid-cols-2 lg:grid-cols-3` |

### Mobile-First Approach
- Menggunakan prefix `md:` dan `lg:` untuk desktop
- Viewport: `width=device-width, initial-scale=1`
- Active state on mobile: menggunakan `active:` pseudo-class
- Tombol aksi di mobile: hanya icon, label di-hidden (`hidden sm:inline`)

---

## 10. Reusable Components (Library-Ready)

### Can be extracted as UI Library

| Component | Dependency | Notes |
|-----------|------------|-------|
| `Button` | Tidak ada | Pure Tailwind, lucide-react untuk loading spinner |
| `Input` | Tidak ada | Pure Tailwind |
| `Select` | Tidak ada | Pure Tailwind |
| `Modal` | lucide-react (X icon) | Escape key, backdrop click, body scroll lock |
| `Alert` | lucide-react | Auto-close timer, 4 variants |
| `ConfirmDialog` | lucide-react + Button | Warning icon, cancel/confirm, children slot |
| `LoadingSpinner` | Tidak ada | Pure CSS animation |
| `LoadingScreen` | Tidak ada | Fullscreen branded |
| `SaveIndicator` | lucide-react | Auto-save subscription |
| `DownloadNotification` | Tidak ada | Toast notification |

### Layout Components (Needs Project Adaptation)

| Component | Adaptable? | Notes |
|-----------|------------|-------|
| `Header` | Yes | Need brand name, nav items, dark mode |
| `Sidebar` | Yes | Need nav items array, active state via pathname |
| `BottomNav` | Yes | Need nav items array, max 5 items |
| `ClientLayout` | Yes | Need Header + Sidebar + Main structure |
| `RunningText` | Yes | Reusable ticker |

---

## 11. Design Rules

### Aturan Desain Konsisten

| Aturan | Value |
|--------|-------|
| Card radius | `12px` (`rounded-[var(--radius)]` atau `rounded-xl`) |
| Button radius | `12px` |
| Modal radius | `16px` (`rounded-2xl`) |
| Input radius | `8px` (`rounded-lg`) |
| Sidebar radius | `8px` per item |
| Header height | `48px` |
| Sidebar width | `256px` (`w-64`) |
| Page padding | `16px` mobile, `24px` desktop |
| Card padding | `24px` (`p-6`) |
| Modal body max-height | `75vh` |
| Button height | `sm: ~32px`, `md: ~40px`, `lg: ~48px` |
| Bottom nav (mobile) | `max-w-[420px]`, center, fixed bottom |
| Loading screen z-index | `99999` |
| Modal z-index | `50` |
| Header z-index | `300` |
| Page transition | `opacity + translateY 0.2s ease` |
| Slide up animation | `translateY(20px) → 0, opacity 0→1, 0.3s` |
| Hover transition | `transition-colors duration-200` |
| Button transition | `transition-all duration-200` |
| Button active scale | `scale-[0.98]` |

---

## 12. Design Strengths

1. **Brand Identity Kuat** — Gradien teal khas (`#0ea5a0 → #0d7a8a → #2d6a7f`) mudah dikenali, konsisten di header, button, loading screen, icon highlights

2. **Konsistensi CRUD Tinggi** — Semua 6 halaman master data (School, Class, Teacher, Subject, TimeSlot, TeachingAllocation) menggunakan pola yang identik. Satu halaman sudah cukup sebagai reference untuk clone halaman baru.

3. **Mobile-First dengan Bottom Nav** — Bottom navigation 5 tab membuat navigasi mobile sangat nyaman, sidebar off-canvas untuk menu lengkap.

4. **Dark Mode Siap** — CSS variables untuk dark mode sudah didefinisikan di `globals.css`, meskipun belum semua komponen mengimplementasikannya secara penuh.

5. **Branded Loading Experience** — LoadingScreen dengan logo, gradient, dan pulse animation memberikan kesan premium.

6. **Auto-Save + Indicator** — Integrasi auto-save dengan SaveIndicator memberikan feedback real-time ke user.

7. **Payment Flow Terintegrasi** — Payment flow sebagai modal multi-step yang terintegrasi dengan export schedule — UX yang mulus.

8. **Bahasa Indonesia Full** — Seluruh UI menggunakan bahasa Indonesia — tepat sasaran untuk user guru di Indonesia.

---

## 13. Weaknesses

1. **Dark Mode Belum Penuh** — CSS variables dark sudah ada, tapi banyak komponen masih pakai hardcoded Tailwind colors (`text-gray-900`, `bg-white`, `border-gray-200`). Perlu migrasi ke CSS variables.

2. **Mobile Table Experience** — Table di halaman CRUD menggunakan horizontal scroll. Alternatif: card layout untuk mobile.

3. **Hardcoded Colors di Banyak Tempat** — Banyak komponen menggunakan Tailwind utility classes langsung (contoh: `text-gray-500`, `bg-blue-100`, `bg-red-50`) alih-alih menggunakan CSS variables atau design tokens yang terpusat.

4. **Tidak Ada Design Token File** — Warna, spacing, radius tersebar di komponen dan `globals.css`. Tidak ada file `tailwind.config.ts` kustom atau file tokens terpusat.

5. **Payment Components Tied to Specific Provider** — PaymentModal, QRISDisplay, dan provider terkait masih terikat dengan Mayar + QRIS. Perlu abstraction untuk generic payment provider.

6. **No Empty State di Beberapa Halaman** — Beberapa list tidak memiliki empty state yang konsisten. Classes page sudah punya, tapi Teachers, Subjects, dll belum semuanya.

7. **Transition/Animation Tidak Konsisten** — Ada yang pakai `animate-slide-up`, ada yang pakai Tailwind `animate-in fade-in`. Perlu standarisasi.

8. **Loading States Tidak Seragam** — Ada yang pakai `LoadingSpinner`, ada yang pakai spinner inline. Perlu satu pattern loading untuk semua async actions.

---

## 14. Clone Guide

### Untuk membuat aplikasi baru (contoh: Kas Kelas, SIPANDI, Absensi, Silabus, Penilaian)

### 1. Struktur yang Bisa Langsung Dicopy

```
components/ui/          → ✅ Seluruh komponen UI (Button, Input, Select, Modal, Alert, dll)
components/layout/      → ✅ Layout structure (Header, Sidebar, BottomNav, ClientLayout, RunningText)
components/dashboard/   → ✅ DraftCard (dengan modifikasi project type)
lib/types.ts            → ✅ Pattern file types (sesuaikan entity)
lib/db.ts               → ✅ LocalDB class (ganti entity names)
lib/utils.ts            → ✅ Utility functions
lib/analytics.ts        → ✅ Analytics pattern
lib/auto-save.ts        → ✅ Auto-save system
```

### 2. Yang Perlu Diubah

| Bagian | Action |
|--------|--------|
| `types.ts` | Ganti entity interfaces (School → different domain entity) |
| `db.ts` | Ganti keys dan entity CRUD methods |
| `app/layout.tsx` | Ganti metadata, title, description |
| `app/globals.css` | Ganti gradient colors (optional untuk brand berbeda) |
| `components/layout/Header.tsx` | Ganti logo image, brand name |
| `components/layout/Sidebar.tsx` | Ganti nav items array |
| `components/layout/BottomNav.tsx` | Ganti nav items array |
| `components/dashboard/DraftCard.tsx` | Ganti project-related text |
| `public/` | Ganti logo images (guru-cibisd2.png, icon.png) |
| `components/payment/` | Optional — hanya jika perlu payment |

### 3. Halaman yang Perlu Dibuat Ulang

| Halaman | Action |
|---------|--------|
| CRUD entities | Copy pattern dari `classes/page.tsx`, ganti field/form sesuai domain |
| Dashboard | Copy pattern dari `page.tsx`, sesuaikan stat cards dan guide steps |
| Generate (jika relevan) | Copy pattern dari `generate/page.tsx` + `scheduler.ts` |
| Schedules / Reports | Copy pattern dari `schedules/page.tsx` |

### 4. CRUD Template (Pattern untuk Clone Halaman Baru)

Setiap halaman CRUD membutuhkan (ikuti pola `classes/page.tsx`):

```tsx
// State entities, filtered, searchTerm
// Modal state: isModalOpen, editingEntity, formData
// Alert state, delete dialog, import result
// Functions: loadData, handleCreate, handleEdit, handleSubmit, handleDelete
// Filter: filterBySearch
// UI: Action Bar → Search → Table → Footer → Modal → ConfirmDialog → ImportModal
```

### 5. Tailwind Config

Jika ingin kustom theme, buat `tailwind.config.ts`:

```ts
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#0ea5a0", ... },
      },
    },
  },
};
```

### 6. Estimasi Pengerjaan Clone

| Task | Estimasi |
|------|----------|
| Copy + rename project | 30 menit |
| Setup layout + navigasi | 1 jam |
| Buat 1 halaman CRUD | 2 jam |
| Copy 5 halaman CRUD lainnya | 3 jam |
| Dashboard + guide | 2 jam |
| Generate / Scheduler | 4 jam (jika perlu) |
| Payment (optional) | 4 jam |
| **Total** | **~12-16 jam** |
