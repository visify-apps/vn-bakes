import { appConfig } from '../config/appConfig'

/**
 * Offline seed catalogue for VN Bakes (Red Hills / Korattur).
 * Menu mirrors Instagram: custom cakes, brownies, chocolates, bouquets — no baking classes.
 */

export const SEED_BUSINESS_ID = appConfig.defaultBusinessId

const IMG = {
  cake:
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80',
  theme:
    'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=80',
  brownie:
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80',
  choco:
    'https://images.unsplash.com/photo-1549007994-cb92beeba73b?auto=format&fit=crop&w=900&q=80',
  bouquet:
    'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80',
}

export const seedCategories = [
  {
    id: 'custom-cakes',
    businessId: SEED_BUSINESS_ID,
    name: 'Custom Cakes',
    slug: 'custom-cakes',
    description: 'Celebration and theme cakes made to your brief.',
    displayOrder: 1,
    available: true,
  },
  {
    id: 'brownies',
    businessId: SEED_BUSINESS_ID,
    name: 'Brownies',
    slug: 'brownies',
    description: 'Fudgy brownies and brownie boxes.',
    displayOrder: 2,
    available: true,
  },
  {
    id: 'chocolates',
    businessId: SEED_BUSINESS_ID,
    name: 'Chocolates',
    slug: 'chocolates',
    description: 'Homemade chocolate treats and gift boxes.',
    displayOrder: 3,
    available: true,
  },
  {
    id: 'bouquets',
    businessId: SEED_BUSINESS_ID,
    name: 'Bouquets',
    slug: 'bouquets',
    description: 'Flower and treat bouquets for gifting.',
    displayOrder: 4,
    available: true,
  },
]

/** @type {Array<Record<string, unknown>>} */
export const seedProducts = [
  {
    id: 'custom-celebration-cake',
    businessId: SEED_BUSINESS_ID,
    name: 'Custom Celebration Cake',
    categoryId: 'custom-cakes',
    description: 'Birthday and party cakes from your theme and reference. Quoted after enquiry.',
    imageUrls: [IMG.cake],
    basePrice: null,
    priceType: 'enquiry',
    minimumQuantity: null,
    available: true,
    requiresCustomEnquiry: true,
    customFields: [],
    displayOrder: 1,
  },
  {
    id: 'theme-cake',
    businessId: SEED_BUSINESS_ID,
    name: 'Theme Cake',
    categoryId: 'custom-cakes',
    description: 'Cartoon, colour, and character themes — tell us the vibe.',
    imageUrls: [IMG.theme],
    basePrice: null,
    priceType: 'enquiry',
    minimumQuantity: null,
    available: true,
    requiresCustomEnquiry: true,
    customFields: [],
    displayOrder: 2,
  },
  {
    id: 'fudge-brownies',
    businessId: SEED_BUSINESS_ID,
    name: 'Fudge Brownies',
    categoryId: 'brownies',
    description: 'Rich homemade brownies. Order by piece or box.',
    imageUrls: [IMG.brownie],
    basePrice: 80,
    priceType: 'starting_from',
    minimumQuantity: 6,
    available: true,
    requiresCustomEnquiry: false,
    customFields: [],
    displayOrder: 1,
  },
  {
    id: 'brownie-box',
    businessId: SEED_BUSINESS_ID,
    name: 'Brownie Box',
    categoryId: 'brownies',
    description: 'Assorted brownie box for gifting or sharing.',
    imageUrls: [IMG.brownie],
    basePrice: null,
    priceType: 'enquiry',
    minimumQuantity: null,
    available: true,
    requiresCustomEnquiry: true,
    customFields: [],
    displayOrder: 2,
  },
  {
    id: 'chocolate-treats',
    businessId: SEED_BUSINESS_ID,
    name: 'Chocolate Treats',
    categoryId: 'chocolates',
    description: 'Homemade chocolates and sweet bites — ask for flavours.',
    imageUrls: [IMG.choco],
    basePrice: null,
    priceType: 'enquiry',
    minimumQuantity: null,
    available: true,
    requiresCustomEnquiry: true,
    customFields: [],
    displayOrder: 1,
  },
  {
    id: 'flower-bouquet',
    businessId: SEED_BUSINESS_ID,
    name: 'Flower Bouquet',
    categoryId: 'bouquets',
    description: 'Fresh flower bouquets. Share colour preference and occasion.',
    imageUrls: [IMG.bouquet],
    basePrice: null,
    priceType: 'enquiry',
    minimumQuantity: null,
    available: true,
    requiresCustomEnquiry: true,
    customFields: [],
    displayOrder: 1,
  },
  {
    id: 'treat-bouquet',
    businessId: SEED_BUSINESS_ID,
    name: 'Treat Bouquet',
    categoryId: 'bouquets',
    description: 'Bouquet styled with brownies or chocolates for gifting.',
    imageUrls: [IMG.bouquet],
    basePrice: null,
    priceType: 'enquiry',
    minimumQuantity: null,
    available: true,
    requiresCustomEnquiry: true,
    customFields: [],
    displayOrder: 2,
  },
]
