export type UserRole='customer'|'vendor'|'admin';
export type StoreCategory='food'|'real_estate'|'fashion';
export type OrderStatus='pending'|'confirmed'|'preparing'|'ready'|'on_the_way'|'delivered'|'cancelled'|'refunded';
export type PaymentMethod='cash_on_delivery'|'card'|'transfer'|'ussd';
export type PaymentStatus='pending'|'paid'|'failed'|'refunded';
export type DeliveryType='delivery'|'pickup'|'viewing';
export type SpiceLevel='none'|'mild'|'medium'|'hot'|'extra_hot';
export type PropertyType='sale'|'rent'|'lease'|'shortlet';
export type Furnishing='furnished'|'semi_furnished'|'unfurnished';
export type Gender='men'|'women'|'unisex'|'kids';
export type PayoutStatus='pending'|'processing'|'paid'|'failed';
export interface Profile{id:string;email:string;full_name:string|null;avatar_url:string|null;phone:string|null;role:UserRole;city:string|null;country:string|null;created_at:string;updated_at:string;}
export interface Store{id:string;vendor_id:string;name:string;description:string|null;category:StoreCategory;logo_url:string|null;cover_url:string|null;address:string;city:string;state:string|null;country:string;phone:string;email:string|null;whatsapp:string|null;is_open:boolean;is_active:boolean;is_verified:boolean;min_order:number;avg_delivery_min:number;rating:number;total_reviews:number;bank_name:string|null;account_number:string|null;account_name:string|null;created_at:string;updated_at:string;}
export interface ProductCategory{id:string;store_id:string;name:string;sort_order:number;created_at:string;}
export interface Product{id:string;store_id:string;category_id:string|null;name:string;description:string|null;price:number;image_url:string|null;images:string[];is_available:boolean;is_featured:boolean;sort_order:number;prep_time_min:number|null;spice_level:SpiceLevel|null;property_type:PropertyType|null;bedrooms:number|null;bathrooms:number|null;toilets:number|null;area_sqm:number|null;furnishing:Furnishing|null;location_url:string|null;sizes:string[];colors:string[];material:string|null;gender:Gender|null;stock_qty:number;created_at:string;updated_at:string;product_categories?:ProductCategory;}
export interface CartItem{product:Product;quantity:number;selected_size?:string;selected_color?:string;}
export interface Order{id:string;customer_id:string;store_id:string;order_number:string;status:OrderStatus;delivery_type:DeliveryType;delivery_address:string|null;delivery_city:string|null;delivery_state:string|null;customer_phone:string;delivery_note:string|null;scheduled_at:string|null;subtotal:number;delivery_fee:number;platform_fee:number;vendor_payout:number;total:number;payment_method:PaymentMethod;payment_status:PaymentStatus;payment_ref:string|null;selected_size:string|null;selected_color:string|null;created_at:string;updated_at:string;stores?:Pick<Store,'name'|'logo_url'|'phone'|'category'>;order_items?:OrderItem[];profiles?:Pick<Profile,'full_name'|'phone'>;}
export interface OrderItem{id:string;order_id:string;product_id:string|null;name:string;price:number;quantity:number;subtotal:number;selected_size:string|null;selected_color:string|null;image_url:string|null;}
export interface Payout{id:string;vendor_id:string;store_id:string;amount:number;platform_fee:number;order_count:number;status:PayoutStatus;paid_at:string|null;reference:string|null;notes:string|null;created_at:string;}
export interface Review{id:string;store_id:string;customer_id:string;order_id:string|null;rating:number;comment:string|null;created_at:string;profiles?:Pick<Profile,'full_name'|'avatar_url'>;}
export const CATEGORY_META={
  food:{label:'Food & Delivery',icon:'🍛',color:'orange',gradient:'from-orange-500 to-red-500',deliveryLabel:'delivery',orderLabel:'Order Now',productLabel:'Menu Item',orderType:'delivery' as DeliveryType},
  real_estate:{label:'Real Estate',icon:'🏠',color:'amber',gradient:'from-amber-500 to-yellow-500',deliveryLabel:'viewing',orderLabel:'Book Viewing',productLabel:'Property',orderType:'viewing' as DeliveryType},
  fashion:{label:'Fashion & Fabric',icon:'👗',color:'rose',gradient:'from-rose-500 to-pink-500',deliveryLabel:'delivery',orderLabel:'Order Now',productLabel:'Item',orderType:'delivery' as DeliveryType},
};

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

export type BusinessCategory = 'food_delivery' | 'fashion' | 'real_estate';