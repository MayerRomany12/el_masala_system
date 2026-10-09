import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserPlus, RefreshCw, Shield, AlertCircle, Check, Key, X, Trash2 } from 'lucide-react';

const ROLE_BASE_PERMISSIONS = {
  'Super Admin': [
    'users:read', 'users:write', 'users:delete', 'users:permissions',
    'settings:read', 'settings:write', 'stages:manage',
    'classes:read', 'classes:manage',
    'members:read', 'members:write', 'members:archive',
    'cards:issue', 'cards:revoke',
    'events:read', 'events:write', 'events:delete',
    'attendance:session', 'attendance:scan', 'attendance:cancel', 'devices:manage',
    'followup:read', 'followup:write', 'followup:manage',
    'rewards:read', 'rewards:manage', 'discounts:manage',
    'birthdays:read', 'birthdays:gift',
    'reports:read', 'reports:export', 'audit:read',
    'messages:send', 'messages:manage'
  ],
  'Admin': [
    'users:read', 'users:write', 'users:delete', 'users:permissions',
    'classes:read', 'classes:manage',
    'members:read', 'members:write', 'members:archive',
    'cards:issue', 'cards:revoke',
    'events:read', 'events:write',
    'attendance:session', 'attendance:scan', 'attendance:cancel',
    'devices:manage',
    'followup:read', 'followup:write', 'followup:manage',
    'rewards:read', 'rewards:manage', 'discounts:manage',
    'birthdays:read', 'birthdays:gift',
    'reports:read', 'reports:export', 'audit:read',
    'messages:send', 'messages:manage',
    'settings:read'
  ],
  'Servant': [
    'classes:read',
    'members:read', 'members:write',
    'events:read',
    'attendance:session', 'attendance:scan',
    'followup:read', 'followup:write',
    'birthdays:read',
    'reports:read',
    'messages:send'
  ]
};

