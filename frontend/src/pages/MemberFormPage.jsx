import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { membersApi } from '../api/members';
import { apiClient } from '../api/client';
import { normalizePhone, isValidFullName, isValidEgyptianMobile } from '../utils/phone';
import { getPhotoUrl } from '../utils/photo';
import { PhotoCropperModal } from '../components/PhotoCropperModal';
import {
  ArrowRight,
  UserPlus,
  User,
  Phone,
  MapPin,
  Camera,
  Save,
  X,
  AlertCircle,
  Calendar,
  Heart,
  CheckCircle,
  Mail,
  Plus,
  Trash2
} from 'lucide-react';

export const MemberFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [classes, setClasses] = useState([]);
  const [areasList, setAreasList] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Residential Areas Custom/Modal Management
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [newAreaInput, setNewAreaInput] = useState('');
  const [areaOpLoading, setAreaOpLoading] = useState(false);
  const [isCustomArea, setIsCustomArea] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    gender: 'ذكر',
    date_of_birth: '',
    class_id: '',
    group_name: '',
    email: '',
    area: '',
    location_url: '',
    phone: '',
    secondary_phone: '',
    member_phone: '',
    whatsapp_phone: '',
    father_of_confession: '',
    address: '',
    notes: '',
    status: 'Active',
    photo_url: ''
  });

  const [rawPhotoSrc, setRawPhotoSrc] = useState(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [croppedPhotoData, setCroppedPhotoData] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const loadAreas = async () => {
    try {
      const res = await membersApi.getDistinctAreas();
      const areas = res?.data || res || [];
      setAreasList(areas);
      return areas;
    } catch (err) {
      console.error('Error fetching areas:', err);
      return [];
    }
  };

  const handleAddArea = async () => {
    if (!newAreaInput.trim()) return;
    setAreaOpLoading(true);
    try {
      await membersApi.addArea(newAreaInput.trim());
      const res = await membersApi.getDistinctAreas();
      const updated = res?.data || res || [];
      setAreasList(updated);
      setFormData(prev => ({ ...prev, area: newAreaInput.trim() }));
      setNewAreaInput('');
      setIsCustomArea(false);
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر إضافة المنطقة');
    } finally {
      setAreaOpLoading(false);
    }
  };

  const handleDeleteArea = async (areaName) => {
    if (!window.confirm(`هل أنت متأكد من حذف منطقة "${areaName}" من القائمة؟`)) return;
    setAreaOpLoading(true);
    try {
      await membersApi.deleteArea(areaName);
      const res = await membersApi.getDistinctAreas();
      const updated = res?.data || res || [];
      setAreasList(updated);
      if (formData.area === areaName) {
        setFormData(prev => ({ ...prev, area: '' }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر حذف المنطقة');
    } finally {
      setAreaOpLoading(false);
    }
  };


  // Load available classes & areas
  useEffect(() => {
    apiClient.get('/classes?limit=200')
      .then(res => {
        const data = res?.data?.data?.items || res?.data?.items || [];
        setClasses(data);
        if (!isEditMode && data.length > 0 && !formData.class_id) {
          setFormData(prev => ({ ...prev, class_id: data[0].class_id }));
        }
      })
      .catch(err => {
        console.error('Error fetching classes:', err);
      });

    loadAreas();
  }, [isEditMode]);

  // Load member data if in edit mode
  useEffect(() => {
    if (!isEditMode) return;

    setLoading(true);
    membersApi.getMemberById(id)
      .then(res => {
        const member = res.data || res;
        const currentArea = member.area || '';
        setFormData({
          full_name: member.full_name || '',
          gender: member.gender || 'ذكر',
          date_of_birth: member.date_of_birth || '',
          class_id: member.active_class_id || member.class_id || '',
          group_name: member.group_name || '',
          email: member.email || '',
          area: currentArea,
          location_url: member.location_url || '',
          phone: member.phone || '',
          secondary_phone: member.secondary_phone || '',
          member_phone: member.member_phone || '',
          whatsapp_phone: member.whatsapp_phone || '',
          father_of_confession: member.father_of_confession || '',
          address: member.address || '',
          notes: member.notes || '',
          status: member.status || 'Active',
          photo_url: member.photo_url || ''
        });
        if (member.photo_url) {
          setPhotoPreview(getPhotoUrl(member.photo_url));
        }
      })
      .catch(err => {
        setError(err.response?.data?.message || 'تعذر تحميل بيانات المخدوم');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, isEditMode]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setRawPhotoSrc(reader.result);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBase64) => {
    setCroppedPhotoData(croppedBase64);
    setPhotoPreview(croppedBase64);
    setFormData(prev => ({ ...prev, photo_url: croppedBase64 }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Validation
    if (!isValidFullName(formData.full_name)) {
      setError('اسم الطفل المخدوم يجب أن يكون ثلاثياً أو رباعياً على الأقل بدون أرقام (مثال: مارك فادي نبيل)');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!isValidEgyptianMobile(formData.phone)) {
      setError('رقم تليفون ولي الأمر الرئيسي يجب أن يكون رقم محمول مصري صالح مكون من 11 رقم يبدأ بـ (010 أو 011 أو 012 أو 015)');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (formData.secondary_phone && !isValidEgyptianMobile(formData.secondary_phone)) {
      setError('الرقم الآخر لولي الأمر غير صالح. يرجى إدخال رقم محمول مصري مكون من 11 رقم يبدأ بـ (010 أو 011 أو 012 أو 015)');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (formData.member_phone && !isValidEgyptianMobile(formData.member_phone)) {
      setError('رقم المخدوم غير صالح. يرجى إدخال رقم محمول مصري مكون من 11 رقم يبدأ بـ (010 أو 011 أو 012 أو 015)');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!formData.class_id) {
      setError('يرجى اختيار الفصل الخدمي');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);

    const selectedClass = classes.find(c => c.class_id === formData.class_id);
    const resolvedStage = selectedClass?.stage || selectedClass?.name || 'عام';

    const payload = {
      ...formData,
      stage: resolvedStage,
      full_name: formData.full_name.trim(),
      email: formData.email?.trim() || null,
      area: formData.area?.trim() || null,
      location_url: formData.location_url?.trim() || null,
      date_of_birth: formData.date_of_birth || null,
      group_name: formData.group_name?.trim() || null,
      father_of_confession: formData.father_of_confession?.trim() || null,
      address: formData.address?.trim() || null,
      notes: formData.notes?.trim() || null,
      photo_url: croppedPhotoData || formData.photo_url || null,
      phone: normalizePhone(formData.phone),
      secondary_phone: formData.secondary_phone ? normalizePhone(formData.secondary_phone) : null,
      member_phone: formData.member_phone ? normalizePhone(formData.member_phone) : null,
      whatsapp_phone: formData.member_phone ? normalizePhone(formData.member_phone) : normalizePhone(formData.phone)
    };

    try {
      let savedMemberId = id;

      if (isEditMode) {
        await membersApi.updateMember(id, payload);
      } else {
        const res = await membersApi.createMember(payload);
        const createdData = res?.data || res;
        savedMemberId = createdData.member_id || createdData.id;

        // Auto enroll into chosen class
        if (formData.class_id && savedMemberId) {
          try {
            await apiClient.post(`/classes/${formData.class_id}/members`, {
              member_id: savedMemberId
            });
          } catch (clsErr) {
            // Already enrolled or managed by server
          }
        }
      }

      // If photo was cropped, save photo data URL directly into DB
      if (croppedPhotoData && savedMemberId) {
        try {
          await membersApi.updatePhotoData(savedMemberId, croppedPhotoData);
        } catch (photoErr) {
          console.error('Error saving photo data:', photoErr);
        }
      }

      setSuccessMsg(isEditMode ? 'تم تحديث بيانات المخدوم بنجاح' : 'تم إضافة المخدوم بنجاح');
      setTimeout(() => {
        navigate(`/members/${savedMemberId}`);
      }, 700);

    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMsg = typeof detail === 'string'
        ? detail
        : (Array.isArray(detail)
            ? detail.map(d => (d.loc ? `${d.loc.slice(-1)}: ` : '') + (d.msg || d.message)).join(' | ')
            : err.response?.data?.message)
          || 'حدث خطأ أثناء حفظ بيانات المخدوم. يرجى مراجعة البيانات والمحاولة مجدداً.';
      setError(errorMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>جاري تحميل بيانات المخدوم...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Photo Cropper Modal */}
      <PhotoCropperModal
        isOpen={isCropperOpen}
        imageSrc={rawPhotoSrc}
        onClose={() => setIsCropperOpen(false)}
        onCropComplete={handleCropComplete}
      />

      {/* Top Navigation & Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.8rem',
            fontSize: '0.85rem',
            marginBottom: '0.75rem',
            color: 'var(--text-muted)'
          }}
        >
          <ArrowRight size={16} />
          <span>رجوع</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              {isEditMode ? 'تعديل بيانات المخدوم' : 'تسجيل مخدوم جديد'}
            </h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {isEditMode ? `تحديث الملف الشخصي للمعرف (${id})` : 'إضافة طفل جديد إلى منظومة الخدمة والفصول'}
            </p>
          </div>

          {isEditMode && (
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--color-primary-light)',
              background: 'var(--bg-secondary)',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'monospace'
            }}>
              {id}
            </span>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: '#fca5a5',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: '#86efac',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Photo Upload Section with circular frame */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              background: 'var(--bg-secondary)',
              border: '3px solid var(--color-gold, #f59e0b)',
              boxShadow: '0 0 14px rgba(245, 158, 11, 0.25)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {photoPreview ? (
                <img src={photoPreview} alt="معاينة الصورة" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={34} style={{ color: 'var(--text-muted)' }} />
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>صورة المخدوم في الإطار</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                يتم حفظ الصورة بصيغة مضغوطة دائمة لا تُفقد عند التحديث
              </div>
            </div>
          </div>

          <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <Camera size={16} />
            <span>{photoPreview ? 'تغيير وتأطير الصورة' : 'اختيار وتأطير الصورة'}</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
            />
          </label>
        </div>

        {/* 1. Basic & Class Information */}
        <div className="glass-card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            paddingBottom: '0.75rem',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            color: 'var(--color-gold)',
            fontSize: '1rem',
            fontWeight: 700
          }}>
            <UserPlus size={18} />
            <span>البيانات الأساسية والفصل الخدمي</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">الاسم الكامل للمخدوم (ثلاثي أو رباعي)*</label>
              <input
                type="text"
                className="form-input"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="مثال: كيرلس فادي عاطف"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">النوع (الجنس)*</label>
              <select
                className="form-input"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="ذكر">ذكر 👦</option>
                <option value="أنثى">أنثى 👧</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">الفصل الخدمي*</label>
              <select
                className="form-input"
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                required
              >
                <option value="">— اختر الفصل الخدمي —</option>
                {classes.map((cls) => (
                  <option key={cls.class_id} value={cls.class_id}>
                    {cls.name} {cls.stage ? `— (${cls.stage})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">اسم الأسرة أو المجموعة (اختياري)</label>
              <input
                type="text"
                className="form-input"
                value={formData.group_name}
                onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                placeholder="مثال: أسرة مارمرقس"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">البريد الإلكتروني / Gmail (اختياري)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@gmail.com"
                  dir="ltr"
                  style={{ textAlign: 'right', paddingLeft: '2.5rem' }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">تاريخ الميلاد (اختياري)</label>
              <input
                type="date"
                className="form-input"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">اسم أب الاعتراف (اختياري)</label>
              <input
                type="text"
                className="form-input"
                value={formData.father_of_confession}
                onChange={(e) => setFormData({ ...formData, father_of_confession: e.target.value })}
                placeholder="مثال: أبونا بولا"
              />
            </div>
          </div>
        </div>

        {/* 2. Contact Phone Numbers */}
        <div className="glass-card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            paddingBottom: '0.75rem',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            color: 'var(--color-primary-light)',
            fontSize: '1rem',
            fontWeight: 700
          }}>
            <Phone size={18} />
            <span>أرقام الهواتف والتواصل</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">تليفون ولي الأمر الرئيسي*</label>
              <input
                type="tel"
                className="form-input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="012XXXXXXXX"
                required
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">رقم إضافي لولي الأمر (اختياري)</label>
              <input
                type="tel"
                className="form-input"
                value={formData.secondary_phone}
                onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })}
                placeholder="010XXXXXXXX"
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">رقم المخدوم نفسه (اختياري)</label>
              <input
                type="tel"
                className="form-input"
                value={formData.member_phone}
                onChange={(e) => setFormData({ ...formData, member_phone: e.target.value })}
                placeholder="015XXXXXXXX"
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
            </div>
          </div>
        </div>

        {/* 3. Address, Area, Location & Health Notes */}
        <div className="glass-card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            paddingBottom: '0.75rem',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            color: 'var(--color-success)',
            fontSize: '1rem',
            fontWeight: 700
          }}>
            <MapPin size={18} />
            <span>بيانات السكن والمنطقة وتوزيع الافتقاد</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>المنطقة السكنية (لتقسيم الافتقاد)*</label>
                <button
                  type="button"
                  onClick={() => setIsAreaModalOpen(true)}
                  className="btn btn-secondary"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', gap: '3px' }}
                  title="إدارة وإضافة وحذف المناطق السكنية"
                >
                  ⚙️ إدارة قائمة المناطق
                </button>
              </div>

              {!isCustomArea ? (
                <select
                  className="form-input"
                  value={formData.area}
                  onChange={(e) => {
                    if (e.target.value === '__OTHER__') {
                      setIsCustomArea(true);
                      setFormData({ ...formData, area: '' });
                    } else {
                      setFormData({ ...formData, area: e.target.value });
                    }
                  }}
                >
                  <option value="">-- اختر المنطقة السكنية من القائمة --</option>
                  {areasList.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                  <option value="__OTHER__">➕ منطقة أخرى (كتابة يدوي)...</option>
                </select>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="اكتب اسم المنطقة هنا..."
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomArea(false);
                      setFormData({ ...formData, area: '' });
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                  >
                    إلغاء
                  </button>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>موقع السكن على Google Maps (اختياري)</label>
                {formData.location_url && (
                  <a
                    href={formData.location_url.startsWith('http') ? formData.location_url : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.location_url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.78rem', color: '#38bdf8', textDecoration: 'underline' }}
                  >
                    🗺️ فتح على الخريطة
                  </a>
                )}
              </div>
              <input
                type="url"
                className="form-input"
                value={formData.location_url}
                onChange={(e) => setFormData({ ...formData, location_url: e.target.value })}
                placeholder="https://maps.app.goo.gl/... أو إحداثيات المكان"
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">العنوان التفصيلي (اختياري)</label>
              <input
                type="text"
                className="form-input"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="الشارع، رقم العمارة، الشقة، علامة مميزة..."
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <label className="form-label">ملاحظات خدمة ورعاية خاصة</label>
            <textarea
              className="form-input"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="أي ملاحظات خاصة بالتلميذ أو الرعاية الصحية أو العائلية..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          paddingTop: '0.5rem'
        }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            إلغاء والعودة
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
          >
            <Save size={16} />
            <span>{submitting ? 'جاري الحفظ...' : isEditMode ? 'حفظ التعديلات' : 'تسجيل المخدوم'}</span>
          </button>
        </div>
      </form>

      {/* Residential Areas Management Modal */}
      {isAreaModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-container glass-card" style={{ maxWidth: '560px', width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={20} color="var(--color-primary-light)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>إدارة قائمة المناطق السكنية</h3>
              </div>
              <button onClick={() => setIsAreaModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
                يمكن للمسؤولين إضافة مناطق سكنية جديدة لتظهر لجميع الخدام في القائمة المنسدلة، أو حذف أي منطقة لم تعد مستخدمة.
              </p>

              {/* Add New Area Input */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <input
                  type="text"
                  className="form-input"
                  value={newAreaInput}
                  onChange={(e) => setNewAreaInput(e.target.value)}
                  placeholder="اسم المنطقة السكنية الجديدة..."
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddArea(); } }}
                />
                <button
                  type="button"
                  onClick={handleAddArea}
                  disabled={areaOpLoading || !newAreaInput.trim()}
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap', gap: '4px' }}
                >
                  <Plus size={16} />
                  <span>إضافة</span>
                </button>
              </div>

              {/* List of current areas */}
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                المناطق المسجلة بالنظام ({areasList.length}):
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                {areasList.map((areaName) => (
                  <span
                    key={areaName}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      padding: '0.3rem 0.65rem',
                      borderRadius: '20px',
                      fontSize: '0.82rem'
                    }}
                  >
                    <span>{areaName}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteArea(areaName)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', padding: 0 }}
                      title={`حذف منطقة ${areaName}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.75rem 1rem' }}>
              <button
                type="button"
                onClick={() => setIsAreaModalOpen(false)}
                className="btn btn-secondary"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
