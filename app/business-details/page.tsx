'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MapPin, Phone, Mail, Globe, Clock, Shield, MessageSquare, Share2, Heart, ChevronLeft, Building2, Utensils, Shirt, Package, ChevronRight, Lock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import InquiryModal from '@/components/InquiryModal';

function BusinessDetailPageInner() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.id as string;
  const { user, profile, isLoggedIn } = useAuth();

  const [business,      setBusiness]      = useState<any>(null);
  const [reviews,       setReviews]       = useState<any[]>([]);
  const [products,      setProducts]      = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState<'about'|'products'|'reviews'>('about');
  const [activeImage,   setActiveImage]   = useState(0);
  const [inquiryOpen,   setInquiryOpen]   = useState(false);
  const [isFavourited,  setIsFavourited]  = useState(false);
  const [userReview,    setUserReview]    = useState<any>(null);
  const [reviewRating,  setReviewRating]  = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [hoverRating,   setHoverRating]   = useState(0);
  const [submitting,    setSubmitting]    = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError,   setReviewError]   = useState('');

  useEffect(() => { if (businessId) fetchAll(); }, [businessId]);

  useEffect(() => {
    if (user && reviews.length > 0) {
      const mine = reviews.find((r: any) => r.user_id === user.id);
      if (mine) { setUserReview(mine); setReviewRating(mine.rating); setReviewComment(mine.comment ?? ''); }
    }
  }, [user, reviews]);

  async function fetchAll() {
    try {
      const [biz, revs, prods] = await Promise.all([
        supabase.from('businesses').select('*').eq('id', businessId).single(),
        supabase.from('reviews').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('products').select('*').eq('business_id', businessId).eq('is_available', true),
      ]);
      setBusiness(biz.data);
      setReviews(revs.data ?? []);
      setProducts(prods.data ?? []);
    } finally { setLoading(false); }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn || !user) { router.push(`/auth/login?next=/businesses/${businessId}`); return; }
    setSubmitting(true); setReviewError('');
    try {
      if (userReview) {
        const { error } = await supabase.from('reviews').update({ rating: reviewRating, comment: reviewComment }).eq('id', userReview.id).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('reviews').insert([{ business_id: businessId, user_id: user.id, customer_name: profile?.full_name ?? user.email?.split('@')[0] ?? 'Customer', rating: reviewRating, comment: reviewComment }]);
        if (error) { if (error.code === '23505') throw new Error('You have already reviewed this business.'); throw error; }
      }
      // Recalculate aggregate
      const { data: allRevs } = await supabase.from('reviews').select('rating').eq('business_id', businessId);
      if (allRevs && allRevs.length > 0) {
        const avg = allRevs.reduce((s: number, r: any) => s + r.rating, 0) / allRevs.length;
        await supabase.from('businesses').update({ rating: parseFloat(avg.toFixed(1)), total_reviews: allRevs.length }).eq('id', businessId);
      }
      setReviewSuccess(true);
      await fetchAll();
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err: any) {
      setReviewError(err.message ?? 'Failed to submit review.');
    } finally { setSubmitting(false); }
  }

  const catGradient = (c?: string) => c === 'food_delivery' ? 'from-orange-500 to-red-500' : c === 'fashion' ? 'from-rose-500 to-pink-600' : 'from-amber-500 to-yellow-500';
  const catIcon = (c?: string) => c === 'food_delivery' ? <Utensils className="w-5 h-5" /> : c === 'fashion' ? <Shirt className="w-5 h-5" /> : <Building2 className="w-5 h-5" />;
  const allImages = business ? [business.cover_image_url, ...(business.gallery_images ?? [])].filter(Boolean) : [];
  const ratingBreakdown = [5,4,3,2,1].map(star => ({ star, count: reviews.filter((r:any)=>r.rating===star).length, pct: reviews.length ? Math.round(reviews.filter((r:any)=>r.rating===star).length/reviews.length*100) : 0 }));

  if (loading) return <div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!business) return <div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="text-center"><h2 className="text-2xl font-black text-gray-800 mb-2">Business not found</h2><Link href="/businesses" className="text-orange-500 font-semibold">← Back</Link></div></div>;

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-orange-500">Home</Link><ChevronRight className="w-3.5 h-3.5" />
          <Link href="/businesses" className="hover:text-orange-500">Businesses</Link><ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-900 font-semibold truncate max-w-[200px]">{business.business_name}</span>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Gallery */}
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
              <div className="relative h-72 md:h-96">
                {allImages.length > 0 ? <img src={allImages[activeImage]} alt={business.business_name} className="w-full h-full object-cover" /> : <div className={`w-full h-full bg-gradient-to-br ${catGradient(business.category)} flex items-center justify-center`}><span className="text-8xl font-black text-white/20">{business.business_name.charAt(0)}</span></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <button onClick={() => router.back()} className="absolute top-4 left-4 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60"><ChevronLeft className="w-5 h-5" /></button>
                <div className="absolute top-4 right-4 flex gap-2">
                  <button onClick={() => setIsFavourited(!isFavourited)} className="w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60"><Heart className={`w-4 h-4 ${isFavourited ? 'fill-rose-400 text-rose-400' : ''}`} /></button>
                  <button className="w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60"><Share2 className="w-4 h-4" /></button>
                </div>
                {business.is_verified && <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white rounded-full text-xs font-bold"><Shield className="w-3 h-3" /> Verified</div>}
                {allImages.length > 1 && <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/50 text-white text-xs font-semibold rounded-full">{activeImage+1} / {allImages.length}</div>}
              </div>
              {allImages.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {allImages.map((img: string, i: number) => (
                    <button key={i} onClick={() => setActiveImage(i)} className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i===activeImage ? 'border-orange-500 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Header */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${catGradient(business.category)} flex items-center justify-center text-white`}>{catIcon(business.category)}</div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{business.category?.replace('_',' ')}</span>
              </div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">{business.business_name}</h1>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s=><Star key={s} className={`w-4 h-4 ${s<=Math.round(business.rating)?'fill-amber-400 text-amber-400':'text-gray-200'}`}/>)}
                  <span className="text-sm font-bold text-gray-800 ml-1">{business.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-400">({business.total_reviews} reviews)</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500"><MapPin className="w-3.5 h-3.5 text-orange-500"/>{business.city}, {business.country}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100">
                {[{id:'about',label:'About'},{id:'products',label:`Products${products.length>0?` (${products.length})`:''}`},{id:'reviews',label:`Reviews (${reviews.length})`}].map(t=>(
                  <button key={t.id} onClick={()=>setActiveTab(t.id as any)} className={`flex-1 py-4 text-sm font-bold transition-all border-b-2 ${activeTab===t.id?'border-orange-500 text-orange-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>{t.label}</button>
                ))}
              </div>
              <div className="p-6">
                {activeTab==='about' && (
                  <div className="space-y-5">
                    <div><h3 className="font-black text-gray-900 mb-2">About</h3><p className="text-gray-600 leading-relaxed">{business.description}</p></div>
                    {business.hours_of_operation && (
                      <div>
                        <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-orange-500"/>Hours</h3>
                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                          {Object.entries(business.hours_of_operation as Record<string,string>).map(([day,hours])=>(
                            <div key={day} className="flex items-center justify-between pr-4"><span className="font-semibold text-gray-700 capitalize">{day}</span><span className="text-gray-500">{hours}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab==='products' && (
                  products.length===0 ? (
                    <div className="text-center py-10"><Package className="w-10 h-10 text-gray-200 mx-auto mb-3"/><p className="text-gray-400 text-sm">No products listed yet.</p></div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {products.map((p:any)=>(
                        <div key={p.id} className="flex gap-3 p-3 rounded-2xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all">
                          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">{p.image_url?<img src={p.image_url} alt={p.name} className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center text-gray-300"><Package className="w-5 h-5"/></div>}</div>
                          <div className="flex-1 min-w-0"><h4 className="font-bold text-gray-900 text-sm truncate">{p.name}</h4><p className="text-xs text-gray-400 line-clamp-2">{p.description}</p>{p.price&&<span className="text-sm font-black text-orange-600">₦{p.price.toLocaleString()}</span>}</div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeTab==='reviews' && (
                  <div className="space-y-6">
                    {reviews.length>0 && (
                      <div className="flex items-center gap-6 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                        <div className="text-center flex-shrink-0">
                          <div className="text-5xl font-black text-gray-900">{business.rating.toFixed(1)}</div>
                          <div className="flex items-center justify-center gap-0.5 mt-1">{[1,2,3,4,5].map(s=><Star key={s} className={`w-4 h-4 ${s<=Math.round(business.rating)?'fill-amber-400 text-amber-400':'text-gray-200'}`}/>)}</div>
                          <div className="text-xs text-gray-500 mt-1">{reviews.length} reviews</div>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          {ratingBreakdown.map(({star,count,pct})=>(
                            <div key={star} className="flex items-center gap-2 text-xs">
                              <span className="w-3 text-right text-gray-500">{star}</span>
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400"/>
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden"><motion.div className="h-full bg-amber-400 rounded-full" initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.5}}/></div>
                              <span className="w-5 text-gray-400">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {reviews.map((review:any)=>(
                        <div key={review.id} className={`p-4 rounded-2xl border ${review.user_id===user?.id?'bg-orange-50 border-orange-200':'bg-gray-50 border-gray-100'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-black">{review.customer_name.charAt(0).toUpperCase()}</div>
                              <div><span className="font-bold text-sm text-gray-900">{review.customer_name}</span>{review.user_id===user?.id&&<span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold">You</span>}</div>
                            </div>
                            <div className="flex items-center gap-0.5">{[1,2,3,4,5].map(s=><Star key={s} className={`w-3.5 h-3.5 ${s<=review.rating?'fill-amber-400 text-amber-400':'text-gray-200'}`}/>)}</div>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                          <p className="text-xs text-gray-400 mt-2">{new Date(review.created_at).toLocaleDateString('en-NG',{year:'numeric',month:'long',day:'numeric'})}</p>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                      <h4 className="font-black text-gray-900 mb-4">{userReview?'Update Your Review':'Leave a Review'}</h4>
                      {!isLoggedIn ? (
                        <div className="flex items-center gap-4 p-5 rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200">
                          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0"><Lock className="w-5 h-5 text-orange-500"/></div>
                          <div className="flex-1"><p className="font-black text-gray-900 text-sm">Sign in to leave a review</p><p className="text-xs text-gray-500 mt-0.5">Your review helps others make better decisions.</p></div>
                          <Link href={`/auth/login?next=/businesses/${businessId}`} className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm">Sign In</Link>
                        </div>
                      ) : (
                        <AnimatePresence mode="wait">
                          {reviewSuccess ? (
                            <motion.div key="success" initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0}} className="flex items-center gap-3 p-5 rounded-2xl bg-green-50 border border-green-200">
                              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0"/>
                              <div><p className="font-bold text-green-800 text-sm">Review {userReview?'updated':'submitted'}!</p><p className="text-xs text-green-600">Thank you for your feedback.</p></div>
                            </motion.div>
                          ) : (
                            <motion.form key="form" onSubmit={submitReview} initial={{opacity:0}} animate={{opacity:1}} className="space-y-4">
                              {reviewError&&<div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">{reviewError}</div>}
                              <div>
                                <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Your Rating *</p>
                                <div className="flex gap-1 items-center">
                                  {[1,2,3,4,5].map(s=>(
                                    <button key={s} type="button" onMouseEnter={()=>setHoverRating(s)} onMouseLeave={()=>setHoverRating(0)} onClick={()=>setReviewRating(s)}>
                                      <Star className={`w-8 h-8 transition-colors cursor-pointer ${s<=(hoverRating||reviewRating)?'fill-amber-400 text-amber-400':'text-gray-200 hover:text-amber-300'}`}/>
                                    </button>
                                  ))}
                                  <span className="ml-2 text-sm text-gray-500 font-semibold">{['','Terrible','Poor','Average','Good','Excellent'][hoverRating||reviewRating]}</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Your Review</label>
                                <textarea required rows={4} value={reviewComment} onChange={e=>setReviewComment(e.target.value)} placeholder="Share your experience..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none bg-gray-50 focus:bg-white resize-none"/>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">{profile?.full_name?.charAt(0).toUpperCase()??(user?.email?.charAt(0).toUpperCase()?? '?')}</div>
                                <div className="text-xs text-gray-500">Posting as <span className="font-bold text-gray-700">{profile?.full_name??user?.email?.split('@')[0]}</span></div>
                                <button type="submit" disabled={submitting} className="ml-auto px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-md shadow-orange-200 disabled:opacity-60 flex items-center gap-2">
                                  {submitting?<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Saving...</>:<>{userReview?'Update Review':'Submit Review'}</>}
                                </button>
                              </div>
                            </motion.form>
                          )}
                        </AnimatePresence>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sticky top-24">
              {isLoggedIn ? (
                <button onClick={()=>setInquiryOpen(true)} className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-black text-base hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2 mb-3">
                  <MessageSquare className="w-5 h-5"/> Send Inquiry
                </button>
              ) : (
                <Link href={`/auth/login?next=/businesses/${businessId}`} className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-black text-base hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2 mb-3">
                  <Lock className="w-5 h-5"/> Sign In to Inquire
                </Link>
              )}
              <a href={`tel:${business.phone}`} className="w-full py-3 border-2 border-orange-200 text-orange-600 rounded-2xl font-bold text-sm hover:bg-orange-50 transition-all flex items-center justify-center gap-2 mb-5">
                <Phone className="w-4 h-4"/> Call Now
              </a>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3"><MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5"/><span className="text-gray-600">{business.address}, {business.city}, {business.country}</span></div>
                <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-orange-500 flex-shrink-0"/><a href={`tel:${business.phone}`} className="text-gray-600 hover:text-orange-600">{business.phone}</a></div>
                <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-orange-500 flex-shrink-0"/><a href={`mailto:${business.email}`} className="text-gray-600 hover:text-orange-600 truncate">{business.email}</a></div>
                {business.website&&<div className="flex items-center gap-3"><Globe className="w-4 h-4 text-orange-500 flex-shrink-0"/><a href={business.website} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline truncate">{business.website}</a></div>}
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-36 bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col items-center justify-center">
                <MapPin className="w-7 h-7 text-orange-400 mb-1"/>
                <p className="text-sm font-semibold text-gray-600">{business.city}, {business.country}</p>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(business.address+' '+business.city)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-500 font-bold hover:underline mt-1">Open in Google Maps →</a>
              </div>
            </div>
            <div className="bg-green-50 rounded-2xl border border-green-100 p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"/>
              <div><p className="text-xs font-bold text-green-800 mb-1">Stay Safe</p><p className="text-xs text-green-700 leading-relaxed">Never send payment before confirming a service or receiving goods.</p></div>
            </div>
          </div>
        </div>
      </div>

      <InquiryModal isOpen={inquiryOpen} onClose={()=>setInquiryOpen(false)} businessId={businessId} businessName={business.business_name}/>
    </div>
  );
}

import { Suspense } from 'react';

export default function BusinessDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-[64px] flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Loading business...</p>
        </div>
      </div>
    }>
      <BusinessDetailPageInner />
    </Suspense>
  );
}
