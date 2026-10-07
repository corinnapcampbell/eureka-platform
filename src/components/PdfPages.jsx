import { useState, useEffect, useRef } from 'react'

export default function PdfPages({ url, name }) {
  const [totalPages, setTotalPages] = useState(0)
  const [shown, setShown] = useState(20)
  const [status, setStatus] = useState('loading')
  const containerRef = useRef(null)
  const docRef = useRef(null)
  const renderedRef = useRef(0)
  const cancelRef = useRef(false)

  useEffect(() => {
    if (!url) return
    cancelRef.current = false
    renderedRef.current = 0

    async function load() {
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
        const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default
        const doc = await pdfjs.getDocument({ url }).promise
        if (cancelRef.current) { doc.destroy(); return }
        docRef.current = doc
        setTotalPages(doc.numPages)
        setStatus('ready')
      } catch (e) {
        if (!cancelRef.current) setStatus('error')
      }
    }

    load()

    return () => {
      cancelRef.current = true
      if (docRef.current) { docRef.current.destroy(); docRef.current = null }
    }
  }, [url])

  useEffect(() => {
    if (status !== 'ready' || !docRef.current || !containerRef.current) return
    const doc = docRef.current
    const container = containerRef.current
    const containerWidth = container.offsetWidth || 600
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const from = renderedRef.current + 1
    const to = Math.min(shown, totalPages)
    if (from > to) return

    async function renderRange() {
      for (let i = from; i <= to; i++) {
        if (cancelRef.current) return
        try {
          const page = await doc.getPage(i)
          if (cancelRef.current) return
          const baseViewport = page.getViewport({ scale: 1 })
          const scale = (containerWidth / baseViewport.width) * dpr
          const viewport = page.getViewport({ scale })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = '100%'
          canvas.style.height = 'auto'
          canvas.style.display = 'block'
          canvas.style.marginBottom = '8px'
          canvas.style.borderRadius = '6px'
          canvas.style.background = '#fff'
          container.appendChild(canvas)
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
          renderedRef.current = i
        } catch (e) {
          renderedRef.current = i
        }
      }
    }

    renderRange()
  }, [status, shown, totalPages])

  if (status === 'loading') return (
    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 0.75rem' }}>Loading document…</p>
  )

  if (status === 'error') return (
    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 0.75rem' }}>This document couldn't be displayed on this device.</p>
  )

  return (
    <div>
      <div
        ref={containerRef}
        onContextMenu={e => e.preventDefault()}
        style={{ width: '100%', marginBottom: '0.5rem' }}
      />
      {totalPages > shown && (
        <button
          onClick={() => setShown(s => s + 20)}
          style={{ fontSize: 13, color: '#7b9ff7', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: '0.75rem' }}
        >Show more pages</button>
      )}
    </div>
  )
}
