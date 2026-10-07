import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ImageMosaic, ImageViewer } from '../components/WorkImages'
import Logo from '../components/Logo'

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/work-access`
const HEADERS = { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

export default function SharedWork() {
  const { token } = useParams()
  const [phase, setPhase] = useState('loading')
  const [coverData, setCoverData] = useState(null)
  const [passedCode, setPassedCode] = useState('')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [checking, setChecking] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [ndaAgreed, setNdaAgreed] = useState(false)
  const [ndaExpanded, setNdaExpanded] = useState(false)
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState('')
  const [work, setWork] = useState(null)
  const [files, setFiles] = useState([])
  const [fileUrls, setFileUrls] = useState({})
  const [viewerIndex, setViewerIndex] = useState(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(`work_session_${token}`)
    if (stored) {
      callRefresh(stored)
    } else {
      callCover()
    }
  }, [token])

  async function callCover() {
    const res = await fetch(FN, { method: 'POST', headers: HEADERS, body: JSON.stringify({ action: 'cover', token }) })
    const data = await res.json()
    if (!res.ok) { setPhase('invalid'); return }
    setCoverData(data)
    if (!data.code_required && !data.nda_required) {
      await callOpen({ cd: data })
    } else if (data.code_required) {
      setPhase('code')
    } else {
      setPhase('nda')
    }
  }

  async function callRefresh(sessionToken) {
    const res = await fetch(FN, { method: 'POST', headers: HEADERS, body: JSON.stringify({ action: 'refresh', token, session: sessionToken }) })
    const data = await res.json()
    if (!res.ok) {
      sessionStorage.removeItem(`work_session_${token}`)
      callCover()
      return
    }
    processContent(data)
  }

  async function handleCheck() {
    setChecking(true)
    setCodeError('')
    const res = await fetch(FN, { method: 'POST', headers: HEADERS, body: JSON.stringify({ action: 'check', token, code }) })
    const data = await res.json()
    setChecking(false)
    if (res.status === 429 || data.error === 'locked') { setCodeError('Too many attempts. Try again in 15 minutes.'); return }
    if (!res.ok) { setCodeError("That code isn't valid or has no openings left."); return }
    setPassedCode(code)
    if (coverData?.nda_required) {
      setPhase('nda')
    } else {
      await callOpen({ c: code })
    }
  }

  async function handleOpen() {
    await callOpen({ c: passedCode })
  }

  async function callOpen({ c, cd } = {}) {
    setOpening(true)
    setOpenError('')
    const b = { action: 'open', token }
    const useCode = c ?? passedCode
    if (useCode) b.code = useCode
    if (name) b.name = name
    if (email) b.email = email
    if (ndaAgreed) b.nda_agreed = true
    const res = await fetch(FN, { method: 'POST', headers: HEADERS, body: JSON.stringify(b) })
    const data = await res.json()
    setOpening(false)
    if (!res.ok) {
      const err = data.error
      const isCodeErr = err === 'invalid_code' || err === 'code_required'
      const isLockout = err === 'locked' || res.status === 429
      const msg = isCodeErr ? "That code isn't valid or has no openings left."
        : isLockout ? 'Too many attempts. Try again in 15 minutes.'
        : err === 'nda_required' ? 'Please fill in your name, a valid email, and accept the NDA.'
        : 'Something went wrong. Please try again.'
      const cdArg = cd ?? coverData
      if ((isCodeErr || isLockout) && cdArg?.code_required) { setCodeError(msg); setPassedCode(''); setPhase('code') }
      else { setOpenError(msg) }
      return
    }
    sessionStorage.setItem(`work_session_${token}`, data.session)
    processContent(data)
  }

  function processContent(data) {
    setWork(data.work)
    const f = data.files || []
    setFiles(f)
    const urlMap = {}
    f.forEach(x => { urlMap[x.id] = x.url })
    setFileUrls(urlMap)
    setPhase('content')
  }

  const imageFiles = files.filter(f => f.mime_type?.startsWith('image/')).map(f => ({ ...f, storage_path: f.id }))
  const videoFiles = files.filter(f => f.mime_type?.startsWith('video/'))
  const audioFiles = files.filter(f => f.mime_type?.startsWith('audio/'))
  const otherFiles = files.filter(f => !f.mime_type?.startsWith('image/') && !f.mime_type?.startsWith('video/') && !f.mime_type?.startsWith('audio/'))

  if (phase === 'loading') return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0e1f' }}>
      <div className="spinner" />
    </div>
  )

  if (phase === 'invalid') return (
    <div style={{ minHeight: '100vh', background: '#0e0e1f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)' }} />
      <Logo size={24} variant="dark" />
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', margin: 0 }}>This link is not available.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e1f', position: 'relative' }}>
      <div style={{ height: 3, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)' }} />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.25rem 4rem', width: '100%', boxSizing: 'border-box' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Logo size={24} variant="dark" />
        </div>

        {/* Cover image */}
        {(coverData?.cover_url || work?.cover_url) && (
          <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: '1.5rem' }}>
            <img
              src={work?.cover_url || coverData.cover_url}
              alt="cover"
              style={{ width: '100%', aspectRatio: '2 / 1', objectFit: 'cover', display: 'block' }}
              onContextMenu={work && !work.allow_download ? e => e.preventDefault() : undefined}
            />
          </div>
        )}

        {/* Title */}
        {(coverData?.title || work?.title) && (
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(22px, 5vw, 38px)', color: '#fff', margin: '0 0 0.75rem', lineHeight: 1.2, wordBreak: 'break-word' }}>
            {work?.title || coverData.title}
          </h1>
        )}

        {/* Code gate */}
        {phase === 'code' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.75rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '0.5px solid rgba(44,44,42,0.08)', marginTop: '1.5rem' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', margin: '0 0 1rem' }}>Enter access code to continue</p>
            <input
              type="text"
              placeholder="Access code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && code.length >= 1 && handleCheck()}
              style={{ width: '100%', border: '0.5px solid rgba(44,44,42,0.2)', borderRadius: 10, padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.05em' }}
            />
            {codeError && <p style={{ color: '#e24b4a', fontSize: 12, margin: '-0.25rem 0 0.75rem' }}>{codeError}</p>}
            <button
              onClick={handleCheck}
              disabled={!code.trim() || checking}
              style={{
                width: '100%', background: code.trim() ? 'linear-gradient(90deg, #7b9ff7, #9b7ff7)' : 'rgba(44,44,42,0.1)',
                border: 'none', borderRadius: 12, padding: '14px',
                fontSize: 15, fontWeight: 600,
                color: code.trim() ? '#fff' : 'rgba(44,44,42,0.3)',
                cursor: code.trim() && !checking ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >{checking ? 'Checking...' : 'Continue'}</button>
          </div>
        )}

        {/* NDA gate */}
        {phase === 'nda' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.75rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '0.5px solid rgba(44,44,42,0.08)', marginTop: '1.5rem' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', margin: '0 0 1.25rem' }}>Sign NDA to view this work</p>

            <input
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ width: '100%', border: '0.5px solid rgba(44,44,42,0.2)', borderRadius: 10, padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem', fontFamily: 'Outfit, sans-serif' }}
            />
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', border: '0.5px solid rgba(44,44,42,0.2)', borderRadius: 10, padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem', fontFamily: 'Outfit, sans-serif' }}
            />
            {email && !isValidEmail(email) && (
              <p style={{ color: '#e24b4a', fontSize: 12, margin: '-0.5rem 0 0.75rem' }}>Please enter a valid email address.</p>
            )}

            <div style={{ marginBottom: '1rem', border: '0.5px solid rgba(44,44,42,0.12)', borderRadius: 10, overflow: 'hidden' }}>
              <div
                onClick={() => setNdaExpanded(v => !v)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', background: 'rgba(44,44,42,0.02)' }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: '#2c2c2a' }}>📄 View NDA contents</span>
                <span style={{ fontSize: 12, color: '#888', display: 'inline-block', transition: 'transform 0.2s', transform: ndaExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
              </div>
              {ndaExpanded && (
                <div style={{ padding: '1rem 1.25rem', borderTop: '0.5px solid rgba(44,44,42,0.08)', background: '#fafaf8' }}>
                  <p style={{ fontSize: 12, color: '#555', lineHeight: 1.7, margin: '0 0 0.75rem' }}>By signing this NDA you agree to:</p>
                  {[
                    'Hold all shared information in strict confidence',
                    'Not disclose any content to third parties without written consent',
                    'Use the information only to evaluate a potential business relationship',
                    'Not copy, reproduce, or distribute the content in any form',
                    'These obligations last for 5 years from the date of signing',
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <span style={{ color: '#7b9ff7', fontSize: 12, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>{item}</span>
                    </div>
                  ))}
                  <a href="/legal/nda" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#7b9ff7', textDecoration: 'underline', display: 'inline-block', marginTop: '0.5rem' }}>Read full NDA →</a>
                </div>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '1.25rem', cursor: 'pointer' }}>
              <div
                onClick={() => setNdaAgreed(v => !v)}
                style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                  background: ndaAgreed ? 'linear-gradient(135deg, #7b9ff7, #9b7ff7)' : '#fff',
                  border: ndaAgreed ? 'none' : '1.5px solid rgba(44,44,42,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s', cursor: 'pointer',
                }}
              >
                {ndaAgreed && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                I have read and agree to the <a href="/legal/nda" target="_blank" rel="noopener noreferrer" style={{ color: '#7b9ff7', textDecoration: 'underline' }}>Non-Disclosure Agreement</a>. I understand my identity and access time will be logged and I am bound by its terms.
              </span>
            </label>

            {openError && <p style={{ color: '#e24b4a', fontSize: 12, margin: '-0.25rem 0 0.75rem' }}>{openError}</p>}

            <button
              onClick={handleOpen}
              disabled={!name.trim() || !email || !isValidEmail(email) || !ndaAgreed || opening}
              style={{
                width: '100%',
                background: name.trim() && email && isValidEmail(email) && ndaAgreed ? 'linear-gradient(90deg, #7b9ff7, #9b7ff7)' : 'rgba(44,44,42,0.1)',
                border: 'none', borderRadius: 12, padding: '14px',
                fontSize: 15, fontWeight: 600,
                color: name.trim() && email && isValidEmail(email) && ndaAgreed ? '#fff' : 'rgba(44,44,42,0.3)',
                cursor: name.trim() && email && isValidEmail(email) && ndaAgreed && !opening ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >{opening ? 'Logging access...' : '✍️ Sign & View Work'}</button>
          </div>
        )}

        {/* Content */}
        {phase === 'content' && work && (
          <div>
            {work.description && (
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: '0 0 2rem' }}>{work.description}</p>
            )}

            {imageFiles.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <ImageMosaic images={imageFiles} urls={fileUrls} onOpen={setViewerIndex} />
              </div>
            )}

            {videoFiles.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' }}>Video</p>
                {videoFiles.map(f => (
                  <div key={f.id} style={{ marginBottom: '1rem' }}>
                    <video
                      src={f.url}
                      controls
                      controlsList={work.allow_download ? undefined : 'nodownload'}
                      onContextMenu={work.allow_download ? undefined : e => e.preventDefault()}
                      style={{ width: '100%', borderRadius: 8 }}
                    />
                    {f.caption && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: '6px 0 0' }}>{f.caption}</p>}
                  </div>
                ))}
              </div>
            )}

            {audioFiles.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' }}>Audio</p>
                {audioFiles.map(f => (
                  <div key={f.id} style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '1rem' }}>
                    <audio
                      src={f.url}
                      controls
                      controlsList={work.allow_download ? undefined : 'nodownload'}
                      onContextMenu={work.allow_download ? undefined : e => e.preventDefault()}
                      style={{ width: '100%' }}
                    />
                    {f.caption && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: '8px 0 0' }}>{f.caption}</p>}
                  </div>
                ))}
              </div>
            )}

            {otherFiles.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' }}>Files</p>
                {otherFiles.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 16px', marginBottom: '0.5rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                      {f.caption && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>{f.caption}</p>}
                    </div>
                    {work.allow_download && f.url && (
                      <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#7b9ff7', textDecoration: 'none', flexShrink: 0, marginLeft: 12 }}>Open</a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {viewerIndex !== null && imageFiles.length > 0 && (
        <ImageViewer
          images={imageFiles}
          urls={fileUrls}
          index={Math.min(viewerIndex, imageFiles.length - 1)}
          onIndex={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  )
}
