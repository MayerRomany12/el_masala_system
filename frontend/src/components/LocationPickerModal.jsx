import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Search, Check, X, Loader2 } from 'lucide-react';

export function LocationPickerModal({ isOpen, onClose, onSelect, initialUrl }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [coords, setCoords] = useState({ lat: 24.0889, lng: 32.8998 }); // Aswan default
  const [loadingMap, setLoadingMap] = useState(true);
  const [locatingCurrent, setLocatingCurrent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Extract initial coords from URL if present
  useEffect(() => {
    if (initialUrl && isOpen) {
      const match = initialUrl.match(/q=([-+]?\d+\.\d+),([-+]?\d+\.\d+)/) ||
                    initialUrl.match(/@([-+]?\d+\.\d+),([-+]?\d+\.\d+)/);
      if (match) {
        const parsedLat = parseFloat(match[1]);
        const parsedLng = parseFloat(match[2]);
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          setCoords({ lat: parsedLat, lng: parsedLng });
        }
      }
    }
  }, [initialUrl, isOpen]);

  // Load Leaflet and initialize map
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const initMap = () => {
      if (!isMounted || !mapContainerRef.current) return;
      const L = window.L;
      if (!L) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current).setView([coords.lat, coords.lng], 15);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // Custom icon or default marker
      const marker = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        setCoords({ lat: pos.lat, lng: pos.lng });
      });

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCoords({ lat, lng });
      });

      // Force recalculate container size
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 300);

      setLoadingMap(false);
    };

    if (window.L) {
      initMap();
    } else {
      // Inject CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Inject JS
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          if (isMounted) initMap();
        };
        document.body.appendChild(script);
      } else {
        const timer = setInterval(() => {
          if (window.L) {
            clearInterval(timer);
            if (isMounted) initMap();
          }
        }, 100);
      }
    }

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('خدمة تحديد الموقع الجغرافي (GPS) غير مدعومة في متصفحك');
      return;
    }
    setLocatingCurrent(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }
        setLocatingCurrent(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        alert('تعذر تحديد موقعك الحالي. تأكد من تفعيل إذن الوصول للموقع في المتصفح.');
        setLocatingCurrent(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearchPlace = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim() + ' Aswan Egypt'
        )}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setCoords({ lat, lng });
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }
      } else {
        alert('لم يتم العثور على نتائج للبحث، يمكنك النقر على الخريطة مباشرة لتحديد النقطة.');
      }
    } catch (err) {
      alert('تعذر إجراء البحث عن العنوان حالياً');
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = () => {
    const mapsUrl = `https://www.google.com/maps?q=${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
    onSelect(mapsUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(5px)',
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--card-bg, #1a1e2e)',
        border: '1px solid var(--border-color, #2d3548)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '850px',
        height: '85vh',
        maxHeight: '700px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        color: '#fff',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color, #2d3548)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <MapPin size={22} color="#38bdf8" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>
                تحديد موقع السكن على الخريطة
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                انقر على الخريطة أو اسحب العلامة الحمراء لتحديد مكان منزل المخدوم بدقة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.4rem',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar: Search + GPS */}
        <div style={{
          padding: '0.75rem 1.25rem',
          display: 'flex',
          gap: '0.6rem',
          flexWrap: 'wrap',
          background: 'rgba(0,0,0,0.25)',
          borderBottom: '1px solid var(--border-color, #2d3548)',
          alignItems: 'center'
        }}>
          <form onSubmit={handleSearchPlace} style={{ flex: 1, display: 'flex', gap: '0.4rem', minWidth: '240px' }}>
            <input
              type="text"
              placeholder="ابحث عن شارع، كنيسة، أو منطقة بأسوان..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '0.45rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #2d3548)',
                background: 'var(--bg-input, #0f172a)',
                color: '#fff',
                fontSize: '0.88rem'
              }}
            />
            <button
              type="submit"
              disabled={searching}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', gap: '4px' }}
            >
              {searching ? <Loader2 size={15} className="spin" /> : <Search size={15} />}
              <span>بحث</span>
            </button>
          </form>

          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={locatingCurrent}
            className="btn btn-secondary"
            style={{
              padding: '0.45rem 0.9rem',
              fontSize: '0.85rem',
              gap: '6px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.4)'
            }}
          >
            {locatingCurrent ? <Loader2 size={15} className="spin" /> : <Navigation size={15} />}
            <span>موقعي الحالي (GPS)</span>
          </button>
        </div>

        {/* Map Body */}
        <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: '300px' }}>
          {loadingMap && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-input, #0f172a)',
              color: '#94a3b8',
              zIndex: 10
            }}>
              <Loader2 size={28} className="spin" style={{ marginRight: '8px' }} />
              <span>جاري تحميل الخريطة التفاعلية...</span>
            </div>
          )}
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.85rem 1.25rem',
          borderTop: '1px solid var(--border-color, #2d3548)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>الإحداثيات المختارة:</span>
            <span style={{ fontFamily: 'monospace', color: '#f8fafc', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1.2rem', fontSize: '0.88rem' }}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="btn btn-primary"
              style={{
                padding: '0.5rem 1.5rem',
                fontSize: '0.88rem',
                gap: '6px',
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)'
              }}
            >
              <Check size={16} />
              <span>تأكيد واختيار هذا الموقع</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
