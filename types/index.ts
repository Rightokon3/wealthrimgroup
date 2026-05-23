export type BusinessCategory = 'food_delivery' | 'fashion' | 'real_estate';

export interface Business {
  id: string;
  user_id?: string;
  business_name: string;
  category: BusinessCategory;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  logo_url?: string;
  cover_image_url?: string;
  gallery_images?: string[];
  hours_of_operation?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  social_media?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  image_url?: string;
  is_available: boolean;
  created_at: string;
}

export interface Property {
  id: string;
  business_id: string;
  title: string;
  description: string;
  property_type: 'sale' | 'rent' | 'lease';
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  address: string;
  city: string;
  images: string[];
  is_available: boolean;
  created_at: string;
}

export interface Inquiry {
  id: string;
  business_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  message: string;
  inquiry_type: 'general' | 'order' | 'booking' | 'property_viewing';
  status: 'pending' | 'responded' | 'closed';
  created_at: string;
}

export interface Review {
  id: string;
  business_id: string;
  customer_name: string;
  rating: number;
  comment?: string;
  created_at: string;
}