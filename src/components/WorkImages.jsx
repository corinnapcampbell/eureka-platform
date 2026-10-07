import { useState, useEffect, useRef } from 'react'

export function ImageMosaic({ images, urls, onOpen }) {
  if (!images.length) return null

  const overflow = images.length - 5
  const bottomCount = Math.min(images.length - 1, 4)
  const bottomImages = images.slice(1, 1 + bottomCount)

  if (images.length === 1) {
    return (
      <div style={{ borderRadius: 8, overflow: 'hidden' }}>
        <img
          src={urls[images[0].storage_path]}
          alt={images[0].name}
          onClick={() => onOpen(0)}
          style={{ width: '100%', maxHeight: 520, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
        />
      </div>
    )
  }

  if (images.length === 2) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, borderRadius: 8, overflow: 'hidden' }}>
        {images.map((img, i) => (
          <img
            key={img.id}
            src={urls[img.storage_path]}
            alt={img.name}
            onClick={() => onOpen(i)}
            style={{ width: '100%', height: 300, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderRadius: 8, overflow: 'hidden' }}>
      <img
        src={urls[images[0].storage_path]}
        alt={images[0].name}
        onClick={() => onOpen(0)}
        style={{ width: '100%', height: 320, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${bottomCount}, 1fr)`, gap: 4 }}>
        {bottomImages.map((img, i) => {
          const globalIndex = i + 1
          const isLast = i === bottomImages.length - 1 && overflow > 0
          return (
            <div key={img.id} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => onOpen(globalIndex)}>
              <img
                src={urls[img.storage_path]}
                alt={img.name}
                style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
              />
              {isLast && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.55)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>+{overflow}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ImageViewer({ images, urls, index, onIndex, onClose, onSaveCaption, onDelete }) {
  const [caption, setCaption] = useState(images[index]?.caption || '')
  const [editingCaption, setEditingCaption] = useState(false)
  const touchStartX = useRef(null)
  const file = images[index]

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    setCaption(images[index]?.caption || '')
    setEditingCaption(false)
  }, [index, images])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1)
      else if (e.key === 'ArrowRight' && index < images.length - 1) onIndex(index + 1)
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, images.length, onIndex, onClose])

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (dx > 50 && index > 0) onIndex(index - 1)
    else if (dx < -50 && index < images.length - 1) onIndex(index + 1)
  }

  if (!file) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>{index + 1} / {images.length}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}>✕</button>
      </div>

      <img
        src={urls[file.storage_path]}
        alt={file.name}
        style={{ maxWidth: '100vw', maxHeight: '78vh', objectFit: 'contain' }}
      />

      {index > 0 && (
        <button onClick={() => onIndex(index - 1)} style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
          width: 40, height: 40, fontSize: 20, color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
      )}
      {index < images.length - 1 && (
        <button onClick={() => onIndex(index + 1)} style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
          width: 40, height: 40, fontSize: 20, color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>›</button>
      )}

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {onSaveCaption && editingCaption ? (
          <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 480 }}>
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              autoFocus
              style={{ flex: 1, fontSize: 14, border: 'none', borderBottom: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', outline: 'none', padding: '4px 0' }}
            />
            <button onClick={() => { onSaveCaption(file.id, caption); setEditingCaption(false) }} style={{ fontSize: 13, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, padding: '4px 12px', color: '#fff', cursor: 'pointer' }}>Save</button>
            <button onClick={() => setEditingCaption(false)} style={{ fontSize: 13, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Cancel</button>
          </div>
        ) : (
          <p
            onClick={onSaveCaption ? () => setEditingCaption(true) : undefined}
            style={{ fontSize: 14, color: caption ? '#fff' : 'rgba(255,255,255,0.4)', margin: 0, cursor: onSaveCaption ? 'pointer' : 'default', fontStyle: caption ? 'normal' : 'italic' }}
          >
            {caption || (onSaveCaption ? 'Add caption' : '')}
          </p>
        )}
        {onDelete && (
          <button onClick={() => onDelete(file)} style={{ fontSize: 12, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
        )}
      </div>
    </div>
  )
}
