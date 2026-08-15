import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserPlus, RefreshCw, Shield, AlertCircle, Check, Key, X } from 'lucide-react';

const AVAILABLE_PERMISSIONS = [
  { key: 'members:read', label: 'قراءة وسجل الأطفال' },
  { key: 'members:write', label: 'إضافة وتعديل بيانات الأطفال' },
  { key: 'cards:issue', label: 'طباعة وإصدار بطاقات الـ QR' },
  { key: 'attendance:session', label: 'إنشاء وإدارة جلسات الحضور' },
  { key: 'attendance:scan', label: 'مسح وتسجيل الحضور بالكاميرا' },
  { key: 'attendance:cancel', label: 'إلغاء وتصحيح الحضور' },
  { key: 'followup:read', label: 'استعراض سجل الغائبين والافتقاد' },
  { key: 'followup:write', label: 'توثيق افتقاد الأطفال والمكالمات' },
  { key: 'followup:manage', label: 'تشغيل كاشف الغائبين وتصعيد المهام' },
  { key: 'events:read', label: 'استعراض الرحلات والأنشطة' },
  { key: 'events:write', label: 'إنشاء وتعديل الرحلات والأنشطة' },
  { key: 'rewards:read', label: 'استعراض لوحة النقاط المتصدرين' },
  { key: 'rewards:manage', label: 'منح واستبدال النقاط والخصومات' },
  { key: 'birthdays:read', label: 'استعراض أعياد الميلاد' },
  { key: 'birthdays:gift', label: 'توثيق تسليم هدايا أعياد الميلاد' },
  { key: 'reports:read', label: 'استعراض التقارير التحليلية' },
  { key: 'reports:export', label: 'تصدير التقارير (Excel / PDF / CSV)' },
  { key: 'users:manage', label: 'إدارة حسابات وصلاحيات الخدام' },
  { key: 'messages:send', label: 'إرسال رسائل وتكليف مهام بالسيستم' }
];

