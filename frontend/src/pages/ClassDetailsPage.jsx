import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { getPhotoUrl } from '../utils/photo';
import { getWaUrl } from '../utils/phone';
import {
  ArrowRight,
  Users,
  GraduationCap,
  Layers,
  Search,
  UserPlus,
  Trash2,
  ArrowRightLeft,
  Phone,
  MessageSquare,
  AlertCircle,
  Plus,
  X,
  FileSpreadsheet,
  Copy,
  Check
} from 'lucide-react';

export const ClassDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [classData, setClassData] = useState(null);
  const [allClasses, setAllClasses] = useState([]);
  const [members, setMembers] = useState([]);
  const [servants, setServants] = useState([]);
  const [allServants, setAllServants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('members'); // 'members', 'servants', 'addMember', 'addServant'

  // WhatsApp Broadcast Modal states
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('سلام ونعمة يا أحبائي أولياء أمور {الاسم}، بنفكركم بميعاد اجتماع مدارس الأحد القادم...');
  const [copiedAll, setCopiedAll] = useState(false);

  // Member search for adding to class
  const [allMembers, setAllMembers] = useState([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [searchingMembers, setSearchingMembers] = useState(false);

  // Transfer Modal state
  const [transferTarget, setTransferTarget] = useState(null);
  const [targetClassId, setTargetClassId] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Add servant form
  const [selectedServantId, setSelectedServantId] = useState('');
  const [servantRoleTitle, setServantRoleTitle] = useState('خادم الفصل');
  const [addingServant, setAddingServant] = useState(false);

  const fetchClassDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [classRes, membersRes, servantsRes, allClassesRes] = await Promise.all([
        apiClient.get(`/classes/${id}`).catch(() => null),
        apiClient.get(`/classes/${id}/members`).catch(() => ({ data: [] })),
        apiClient.get(`/classes/${id}/servants`).catch(() => ({ data: [] })),
        apiClient.get('/classes?limit=200').catch(() => ({ data: [] }))
      ]);

      const foundClass = classRes?.data?.data || classRes?.data || (allClassesRes?.data?.data?.items || allClassesRes?.data?.items || allClassesRes?.data || []).find(c => c.class_id === id);

      if (foundClass) {
        setClassData(foundClass);
      } else {
        setError('تعذر العثور على الفصل الخدمي المطلوب');
      }

      const mList = membersRes?.data?.data?.items || membersRes?.data?.items || (Array.isArray(membersRes?.data) ? membersRes.data : []);
      const sList = servantsRes?.data?.data?.items || servantsRes?.data?.items || (Array.isArray(servantsRes?.data) ? servantsRes.data : []);
      const cList = allClassesRes?.data?.data?.items || allClassesRes?.data?.items || (Array.isArray(allClassesRes?.data) ? allClassesRes.data : []);

      setMembers(mList);
      setServants(sList);
      setAllClasses(cList);
    } catch (err) {
      setError('حدث خطأ أثناء تحميل بيانات الفصل');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClassDetails();
  }, [fetchClassDetails]);

  // Load all servants for dropdown
  useEffect(() => {
    apiClient.get('/users?limit=100')
      .then(res => {
        const list = res?.data?.data?.items || res?.data?.items || (Array.isArray(res?.data) ? res.data : []);
        setAllServants(list);
      })
      .catch(() => {});
  }, []);

  // Search members to add to class
  const searchGlobalMembers = async () => {
    if (!memberSearchTerm.trim()) return;
    setSearchingMembers(true);
    try {
      const res = await apiClient.get('/members', { params: { search: memberSearchTerm.trim(), limit: 15 } });
      const list = res?.data?.data?.items || res?.data?.items || [];
      setAllMembers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingMembers(false);
    }
  };

  const handleAddMemberToClass = async (memberId) => {
    try {
      await apiClient.post(`/classes/${id}/members`, { member_id: memberId });
      fetchClassDetails();
      setMemberSearchTerm('');
      setAllMembers([]);
      setActiveTab('members');
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر إضافة المخدوم للفصل');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`هل أنت متأكد من إزالة (${memberName}) من هذا الفصل؟`)) return;
    try {
      await apiClient.delete(`/classes/${id}/members/${memberId}`);
      setMembers(prev => prev.filter(m => (m.member_id || m.id) !== memberId));
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر إزالة المخدوم من الفصل');
    }
  };

  const handleAddServant = async (e) => {
    e.preventDefault();
    if (!selectedServantId) return;
    setAddingServant(true);
    try {
      await apiClient.post(`/classes/${id}/servants`, {
        servant_id: selectedServantId,
        role_title: servantRoleTitle
      });
      fetchClassDetails();
      setSelectedServantId('');
      setActiveTab('servants');
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تعيين الخادم للفصل');
    } finally {
      setAddingServant(false);
    }
  };

  const handleCopyAllPhones = () => {
    const phones = members.map(m => m.phone || m.whatsapp_phone).filter(Boolean);
    const uniquePhones = [...new Set(phones)];
    if (uniquePhones.length === 0) {
      alert('لا توجد أرقام هواتف مسجلة لأعضاء هذا الفصل');
      return;
    }
    navigator.clipboard.writeText(uniquePhones.join(', '));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2200);
  };

  const handleRemoveServant = async (servantId, servantName) => {
    if (!window.confirm(`هل أنت متأكد من إلغاء إشراف الخادم (${servantName})؟`)) return;
    try {
      await apiClient.delete(`/classes/${id}/servants/${servantId}`);
      setServants(prev => prev.filter(s => (s.servant_id || s.id) !== servantId));
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر إلغاء الإشراف');
    }
  };

  const handleTransferSubmit = async () => {
    if (!transferTarget || !targetClassId) return;
    setTransferring(true);
    try {
      await apiClient.post('/classes/transfer-member', {
        member_id: transferTarget.member_id || transferTarget.id,
        from_class_id: id,
        to_class_id: targetClassId
      });
      setTransferTarget(null);
      setTargetClassId('');
      fetchClassDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر نقل المخدوم');
    } finally {
      setTransferring(false);
    }
  };

  const filteredMembers = members.filter(m => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(s) ||
      m.member_id?.toLowerCase().includes(s) ||
      m.phone?.includes(s)
    );
  });

  if (loading) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>جاري تحميل بيانات وتفاصيل الفصل الخدمي...</div>
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ color: 'var(--color-danger)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>تعذر العثور على الفصل</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'الفصل الخدمي غير موجود'}</p>
          <button onClick={() => navigate('/classes')} className="btn btn-primary">
            العودة لقائمة الفصول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          onClick={() => navigate('/classes')}
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
          <span>العودة لقائمة الفصول</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                {classData.name}
              </h1>
              <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--color-gold)', border: '1px solid var(--border-subtle)', fontFamily: 'monospace' }}>
                {classData.class_id}
              </span>
            </div>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              المرحلة: <strong style={{ color: 'var(--text-main)' }}>{classData.stage || 'عام'}</strong> | النوع: <strong style={{ color: 'var(--text-main)' }}>{classData.group_type === 'Summer' ? 'نشاط صيفي' : classData.group_type === 'General' ? 'عام' : 'مدارس أحد'}</strong>
              {classData.description && ` — ${classData.description}`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}
            >
              <MessageSquare size={16} />
              <span>رسالة جماعية لاعضاء الجروب علي واتساب</span>
            </button>

            <Link
              to="/attendance"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700 }}
            >
              <FileSpreadsheet size={16} />
              <span>كشف حضور الفصل</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-success)', flexShrink: 0
          }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>إجمالي المخدومين</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>{members.length} مخدوم</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-primary-light)', flexShrink: 0
          }}>
            <GraduationCap size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>خدام الفصل</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>{servants.length} خادم</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(212, 175, 55, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-gold)', flexShrink: 0
          }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>المرحلة الدراسية</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>{classData.stage || 'عام'}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.65rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('members')}
          className={`btn ${activeTab === 'members' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem', gap: '0.4rem' }}
        >
          <Users size={16} />
          <span>قائمة المخدومين ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('servants')}
          className={`btn ${activeTab === 'servants' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem', gap: '0.4rem' }}
        >
          <GraduationCap size={16} />
          <span>خدام الفصل ({servants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('addMember')}
          className={`btn ${activeTab === 'addMember' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem', gap: '0.4rem' }}
        >
          <UserPlus size={16} />
          <span>إضافة مخدوم للفصل</span>
        </button>

        <button
          onClick={() => setActiveTab('addServant')}
          className={`btn ${activeTab === 'addServant' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem', gap: '0.4rem' }}
        >
          <Plus size={16} />
          <span>تعيين خادم مشرف</span>
        </button>
      </div>

      {/* Tab 1: Members List */}
      {activeTab === 'members' && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
              <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="بحث بالاسم أو الكود أو الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingRight: '32px' }}
              />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              عرض {filteredMembers.length} من أصل {members.length} مخدوم
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <p>لا يوجد مخدومين في هذا الفصل حالياً</p>
              <button onClick={() => setActiveTab('addMember')} className="btn btn-secondary" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                <UserPlus size={15} />
                <span>إضافة مخدوم الآن</span>
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>المخدوم</th>
                    <th>كود ID</th>
                    <th>المنطقة</th>
                    <th>الهاتف والواتساب</th>
                    <th>المجموعة</th>
                    <th style={{ textAlign: 'left' }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => {
                    const memberId = m.member_id || m.id;
                    return (
                      <tr key={memberId}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              background: 'var(--bg-secondary)', overflow: 'hidden',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-gold)', flexShrink: 0
                            }}>
                              {m.photo_url ? (
                                <img src={getPhotoUrl(m.photo_url)} alt={m.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                m.full_name?.charAt(0)
                              )}
                            </div>
                            <div>
                              <Link
                                to={`/members/${memberId}`}
                                style={{ fontWeight: 700, color: 'var(--text-main)', textDecoration: 'none' }}
                                className="hover:underline"
                              >
                                {m.full_name}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-primary-light)' }}>
                            {memberId}
                          </span>
                        </td>
                        <td>
                          {m.area ? (
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 6px',
                              background: 'rgba(168, 85, 247, 0.12)',
                              color: '#c084fc',
                              borderRadius: '4px',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              fontWeight: 700
                            }}>
                              {m.area}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', dir: 'ltr' }}>{m.phone}</span>
                            {m.phone && (
                              <a
                                href={getWaUrl(m.whatsapp_phone || m.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="واتساب"
                                style={{ color: 'var(--color-success)' }}
                              >
                                <MessageSquare size={14} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {m.group_name || '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'left' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                              onClick={() => {
                                setTransferTarget(m);
                                setTargetClassId('');
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', gap: '0.3rem' }}
                              title="نقل لفصل آخر"
                            >
                              <ArrowRightLeft size={13} />
                              <span>نقل</span>
                            </button>
                            <button
                              onClick={() => handleRemoveMember(memberId, m.full_name)}
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.5rem', color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.25)' }}
                              title="إزالة من الفصل"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Servants List */}
      {activeTab === 'servants' && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          {servants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
              <p>لم يتم تعيين خدام مشرفين لهذا الفصل حتى الآن</p>
              <button onClick={() => setActiveTab('addServant')} className="btn btn-secondary" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                <Plus size={15} />
                <span>تعيين خادم مشرف</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {servants.map((s) => {
                const servantId = s.servant_id || s.id;
                return (
                  <div
                    key={servantId}
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {s.full_name || s.username}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-gold)', marginTop: '2px' }}>
                        {s.role_title || 'خادم الفصل'}
                      </div>
                      {s.phone && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>
                          {s.phone}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleRemoveServant(servantId, s.full_name || s.username)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.5rem', color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.25)' }}
                      title="إلغاء الإشراف"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Add Member to Class */}
      {activeTab === 'addMember' && (
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.85rem', color: 'var(--text-main)' }}>
            إضافة مخدوم موجود إلى هذا الفصل
          </h3>

          <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="ابحث بالاسم أو رقم الهاتف..."
              value={memberSearchTerm}
              onChange={(e) => setMemberSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchGlobalMembers()}
            />
            <button
              onClick={searchGlobalMembers}
              className="btn btn-primary"
              disabled={searchingMembers}
              style={{ flexShrink: 0 }}
            >
              <Search size={16} />
              <span>{searchingMembers ? 'جاري البحث...' : 'بحث'}</span>
            </button>
          </div>

          {allMembers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {allMembers.map((m) => {
                const memberId = m.member_id || m.id;
                const isAlreadyInClass = members.some(em => (em.member_id || em.id) === memberId);

                return (
                  <div
                    key={memberId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 1rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {m.full_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        كود: {memberId} | الهاتف: {m.phone || '—'}
                      </div>
                    </div>

                    {isAlreadyInClass ? (
                      <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>موجود بالفعل</span>
                    ) : (
                      <button
                        onClick={() => handleAddMemberToClass(memberId)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', gap: '0.35rem' }}
                      >
                        <UserPlus size={14} />
                        <span>إضافة للفصل</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Add Servant */}
      {activeTab === 'addServant' && (
        <div className="glass-card" style={{ maxWidth: '550px', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem', color: 'var(--text-main)' }}>
            تعيين خادم مشرف على هذا الفصل
          </h3>

          <form onSubmit={handleAddServant} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">اختر الخادم*</label>
              <select
                className="form-input"
                value={selectedServantId}
                onChange={(e) => setSelectedServantId(e.target.value)}
                required
              >
                <option value="">— اختر الخادم —</option>
                {allServants.map((srv) => (
                  <option key={srv.user_id || srv.id} value={srv.user_id || srv.id}>
                    {srv.full_name || srv.username} ({srv.role || 'خادم'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">المسمى / المسؤولية الخدمية</label>
              <input
                type="text"
                className="form-input"
                value={servantRoleTitle}
                onChange={(e) => setServantRoleTitle(e.target.value)}
                placeholder="مثال: أمين الفصل، خادم مساعد، مسؤول أنشطة..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setActiveTab('servants')}
                className="btn btn-secondary"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={addingServant}
              >
                {addingServant ? 'جاري التعيين...' : 'تعيين الخادم'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transfer Member Modal (Small action modal) */}
      {transferTarget && (
        <div className="modal-overlay" onClick={() => setTransferTarget(null)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                نقل المخدوم ({transferTarget.full_name})
              </h3>
              <button onClick={() => setTransferTarget(null)} className="btn-secondary" style={{ padding: '0.3rem', borderRadius: '50%' }}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                سيتم نقل المخدوم من فصل <strong>{classData.name}</strong> إلى الفصل المختار:
              </p>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">الفصل الجديد*</label>
                <select
                  className="form-input"
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                >
                  <option value="">— اختر الفصل المنقول إليه —</option>
                  {allClasses
                    .filter(c => c.class_id !== id)
                    .map(c => (
                      <option key={c.class_id} value={c.class_id}>
                        {c.name} ({c.stage || 'عام'})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setTransferTarget(null)} className="btn btn-secondary">إلغاء</button>
              <button
                onClick={handleTransferSubmit}
                className="btn btn-primary"
                disabled={!targetClassId || transferring}
              >
                {transferring ? 'جاري النقل...' : 'تأكيد النقل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Broadcast Modal */}
      {isBroadcastModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={20} />
                <span>رسالة جماعية لأعضاء الجروب على واتساب ({members.length})</span>
              </h3>
              <button onClick={() => setIsBroadcastModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="form-label">نص الرسالة الموحدة (استخدم {'{الاسم}'} ليتم استبداله باسم كل طفل):</label>
              <textarea
                className="form-input"
                rows={3}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="سلام ونعمة يا أحبائي أولياء أمور {الاسم}..."
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
              <div>
                <strong style={{ fontSize: '0.85rem' }}>أرقام هواتف الفصل:</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
                  {members.filter(m => m.phone).length} أرقام مسجلة
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyAllPhones}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', gap: '6px' }}
              >
                {copiedAll ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                <span>{copiedAll ? 'تم نسخ جميع الأرقام!' : 'نسخ كافة الأرقام للمجموعة'}</span>
              </button>
            </div>

            {/* Members Quick Send Table */}
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              <table className="custom-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>اسم الطفل</th>
                    <th>الهاتف</th>
                    <th style={{ textAlign: 'center' }}>إرسال مباشر</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => {
                    const phone = m.whatsapp_phone || m.phone;
                    const personalizedText = broadcastMessage.replace(/\{الاسم\}/g, m.full_name || '');
                    const cleanPhone = phone ? phone.replace(/\D/g, '').replace(/^0+/, '') : '';
                    const waLink = cleanPhone ? `https://wa.me/20${cleanPhone}?text=${encodeURIComponent(personalizedText)}` : null;

                    return (
                      <tr key={m.member_id || m.id}>
                        <td style={{ fontWeight: 700 }}>{m.full_name}</td>
                        <td style={{ fontFamily: 'monospace' }} dir="ltr">{phone || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          {waLink ? (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.3)' }}
                            >
                              <MessageSquare size={13} />
                              <span>إرسال واتساب</span>
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>لا يوجد هاتف</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsBroadcastModalOpen(false)} className="btn btn-secondary">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
