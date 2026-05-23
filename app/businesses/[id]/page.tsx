'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Star, MapPin, Phone, Mail, Globe, Clock, Shield,
  MessageSquare, Share2, Heart, ChevronLeft, Building2,
  Utensils, Shirt, Image as ImageIcon, Package, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Business } from '@/types/index';
import InquiryModal from '@/components/InquiryModal';

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
}

export default function BusinessDetailPage() {
  const params = useParams();
  const businessId = params.id as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'products' | 'reviews'>('about');
  const [activeImage, setActiveImage] = useState(0);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [isFavourited, setIsFavourited] = useState(false);
  const [reviewForm, setReviewForm] = useState({ customer_name: '', rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (businessId) fetchAll();
  }, [businessId]);

  async function fetchAll() {
    try {
      const [biz, revs, prods] = await Promise.all([
        supabase.from('businesses').select('*').eq('id', businessId).single(),
        supabase.from('reviews').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('business_id', businessId).eq('is_available', true),
      ]);
      setBusiness(biz.data);
      setReviews(revs.data || []);
      setProducts(prods.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const { error } = await supabase.from('reviews').insert([{ business_id: businessId, ...reviewForm }]);
      if (error) throw error;
      setReviewSuccess(true);
      setReviewForm({ customer_name: '', rating: 5, comment: '' });
      fetchAll();
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  }

  const getCategoryColor = (cat?: string) => {
    if (cat === 'food_delivery') return 'from-orange-500 to-red-500';
    if (cat === 'fashion') return 'from-rose-500 to-pink-600';
    return 'from-amber-500 to-yellow-500';
  };

  const getCategoryIcon = (cat?: string) => {
    if (cat === 'food_delivery') return <Utensils className="w-5 h-5" />;
    if (cat === 'fashion') return <Shirt className="w-5 h-5" />;
    return <Building2 className="w-5 h-5" />;
  };

  const allImages = business
    ? [business.cover_image_url, ...(business.gallery_images || [])].filter(Boolean)
    : [];

  if (loading) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Loading business...</p>
      </div>
    </div>
  );

  if (!business) return (
    <div className="min-h-screen pt-[64px] flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-black text-gray-800 mb-2">Business not found</h2>
        <Link href="/businesses" className="text-orange-500 font-semibold">← Back to businesses</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Back nav */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-orange-500 transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/businesses" className="hover:text-orange-500 transition-colors">Businesses</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-900 font-semibold truncate max-w-[200px]">{business.business_name}</span>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* LEFT — Main content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Image gallery */}
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
              <div className="relative h-72 md:h-96">
                {allImages.length > 0 ? (
                  <img src={allImages[activeImage]} alt={business.business_name}
                    className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${getCategoryColor(business.category)} flex items-center justify-center`}>
                    <span className="text-8xl font-black text-white/30">{business.business_name.charAt(0)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                {/* Back button */}
                <Link href="/businesses"
                  className="absolute top-4 left-4 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </Link>

                {/* Actions */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button onClick={() => setIsFavourited(!isFavourited)}
                    className="w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                    <Heart className={`w-4 h-4 ${isFavourited ? 'fill-rose-400 text-rose-400' : ''}`} />
                  </button>
                  <button className="w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Verified badge */}
                {business.is_verified && (
                  <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-full text-xs font-bold">
                    <Shield className="w-3 h-3" /> Verified Business
                  </div>
                )}

                {/* Image counter */}
                {allImages.length > 1 && (
                  <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/50 text-white text-xs font-semibold rounded-full">
                    {activeImage + 1} / {allImages.length}
                  </div>
                )}
              </div>

              {/* Thumbnail strip */}
              {allImages.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {allImages.map((img, i) => (
                    <button key={i} onClick={() => setActiveImage(i)}
                      className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === activeImage ? 'border-orange-500 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Business header */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${getCategoryColor(business.category)} flex items-center justify-center`}>
                      {getCategoryIcon(business.category)}
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      {business.category?.replace('_', ' ')}
                    </span>
                  </div>
                  <h1 className="text-3xl font-black text-gray-900 mb-1">{business.business_name}</h1>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-4 h-4 ${s <= Math.round(business.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                      ))}
                      <span className="text-sm font-bold text-gray-800 ml-1">{business.rating.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({business.total_reviews} reviews)</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="w-3.5 h-3.5 text-orange-500" />
                      {business.city}, {business.country}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100">
                {[
                  { id: 'about', label: 'About', icon: <Package className="w-4 h-4" /> },
                  { id: 'products', label: products.length > 0 ? `Products (${products.length})` : 'Products', icon: <Package className="w-4 h-4" /> },
                  { id: 'reviews', label: `Reviews (${reviews.length})`, icon: <Star className="w-4 h-4" /> },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all border-b-2 ${
                      activeTab === tab.id
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* ABOUT */}
                {activeTab === 'about' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-black text-gray-900 mb-2">About this business</h3>
                      <p className="text-gray-600 leading-relaxed">{business.description}</p>
                    </div>
                    {business.hours_of_operation && (
                      <div>
                        <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-500" /> Hours of Operation
                        </h3>
                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                          {Object.entries(business.hours_of_operation as Record<string, string>).map(([day, hours]) => (
                            <div key={day} className="flex items-center justify-between pr-4">
                              <span className="font-semibold text-gray-700 capitalize">{day}</span>
                              <span className="text-gray-500">{hours}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {business.social_media && (
                      <div>
                        <h3 className="font-black text-gray-900 mb-3">Social Media</h3>
                        <div className="flex gap-3">
                          {Object.entries(business.social_media as Record<string, string>).map(([platform, url]) => (
                            <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                              className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-semibold text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors capitalize">
                              {platform}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* PRODUCTS */}
                {activeTab === 'products' && (
                  <div>
                    {products.length === 0 ? (
                      <div className="text-center py-10">
                        <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No products listed yet.</p>
                        <p className="text-gray-400 text-sm">Contact the vendor directly for availability.</p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {products.map(product => (
                          <div key={product.id} className="flex gap-3 p-3 rounded-2xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all">
                            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                              {product.image_url
                                ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-gray-300"><Package className="w-6 h-6" /></div>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 text-sm truncate">{product.name}</h4>
                              <p className="text-xs text-gray-400 line-clamp-2 mb-1">{product.description}</p>
                              {product.price && (
                                <span className="text-sm font-black text-orange-600">₦{product.price.toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* REVIEWS */}
                {activeTab === 'reviews' && (
                  <div className="space-y-6">
                    {/* Rating summary */}
                    <div className="flex items-center gap-6 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                      <div className="text-center">
                        <div className="text-5xl font-black text-gray-900">{business.rating.toFixed(1)}</div>
                        <div className="flex items-center justify-center gap-0.5 mt-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-4 h-4 ${s <= Math.round(business.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{business.total_reviews} reviews</div>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5,4,3,2,1].map(r => (
                          <div key={r} className="flex items-center gap-2 text-xs">
                            <span className="w-3 text-right text-gray-500 font-medium">{r}</span>
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full"
                                style={{ width: `${reviews.filter(rev => rev.rating === r).length / Math.max(reviews.length, 1) * 100}%` }} />
                            </div>
                            <span className="w-6 text-gray-400">{reviews.filter(rev => rev.rating === r).length}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Review list */}
                    <div className="space-y-4">
                      {reviews.map(review => (
                        <div key={review.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-black">
                                {review.customer_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-sm text-gray-900">{review.customer_name}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(review.created_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Add review */}
                    <div className="border-t border-gray-100 pt-6">
                      <h4 className="font-black text-gray-900 mb-4">Leave a Review</h4>
                      {reviewSuccess ? (
                        <div className="text-center py-4 text-green-600 font-semibold flex items-center justify-center gap-2">
                          ✓ Thank you for your review!
                        </div>
                      ) : (
                        <form onSubmit={submitReview} className="space-y-4">
                          <input type="text" required placeholder="Your name"
                            value={reviewForm.customer_name}
                            onChange={e => setReviewForm({...reviewForm, customer_name: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white" />
                          <div>
                            <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Rating</p>
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(s => (
                                <button type="button" key={s} onClick={() => setReviewForm({...reviewForm, rating: s})}>
                                  <Star className={`w-7 h-7 transition-colors ${s <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 hover:text-amber-300'}`} />
                                </button>
                              ))}
                            </div>
                          </div>
                          <textarea required rows={3} placeholder="Share your experience..."
                            value={reviewForm.comment}
                            onChange={e => setReviewForm({...reviewForm, comment: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white resize-none" />
                          <button type="submit" disabled={submittingReview}
                            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-md shadow-orange-200 disabled:opacity-60">
                            {submittingReview ? 'Submitting...' : 'Submit Review'}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — Contact sidebar */}
          <div className="space-y-5">
            {/* Contact card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <button onClick={() => setInquiryOpen(true)}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-black text-base hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5" /> Send Inquiry
              </button>
              <a href={`tel:${business.phone}`}
                className="w-full py-3 border-2 border-orange-200 text-orange-600 rounded-2xl font-bold text-sm hover:bg-orange-50 transition-all flex items-center justify-center gap-2 mb-5">
                <Phone className="w-4 h-4" /> Call Now
              </a>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600">{business.address}, {business.city}, {business.country}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <a href={`tel:${business.phone}`} className="text-gray-600 hover:text-orange-600">{business.phone}</a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <a href={`mailto:${business.email}`} className="text-gray-600 hover:text-orange-600 truncate">{business.email}</a>
                </div>
                {business.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <a href={business.website} target="_blank" rel="noopener noreferrer"
                      className="text-orange-500 hover:underline truncate">{business.website}</a>
                  </div>
                )}
              </div>
            </div>

            {/* Map placeholder */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-40 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-600">{business.city}, {business.country}</p>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(business.address + ' ' + business.city)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-orange-500 font-bold hover:underline mt-1 inline-block">
                    View on Google Maps →
                  </a>
                </div>
              </div>
            </div>

            {/* Safety tip */}
            <div className="bg-green-50 rounded-2xl border border-green-100 p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-green-800 mb-1">Stay Safe</p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    Always meet in public places for first transactions. Never send payment before receiving goods.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <InquiryModal
        isOpen={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        businessId={businessId}
        businessName={business.business_name}
      />
    </div>
  );
}
