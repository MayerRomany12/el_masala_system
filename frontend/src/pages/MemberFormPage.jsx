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
  Mail
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

  const [formData, setFormData] = useState({
    full_name: '',
    gender: 'ذكر',
    date_of_birth: '',
    class_id: '',
    group_name: '',
    email: '',
    area: '',
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

    membersApi.getDistinctAreas()
      .then(res => {
        const areas = res?.data || res || [];
        setAreasList(areas);
      })
      .catch(err => {
        console.error('Error fetching areas:', err);
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
          email: member.email || '',
          area: member.area || '',
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
      email: formData.email?.trim() || null,
      area: formData.area?.trim() || null,
      date_of_birth: formData.date_of_birth || null,
      group_name: formData.group_name?.trim() || null,
      father_of_confession: formData.father_of_confession?.trim() || null,
      address: formData.address?.trim() || null,
      notes: formData.notes?.trim() || null,
      photo_url: croppedPhotoData || formData.photo_url || null,
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

        {/* 3. Address, Area & Health Notes */}
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
              <label className="form-label">المنطقة السكنية (لتقسيم الافتقاد الجغرافي)</label>
              <input
                type="text"
                list="areas-datalist"
                className="form-input"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="مثال: الكرور، عزبة شنودة، الشيخ هارون..."
              />
              <datalist id="areas-datalist">
                {areasList.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">العنوان التفصيلي (اختياري)</label>
              <input
                type="text"
                className="form-input"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="الشارع، رقم العمارة، علامة مميزة..."
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
    </div>
  );
};
