'use client';
import { createContext, useContext, useReducer, useEffect } from 'react';
import { CartItem, Product, Store } from '@/types';
interface CartState{items:CartItem[];store:Pick<Store,'id'|'name'|'city'|'category'|'min_order'|'avg_delivery_min'>|null;}
type Action=|{type:'ADD';product:Product;store:CartState['store'];size?:string;color?:string}|{type:'REMOVE';productId:string}|{type:'QTY';productId:string;qty:number}|{type:'CLEAR'};
interface CartCtx{items:CartItem[];store:CartState['store'];totalItems:number;subtotal:number;addItem:(p:Product,s:CartState['store'],size?:string,color?:string)=>void;removeItem:(id:string)=>void;updateQty:(id:string,qty:number)=>void;clearCart:()=>void;}
const Ctx=createContext<CartCtx|null>(null);
function reducer(state:CartState,action:Action):CartState{
  switch(action.type){
    case 'ADD':{
      if(state.store&&state.store.id!==action.store?.id)return{store:action.store,items:[{product:action.product,quantity:1,selected_size:action.size,selected_color:action.color}]};
      const ex=state.items.find(i=>i.product.id===action.product.id&&i.selected_size===action.size&&i.selected_color===action.color);
      return{store:action.store??state.store,items:ex?state.items.map(i=>(i.product.id===action.product.id&&i.selected_size===action.size&&i.selected_color===action.color)?{...i,quantity:i.quantity+1}:i):[...state.items,{product:action.product,quantity:1,selected_size:action.size,selected_color:action.color}]};
    }
    case 'REMOVE':return{...state,items:state.items.filter(i=>i.product.id!==action.productId)};
    case 'QTY':return{...state,items:action.qty<=0?state.items.filter(i=>i.product.id!==action.productId):state.items.map(i=>i.product.id===action.productId?{...i,quantity:action.qty}:i)};
    case 'CLEAR':return{items:[],store:null};
    default:return state;
  }
}
const KEY='africart_v2_cart';
export function CartProvider({children}:{children:React.ReactNode}){
  const[state,dispatch]=useReducer(reducer,{items:[],store:null},()=>{
    if(typeof window==='undefined')return{items:[],store:null};
    try{const s=localStorage.getItem(KEY);return s?JSON.parse(s):{items:[],store:null};}
    catch{return{items:[],store:null};}
  });
  useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}},[state]);
  const subtotal=state.items.reduce((s,i)=>s+i.product.price*i.quantity,0);
  const totalItems=state.items.reduce((s,i)=>s+i.quantity,0);
  return(
    <Ctx.Provider value={{items:state.items,store:state.store,subtotal,totalItems,
      addItem:(p,s,size,color)=>dispatch({type:'ADD',product:p,store:s,size,color}),
      removeItem:(id)=>dispatch({type:'REMOVE',productId:id}),
      updateQty:(id,qty)=>dispatch({type:'QTY',productId:id,qty}),
      clearCart:()=>dispatch({type:'CLEAR'}),
    }}>{children}</Ctx.Provider>
  );
}
export function useCart(){const c=useContext(Ctx);if(!c)throw new Error('useCart outside CartProvider');return c;}
