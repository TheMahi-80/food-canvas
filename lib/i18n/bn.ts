/**
 * Bangla UI message catalog (default and only UI language).
 * All user-facing UI copy lives here; components must not hard-code strings.
 * Product names/descriptions are admin content and come from the database instead.
 */
export const bn = {
  meta: {
    siteName: "Food Canvas",
    defaultTitle: "Food Canvas — CUET-এর পাশে মজার খাবার",
    description:
      "CUET ও আশেপাশের সবার জন্য মজার খাবার, সহজ অর্ডার। মেনু দেখুন আর হোয়াটসঅ্যাপে অর্ডার পাঠান।",
  },
  a11y: {
    skipToContent: "মূল অংশে যান",
    homeLink: "Food Canvas — হোম",
    mainNav: "প্রধান মেনু",
    themeToDark: "ডার্ক থিম চালু করুন",
    themeToLight: "লাইট থিম চালু করুন",
  },
  nav: {
    home: "হোম",
    menu: "মেনু",
    about: "আমাদের সম্পর্কে",
    contact: "যোগাযোগ",
  },
  actions: {
    exploreMenu: "মেনু দেখুন",
    orderNow: "অর্ডার করুন",
    addToCart: "কার্টে যোগ করুন",
    continueToWhatsApp: "হোয়াটসঅ্যাপে অর্ডার করুন",
    backHome: "হোমে ফিরে যান",
    retry: "আবার চেষ্টা করুন",
  },
  hero: {
    headline: "পছন্দের খাবার, এখন আপনার হাতের নাগালে।",
    subtext: "CUET ও আশেপাশের সবার জন্য মজার খাবার, সহজ অর্ডার।",
  },
  menu: {
    search: "খাবার খুঁজুন...",
    allItems: "সব খাবার",
    popularItems: "জনপ্রিয় খাবার",
    categories: "খাবারের ক্যাটাগরি",
    specialOffers: "বিশেষ অফার",
    available: "পাওয়া যাচ্ছে",
    unavailable: "এই মুহূর্তে নেই",
  },
  cart: {
    title: "আপনার কার্ট",
    subtotal: "সাবটোটাল",
    discount: "ছাড়",
    estimatedTotal: "আনুমানিক মোট",
  },
  customer: {
    name: "আপনার নাম",
    whatsapp: "আপনার হোয়াটসঅ্যাপ নম্বর",
  },
  hours: {
    title: "খোলার সময়",
    everyDayDefault: "প্রতিদিন: বিকাল ৩টা – রাত ১০টা",
    openNow: "এখন খোলা",
    closedNow: "এখন বন্ধ",
  },
  contact: {
    title: "যোগাযোগ",
    whatsappLabel: "হোয়াটসঅ্যাপ",
    whatsappHint: "অর্ডার ও যেকোনো প্রশ্নের জন্য হোয়াটসঅ্যাপে মেসেজ দিন।",
    addressLabel: "ঠিকানা",
    toBeConfirmed: "শীঘ্রই জানানো হবে",
  },
  footer: {
    tagline: "CUET ও আশেপাশের সবার জন্য মজার খাবার।",
  },
  errors: {
    notFoundTitle: "পেজটি খুঁজে পাওয়া যায়নি",
    notFoundBody: "আপনি যে পেজটি খুঁজছেন সেটি নেই বা সরিয়ে ফেলা হয়েছে।",
    genericTitle: "কিছু একটা সমস্যা হয়েছে",
    genericBody: "দুঃখিত, পেজটি লোড করা যায়নি। একটু পরে আবার চেষ্টা করুন।",
  },
} as const;

export type Messages = typeof bn;
