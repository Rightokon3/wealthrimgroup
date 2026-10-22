# WealthRim Marketplace

A full-stack, multi-vendor e-commerce, real estate, and on-demand delivery platform designed for African markets (supporting cities like Lagos, Abuja, Port Harcourt, Ibadan, Kano, Accra, and Nairobi).

## What It Does

WealthRim Marketplace is a multi-sided platform connecting **Customers**, **Vendors**, **Dispatch Riders**, and **Platform Admins** across three core business verticals:

- 🍔 **Food & Delivery** — Restaurant discovery, menu ordering, preparation status tracking, and on-demand courier dispatch.
- 👗 **Fashion & Fabric** — Apparel & textile catalog with size/color variants and door-to-door delivery.
- 🏢 **Real Estate** — Property listings for sale, rent, lease, or shortlet with scheduled physical inspection/viewing bookings.

---

## User Roles & Portals

- **Customer Portal (`/`, `/account`, `/checkout`, `/orders`)**
  - City-based store and product discovery with real-time search and filters.
  - Cart management, multi-step checkout with delivery, pickup, or property viewing options.
  - Live order tracking, saved address book, and order history.

- **Vendor Portal (`/vendor`)**
  - Store profile setup, operational hours, and contact channels.
  - Catalog and inventory management for food menus, fashion variants, and property listings.
  - Incoming order processing and automated payouts to verified NUBAN bank accounts.

- **Rider (Courier) Portal (`/rider`)**
  - Dedicated authentication and profile verification.
  - Order pickup and delivery assignment workflow (`picked_up`, `on_the_way`, `delivered`).
  - Real-time GPS location sharing and delivery earnings tracking.

- **Admin Portal (`/admin`)**
  - Super-admin overview and platform analytics.
  - Vendor store and rider onboarding verification/approval.
  - Platform-wide order moderation, transaction tracking, and payout settlement.

---

## Tech Stack & Architecture

- **Framework:** Next.js (App Router) + React 19 + TypeScript
- **Styling & UI:** Tailwind CSS (v4), Framer Motion, Lucide React
- **Database & Auth:** Supabase (PostgreSQL, Supabase Auth via `@supabase/ssr`, Row-Level Security)
- **Payments & Payouts:** Paystack integration (Cards, Bank Transfer, USSD, Virtual Accounts, automated vendor & rider settlements, refunds)
- **Maps & Logistics:** Leaflet & React-Leaflet for interactive maps, geocoding, distance-based delivery fee computation, and live courier tracking
- **Notifications & Mail:**
  - Web Push API for PWA push notifications on order status changes
  - Nodemailer for transactional emails (email verification, order receipts, password resets)

---

## Directory Structure

```
wealthrimgroup/
├── app/                  # Next.js App Router (pages, layouts, and API routes)
│   ├── account/          # Customer profile, addresses, settings
│   ├── admin/            # Super-admin management portal
│   ├── api/              # API endpoints (paystack, payouts, push, orders, auth)
│   ├── auth/             # Customer and vendor authentication
│   ├── checkout/         # Multi-step checkout flow
│   ├── orders/           # Order tracking and history
│   ├── rider/            # Dispatch rider portal and dashboard
│   ├── store/            # Public store and product details
│   └── vendor/           # Merchant store and catalog management
├── components/           # Reusable UI components (Navigation, Footer, Cart, Maps)
├── contexts/             # React Contexts (AuthContext, CartContext)
├── lib/                  # Business logic (Paystack, Supabase, Geocoding, Mailer, Push)
├── types/                # TypeScript type definitions and data contracts
├── middleware.ts         # Edge authentication guards
└── public/               # Static assets and icons
```

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- A configured Supabase project
- A Paystack account (for payment and transfer features)
- SMTP credentials (for transactional emails)

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   PAYSTACK_SECRET_KEY=your_paystack_secret_key
   PAYSTACK_PUBLIC_KEY=your_paystack_public_key
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   npm run start
   ```

