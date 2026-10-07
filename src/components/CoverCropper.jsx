import { useState, useEffect, useRef } from 'react'

export default function CoverCropper({ file, onCancel, onSave }) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [imgSize, setImgSize] = useState(null)
  const [saving, setSaving] = useState(false)
  const frameRef = useRef()
  const objectUrl = useRef(URL.createObjectURL(file))
  const dragStart = useRef(null)

  useEffect(() => {
    const url = objectUrl.current
    return () => URL.revokeObjectURL(url)
  }, [])

  function getFrameSize() {
    if (frameRef.current) return { w: frameRef.current.offsetWidth, h: frameRef.current.offsetHeight }
    const w = Math.min(window.innerWidth * 0.92, 640)
    return { w, h: w / 2 }
  }

  function computeBaseScale(iw, ih) {
    const { w, h } = getFrameSize()
    return Math.max(w / iw, h / ih)
  }

  function clampOffset(ox, oy, z, iw, ih) {
    const { w, h } = getFrameSize()
    const scale = computeBaseScale(iw, ih) * z
    return {
      x: Math.max(w - iw * scale, Math.min(0, ox)),
      y: Math.max(h - ih * scale, Math.min(0, oy)),
    }
  }

  function onImgLoad(e) {
    const iw = e.target.naturalWidth
    const ih = e.target.naturalHeight
    setImgSize({ w: iw, h: ih })
    const { w, h } = getFrameSize()
    const scale = Math.max(w / iw, h / ih)
    setOffset({ x: (w - iw * scale) / 2, y: (h - ih * scale) / 2 })
  }

  function onMouseDown(e) {
    e.preventDefault()
    const startX = e.clientX, startY = e.clientY
    const startOX = offset.x, startOY = offset.y
    const z = zoom, is = imgSize
    function move(ev) {
      if (!is) return
      setOffset(clampOffset(startOX + ev.clientX - startX, startOY + ev.clientY - startY, z, is.w, is.h))
    }
    function up() {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  function onTouchStart(e) {
    const t = e.touches[0]
    dragStart.current = { x: t.clientX, y: t.clientY, ox: offset.x, oy: offset.y }
  }

  function onTouchMove(e) {
    if (!dragStart.current || !imgSize) return
    const t = e.touches[0]
    setOffset(clampOffset(
      dragStart.current.ox + t.clientX - dragStart.current.x,
      dragStart.current.oy + t.clientY - dragStart.current.y,
      zoom, imgSize.w, imgSize.h,
    ))
  }

  function onTouchEnd() { dragStart.current = null }

  function onZoomChange(e) {
    const z = parseFloat(e.target.value)
    if (imgSize) setOffset(o => clampOffset(o.x, o.y, z, imgSize.w, imgSize.h))
    setZoom(z)
  }

  async function handleSave() {
    if (!imgSize) return
    setSaving(true)
    const { w, h } = getFrameSize()
    const scale = computeBaseScale(imgSize.w, imgSize.h) * zoom
    const sx = -offset.x / scale
    const sy = -offset.y / scale
    const sw = w / scale
    const sh = h / scale
    const canvas = document.createElement('canvas')
    canvas.width = 1600
    canvas.height = 800
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 1600, 800)
      canvas.toBlob(blob => { setSaving(false); onSave(blob) }, 'image/jpeg', 0.9)
    }
    img.src = objectUrl.current
  }

  const displayScale = imgSize ? computeBaseScale(imgSize.w, imgSize.h) * zoom : 1

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#1a1a2e', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 680, boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        <h3 style={{ fontSize: 17, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>Position your cover</h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 1rem' }}>Drag the photo. This frame is exactly what people will see.</p>

        <div
          ref={frameRef}
          style={{ width: '100%', aspectRatio: '2 / 1', overflow: 'hidden', background: '#000', borderRadius: 8, cursor: 'grab', userSelect: 'none', position: 'relative', touchAction: 'none' }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <img
            src={objectUrl.current}
            alt="cover preview"
            onLoad={onImgLoad}
            draggable={false}
            style={{
              position: 'absolute',
              width: imgSize ? imgSize.w * displayScale : undefined,
              height: imgSize ? imgSize.h * displayScale : undefined,
              left: offset.x,
              top: offset.y,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Zoom</span>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={onZoomChange} style={{ flex: 1 }} />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button onClick={onCancel} disabled={saving} style={{
            background: 'none', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 8,
            padding: '9px 20px', fontSize: 14, color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !imgSize} style={{
            background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', border: 'none', borderRadius: 8,
            padding: '9px 20px', fontSize: 14, fontWeight: 500, color: '#fff', cursor: 'pointer',
            opacity: saving ? 0.6 : 1,
          }}>{saving ? 'Saving...' : 'Save cover'}</button>
        </div>
      </div>
    </div>
  )
}
