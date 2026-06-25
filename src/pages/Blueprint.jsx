import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// ── Styles ────────────────────────────────────────
const s = {
  wrap: { minHeight: '100vh', background: '#0e0e1f', color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 300 },
  inner: { maxWidth: 780, margin: '0 auto', padding: '2rem 1.5rem 4rem' },
  header: { marginBottom: '2rem' },
  backBtn: { padding: '8px 16px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.15)', background: 'transparent', fontSize: 13, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', marginBottom: '1.5rem' },
  title: { fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 },
  ideaName: { fontSize: 22, fontWeight: 300, color: '#fff', marginBottom: 6 },
  ideaSub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 },
  chatWrap: { display: 'flex', flexDirection: 'column', gap: 0 },
  msgWrap: (role) => ({
    display: 'flex',
    justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
    marginBottom: '1rem',
  }),
  bubble: (role) => ({
    maxWidth: '78%',
    padding: '12px 16px',
    borderRadius: role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    background: role === 'user' ? 'linear-gradient(90deg,#7b9ff7,#9b7ff7)' : 'rgba(255,255,255,0.06)',
    border: role === 'user' ? 'none' : '0.5px solid rgba(255,255,255,0.1)',
    fontSize: 14,
    lineHeight: 1.6,
    color: '#fff',
    whiteSpace: 'pre-wrap',
  }),
  inputRow: { display: 'flex', gap: 10, marginTop: '1.5rem', alignItems: 'flex-end' },
  textarea: { flex: 1, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 300, resize: 'none', outline: 'none', lineHeight: 1.5, minHeight: 48, maxHeight: 140 },
  sendBtn: { padding: '12px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', fontSize: 14, color: '#fff', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', flexShrink: 0 },
  sendBtnDisabled: { padding: '12px 20px', borderRadius: 12, border: 'none', background: 'rgba(123,159,247,0.3)', fontSize: 14, color: 'rgba(255,255,255,0.4)', cursor: 'not-allowed', fontFamily: 'Outfit, sans-serif', flexShrink: 0 },
  typingDot: { display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#7b9ff7', margin: '0 2px', animation: 'bounce 1s infinite' },
  viewerWrap: { background: '#0d1b3e', borderRadius: 14, overflow: 'hidden', marginTop: '2rem', position: 'relative' },
  viewerCanvas: { width: '100%', display: 'block' },
  viewerControls: { display: 'flex', gap: 8, padding: '12px 16px', flexWrap: 'wrap', borderTop: '0.5px solid rgba(255,255,255,0.08)' },
  viewBtn: { padding: '5px 12px', background: 'rgba(123,159,247,0.12)', border: '0.5px solid rgba(123,159,247,0.3)', borderRadius: 6, color: '#7b9ff7', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' },
  saveRow: { display: 'flex', alignItems: 'center', gap: 12, marginTop: '1.5rem' },
  saveBtn: { padding: '9px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', fontSize: 14, color: '#fff', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' },
  savedTxt: { fontSize: 13, color: '#7b9ff7' },
  continueBtn: { padding: '9px 22px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.15)', background: 'transparent', fontSize: 14, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' },
}

// ── Three.js Vase Viewer ─────────────────────────
function VaseViewer({ config }) {
  console.log('VaseViewer mounted, config:', config)
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !config) return
    if (typeof window.THREE === 'undefined') {
      console.error('THREE not loaded')
      return
    }
    const THREE = window.THREE
    console.log('THREE loaded, starting scene init')
    try {

    const canvas = canvasRef.current
    canvas.width = 700
    canvas.height = 420

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setSize(700, 420)
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setClearColor(0x0d1b3e, 1)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0d1b3e)

    const camera = new THREE.PerspectiveCamera(45, 700/420, 0.1, 100)
    camera.position.set(0, 2, 5)
    camera.lookAt(0, 1.5, 0)

    scene.add(new THREE.AmbientLight(0x1a3060, 1.5))
    const key = new THREE.DirectionalLight(0x7eb8f7, 2)
    key.position.set(3, 5, 3); scene.add(key)
    const fill = new THREE.DirectionalLight(0xa8d4f5, 1)
    fill.position.set(-3, 2, 2); scene.add(fill)
    scene.add(new THREE.GridHelper(8, 20, 0x1a3050, 0x0f1e35))

    // Build profile from config
    const pts = (config.profile_points || [
      [0.38, 0.00], [0.40, 0.04], [0.36, 0.10],
      [0.24, 0.20], [0.22, 0.30], [0.30, 0.45],
      [0.55, 0.65], [0.82, 0.88], [1.00, 1.05],
      [1.10, 1.30], [1.08, 1.55], [0.95, 1.80],
      [0.75, 2.05], [0.55, 2.25], [0.34, 2.52],
      [0.25, 2.68], [0.24, 2.82], [0.27, 2.92],
      [0.36, 3.02], [0.52, 3.10], [0.58, 3.16], [0.56, 3.22],
    ]).map(([r, y]) => new THREE.Vector2(r, y))

    const lathe = new THREE.LatheGeometry(pts, 64)
    const mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(config.color_primary || '#141c2e'),
      emissive: 0x080e1a,
      specular: new THREE.Color(config.color_accent || '#7eb8f7'),
      shininess: 80,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    })
    scene.add(new THREE.Mesh(lathe, mat))

    // Wireframe
    const wire = new THREE.Mesh(lathe, new THREE.MeshBasicMaterial({ color: 0x7eb8f7, wireframe: true, transparent: true, opacity: 0.18 }))
    scene.add(wire)

    // Edge lines
    scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(lathe, 15), new THREE.LineBasicMaterial({ color: 0x7eb8f7 })))

    // Mechanism indicator ring
    if (config.mechanism) {
      const pos = config.mechanism.position_from_bottom || 0.25
      const totalH = pts[pts.length-1].y
      const yPos = pos * totalH
      // Find approximate radius at that height
      let mechR = 0.5
      for (let i = 0; i < pts.length - 1; i++) {
        if (pts[i].y <= yPos && pts[i+1].y >= yPos) {
          const t = (yPos - pts[i].y) / (pts[i+1].y - pts[i].y)
          mechR = pts[i].x + t * (pts[i+1].x - pts[i].x)
        }
      }
      const ringGeo = new THREE.TorusGeometry(mechR * 0.85, 0.025, 8, 48)
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xa8d4f5 })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.position.y = yPos
      ring.rotation.x = Math.PI / 2
      scene.add(ring)

      // Glow ring
      const glow = new THREE.Mesh(
        new THREE.TorusGeometry(mechR * 0.85, 0.008, 4, 48),
        new THREE.MeshBasicMaterial({ color: 0x4a8fd4, transparent: true, opacity: 0.5 })
      )
      glow.position.y = yPos
      glow.rotation.x = Math.PI / 2
      scene.add(glow)
    }

    // Orbit controls
    let drag = false, prev = { x:0, y:0 }
    let sph = { theta: 0.4, phi: 1.2, r: 5 }
    let autoRot = true

    function updCam() {
      camera.position.set(
        sph.r * Math.sin(sph.phi) * Math.sin(sph.theta),
        sph.r * Math.cos(sph.phi) + 1.5,
        sph.r * Math.sin(sph.phi) * Math.cos(sph.theta)
      )
      camera.lookAt(0, 1.5, 0)
    }
    updCam()

    canvas.addEventListener('mousedown', e => { drag=true; prev={x:e.clientX,y:e.clientY}; autoRot=false; })
    window.addEventListener('mouseup', () => drag=false)
    window.addEventListener('mousemove', e => {
      if (!drag) return
      sph.theta -= (e.clientX-prev.x)*0.01
      sph.phi = Math.max(0.1, Math.min(Math.PI-0.1, sph.phi+(e.clientY-prev.y)*0.01))
      prev={x:e.clientX,y:e.clientY}; updCam()
    })
    canvas.addEventListener('wheel', e => { sph.r=Math.max(2,Math.min(10,sph.r+e.deltaY*0.01)); updCam() })

    canvas.addEventListener('touchstart', e => { drag=true; prev={x:e.touches[0].clientX,y:e.touches[0].clientY}; autoRot=false; })
    window.addEventListener('touchend', () => drag=false)
    window.addEventListener('touchmove', e => {
      if (!drag) return
      sph.theta -= (e.touches[0].clientX-prev.x)*0.01
      sph.phi = Math.max(0.1,Math.min(Math.PI-0.1,sph.phi+(e.touches[0].clientY-prev.y)*0.01))
      prev={x:e.touches[0].clientX,y:e.touches[0].clientY}; updCam()
    })

    // View buttons
    window._blueprintSetView = (v) => {
      if (v==='front') { sph.theta=0; sph.phi=1.2; sph.r=5 }
      if (v==='top') { sph.theta=0; sph.phi=0.1; sph.r=5 }
      if (v==='side') { sph.theta=Math.PI/2; sph.phi=1.2; sph.r=5 }
      autoRot=false; updCam()
    }

    let animId
    function loop() {
      animId = requestAnimationFrame(loop)
      if (autoRot) { sph.theta+=0.004; updCam() }
      renderer.render(scene, camera)
    }
    loop()
    sceneRef.current = { renderer, animId }

    } catch(err) {
      console.error('THREE scene error:', err)
    }
    return () => {
      cancelAnimationFrame(animId)
      renderer.dispose()
      window.removeEventListener('mouseup', () => drag=false)
      window.removeEventListener('mousemove', () => {})
    }
  }, [config])

  return (
    <div style={s.viewerWrap}>
      <canvas ref={canvasRef} style={s.viewerCanvas} />
      <div style={s.viewerControls}>
        <button style={s.viewBtn} onClick={() => window._blueprintSetView?.('front')}>Front</button>
        <button style={s.viewBtn} onClick={() => window._blueprintSetView?.('top')}>Top</button>
        <button style={s.viewBtn} onClick={() => window._blueprintSetView?.('side')}>Side</button>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto', fontFamily: 'monospace' }}>
          {config?.mechanism?.description || ''} · Drag to rotate · Scroll to zoom
        </span>
      </div>
    </div>
  )
}