export const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Custom Granular Permissions Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [customPerms, setCustomPerms] = useState([]);
  const [revokedPerms, setRevokedPerms] = useState([]);
  const [permSaving, setPermSaving] = useState(false);

  // New User Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'Servant'
  });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { hasPermission } = useAuth();

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/users');
      if (response.data.success) {
        setUsers(response.data.data.items);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'تعذر جلب قائمة المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);

    try {
      const response = await apiClient.post('/users', formData);
      if (response.data.success) {
        setShowModal(false);
        setFormData({ username: '', email: '', full_name: '', password: '', role: 'Servant' });
        fetchUsers();
      }
    } catch (err) {
      setModalError(err.response?.data?.message || 'فشل إنشاء حساب المستخدم');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPermModal = (user) => {
    setSelectedUser(user);
    setCustomPerms(user.custom_permissions || []);
    setRevokedPerms(user.revoked_permissions || []);
  };

  const handleToggleCustomPerm = (permKey) => {
    if (customPerms.includes(permKey)) {
      setCustomPerms(customPerms.filter(p => p !== permKey));
    } else {
      setCustomPerms([...customPerms, permKey]);
      setRevokedPerms(revokedPerms.filter(p => p !== permKey));
    }
  };

  const handleToggleRevokedPerm = (permKey) => {
    if (revokedPerms.includes(permKey)) {
      setRevokedPerms(revokedPerms.filter(p => p !== permKey));
    } else {
      setRevokedPerms([...revokedPerms, permKey]);
      setCustomPerms(customPerms.filter(p => p !== permKey));
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setPermSaving(true);
    try {
      const response = await apiClient.patch(`/users/${selectedUser.user_id}/permissions`, {
        custom_permissions: customPerms,
        revoked_permissions: revokedPerms
      });
      if (response.data.success) {
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر حفظ الصلاحيات المخصصة');
    } finally {
      setPermSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
            إدارة المستخدمين والصلاحيات المخصصة
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            إدارة حسابات الخدام والمسؤولين وتخصيص الصلاحيات الفردية الدقيقة (Granular RBAC)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={fetchUsers} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>تحديث</span>
          </button>
          {hasPermission('users:write') && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              <UserPlus size={18} />
              <span>إضافة خادم / مسؤول جديد</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          padding: '0.85rem 1.25rem',
          background: 'var(--danger-glow)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-sm)',
          color: '#fca5a5',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>اسم المستخدم</th>
                <th>الاسم الكامل</th>
                <th>البريد الإلكتروني</th>
                <th>الدور والصلاحية</th>
                <th>تخصيص الصلاحيات</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    جاري تحميل حسابات المستخدمين...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    لا يوجد مستخدمين مسجلين حالياً.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.user_id}>
                    <td style={{ fontWeight: 700, color: '#38bdf8' }}>{user.username}</td>
                    <td>{user.full_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{user.email}</td>
                    <td>
                      <select
                        className="form-input"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', width: '130px' }}
                        value={user.role}
                        onChange={async (e) => {
                          const newRole = e.target.value;
                          try {
                            await apiClient.patch(`/users/${user.user_id}`, { role: newRole });
                            fetchUsers();
                          } catch (err) {
                            alert(err.response?.data?.message || 'تعذر تغيير صلاحية المستخدم');
                          }
                        }}
                      >
                        <option value="Servant">Servant</option>
                        <option value="Admin">Admin</option>
                        <option value="Super Admin">Super Admin</option>
                      </select>
                    </td>

                    {/* Custom Permissions Matrix Button */}
                    <td>
                      <button
                        onClick={() => handleOpenPermModal(user)}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', gap: '0.3rem', color: 'var(--color-gold-light)' }}
                        title="تعديل الصلاحيات المخصصة والمسترجعة بالاسم"
                      >
                        <Key size={14} />
                        <span>تخصيص ({user.effective_permissions?.length || 0})</span>
                      </button>
                    </td>

                    <td>
                      <button
                        onClick={async () => {
                          try {
                            await apiClient.patch(`/users/${user.user_id}`, { is_active: !user.is_active });
                            fetchUsers();
                          } catch (err) {
                            alert(err.response?.data?.message || 'تعذر تغيير حالة حساب المستخدم');
                          }
                        }}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.78rem',
                          color: user.is_active ? '#34d399' : '#f87171',
                          borderColor: user.is_active ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)'
                        }}
                      >
                        {user.is_active ? 'نشط 🟢' : 'معطل 🔴'}
                      </button>
                    </td>
                    <td style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                      {new Date(user.created_at).toLocaleDateString('ar-EG')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                إضافة خادم / مسؤول جديد
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-secondary" style={{ padding: '0.3rem', borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {modalError && (
                <div style={{ padding: '0.75rem', background: 'var(--danger-glow)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
                  {modalError}
                </div>
              )}

              <form id="addUserForm" onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">الاسم الكامل</label>
                  <input
                    type="text" className="form-input" value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="مثال: الخادم مينا سمير" required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">اسم المستخدم (Username)</label>
                  <input
                    type="text" className="form-input" value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="مثال: mina_sameh" required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">البريد الإلكتروني</label>
                  <input
                    type="email" className="form-input" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="mina@almasalla-church.org" required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">كلمة المرور</label>
                  <input
                    type="password" className="form-input" value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="كلمة مرور من 6 خانات على الأقل" required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">الدور / الصلاحية</label>
                  <select
                    className="form-input" value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="Servant">خادم (Servant)</option>
                    <option value="Admin">مسؤول (Admin)</option>
                    <option value="Super Admin">مدير النظام (Super Admin)</option>
                  </select>
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">إلغاء</button>
              <button type="submit" form="addUserForm" className="btn btn-primary">{submitting ? 'جاري الحفظ...' : 'إنشاء الحساب'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Granular Permissions Matrix Modal */}
      {selectedUser && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-gold-light)', margin: 0 }}>
                  تخصيص الصلاحيات الفردية للمستخدم: {selectedUser.full_name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  الصلاحيات الفعلية = (صلاحيات الدور {selectedUser.role} + المضافة) - المسترجعة
                </p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="btn-secondary" style={{ padding: '0.3rem', borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {AVAILABLE_PERMISSIONS.map(p => {
                const isCustom = customPerms.includes(p.key);
                const isRevoked = revokedPerms.includes(p.key);

                return (
                  <div key={p.key} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{p.label}</div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.key}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleCustomPerm(p.key)}
                        style={{
                          padding: '0.2rem 0.5rem', fontSize: '0.72rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                          background: isCustom ? '#34d399' : 'rgba(255,255,255,0.1)', color: isCustom ? '#000' : '#fff', fontWeight: 800
                        }}
                      >
                        + منح
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleRevokedPerm(p.key)}
                        style={{
                          padding: '0.2rem 0.5rem', fontSize: '0.72rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                          background: isRevoked ? '#ef4444' : 'rgba(255,255,255,0.1)', color: isRevoked ? '#fff' : '#fff', fontWeight: 800
                        }}
                      >
                        - سحب
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setSelectedUser(null)} className="btn btn-secondary">إلغاء</button>
              <button type="button" onClick={handleSavePermissions} disabled={permSaving} className="btn btn-primary">
                {permSaving ? 'جاري الحفظ...' : 'حفظ الصلاحيات المخصصة 💾'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
