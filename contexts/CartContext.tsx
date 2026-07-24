'use client';
import {
  createContext, useContext, useReducer, useEffect, useState
} from 'react';
import { CartItem, Product, Store } from '@/types';

type CartStore = Pick<Store, 'id' | 'name' | 'city' | 'category' | 'min_order' | 'avg_delivery_min' | 'latitude' | 'longitude' | 'custom_delivery_fee'> | null;

interface CartState {
  items: CartItem[];
  store: CartStore;
}

type Action =
  | { type:'ADD';    product:Product; store:CartStore; size?:string; color?:string }
  | { type:'REMOVE'; productId:string }
  | { type:'QTY';    productId:string; qty:number }
  | { type:'CLEAR' };

interface CartCtx {
  items:      CartItem[];
  store:      CartStore;
  totalItems: number;
  subtotal:   number;
  hydrated:   boolean;
  addItem:    (p:Product, s:CartStore, size?:string, color?:string) => void;
  removeItem: (id:string) => void;
  updateQty:  (id:string, qty:number) => void;
  clearCart:  () => void;
}

const CartContext = createContext<CartCtx | null>(null);
const KEY = 'africart_v2_cart';

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case 'ADD': {
      if (state.store && state.store.id !== action.store?.id) {
        return {
          store: action.store,
          items: [{ product: action.product, quantity: 1, selected_size: action.size, selected_color: action.color }],
        };
      }
      const key = `${action.product.id}__${action.size ?? ''}__${action.color ?? ''}`;
      const existing = state.items.find(i =>
        `${i.product.id}__${i.selected_size ?? ''}__${i.selected_color ?? ''}` === key
      );
      return {
        store: action.store ?? state.store,
        items: existing
          ? state.items.map(i =>
              `${i.product.id}__${i.selected_size ?? ''}__${i.selected_color ?? ''}` === key
                ? { ...i, quantity: i.quantity + 1 }
                : i
            )
          : [...state.items, { product: action.product, quantity: 1, selected_size: action.size, selected_color: action.color }],
      };
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter(i => i.product.id !== action.productId) };
    case 'QTY':
      return {
        ...state,
        items: action.qty <= 0
          ? state.items.filter(i => i.product.id !== action.productId)
          : state.items.map(i => i.product.id === action.productId ? { ...i, quantity: action.qty } : i),
      };
    case 'CLEAR':
      return { items: [], store: null };
    default:
      return state;
  }
}

function readCart(): CartState {
  if (typeof window === 'undefined') return { items: [], store: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { items: [], store: null };
    const parsed = JSON.parse(raw) as CartState;
    if (!Array.isArray(parsed.items)) return { items: [], store: null };
    return parsed;
  } catch {
    return { items: [], store: null };
  }
}

function writeCart(state: CartState) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], store: null });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readCart();
    if (saved.items.length > 0 || saved.store) {
      dispatch({ type: 'CLEAR' });
      saved.items.forEach(item => {
        dispatch({ type: 'ADD', product: item.product, store: saved.store, size: item.selected_size, color: item.selected_color });
        if (item.quantity > 1) {
          dispatch({ type: 'QTY', productId: item.product.id, qty: item.quantity });
        }
      });
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeCart(state);
  }, [state, hydrated]);

  const subtotal   = state.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items: state.items, store: state.store, subtotal, totalItems, hydrated,
      addItem:    (p, s, size, color) => dispatch({ type: 'ADD',    product: p, store: s, size, color }),
      removeItem: (id)                => dispatch({ type: 'REMOVE', productId: id }),
      updateQty:  (id, qty)           => dispatch({ type: 'QTY',    productId: id, qty }),
      clearCart:  ()                  => dispatch({ type: 'CLEAR' }),
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error('useCart must be used inside <CartProvider>');
  return c;
}