// ── Main Blueprint page ──────────────────────────
export default function Blueprint({ session }) {
  const { ideaId } = useParams()
  const navigate = useNavigate()
  const [ideaData, setIdeaData] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [blueprintConfig, setBlueprintConfig] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [threeLoaded, setThreeLoaded] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  // Load Three.js
  useEffect(() => {
    if (window.THREE) { setThreeLoaded(true); return }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
    script.onload = () => setThreeLoaded(true)
    document.head.appendChild(script)
  }, [])

  // Load idea data and existing blueprint
  useEffect(() => {
    if (!ideaId) return
    supabase.from('ideas').select('title,tagline,problem,solution,how_it_works,category,blueprint_2d').eq('id', ideaId).single().then(({ data }) => {
      if (!data) return
      setIdeaData(data)
      // If existing blueprint conversation, restore it
      if (data.blueprint_2d?.messages) {
        setMessages(data.blueprint_2d.messages)
        if (data.blueprint_2d.messages.length > 0) setStarted(true)
      }
      if (data.blueprint_2d?.config) {
        setBlueprintConfig(data.blueprint_2d.config)
      }
    })
  }, [ideaId])

  const [started, setStarted] = useState(false)

  function startBlueprint() {
    setStarted(true)
    const firstMsg = `I want to create a blueprint for my product idea. Here is what I have so far:

Name: ${ideaData.title || ''}
Tagline: ${ideaData.tagline || ''}
Problem: ${ideaData.problem || ''}
Solution: ${ideaData.solution || ''}
How it works: ${ideaData.how_it_works || ''}

Please start asking me questions to understand the product better so you can generate a 3D blueprint.`
    sendMessage(firstMsg)
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(userText) {
    if (loading) return
    const newMessages = userText
      ? [...messages, { role: 'user', content: userText }]
      : messages

    if (userText) setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blueprint-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.access_token}` },
        body: JSON.stringify({ messages: newMessages, ideaData: ideaData || {} }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)

      const updated = json.text && json.text.trim()
        ? [...newMessages, { role: 'assistant', content: json.text }]
        : newMessages
      if (json.text && json.text.trim()) setMessages(updated)
      else setMessages(newMessages)

      if (json.blueprintConfig) {
        setBlueprintConfig(json.blueprintConfig)
        // Auto-save
        await supabase.from('ideas').update({
          blueprint_2d: { messages: updated, config: json.blueprintConfig }
        }).eq('id', ideaId)
      }
    } catch(e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong — please try again.' }])
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('ideas').update({
      blueprint_2d: { messages, config: blueprintConfig }
    }).eq('id', ideaId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim()) sendMessage(input.trim())
    }
  }

  return (
    <div style={s.wrap}>
      <style>{`
        @keyframes bounce {
          0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)}
        }
        .dot1{animation-delay:0s} .dot2{animation-delay:0.15s} .dot3{animation-delay:0.3s}
      `}</style>
      <div style={s.inner}>
        <button style={s.backBtn} onClick={() => navigate(`/idea/${ideaId}`)}>← Back to idea</button>

        {ideaData && (
          <div style={s.header}>
            <div style={s.title}>Blueprint</div>
            <div style={s.ideaName}>{ideaData.title}</div>
            {ideaData.tagline && <div style={s.ideaSub}>{ideaData.tagline}</div>}
          </div>
        )}

        {/* 3D Viewer — shows once config is ready */}
        {blueprintConfig && (threeLoaded || typeof window.THREE !== 'undefined') && (console.log('Rendering VaseViewer, blueprintConfig:', blueprintConfig), true) && (
          <>
            <VaseViewer config={blueprintConfig} />
            <div style={s.saveRow}>
              <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save blueprint'}
              </button>
              {saved && <span style={s.savedTxt}>Saved ✓</span>}
              <button style={s.continueBtn} onClick={() => setBlueprintConfig(null)}>
                Continue refining →
              </button>
            </div>
          </>
        )}

        {/* Start button — shown before conversation begins */}
        {!started && messages.length === 0 && ideaData && (
          <div style={{ textAlign: 'center', padding: '3rem 0 2rem' }}>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Our AI will ask you questions about your product one at a time<br/>to understand its shape, mechanism, and function — then generate a 3D model.
            </div>
            <button
              onClick={startBlueprint}
              style={{ padding: '14px 36px', borderRadius: 12, border: 'none', background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', fontSize: 16, fontWeight: 400, color: '#fff', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}
            >
              Create Blueprint →
            </button>
          </div>
        )}

        {/* Chat */}
        <div style={s.chatWrap}>
          {messages.map((msg, i) => (
            <div key={i} style={s.msgWrap(msg.role)}>
              <div style={s.bubble(msg.role)}>{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div style={s.msgWrap('assistant')}>
              <div style={s.bubble('assistant')}>
                <span style={s.typingDot} className="dot1"/>
                <span style={s.typingDot} className="dot2"/>
                <span style={s.typingDot} className="dot3"/>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={s.inputRow}>
          <textarea
            ref={textareaRef}
            style={s.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Answer the question or ask anything..."
            rows={1}
          />
          <button
            style={input.trim() && !loading ? s.sendBtn : s.sendBtnDisabled}
            onClick={() => input.trim() && !loading && sendMessage(input.trim())}
            disabled={!input.trim() || loading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
