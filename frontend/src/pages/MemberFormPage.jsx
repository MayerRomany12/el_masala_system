import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { membersApi } from '../api/members';
import { apiClient } from '../api/client';
import { normalizePhone, isValidFullName, isValidEgyptianMobile } from '../utils/phone';
import { getPhotoUrl } from '../utils/photo';
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
  CheckCircle
} from 'lucide-react';

export const MemberFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    gender: 'ذكر',
    date_of_birth: '',
    class_id: '',
    group_name: '',
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

  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Load available classes
  useEffect(() => {
    apiClient.get('/classes/?status=Active&limit=100')
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
  }, [isEditMode]);

  // Load member data if in edit mode
  useEffect(() => {
    if (!isEditMode) return;

    setLoading(true);
    membersApi.getMemberById(id)
      .then(res => {
        const member = res.data || res;
        setFormData({
          full_name: member.full_name || '',
          gender: member.gender || 'ذكر',
          date_of_birth: member.date_of_birth || '',
          class_id: member.active_class_id || member.class_id || '',
          group_name: member.group_name || '',
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
      setSelectedPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
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
      setError('رقم الطفل المخدوم غير صالح. يرجى إدخال رقم محمول مصري مكون من 11 رقم يبدأ بـ (010 أو 011 أو 012 أو 015)');
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
      date_of_birth: formData.date_of_birth || null,
      group_name: formData.group_name?.trim() || null,
      father_of_confession: formData.father_of_confession?.trim() || null,
      address: formData.address?.trim() || null,
      notes: formData.notes?.trim() || null,
      phone: normalizePhone(formData.phone),
      secondary_phone: formData.secondary_phone ? normalizePhone(formData.secondary_phone) : null,
      member_phone: formData.member_phone ? normalizePhone(formData.member_phone) : null,
      whatsapp_phone: formData.whatsapp_phone
        ? normalizePhone(formData.whatsapp_phone)
        : (formData.member_phone ? normalizePhone(formData.member_phone) : normalizePhone(formData.phone))
    };

    try {
      let savedMemberId = id;

      if (isEditMode) {
        await membersApi.updateMember(id, payload);
      } else {
        const res = await membersApi.createMember(payload);
        const createdData = res?.data || res;
        savedMemberId = createdData.member_id || createdData.id;

        // Auto enroll into chosen class if needed
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

      // Upload photo if file was selected
      if (selectedPhotoFile && savedMemberId) {
        try {
          await membersApi.uploadPhoto(savedMemberId, selectedPhotoFile);
        } catch (photoErr) {
          console.error('Error uploading photo:', photoErr);
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
        {/* Photo Upload Section */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--bg-secondary)',
              border: '2px solid var(--color-primary-light)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {photoPreview ? (
                <img src={photoPreview} alt="معاينة الصورة" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={30} style={{ color: 'var(--text-muted)' }} />
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>صورة المخدوم</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                اختياري - صورة واضحة للتعرف البصري والبطاقة
              </div>
            </div>
          </div>

          <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <Camera size={16} />
            <span>{photoPreview ? 'تغيير الصورة' : 'اختيار صورة'}</span>
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
                    {cls.name} ({cls.group_type === 'Standard' ? 'أساسي' : cls.group_type})
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
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
              <label className="form-label">رقم الطفل نفسه (اختياري)</label>
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

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">رقم الواتساب (اختياري)</label>
              <input
                type="tel"
                className="form-input"
                value={formData.whatsapp_phone}
                onChange={(e) => setFormData({ ...formData, whatsapp_phone: e.target.value })}
                placeholder="إن ترك فارغاً سيتم استخدام رقم ولي الأمر"
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
            </div>
          </div>
        </div>

        {/* 3. Address & Health Notes */}
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
            <span>بيانات السكن والرعاية</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">عنوان السكن (اختياري)</label>
              <input
                type="text"
                className="form-input"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="عزبة شنوده - الكرور - الشارع..."
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
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
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Save size={16} />
            <span>{submitting ? 'جاري الحفظ...' : isEditMode ? 'حفظ التعديلات' : 'تسجيل المخدوم'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
