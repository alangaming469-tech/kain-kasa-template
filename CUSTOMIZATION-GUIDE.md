# 🎨 CUSTOMIZATION GUIDE - Kain & Kasa Template

Panduan lengkap customize template 11ty untuk UMKM clothing brand!

---

## 📋 QUICK WINS (5-10 menit)

### 1. Ganti Nama Brand
**File:** `src/index.md`, `src/about.md`, dll  
**Cari:** `Kain & Kasa`  
**Ganti dengan:** Nama brand lo

```markdown
# 🇮🇩 [NAMA BRAND LO] - Local Pride Clothing
```

---

### 2. Ganti WhatsApp Number
**File:** Semua file `.md` di `src/`  
**Cari:** `wa.me/6281234567890`  
**Ganti dengan:** Nomor WA bisnis lo

```markdown
https://wa.me/628xxxxxxxxxx?text=Halo%20saya%20tertarik
```

**Format:** `628xxxxxxxxxx` (ganti 08 jadi 628)

---

### 3. Ganti Email
**File:** `src/_includes/base.html`  
**Cari:** `hello@example.com`  
**Ganti dengan:** Email bisnis lo

---

### 4. Ganti Warna Brand
**File:** `src/_includes/base.html`  
**Default:** `indigo-600` (ungu)

**Opsi warna Tailwind:**
- `red-600` - Merah berani 🔴
- `blue-600` - Biru profesional 🔵
- `green-600` - Hijau fresh 🟢
- `orange-600` - Orange energetic 🟠
- `purple-600` - Ungu kreatif 🟣
- `pink-600` - Pink trendy 🩷

**Contoh:**
```html
<a href="/products/" class="hover:text-red-600">Produk</a>
```

---

## 🖼️ ADD PRODUCT IMAGES (15 menit)

### Step 1: Siapin Foto Produk
- Format: `.jpg` atau `.png`
- Size: 800x1000px (portrait) atau 1000x1000px (square)
- Max file size: 500KB per foto (biar loading cepet)

### Step 2: Upload ke Folder
```bash
mkdir -p images/products
# Copy foto ke folder: images/products/
```

### Step 3: Update Code
**File:** `src/index.md` atau `src/products.md`

**Ganti placeholder:**
```html
<!-- DARI INI: -->
<div class="bg-gray-200 h-64 rounded-lg mb-4 flex items-center justify-center">
  <span class="text-gray-400">Product Image 1</span>
</div>

<!-- KE INI: -->
<img src="/images/products/kaos-oversized.jpg" 
     alt="Kaos Oversized Street" 
     class="w-full h-64 object-cover rounded-lg mb-4">
```

