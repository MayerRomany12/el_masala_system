import React, { useEffect, useState, useCallback } from 'react';
import { messagesApi } from '../api/messages';
import {
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  X,
  Inbox,
  SendHorizontal,
  PlusCircle,
  MailCheck
} from 'lucide-react';

export const CommunicationHubModal = ({ isOpen, onClose, usersList = [] }) => {
  const [activeTab, setActiveTab] = useState('inbox'); // inbox, sent, compose
  const [inboxItems, setInboxItems] = useState([]);
  const [sentItems, setSentItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State for New Message / Task
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Message'); // Message, Task, Note, Escalation
  const [priority, setPriority] = useState('Normal');   // Normal, High, Urgent

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const res = await messagesApi.getInbox();
      if (res.success) {
        setInboxItems(res.data.items);
      }
    } catch (err) {
      setError('تعذر جلب رسائل الوارد');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await messagesApi.getSent();
      if (res.success) {
        setSentItems(res.data.items);
      }
    } catch (err) {
      setError('تعذر جلب الرسائل المرسلة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'inbox') fetchInbox();
      if (activeTab === 'sent') fetchSent();
    }
  }, [isOpen, activeTab, fetchInbox, fetchSent]);

  const handleMarkAsRead = async (messageId, isRead) => {
    if (isRead) return;
    try {
      await messagesApi.markAsRead(messageId);
      setInboxItems(prev => prev.map(m => m.message_id === messageId ? { ...m, is_read: true } : m));
    } catch (e) {}
  };

  const handleUpdateTaskStatus = async (messageId, newStatus) => {
    try {
      const res = await messagesApi.updateTaskStatus(messageId, newStatus);
      if (res.success) {
        setInboxItems(prev => prev.map(m => m.message_id === messageId ? { ...m, status: newStatus } : m));
      }
    } catch (e) {}
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const res = await messagesApi.sendMessage({
        recipient_id: recipientId || null,
        subject,
        content,
        category,
        priority
      });
      if (res.success) {
        setSuccessMsg('تم إرسال الرسالة/المهمة بنجاح ✉️');
        setSubject('');
        setContent('');
        setRecipientId('');
        setActiveTab('sent');
        fetchSent();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذر إرسال الرسالة');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '850px' }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, rgba(122, 8, 29, 0.6) 0%, rgba(26, 10, 16, 0.8) 100%)',
          borderBottom: '1px solid rgba(212, 175, 55, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <MessageSquare size={24} style={{ color: '#d4af37' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              مركز التواصل والمهام الداخلي (Communication Hub)
            </h2>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '0.4rem 0.6rem', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`btn ${activeTab === 'inbox' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', gap: '0.4rem' }}
          >
            <Inbox size={16} />
            <span>صندوق الوارد 📥</span>
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`btn ${activeTab === 'sent' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', gap: '0.4rem' }}
          >
            <SendHorizontal size={16} />
            <span>الرسائل المرسلة 📤</span>
          </button>
          <button
            onClick={() => setActiveTab('compose')}
            className={`btn ${activeTab === 'compose' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', gap: '0.4rem', background: activeTab === 'compose' ? 'linear-gradient(135deg, #d4af37 0%, #7a081d 100%)' : undefined }}
          >
            <PlusCircle size={16} />
            <span>إرسال رسالة / تكليف مهمة ✍️</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          
          {error && (
            <div style={{ padding: '0.75rem', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {successMsg && (
            <div style={{ padding: '0.75rem', marginBottom: '1rem', background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.4)', borderRadius: '8px', color: '#6ee7b7', fontSize: '0.85rem' }}>
              {successMsg}
            </div>
          )}

          {/* INBOX TAB */}
          {activeTab === 'inbox' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>جاري استعلام صندوق الوارد...</div>
              ) : inboxItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لا توجد رسائل في صندوق الوارد.</div>
              ) : (
                inboxItems.map(msg => (
                  <div
                    key={msg.message_id}
                    onClick={() => handleMarkAsRead(msg.message_id, msg.is_read)}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      background: msg.is_read ? 'rgba(255,255,255,0.03)' : 'rgba(212, 175, 55, 0.08)',
                      border: msg.is_read ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(212, 175, 55, 0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {!msg.is_read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }}></span>}
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{msg.subject}</strong>
                        <span className="badge" style={{ fontSize: '0.72rem', background: msg.category === 'Task' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(56, 189, 248, 0.2)', color: msg.category === 'Task' ? '#fbbf24' : '#38bdf8' }}>
                          {msg.category}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        من: {msg.sender_name} | {msg.created_at ? new Date(msg.created_at).toLocaleDateString('ar-EG') : ''}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </p>

                    {/* Task Lifecycle Status Controls */}
                    {msg.category === 'Task' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-gold-light)', fontWeight: 700 }}>حالة تنفيذ المهمة:</span>
                        <select
                          className="form-input"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem', width: 'auto' }}
                          value={msg.status}
                          onChange={(e) => handleUpdateTaskStatus(msg.message_id, e.target.value)}
                        >
                          <option value="Pending">قيد الإسناد (Pending) 🟡</option>
                          <option value="In_Progress">قيد التنفيذ (In Progress) 🔵</option>
                          <option value="Completed">مكتملة بنجاح (Completed) 🟢</option>
                        </select>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* SENT TAB */}
          {activeTab === 'sent' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>جاري جلب الرسائل المرسلة...</div>
              ) : sentItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>لم تقم بفي إرسال أي رسائل بعد.</div>
              ) : (
                sentItems.map(msg => (
                  <div key={msg.message_id} style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{msg.subject}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        إلى: {msg.recipient_name}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* COMPOSE TAB */}
          {activeTab === 'compose' && (
            <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">المستلم (Recipient)</label>
                <select className="form-input" value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
                  <option value="">إعلان عام للجميع (Broadcast) 📢</option>
                  {usersList.map(u => (
                    <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">نوع الرسالة/المهمة (Category)</label>
                  <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Message">رسالة تواصل 💬</option>
                    <option value="Task">تكليف بمهمة 📋</option>
                    <option value="Note">ملاحظة خدمية 📝</option>
                    <option value="Escalation">تصعيد عاجل 🚨</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">الأولوية (Priority)</label>
                  <select className="form-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="Normal">عادي (Normal)</option>
                    <option value="High">هام (High)</option>
                    <option value="Urgent">عاجل جداً (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">عنوان الرسالة / المهمة</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="مثال: متابعة غياب أطفال فصل الصف الثالث"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">محتوى التفاصيل والملاحظات</label>
                <textarea
                  className="form-input"
                  rows={4}
                  required
                  placeholder="اكتب التكليف أو الرسالة بالتفصيل..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
                  <Send size={16} />
                  <span>إرسال وتكليف الآن</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