const PERMISSION_CATEGORIES = [
  {
    id: 'members',
    label: 'سجل المخدومين والأطفال',
    items: [
      { key: 'members:read', label: 'استعراض بيانات وسجل المخدومين', desc: 'عرض قائمة الأطفال والبحث والتفاصيل' },
      { key: 'members:write', label: 'إضافة وتعديل بيانات المخدومين', desc: 'إنشاء مخدوم جديد، تعديل البيانات والموقع الجغرافي' },
      { key: 'members:archive', label: 'أرشفة واستعادة المخدومين المستبعدين', desc: 'أرشفة المخدوم المستبعد أو فك أرشفته' },
      { key: 'cards:issue', label: 'إصدار وطباعة كروت وبطاقات QR', desc: 'توليد وطباعة بطاقات الهوية والـ QR للمخدومين' }
    ]
  },
  {
    id: 'classes',
    label: 'الفصول والمجموعات',
    items: [
      { key: 'classes:read', label: 'استعراض الفصول والمجموعات', desc: 'رؤية فصول مدارس الأحد والأنشطة' },
      { key: 'classes:manage', label: 'إنشاء وتعديل وإدارة الفصول', desc: 'إنشاء فصل جديد، تعديل بياناته، وتسكين الخدام والأطفال' }
    ]
  },
  {
    id: 'attendance',
    label: 'الحضور والانصراف والـ QR',
    items: [
      { key: 'attendance:session', label: 'فتح وإدارة جلسات الحضور', desc: 'إنشاء جلسة حضور جديدة للفصول وتحديد المواعيد' },
      { key: 'attendance:scan', label: 'تسجيل ومسح الحضور بالكاميرا', desc: 'مسح باركود QR للأطفال ورصد الحضور اللحظي' },
      { key: 'attendance:cancel', label: 'تعديل وإلغاء وتصحيح الحضور يدويًا', desc: 'تعديل حالة الحاضر إلى غائب أو العكس يدوياً' }
    ]
  },
  {
    id: 'followup',
    label: 'الافتقاد ومتابعة الغياب',
    items: [
      { key: 'followup:read', label: 'استعراض سجل الغائبين والافتقاد', desc: 'عرض مهام الافتقاد ومتابعة غياب الفصل' },
      { key: 'followup:write', label: 'توثيق وتسجيل الافتقاد والمكالمات', desc: 'تسجيل نتائج المكالمات والزيارات والملاحظات' },
      { key: 'followup:manage', label: 'تشغيل كاشف الغياب وتوزيع المهام', desc: 'فحص الغياب آلياً وتوزيع المهام بالتساوي على خدام الفصل' }
    ]
  },
  {
    id: 'birthdays',
    label: 'أعياد الميلاد والهدايا',
    items: [
      { key: 'birthdays:read', label: 'استعراض أعياد الميلاد', desc: 'متابعة قائمة أعياد الميلاد القادمة للمخدومين' },
      { key: 'birthdays:gift', label: 'توثيق تسليم هدايا أعياد الميلاد', desc: 'تسجيل تسليم الهدايا السنوية للأطفال' }
    ]
  },
  {
    id: 'reports',
    label: 'التقارير وسجل الرقابة',
    items: [
      { key: 'reports:read', label: 'استعراض التقارير الإحصائية', desc: 'الاطلاع على تقارير وكشوفات الحضور والغياب' },
      { key: 'reports:export', label: 'تصدير التقارير (Excel / PDF / طباعة)', desc: 'تنزيل ملفات الإكسل وطباعة الكشوفات الرسمية' },
      { key: 'audit:read', label: 'الاطلاع على سجل العمليات والرقابة', desc: 'متابعة سجل تدقيق النشاطات والتعديلات الحساسة (Audit Logs)' }
    ]
  },
  {
    id: 'events_rewards',
    label: 'الأنشطة والمكافآت',
    items: [
      { key: 'events:read', label: 'استعراض الرحلات والأنشطة', desc: 'رؤية الفعاليات والرحلات الصيفية' },
      { key: 'events:write', label: 'إدارة وتعديل الأنشطة والاشتراكات', desc: 'إنشاء الفعاليات والرحلات وتسجيل المشتركين' },
      { key: 'rewards:read', label: 'استعراض لوحة النقاط والشرف', desc: 'عرض نقاط المخدومين والمتميزين' },
      { key: 'rewards:manage', label: 'إدارة ومنح واستبدال النقاط', desc: 'إضافة وخصم نقاط المخدومين' }
    ]
  },
  {
    id: 'users',
    label: 'إدارة الخدام والمستخدمين',
    items: [
      { key: 'users:read', label: 'استعراض قائمة المستخدمين والخدام', desc: 'عرض حسابات الخدام والمسؤولين' },
      { key: 'users:write', label: 'إضافة وتعديل بيانات الخدام والحسابات', desc: 'إنشاء حساب جديد وتعديل بيانات المستخدمين' },
      { key: 'users:delete', label: 'حذف حسابات المستخدمين', desc: 'حذف حساب مستخدم نهائياً من النظام' },
      { key: 'users:permissions', label: 'تخصيص وتعديل الصلاحيات', desc: 'منح وسحب الصلاحيات الفردية للمستخدمين' }
    ]
  }
];

