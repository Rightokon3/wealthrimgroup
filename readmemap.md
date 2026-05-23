wealthrim-marketplace/
├── app/
│   ├── layout.tsx (updated with new navigation)
│   ├── page.tsx (NEW modern landing page)
│   ├── businesses/
│   │   ├── page.tsx (existing - browse all businesses)
│   │   └── [id]/page.tsx (existing - business details)
│   ├── categories/
│   │   ├── page.tsx (existing - browse categories)
│   │   ├── food-delivery/page.tsx (existing)
│   │   ├── fashion/page.tsx (existing)
│   │   └── real-estate/page.tsx (existing)
│   ├── list-business/
│   │   └── page.tsx (existing - list business form)
│   ├── dashboard/
│   │   └── page.tsx (existing - vendor dashboard)
│   └── api/
│       ├── businesses/route.ts (existing)
│       └── inquiries/route.ts (existing)
├── components/
│   ├── Navigation.tsx (UPDATED - new design)
│   ├── BusinessCard.tsx (existing)
│   ├── BusinessFilter.tsx (existing)
│   ├── InquiryModal.tsx (existing)
│   └── Footer.tsx (NEW - add this)
├── lib/
│   └── supabase.ts (existing)
├── types/
│   └── index.ts (existing)
└── .env.local (existing)