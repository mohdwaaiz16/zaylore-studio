# Zaylore Studio - SEO Implementation Guide & Migration Code

This document provides the foundational SEO structure for **Zaylore Studio** and acts as a bridge for migrating to a modern tech stack (e.g., Next.js, React) or an eCommerce platform (e.g., Shopify) while retaining the SEO value we've built.

---

## 1. Shopify Implementation

If you migrate to Shopify, you need to implement structured data and dynamic meta tags using Liquid.

### `theme.liquid` - Dynamic Meta Tags & JSON-LD
Place this inside the `<head>` of your `theme.liquid`:

```liquid
<!-- Dynamic Title and Meta Description -->
<title>
  {{ page_title }}
  {%- if current_tags %} &ndash; tagged "{{ current_tags | join: ', ' }}"{% endif -%}
  {%- if current_page != 1 %} &ndash; Page {{ current_page }}{% endif -%}
  {%- unless page_title contains shop.name %} &ndash; {{ shop.name }}{% endunless -%}
</title>

{% if page_description %}
  <meta name="description" content="{{ page_description | escape }}">
{% endif %}

<!-- Canonical URL -->
<link rel="canonical" href="{{ canonical_url }}">

<!-- Open Graph / Social Meta -->
<meta property="og:site_name" content="{{ shop.name }}">
<meta property="og:url" content="{{ canonical_url }}">
<meta property="og:title" content="{{ page_title | escape }}">
<meta property="og:type" content="{% if template.name == 'product' %}product{% else %}website{% endif %}">
<meta property="og:description" content="{{ page_description | escape }}">
{% if page_image %}
  <meta property="og:image" content="http:{{ page_image | image_url: width: 1200 }}">
{% endif %}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{ page_title | escape }}">
<meta name="twitter:description" content="{{ page_description | escape }}">

<!-- Organization & Founder Schema (Global) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "{{ shop.url }}/#organization",
      "name": "Zaylore Studio",
      "url": "{{ shop.url }}",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.zaylorestudio.in/img/logo-full.jpg"
      },
      "description": "Premium streetwear brand offering high-quality oversized t-shirts, oversized hoodies, sweatshirts, vintage polos, bomber jackets, and baggy jeans.",
      "founder": {
        "@id": "{{ shop.url }}/#founder"
      },
      "sameAs": [
        "https://www.instagram.com/zaylorestudio",
        "https://www.facebook.com/zaylorestudio",
        "https://www.tiktok.com/@zaylorestudio"
      ]
    },
    {
      "@type": "Person",
      "@id": "{{ shop.url }}/#founder",
      "name": "PM Mohammed Waaiz",
      "alternateName": "md_waaizz",
      "jobTitle": ["Founder", "Managing Director", "CEO"],
      "worksFor": {
        "@id": "{{ shop.url }}/#organization"
      },
      "url": "{{ shop.url }}",
      "sameAs": [
        "https://www.instagram.com/md_waaizz/",
        "https://www.linkedin.com/in/mohd-waaiz/",
        "https://www.facebook.com/profile.php?id=100056069555392"
      ]
    }
  ]
}
</script>
```

### `product.liquid` - Product Schema
Add this to your Product template for rich results in Google:

```liquid
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "{{ product.title | escape }}",
  "image": [
    "https:{{ product.featured_image | image_url: width: 800 }}"
  ],
  "description": "{{ product.description | strip_html | escape }}",
  "sku": "{{ product.selected_or_first_available_variant.sku }}",
  "brand": {
    "@type": "Brand",
    "name": "Zaylore Studio"
  },
  "offers": {
    "@type": "Offer",
    "url": "{{ shop.url }}{{ product.url }}",
    "priceCurrency": "{{ cart.currency.iso_code }}",
    "price": "{{ product.price | money_without_currency | remove: ',' }}",
    "itemCondition": "https://schema.org/NewCondition",
    "availability": "https://schema.org/{% if product.available %}InStock{% else %}OutOfStock{% endif %}"
  }
}
</script>
```

---

## 2. Next.js App Router (`app` directory)

For a Next.js implementation, leverage built-in Metadata APIs and structure your JSON-LD within a layout or specific page.

