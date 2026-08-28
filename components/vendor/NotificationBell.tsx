'use client';
import { useEffect, useState, useRef } from 'react';
import { Bell, Check, BellRing } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { enablePushNotifications } from '@/lib/push-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell({ vendorId }: { vendorId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [pushEnabled, setPushEnabled] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const unread = items.filter(n => !n.is_read).length;

  useEffect(() => {
    supabase
      .from('notifications')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setItems(data ?? []));

    const channel = supabase
      .channel(`vendor-notifications-${vendorId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `vendor_id=eq.${vendorId}` },
        (payload) => setItems(prev => [payload.new as Notification, ...prev])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [vendorId]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function markRead(id: string) {
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  }

  async function markAllRead() {
    const unreadIds = items.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
  }

  async function handleEnablePush() {
    try {
      await enablePushNotifications(vendorId);
      setPushEnabled(true);
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
        <Bell className="w-4 h-4 text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-gray-100 shadow-xl z-30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-black text-sm text-gray-900">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-bold text-orange-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {!pushEnabled && (
            <button onClick={handleEnablePush}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 border-b border-orange-100">
              <BellRing className="w-3.5 h-3.5" /> Enable push notifications
            </button>
          )}

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <div className="py-10 text-center text-gray-400 text-sm">No notifications yet.</div>
            )}
            {items.map(n => (
              <button key={n.id} onClick={() => markRead(n.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-orange-50/50' : ''}`}>
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-gray-300 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}