const ALL_DEFINED_PERMISSIONS = PERMISSION_CATEGORIES.flatMap(cat => cat.items);

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

  const { user: currentUser, hasPermission } = useAuth();

  const handleDeleteUser = async (u) => {
    if (u.user_id === currentUser?.user_id) {
      alert('لا يمكنك حذف حسابك الشخصي المسجل به حالياً!');
      return;
    }
    if (u.role === 'Super Admin' || u.username === 'superadmin') {
      alert('حظر أمني: لا يمكن حذف حساب مسؤول النظام الأكبر (Super Admin)!');
      return;
    }
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف حساب المسؤول/الخادم (${u.full_name || u.username}) نهائياً من النظام؟\n\nلن يتمكن من تسجيل الدخول بعد الآن.`);
    if (!confirmDelete) return;

    try {
      await apiClient.delete(`/users/${u.user_id}`);
      setUsers(prev => prev.filter(item => item.user_id !== u.user_id));
      alert(`تم حذف حساب (${u.full_name || u.username}) بنجاح ✨`);
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.message || 'تعذر حذف حساب المستخدم');
    }
  };

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

  const [permFilterCategory, setPermFilterCategory] = useState('all');

  const handleOpenPermModal = (user) => {
    setSelectedUser(user);
    setCustomPerms(user.custom_permissions || []);
    setRevokedPerms(user.revoked_permissions || []);
    setPermFilterCategory('all');
  };

  const handleTogglePerm = (permKey) => {
    if (!selectedUser) return;
    const basePerms = ROLE_BASE_PERMISSIONS[selectedUser.role] || [];
    const isBase = basePerms.includes(permKey);
    const isCustom = customPerms.includes(permKey);
    const isRevoked = revokedPerms.includes(permKey);
    const isEffective = (isBase || isCustom) && !isRevoked;

    if (isEffective) {
      // Turn it OFF
      if (isBase) {
        if (!revokedPerms.includes(permKey)) {
          setRevokedPerms(prev => [...prev, permKey]);
        }
        setCustomPerms(prev => prev.filter(k => k !== permKey));
      } else {
        setCustomPerms(prev => prev.filter(k => k !== permKey));
      }
    } else {
      // Turn it ON
      if (isBase) {
        setRevokedPerms(prev => prev.filter(k => k !== permKey));
      } else {
        if (!customPerms.includes(permKey)) {
          setCustomPerms(prev => [...prev, permKey]);
        }
        setRevokedPerms(prev => prev.filter(k => k !== permKey));
      }
    }
  };

  const handleGrantAll = () => {
    if (!selectedUser) return;
    const basePerms = ROLE_BASE_PERMISSIONS[selectedUser.role] || [];
    setRevokedPerms([]);
    const nonBase = ALL_DEFINED_PERMISSIONS.map(p => p.key).filter(k => !basePerms.includes(k));
    setCustomPerms(nonBase);
  };

  const handleResetToDefault = () => {
    setCustomPerms([]);
    setRevokedPerms([]);
  };

  const handleRevokeAll = () => {
    if (!selectedUser) return;
    const basePerms = ROLE_BASE_PERMISSIONS[selectedUser.role] || [];
    setCustomPerms([]);
    setRevokedPerms([...basePerms]);
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
      <div className="user-header-container">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
            إدارة المستخدمين والصلاحيات المخصصة
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            إدارة حسابات الخدام والمسؤولين وتخصيص الصلاحيات الفردية الدقيقة (Granular RBAC)
          </p>
        </div>

        <div className="user-header-actions">
          <button onClick={fetchUsers} className="btn btn-secondary" style={{ flex: 1 }}>
            <RefreshCw size={16} />
            <span>تحديث</span>
          </button>
          {hasPermission('users:write') && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ flex: 2 }}>
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

      {/* Desktop Users Table */}
      <div className="glass-card users-desktop-table" style={{ padding: 0, overflow: 'hidden' }}>
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
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    جاري تحميل حسابات المستخدمين...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
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
                        disabled={!hasPermission('users:write') || user.role === 'Super Admin'}
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
                      {hasPermission('users:permissions') ? (
                        <button
                          onClick={() => handleOpenPermModal(user)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', gap: '0.3rem', color: 'var(--color-gold-light)' }}
                          title="تعديل الصلاحيات المخصصة والمسترجعة بالاسم"
                        >
                          <Key size={14} />
                          <span>تخصيص ({user.effective_permissions?.length || 0})</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {user.effective_permissions?.length || 0} صلاحية
                        </span>
                      )}
                    </td>

                    <td>
                      <button
                        onClick={async () => {
                          if (!hasPermission('users:write')) return;
                          try {
                            await apiClient.patch(`/users/${user.user_id}`, { is_active: !user.is_active });
                            fetchUsers();
                          } catch (err) {
                            alert(err.response?.data?.message || 'تعذر تغيير حالة حساب المستخدم');
                          }
                        }}
                        disabled={!hasPermission('users:write') || user.role === 'Super Admin'}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.78rem',
                          color: user.is_active ? '#34d399' : '#f87171',
                          borderColor: user.is_active ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)',
                          cursor: !hasPermission('users:write') || user.role === 'Super Admin' ? 'default' : 'pointer'
                        }}
                      >
                        {user.is_active ? 'نشط 🟢' : 'معطل 🔴'}
                      </button>
                    </td>
                    <td style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                      {new Date(user.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td>
                      {hasPermission('users:delete') && user.role !== 'Super Admin' && user.user_id !== currentUser?.user_id && (
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.25rem 0.55rem',
                            fontSize: '0.75rem',
                            color: 'var(--color-danger, #ef4444)',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            gap: '0.25rem'
                          }}
                          title="حذف المسؤول / الخادم نهائياً"
                        >
                          <Trash2 size={13} />
                          <span>حذف</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Users Responsive Cards View */}
      <div className="users-mobile-list">
        {loading ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            جاري تحميل حسابات المستخدمين...
          </div>
        ) : users.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            لا يوجد مستخدمين مسجلين حالياً.
          </div>
        ) : (
          users.map((user) => (
            <div key={user.user_id} className="user-mobile-card">
              <div className="user-mobile-card-row">
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1rem' }}>{user.full_name}</div>
                  <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.85rem' }}>@{user.username}</div>
                </div>
                <button
                  onClick={async () => {
                    if (!hasPermission('users:write')) return;
                    try {
                      await apiClient.patch(`/users/${user.user_id}`, { is_active: !user.is_active });
                      fetchUsers();
                    } catch (err) {
                      alert(err.response?.data?.message || 'تعذر تغيير حالة حساب المستخدم');
                    }
                  }}
                  disabled={!hasPermission('users:write') || user.role === 'Super Admin'}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.78rem',
                    color: user.is_active ? '#34d399' : '#f87171',
                    borderColor: user.is_active ? 'rgba(52, 211, 153, 0.3)' : 'rgba(248, 113, 113, 0.3)',
                    cursor: !hasPermission('users:write') || user.role === 'Super Admin' ? 'default' : 'pointer'
                  }}
                >
                  {user.is_active ? 'نشط 🟢' : 'معطل 🔴'}
                </button>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                📧 {user.email}
              </div>

              <div className="user-mobile-card-row" style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>الدور</label>
                  <select
                    className="form-input"
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: '100%' }}
                    value={user.role}
                    disabled={!hasPermission('users:write') || user.role === 'Super Admin'}
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
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>الصلاحيات</label>
                  {hasPermission('users:permissions') ? (
                    <button
                      onClick={() => handleOpenPermModal(user)}
                      className="btn btn-secondary"
                      style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.78rem', gap: '0.3rem', color: 'var(--color-gold-light)' }}
                    >
                      <Key size={14} />
                      <span>تخصيص ({user.effective_permissions?.length || 0})</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {user.effective_permissions?.length || 0} صلاحية
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.35rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                  تاريخ الإنشاء: {new Date(user.created_at).toLocaleDateString('ar-EG')}
                </div>
                {hasPermission('users:delete') && user.role !== 'Super Admin' && user.user_id !== currentUser?.user_id && (
                  <button
                    onClick={() => handleDeleteUser(user)}
                    className="btn btn-secondary"
                    style={{
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem',
                      color: 'var(--color-danger, #ef4444)',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      gap: '0.3rem'
                    }}
                  >
                    <Trash2 size={13} />
                    <span>حذف المسؤول</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
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
      {selectedUser && (() => {
        const basePerms = ROLE_BASE_PERMISSIONS[selectedUser.role] || [];
        const isSuperAdminUser = selectedUser.role === 'Super Admin' || selectedUser.username === 'superadmin';

        // Filter permissions based on category
        const categoriesToDisplay = permFilterCategory === 'all'
          ? PERMISSION_CATEGORIES
          : PERMISSION_CATEGORIES.filter(cat => cat.id === permFilterCategory);

        // Count how many are effective
        const totalPermsCount = ALL_DEFINED_PERMISSIONS.length;
        const effectivePermsCount = ALL_DEFINED_PERMISSIONS.filter(p => {
          if (isSuperAdminUser) return true;
          const isBase = basePerms.includes(p.key);
          const isCustom = customPerms.includes(p.key);
          const isRevoked = revokedPerms.includes(p.key);
          return (isBase || isCustom) && !isRevoked;
        }).length;

        return (
          <div className="modal-overlay">
            <div className="modal-card" style={{ maxWidth: '880px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header" style={{ paddingBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                    <Key size={20} style={{ color: 'var(--color-gold)' }} />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      تخصيص الصلاحيات الفردية: {selectedUser.full_name}
                    </h3>
                    <span className="badge" style={{ background: 'rgba(212, 175, 55, 0.2)', color: 'var(--color-gold-light)', fontSize: '0.78rem' }}>
                      {selectedUser.role}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    الصلاحيات الفعالة: <strong style={{ color: '#38bdf8' }}>{effectivePermsCount}</strong> من أصل {totalPermsCount} | أي صلاحية ملغاة تختفي شاشتها وأزرارها بالكامل من حساب الخادم
                  </p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="btn-secondary" style={{ padding: '0.3rem', borderRadius: '50%' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Batch Action Toolbar */}
              {!isSuperAdminUser && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  padding: '0.65rem 1rem',
                  background: 'rgba(0,0,0,0.25)',
                  borderBottom: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    إجراءات سريعة:
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleGrantAll}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.4)' }}
                    >
                      منح وتفعيل كافة الصلاحيات ⚡
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                    >
                      استعادة الافتراضي للرتبة 🔄
                    </button>
                    <button
                      type="button"
                      onClick={handleRevokeAll}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                    >
                      تعطيل وسحب الكل 🚫
                    </button>
                  </div>
                </div>
              )}

              {/* Category Filter Tabs */}
              <div style={{
                display: 'flex',
                gap: '0.4rem',
                overflowX: 'auto',
                padding: '0.65rem 1rem',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'rgba(255, 255, 255, 0.02)'
              }}>
                <button
                  type="button"
                  onClick={() => setPermFilterCategory('all')}
                  className={`btn ${permFilterCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                >
                  الكل ({totalPermsCount})
                </button>
                {PERMISSION_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setPermFilterCategory(cat.id)}
                    className={`btn ${permFilterCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                  >
                    {cat.label} ({cat.items.length})
                  </button>
                ))}
              </div>

              {/* Permissions Items List */}
              <div className="modal-body" style={{ overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {isSuperAdminUser ? (
                  <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(212, 175, 55, 0.08)', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                    <Shield size={36} style={{ color: 'var(--color-gold)', margin: '0 auto 0.75rem' }} />
                    <h4 style={{ color: 'var(--color-gold-light)', margin: '0 0 0.4rem', fontSize: '1.05rem' }}>
                      مسؤول النظام الأكبر (Super Admin)
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      حساب مسؤول النظام يتمتع بكافة الصلاحيات تلقائياً ودون قيود لأسباب أمنية وتشغيلية.
                    </p>
                  </div>
                ) : (
                  categoriesToDisplay.map(cat => (
                    <div key={cat.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '0.85rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-gold-light)', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>📂</span>
                        <span>{cat.label}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.65rem' }}>
                        {cat.items.map(p => {
                          const isBase = basePerms.includes(p.key);
                          const isCustom = customPerms.includes(p.key);
                          const isRevoked = revokedPerms.includes(p.key);
                          const isEffective = (isBase || isCustom) && !isRevoked;

                          return (
                            <div
                              key={p.key}
                              style={{
                                padding: '0.75rem',
                                background: isEffective ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                borderRadius: '8px',
                                border: `1px solid ${isEffective ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem'
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '2px' }}>
                                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: isEffective ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                    {p.label}
                                  </span>
                                  {isRevoked ? (
                                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', fontSize: '0.68rem', padding: '1px 5px' }}>
                                      مسحوبة ⛔
                                    </span>
                                  ) : isCustom ? (
                                    <span className="badge" style={{ background: 'rgba(52, 211, 153, 0.2)', color: '#86efac', fontSize: '0.68rem', padding: '1px 5px' }}>
                                      ممنوحة يدويًا ➕
                                    </span>
                                  ) : isBase ? (
                                    <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc', fontSize: '0.68rem', padding: '1px 5px' }}>
                                      افتراضية
                                    </span>
                                  ) : null}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                                  {p.desc}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', fontFamily: 'monospace', marginTop: '2px' }}>
                                  {p.key}
                                </div>
                              </div>

                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePerm(p.key)}
                                  className={`btn ${isEffective ? 'btn-primary' : 'btn-secondary'}`}
                                  style={{
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    borderRadius: '6px',
                                    gap: '0.3rem',
                                    background: isEffective
                                      ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                                      : 'rgba(255, 255, 255, 0.06)',
                                    borderColor: isEffective ? 'transparent' : 'rgba(239, 68, 68, 0.3)',
                                    color: isEffective ? '#ffffff' : '#f87171'
                                  }}
                                  title={isEffective ? 'انقر لتعطيل هذه الصلاحية عن المستخدم' : 'انقر لتفعيل هذه الصلاحية للمستخدم'}
                                >
                                  {isEffective ? (
                                    <>
                                      <Check size={14} />
                                      <span>مفعّلة ✓</span>
                                    </>
                                  ) : (
                                    <>
                                      <X size={14} />
                                      <span>معطلة ✗</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '0.85rem 1rem' }}>
                <button type="button" onClick={() => setSelectedUser(null)} className="btn btn-secondary">
                  إلغاء
                </button>
                {!isSuperAdminUser && (
                  <button type="button" onClick={handleSavePermissions} disabled={permSaving} className="btn btn-primary" style={{ fontWeight: 800 }}>
                    {permSaving ? 'جاري الحفظ...' : 'حفظ الصلاحيات المخصصة 💾'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
