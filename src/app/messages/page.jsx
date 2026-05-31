'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/store';

export default function MessagesPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const hydrated = useAuthStore(s => s.hydrated);
  const [convos, setConvos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push('/'); return; }
    api.contact.inquiries()
      .then(data => setConvos(data || []))
      .catch(() => setConvos([]))
      .finally(() => setLoading(false));
  }, [user]);

  const openConvo = async (c) => {
    setSelected(c);
    setMessages([]);
    try {
      const msgs = await api.contact.get(c.listing_id);
      setMessages(msgs || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch(e) {}
  };

  const send = async () => {
    if (!input.trim() || !selected || sending) return;
    setSending(true);
    try {
      await api.contact.send(selected.listing_id, input.trim());
      setInput('');
      const msgs = await api.contact.get(selected.listing_id);
      setMessages(msgs || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch(e) {} finally { setSending(false); }
  };

  if (!user) return null;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 0, height: 'calc(100vh - 120px)', background: 'var(--bg)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ width: 280, borderRight: '1px solid var(--border)', flexShrink: 0, overflowY: 'auto' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>💬 Messages</h2>
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading...</div>
        ) : convos.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No conversations yet.<br/><br/>Browse listings and click<br/>💬 Message Seller to start.</div>
        ) : convos.map(c => (
          <div key={c.listing_id+c.other_username} onClick={() => openConvo(c)} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', background: selected?.listing_id === c.listing_id ? 'rgba(59,130,246,0.1)' : 'transparent', borderLeft: selected?.listing_id === c.listing_id ? '3px solid #3b82f6' : '3px solid transparent', transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.other_username}</span>
              {Number(c.unread) > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px' }}>{c.unread}</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.listing_title}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.content}</div>
          </div>
        ))}
      </div>

      {!selected ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
            <div>Select a conversation</div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{selected.other_username}</div>
            <a href={'/listing/'+selected.listing_id} style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>{selected.listing_title}</a>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map(m => {
              const mine = m.sender_id === user.id;
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '70%', background: mine ? 'var(--accent)' : 'var(--surface)', borderRadius: mine ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '8px 12px' }}>
                    {!mine && <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2, fontWeight: 600 }}>{m.sender_username}</div>}
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>{m.content}</div>
                    <div style={{ fontSize: 10, color: mine ? 'rgba(255,255,255,0.6)' : 'var(--text3)', marginTop: 2, textAlign: mine ? 'right' : 'left' }}>
                      {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder="Type a message..." style={{ flex: 1, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
            <button onClick={send} disabled={sending || !input.trim()} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending || !input.trim() ? 0.5 : 1 }}>
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
