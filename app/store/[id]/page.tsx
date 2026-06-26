'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, MapPin, Clock, ChevronLeft, Plus, Minus, ShoppingCart,
  Search, Shield, X, ChevronRight, Home, Shirt, Utensils,
  BedDouble, Bath, Maximize2, Tag, Phone, MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Store, Product, ProductCategory, CATEGORY_META } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Suspense } from 'react';

const DELIVERY_FEES: Record<string,number> = {
  lagos:500,abuja:700,'port harcourt':600,ibadan:550,kano:800,default:1000
};

function StoreInner() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;
  const { isLoggedIn } = useAuth();
  const { items, store:cartStore, subtotal, totalItems, addItem, removeItem, updateQty } = useCart();

  const [store,      setStore]      = useState<Store|null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products,   setProducts]   = useState<Product[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [activeTab,  setActiveTab]  = useState('');
  const [warnDiff,   setWarnDiff]   = useState(false);
  const [selected,   setSelected]   = useState<Product|null>(null); // for fashion size/color picker
  const [pickSize,   setPickSize]   = useState('');
  const [pickColor,  setPickColor]  = useState('');
  const catRefs = useRef<Record<string, HTMLDivElement|null>>({});

  useEffect(() => { fetchStore(); }, [id]);

  async function fetchStore() {
    const [sr, cr, pr] = await Promise.all([
      supabase.from('stores').select('*').eq('id', id).single(),
      supabase.from('product_categories').select('*').eq('store_id', id).order('sort_order'),
      supabase.from('products').select('*, product_categories(name)').eq('store_id', id).eq('is_available', true).order('sort_order'),
    ]);
    setStore(sr.data); setCategories(cr.data??[]); setProducts(pr.data??[]);
    if (cr.data?.[0]) setActiveTab(cr.data[0].id);
    setLoading(false);
  }

  const getQty = (pid: string) => items.find(i=>i.product.id===pid)?.quantity??0;

  const handleAdd = (product: Product, size?: string, color?: string) => {
    if (cartStore && cartStore.id !== id && totalItems > 0) { setWarnDiff(true); return; }
    if (!store) return;
    const storeRef = { id:store.id, name:store.name, city:store.city, category:store.category, min_order:store.min_order, avg_delivery_min:store.avg_delivery_min };
    // Fashion needs size/color selection
    if (store.category==='fashion' && (product.sizes.length>0||product.colors.length>0) && !size && !color) {
      setSelected(product); setPickSize(''); setPickColor(''); return;
    }
    addItem(product, storeRef, size, color);
    setSelected(null);
  };

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()));
  const byCat    = categories.map(c=>({...c, products:filtered.filter(p=>p.category_id===c.id)})).filter(c=>c.products.length>0);
  const uncat    = filtered.filter(p=>!p.category_id);
  const deliveryFee = store ? (DELIVERY_FEES[store.city.toLowerCase()] ?? DELIVERY_FEES.default) : 0;
  const isThisCart  = cartStore?.id === id;
  const meta        = store ? CATEGORY_META[store.category] : null;

  if (loading) return <div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>;
  if (!store) return <div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="text-center"><p className="text-gray-500 mb-4">Store not found.</p><Link href="/" className="text-orange-500 font-bold">← Home</Link></div></div>;

  return (
    <div className="min-h-screen pt-[64px] bg-gray-50">
      {/* Different-store warning */}
      <AnimatePresence>
        {warnDiff&&(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setWarnDiff(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
            <motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.9,opacity:0}} className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="font-black text-gray-900 text-lg mb-2">Start a new order?</h3>
              <p className="text-gray-500 text-sm mb-5">Your cart has items from <span className="font-bold">{cartStore?.name}</span>. This will clear your current cart.</p>
              <div className="flex gap-3">
                <button onClick={()=>setWarnDiff(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-bold text-sm text-gray-600">Keep cart</button>
                <button onClick={()=>{setWarnDiff(false);}} className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600">Start fresh</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fashion size/color picker */}
      <AnimatePresence>
        {selected&&(
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setSelected(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
            <motion.div initial={{y:50,opacity:0}} animate={{y:0,opacity:1}} exit={{y:50,opacity:0}} className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <button onClick={()=>setSelected(null)} className="absolute top-4 right-4 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center"><X className="w-4 h-4"/></button>
              <h3 className="font-black text-gray-900 mb-1">{selected.name}</h3>
              <p className="text-orange-600 font-black text-lg mb-4">₦{selected.price.toLocaleString()}</p>
              {selected.sizes.length>0&&(
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Size</p>
                  <div className="flex gap-2 flex-wrap">
                    {selected.sizes.map(s=>(
                      <button key={s} onClick={()=>setPickSize(s)}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${pickSize===s?'border-orange-500 bg-orange-50 text-orange-700':'border-gray-200 text-gray-600 hover:border-orange-200'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {selected.colors.length>0&&(
                <div className="mb-5">
                  <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Color</p>
                  <div className="flex gap-2 flex-wrap">
                    {selected.colors.map(c=>(
                      <button key={c} onClick={()=>setPickColor(c)}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${pickColor===c?'border-orange-500 bg-orange-50 text-orange-700':'border-gray-200 text-gray-600 hover:border-orange-200'}`}>{c}</button>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={()=>handleAdd(selected,pickSize||undefined,pickColor||undefined)}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-black hover:from-orange-600 hover:to-red-700">
                Add to Order
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <div className="relative h-52 md:h-64 overflow-hidden">
        {store.cover_url
          ? <img src={store.cover_url} alt={store.name} className="w-full h-full object-cover"/>
          : <div className={`w-full h-full bg-gradient-to-br ${meta?.gradient??'from-orange-400 to-red-500'} flex items-center justify-center text-6xl`}>{meta?.icon}</div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
        <button onClick={()=>router.back()} className="absolute top-4 left-4 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60">
          <ChevronLeft className="w-5 h-5"/>
        </button>
        <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
          {store.logo_url&&<img src={store.logo_url} alt="" className="w-16 h-16 rounded-2xl border-2 border-white shadow-xl object-cover flex-shrink-0"/>}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-black text-white">{store.name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <div className="flex items-center gap-1 text-amber-300 text-sm font-semibold">
                <Star className="w-4 h-4 fill-amber-300"/>{store.rating.toFixed(1)}
                <span className="text-white/60 font-normal">({store.total_reviews})</span>
              </div>
              {store.category==='food'&&<div className="flex items-center gap-1 text-white/80 text-sm"><Clock className="w-3.5 h-3.5"/>{store.avg_delivery_min}–{store.avg_delivery_min+15} min</div>}
              <div className="flex items-center gap-1 text-white/80 text-sm"><MapPin className="w-3.5 h-3.5"/>{store.city}</div>
              {store.is_verified&&<span className="flex items-center gap-1 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold"><Shield className="w-3 h-3"/>Verified</span>}
            </div>
          </div>
        </div>
      </div>

      {!store.is_open&&<div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-center text-sm font-semibold text-red-700">Currently closed — browsing only</div>}

      <div className="max-w-[1100px] mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Menu */}
          <div className="lg:col-span-2 space-y-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                placeholder={`Search ${store.name}...`}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"/>
            </div>

            {/* Category tabs */}
            {categories.length>0&&!search&&(
              <div className="flex gap-2 overflow-x-auto pb-1 sticky top-[64px] z-20 bg-gray-50 pt-1">
                {categories.map(c=>(
                  <button key={c.id} onClick={()=>{setActiveTab(c.id);catRefs.current[c.id]?.scrollIntoView({behavior:'smooth',block:'start'});}}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeTab===c.id?'bg-orange-500 text-white shadow-md shadow-orange-200':'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Products by category */}
            {byCat.map(c=>(
              <div key={c.id} ref={el=>{catRefs.current[c.id]=el;}}>
                <h2 className="font-black text-gray-900 text-lg mb-3">{c.name}</h2>
                <div className="space-y-3">
                  {c.products.map(p=>(
                    <ProductCard key={p.id} product={p} qty={getQty(p.id)} category={store.category}
                      onAdd={()=>handleAdd(p)}
                      onInc={()=>updateQty(p.id, getQty(p.id)+1)}
                      onDec={()=>updateQty(p.id, getQty(p.id)-1)}/>
                  ))}
                </div>
              </div>
            ))}
            {uncat.length>0&&(
              <div>
                {byCat.length>0&&<h2 className="font-black text-gray-900 text-lg mb-3">More Items</h2>}
                <div className="space-y-3">
                  {uncat.map(p=>(
                    <ProductCard key={p.id} product={p} qty={getQty(p.id)} category={store.category}
                      onAdd={()=>handleAdd(p)}
                      onInc={()=>updateQty(p.id, getQty(p.id)+1)}
                      onDec={()=>updateQty(p.id, getQty(p.id)-1)}/>
                  ))}
                </div>
              </div>
            )}
            {filtered.length===0&&<div className="text-center py-16 text-gray-400 text-sm">No items match your search.</div>}

            {/* Store info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-4">
              <h3 className="font-black text-gray-900 mb-3">About {store.name}</h3>
              {store.description&&<p className="text-gray-500 text-sm mb-3 leading-relaxed">{store.description}</p>}
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-500"/>{store.address}, {store.city}</div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-orange-500"/>{store.phone}</div>
                {store.whatsapp&&<a href={`https://wa.me/${store.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:underline"><MessageCircle className="w-4 h-4"/>WhatsApp</a>}
              </div>
            </div>
          </div>

          {/* Cart */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-24 overflow-hidden">
              <div className={`bg-gradient-to-r ${meta?.gradient??'from-orange-500 to-red-500'} px-5 py-4 flex items-center gap-2 text-white`}>
                <ShoppingCart className="w-5 h-5"/>
                <span className="font-black text-lg">Your Order</span>
                {isThisCart&&totalItems>0&&<span className="ml-auto bg-white/20 text-white text-xs font-black px-2 py-1 rounded-full">{totalItems}</span>}
              </div>
              <div className="p-5">
                {!isThisCart||totalItems===0?(
                  <div className="text-center py-8">
                    <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3"/>
                    <p className="text-gray-400 text-sm">
                      {store.category==='real_estate'?'Select a property to book a viewing'
                      :store.category==='fashion'?'Add items to your order'
                      :'Add items to start your order'}
                    </p>
                    {store.min_order>0&&<p className="text-xs text-gray-400 mt-1">Min. order: ₦{store.min_order.toLocaleString()}</p>}
                  </div>
                ):(
                  <>
                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                      {items.map(item=>(
                        <div key={`${item.product.id}-${item.selected_size}-${item.selected_color}`} className="flex items-center gap-3">
                          <div className="flex items-center gap-1 bg-orange-50 rounded-xl p-1">
                            <button onClick={()=>updateQty(item.product.id,item.quantity-1)} className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-orange-600 hover:bg-orange-100 shadow-sm">
                              <Minus className="w-3.5 h-3.5"/>
                            </button>
                            <span className="w-5 text-center text-sm font-black text-orange-700">{item.quantity}</span>
                            <button onClick={()=>updateQty(item.product.id,item.quantity+1)} className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white hover:bg-orange-600 shadow-sm">
                              <Plus className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-700 font-medium truncate block">{item.product.name}</span>
                            {(item.selected_size||item.selected_color)&&<span className="text-xs text-gray-400">{[item.selected_size,item.selected_color].filter(Boolean).join(' · ')}</span>}
                          </div>
                          <span className="text-sm font-black text-gray-900 flex-shrink-0">₦{(item.product.price*item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 pt-4 space-y-2 text-sm mb-4">
                      <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₦{subtotal.toLocaleString()}</span></div>
                      {store.category!=='real_estate'&&<div className="flex justify-between text-gray-500"><span>Delivery</span><span>₦{deliveryFee.toLocaleString()}</span></div>}
                      <div className="flex justify-between font-black text-gray-900 text-base pt-2 border-t border-gray-100">
                        <span>Total</span>
                        <span>₦{(subtotal+(store.category!=='real_estate'?deliveryFee:0)).toLocaleString()}</span>
                      </div>
                    </div>
                    {!isLoggedIn?(
                      <Link href={`/auth/login?next=/store/${id}`}
                        className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-black text-sm flex items-center justify-center hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-200">
                        Sign in to {meta?.orderLabel??'order'}
                      </Link>
                    ):(
                      <Link href="/checkout"
                        className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-200">
                        <ShoppingCart className="w-4 h-4"/>
                        {meta?.orderLabel} · ₦{(subtotal+(store.category!=='real_estate'?deliveryFee:0)).toLocaleString()}
                        <ChevronRight className="w-4 h-4 ml-auto"/>
                      </Link>
                    )}
                    {store.category==='food'&&<p className="text-xs text-center text-gray-400 mt-2 flex items-center justify-center gap-1"><Clock className="w-3 h-3"/>{store.avg_delivery_min}–{store.avg_delivery_min+15} min delivery</p>}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Product card — adapts to all 3 categories ──────────────────────────────
function ProductCard({ product, qty, category, onAdd, onInc, onDec }:{
  product:Product; qty:number; category:string;
  onAdd:()=>void; onInc:()=>void; onDec:()=>void;
}) {
  return (
    <motion.div layout className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 hover:border-orange-200 hover:shadow-md transition-all">
      {product.image_url&&(
        <img src={product.image_url} alt={product.name} className="w-24 h-24 rounded-xl object-cover flex-shrink-0 border border-gray-100"/>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <h3 className="font-bold text-gray-900 text-sm leading-tight flex-1">{product.name}</h3>
          {product.is_featured&&<span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0">🔥</span>}
        </div>
        {product.description&&<p className="text-xs text-gray-400 line-clamp-2 mb-2">{product.description}</p>}

        {/* Category-specific details */}
        {category==='food'&&product.prep_time_min&&(
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2"><Clock className="w-3 h-3"/>{product.prep_time_min} min</div>
        )}
        {category==='real_estate'&&(
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 flex-wrap">
            {product.property_type&&<span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold capitalize">{product.property_type}</span>}
            {product.bedrooms&&<span className="flex items-center gap-1"><BedDouble className="w-3 h-3"/>{product.bedrooms} bed</span>}
            {product.bathrooms&&<span className="flex items-center gap-1"><Bath className="w-3 h-3"/>{product.bathrooms} bath</span>}
            {product.area_sqm&&<span className="flex items-center gap-1"><Maximize2 className="w-3 h-3"/>{product.area_sqm} m²</span>}
          </div>
        )}
        {category==='fashion'&&(product.sizes.length>0||product.colors.length>0)&&(
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {product.sizes.length>0&&<span className="text-xs text-gray-400 flex items-center gap-1"><Tag className="w-3 h-3"/>{product.sizes.join(', ')}</span>}
            {product.colors.length>0&&<span className="text-xs text-gray-400">{product.colors.join(', ')}</span>}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="font-black text-orange-600 text-base">₦{product.price.toLocaleString()}</span>
          {qty===0?(
            <button onClick={onAdd}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all shadow-sm shadow-orange-200">
              <Plus className="w-3.5 h-3.5"/>
              {category==='real_estate'?'Book':'Add'}
            </button>
          ):(
            <div className="flex items-center gap-2 bg-orange-50 rounded-xl p-1">
              <button onClick={onDec} className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-orange-600 hover:bg-orange-100 shadow-sm"><Minus className="w-3.5 h-3.5"/></button>
              <span className="w-5 text-center font-black text-orange-700 text-sm">{qty}</span>
              <button onClick={onInc} className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white hover:bg-orange-600 shadow-sm"><Plus className="w-3.5 h-3.5"/></button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-[64px] flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>}>
      <StoreInner/>
    </Suspense>
  );
}