### `app/layout.tsx` - Global Metadata & Schema

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.zaylorestudio.in'),
  title: {
    default: 'Zaylore Studio | Premium Streetwear Brand by PM Mohammed Waaiz',
    template: '%s | Zaylore Studio'
  },
  description: 'Zaylore Studio is a premium streetwear brand founded by PM Mohammed Waaiz, offering high-quality oversized t-shirts, hoodies, and streetwear fashion.',
  keywords: ['Zaylore Studio', 'PM Mohammed Waaiz', 'premium streetwear', 'oversized t-shirts', 'streetwear hoodies', 'luxury streetwear'],
  authors: [{ name: 'PM Mohammed Waaiz' }],
  creator: 'PM Mohammed Waaiz',
  openGraph: {
    title: 'Zaylore Studio | Premium Streetwear Brand',
    description: 'Discover Zaylore Studio, the premium oversized streetwear brand founded by PM Mohammed Waaiz.',
    url: 'https://www.zaylorestudio.in',
    siteName: 'Zaylore Studio',
    images: [
      {
        url: '/img/hero-bg.jpg',
        width: 1200,
        height: 630,
        alt: 'Zaylore Studio Streetwear',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zaylore Studio',
    description: 'Discover Zaylore Studio, the premium oversized streetwear brand founded by PM Mohammed Waaiz.',
    creator: '@md_waaizz',
    site: '@zaylorestudio',
    images: ['/img/hero-bg.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.zaylorestudio.in/#organization",
        "name": "Zaylore Studio",
        "url": "https://www.zaylorestudio.in",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.zaylorestudio.in/img/logo-full.jpg"
        },
        "description": "Premium streetwear brand offering high-quality oversized t-shirts, oversized hoodies, sweatshirts, vintage polos, bomber jackets, and baggy jeans.",
        "founder": {
          "@id": "https://www.zaylorestudio.in/#founder"
        },
        "sameAs": [
          "https://www.instagram.com/zaylorestudio",
          "https://www.facebook.com/zaylorestudio",
          "https://www.tiktok.com/@zaylorestudio"
        ]
      },
      {
        "@type": "Person",
        "@id": "https://www.zaylorestudio.in/#founder",
        "name": "PM Mohammed Waaiz",
        "alternateName": "md_waaizz",
        "jobTitle": ["Founder", "Managing Director", "CEO"],
        "worksFor": {
          "@id": "https://www.zaylorestudio.in/#organization"
        },
        "url": "https://www.zaylorestudio.in",
        "sameAs": [
          "https://www.instagram.com/md_waaizz/",
          "https://www.linkedin.com/in/mohd-waaiz/",
          "https://www.facebook.com/profile.php?id=100056069555392"
        ]
      }
    ]
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## 3. Topical Authority Content Strategy

To rank for highly competitive terms like "premium streetwear" and "oversized t-shirts", Zaylore Studio must establish **Topical Authority**. This involves creating a cluster of related content that signals expertise to search engines.

### Recommended Blog / Article Architecture
Create a `/blog` or `/editorial` section and structure content around these pillars:

**Pillar 1: Streetwear Culture & Styling**
*   *How to Style Oversized T-Shirts for a Premium Look* (Target: oversized t-shirts styling)
*   *The Evolution of Streetwear in India: Why Premium Matters* (Target: premium streetwear brand India)
*   *Streetwear Hoodies: The Ultimate Guide to Fits and Fabrics* (Target: streetwear hoodies)
*   *Baggy Jeans vs. Slim Fit: The Shift in Modern Street Fashion* (Target: baggy jeans styling)

**Pillar 2: Brand Identity & Founder Story**
*   *Behind the Seams: PM Mohammed Waaiz on Building Zaylore Studio* (Target: PM Mohammed Waaiz, Zaylore founder)
*   *Quality over Hype: The Fabric Technology Behind Zaylore Studio* (Target: luxury streetwear fabrics)
*   *The Syndicate: Why We're Building a Community, Not Just a Clothing Brand* (Target: clothing brand community)

### Execution Guidelines
1.  **Internal Linking**: Every article should internally link to specific product collections (e.g., "Shop our premium oversized t-shirts here").
2.  **Semantic Depth**: Don't just stuff keywords. Discuss related entities (e.g., fabric weight, GSM, drop shoulders, modern silhouettes).
3.  **Visuals**: Include high-quality gallery images optimized with descriptive `alt` tags and EXIF data removed for faster loading.