**Pro tip:** Compress foto pake [TinyPNG](https://tinypng.com/) biar <200KB!

---

## ✏️ COPYWRITING TIPS (10 menit)

### Homepage Hero Section
**Location:** `src/index.md`

**Template proven:**
```markdown
# 🇮🇩 [BRAND] - [TAGLINE]

[Brief description: 1-2 kalimat max]

Contoh:
"Kain & Kasa - Local Pride Clothing
Kualitas premium, desain lokal bangga. Dibuat dengan cinta di Indonesia."
```

### Product Description
**Formula:**
```
[Nama Produk]
[Bahan/quality.highlight] + [Use case/benefit]

Contoh:
"Kaos Oversized Street
Premium cotton 24s, nyaman seharian. Perfect buat streetwear look!"
```

### About Us Story
**Template:**
```markdown
## Cerita Kami

[BRAND] dimulai dari [origin story - 1 kalimat]. 
Kami percaya bahwa [mission/belief - 1 kalimat].

Contoh:
"StreetWear ID dimulai dari kecintaan kami pada hip-hop culture.
Kami percaya bahwa anak Indo deserves quality streetwear dengan harga terjangkau."
```

---

## 🎯 ADVANCED CUSTOMIZATION

### Add Testimonials Section
**File:** `src/index.md` (add after "Kenapa Pilih Kami")

```markdown
## Kata Mereka

<div class="grid md:grid-cols-2 gap-6 mt-8">
  <div class="bg-white p-6 rounded-lg shadow">
    <p class="text-gray-600 italic">"Kaosnya nyaman banget, bahannya adem. Pasti order lagi!"</p>
    <p class="font-bold mt-4">- Andi, Jakarta</p>
    <div class="text-yellow-400">⭐⭐⭐⭐⭐</div>
  </div>

  <div class="bg-white p-6 rounded-lg shadow">
    <p class="text-gray-600 italic">"Pengiriman cepet, packing rapi. Recommended seller!"</p>
    <p class="font-bold mt-4">- Sari, Bandung</p>
    <div class="text-yellow-400">⭐⭐⭐⭐⭐</div>
  </div>
</div>
```

### Add Size Guide
**File:** Create new file `src/size-guide.md`

```markdown
---
layout: base.html
title: Size Guide
description: Panduan ukuran
siteName: Kain & Kasa
---

# 📏 Size Guide

## Kaos & Hoodie

| Size | Chest (cm) | Length (cm) |
|------|-----------|-------------|
| S    | 96        | 68          |
| M    | 100       | 70          |
| L    | 104       | 72          |
| XL   | 108       | 74          |
| XXL  | 112       | 76          |

## Celana

| Size | Waist (cm) | Hips (cm) | Length (cm) |
|------|-----------|-----------|-------------|
| 28   | 70        | 92        | 96          |
| 29   | 72        | 94        | 97          |
| 30   | 74        | 96        | 98          |
| 31   | 76        | 98        | 99          |
| 32   | 78        | 100       | 100         |

*Measurements may vary 1-2cm due to production process*
```

Then add link to navigation in `src/_includes/base.html`:
```html
<a href="/size-guide/" class="hover:text-indigo-600">Size Guide</a>
```

### Add Instagram Feed
**File:** `src/index.md` (add at bottom before "Kenapa Pilih Kami")

```markdown
## Follow Us

<div class="text-center mt-12">
  <h2 class="text-2xl font-bold mb-4">📸 [@yourinstagram]</h2>
  <a href="https://instagram.com/yourusername" 
     class="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-bold hover:shadow-lg transition">
    Follow on Instagram
  </a>
</div>
```

---

## 🚀 SEO OPTIMIZATION (5 menit)

### Update Meta Description
**File:** Each `.md` file, update frontmatter:

```yaml
---
layout: base.html
title: Kain & Kasa - Clothing Brand Indonesia
description: "Kain & Kasa: Clothing brand lokal dengan kualitas premium. Kaos, hoodie, jacket dengan desain modern. Made in Indonesia 🇮🇩"
siteName: Kain & Kasa
---
```

**Best practices:**
- Title: 50-60 characters
- Description: 150-160 characters
- Include keywords: "clothing Indonesia", "local pride", "quality"

### Add Open Graph Tags (for social sharing)
**File:** `src/_includes/base.html` (add in `<head>`)

```html
<meta property="og:title" content="{{ title }} | {{ siteName }}">
<meta property="og:description" content="{{ description }}">
<meta property="og:image" content="/images/og-image.jpg">
<meta property="og:url" content="https://yourdomain.com">
<meta property="og:type" content="website">
```

**OG Image size:** 1200x630px

---

## 📦 VARIANT CREATION (For Template Shop)

To create different variants for selling:

### Variant 1: F&B Restaurant
```bash
cp -r kain-kasa-template restaurant-template
cd restaurant-template
```

**Changes needed:**
- `src/index.md` → Menu showcase, reservation CTA
- `src/products.md` → Menu items with prices
- Colors: `orange-600` or `red-600` (appetite colors)
- Add: Location map, opening hours, booking form

### Variant 2: Service Business (Plumber, Electric, etc.)
```bash
cp -r kain-kasa-template service-template
cd service-template
```

**Changes needed:**
- `src/index.md` → Services list, emergency CTA
- `src/products.md` → Service packages
- Add: Emergency hotline, service area, testimonials
- Colors: `blue-600` (trust) or `green-600` (eco)

### Variant 3: Portfolio/Freelancer
```bash
cp -r kain-kasa-template portfolio-template
cd portfolio-template
```

**Changes needed:**
- `src/index.md` → Hero with photo, skills, bio
- `src/products.md` → Projects/case studies
- Add: Resume, contact form, blog section
- Colors: Minimalist (`gray-900`, white space)

---

## 🛠️ TROUBLESHOOTING

### Build fails with error
**Solution:**
```bash
# Delete _site folder
rm -rf _site

# Rebuild
npm run build
```

### Changes not showing
**Solution:**
```bash
# Stop server (Ctrl+C)
# Clear browser cache (Ctrl+Shift+R / Cmd+Shift+R)
# Restart server
npm run start
```

### Tailwind styles not working
**Check:** CDN link in `src/_includes/base.html`:
```html
<script src="https://cdn.tailwindcss.com"></script>
```
Make sure it's in the `<head>` section.

---

## 📊 PERFORMANCE TIPS

### Page Speed Optimization
1. **Compress images:** Use TinyPNG compressor (<200KB each)
2. **Minimize custom CSS:** Tailwind CDN is already optimized
3. **Limit external fonts:** Use system fonts if possible
4. **Preload critical assets:**
   ```html
   <link rel="preload" href="/images/hero.jpg" as="image">
   ```

### Lighthouse Score Target
- Performance: 95+
- Accessibility: 90+
- Best Practices: 95+
- SEO: 100

---

## 🎓 RESOURCES

**Helpful Links:**
- [11ty Documentation](https://www.11ty.dev/docs/)
- [Tailwind CSS Cheat Sheet](https://tailwindcomponents.com/cheatsheet/)
- [TinyPNG Image Compressor](https://tinypng.com/)
- [Unsplash Free Stock Photos](https://unsplash.com/)
- [Google Fonts](https://fonts.google.com/)

**Inspiration:**
- Check competitor websites
- Dribbble for design ideas
- Pinterest for layout inspiration

---

## 💡 PRO TIPS

1. **Backup before big changes:**
   ```bash
   cp -r kain-kasa-template kain-kasa-template-backup
   ```

2. **Use Git for version control:**
   ```bash
   git init
   git add .
   git commit -m "Initial template"
   ```

3. **Test on mobile before launch:**
   - Use Chrome DevTools mobile view
   - Test on actual phone

4. **Keep it simple:**
   - Don't over-customize for MVP
   - Launch fast, iterate based on feedback

---

**Happy customizing! 🚀**

Need help? Reach out: hello@kain-kasa.com