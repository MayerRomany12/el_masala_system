import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Check, X, RotateCw } from 'lucide-react';

export const PhotoCropperModal = ({ isOpen, imageSrc, onClose, onCropComplete }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for mobile devices
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleApplyCrop = () => {
    const canvas = document.createElement('canvas');
    const size = 320; // 320x320 optimal square thumbnail
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const img = imageRef.current;
    if (!img) return;

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Save state
    ctx.save();

    // Center crop frame
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const frameSize = 240; // Diameter of crop frame in UI
    const ratio = size / frameSize;

    const drawW = img.naturalWidth * (scale * ratio * (frameSize / Math.max(img.naturalWidth, img.naturalHeight)));
    const drawH = img.naturalHeight * (scale * ratio * (frameSize / Math.max(img.naturalWidth, img.naturalHeight)));

    ctx.drawImage(
      img,
      (position.x * ratio) - drawW / 2,
      (position.y * ratio) - drawH / 2,
      drawW,
      drawH
    );

    ctx.restore();

    // Compress to JPEG ~20KB
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    onCropComplete(croppedDataUrl);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.82)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-card, #1e293b)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '16px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          color: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-gold, #f59e0b)' }}>
            تظبيط وتأطير صورة المخدوم
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
          اسحب الصورة لتحريكها واستخدم المؤشر لتكبيرها داخل إطار البطاقة الدائري
        </p>

        {/* Viewport with Circular Mask */}
        <div
          style={{
            position: 'relative',
            width: '260px',
            height: '260px',
            margin: '0 auto',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid #3b82f6',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            background: '#0f172a'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="صورة التحرير"
            draggable={false}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          />
        </div>

        {/* Zoom & Rotation Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0 0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ZoomOut size={16} color="#94a3b8" />
            <input
              type="range"
              min="0.6"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#3b82f6', cursor: 'pointer' }}
            />
            <ZoomIn size={16} color="#94a3b8" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <RotateCw size={14} />
              <span>تدوير 90°</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); setRotation(0); }}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              إعادة ضبط
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            إلغاء
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApplyCrop}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <Check size={16} />
            <span>اعتماد وتثبيت الصورة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
