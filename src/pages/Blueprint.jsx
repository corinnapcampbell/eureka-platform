import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const SECTIONS = [
  { id: 'form', label: 'Form & shape' },
  { id: 'anatomy', label: 'Anatomy & parts' },
  { id: 'mechanism', label: 'Mechanism' },
  { id: 'interaction', label: 'User interaction' },
  { id: 'materials', label: 'Materials & finish' },
  { id: 'context', label: 'Context & purpose' },
]

const TITLES = [
  ['Shape & form', 'Describe the outer appearance — what it looks like from the outside'],
  ['Anatomy & parts', 'Break it down into its components, visible and hidden'],
  ['Mechanism & function', 'Explain how it works — even a rough guess is fine'],
  ['How it\'s used', 'Walk through the user interaction step by step'],
  ['Materials & finish', 'What is it made of, how does it feel and look up close'],
  ['Context & purpose', 'Who uses it, where, and what makes it special'],
]

const EMPTY_ANSWERS = {
  product_name: '', product_summary: '', primary_shape: '', secondary_shapes: [],
  size_ref: '', size_custom: '', proportions: '', silhouette_notes: '',
  part_count: '', parts_named: [''], has_internal: '', internal_desc: '',
  symmetry: '', interior_view: '',
  mechanism_type: '', mechanism_plain: '', mechanism_idk: false,
  trigger: '', moving_parts: '', energy_source: '', internal_layout: '',
  interaction_primary: [], grip_style: '', use_steps: ['', ''], use_position: '', feedback_type: [],
  materials_outer: [], materials_inner: '', finish: [], color_intent: '', weight_feel: '', tactile_notes: '',
  problem_solved: '', existing_similar: '', differentiator: '', user_type: '', use_environment: [], emotional_intent: '',
}

const s = {
  wrap: { minHeight: '100vh', background: '#0e0e1f', color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 300 },
  inner: { maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem 4rem' },
  progress: { height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginBottom: '2rem' },
  progressFill: (pct) => ({ height: 3, background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', borderRadius: 2, width: pct + '%', transition: 'width 0.4s' }),
  tabs: { display: 'flex', gap: 6, marginBottom: '2rem', flexWrap: 'wrap' },
  tab: (active, done) => ({
    padding: '5px 14px', borderRadius: 100, fontSize: 12, cursor: 'default',
    border: active ? 'none' : '0.5px solid rgba(255,255,255,0.15)',
    background: active ? 'linear-gradient(90deg,#7b9ff7,#9b7ff7)' : done ? 'rgba(123,159,247,0.1)' : 'transparent',
    color: active ? '#fff' : done ? '#7b9ff7' : 'rgba(255,255,255,0.4)',
  }),
  sectionLabel: { fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '0.35rem' },
  sectionTitle: { fontSize: 22, fontWeight: 300, color: '#fff', marginBottom: '0.25rem' },
  sectionSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', lineHeight: 1.6 },
  qBlock: { marginBottom: '1.75rem' },
  qLabel: { fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.85)', marginBottom: '0.4rem', display: 'block' },
  qHint: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: '0.5rem', display: 'block', lineHeight: 1.5 },
  input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 300, outline: 'none' },
  textarea: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#fff', fontFamily: 'Outfit, sans-serif', fontWeight: 300, resize: 'vertical', minHeight: 80, lineHeight: 1.5, outline: 'none' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: (on) => ({ padding: '6px 14px', borderRadius: 100, fontSize: 13, cursor: 'pointer', userSelect: 'none', border: on ? 'none' : '0.5px solid rgba(255,255,255,0.15)', background: on ? 'linear-gradient(90deg,#7b9ff7,#9b7ff7)' : 'transparent', color: on ? '#fff' : 'rgba(255,255,255,0.5)' }),
  navRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '0.5px solid rgba(255,255,255,0.08)' },
  btnBack: { padding: '9px 20px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.15)', background: 'transparent', fontSize: 14, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' },
  btnNext: { padding: '9px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', fontSize: 14, fontWeight: 400, color: '#fff', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' },
  btnGen: { padding: '10px 28px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', fontSize: 15, fontWeight: 400, color: '#fff', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' },
  addBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '0.5px dashed rgba(255,255,255,0.2)', background: 'transparent', fontSize: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', marginTop: 6 },
  partRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  rmBtn: { width: 22, height: 22, borderRadius: '50%', border: '0.5px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  stepNum: { width: 24, height: 24, borderRadius: '50%', background: 'rgba(123,159,247,0.15)', color: '#7b9ff7', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  idkBtn: (on) => ({ padding: '5px 12px', borderRadius: 100, border: '0.5px dashed rgba(255,255,255,0.2)', background: on ? 'rgba(123,159,247,0.1)' : 'transparent', fontSize: 12, color: on ? '#7b9ff7' : 'rgba(255,255,255,0.35)', cursor: 'pointer', marginTop: 8 }),
  errorBox: { background: 'rgba(220,53,69,0.1)', border: '0.5px solid rgba(220,53,69,0.4)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff6b7a', marginTop: 12 },
  bpWrap: { background: '#0d1b3e', borderRadius: 12, padding: '1.5rem', position: 'relative', overflow: 'hidden' },
  regenRow: { display: 'flex', alignItems: 'center', gap: 12, marginTop: '1.5rem', flexWrap: 'wrap' },
  regenCount: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  toolBar: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  toolBtn: (on) => ({ padding: '6px 14px', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.15)', background: on ? 'rgba(123,159,247,0.2)' : 'rgba(255,255,255,0.04)', fontSize: 12, color: on ? '#7b9ff7' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }),
  saveBtn: { padding: '7px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', fontSize: 13, color: '#fff', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' },
}

// ── Chips helpers ──────────────────────────────────────────────
function Chips({ k, opts, multi, answers, setAnswers }) {
  function toggle(val) {
    if (multi) {
      const arr = answers[k] || []
      const i = arr.indexOf(val)
      setAnswers(a => ({ ...a, [k]: i > -1 ? arr.filter(x => x !== val) : [...arr, val] }))
    } else {
      setAnswers(a => ({ ...a, [k]: a[k] === val ? '' : val }))
    }
  }
  return (
    <div style={s.chips}>
      {opts.map(o => {
        const on = multi ? (answers[k] || []).includes(o) : answers[k] === o
        return <span key={o} style={s.chip(on)} onClick={() => toggle(o)}>{o}</span>
      })}
    </div>
  )
}

function Field({ k, answers, setAnswers, placeholder, area, hint }) {
  return (
    <>
      {hint && <span style={s.qHint}>{hint}</span>}
      {area
        ? <textarea style={s.textarea} placeholder={placeholder} defaultValue={answers[k]} onBlur={e => setAnswers(a => ({ ...a, [k]: e.target.value }))} />
        : <input style={s.input} type="text" placeholder={placeholder} defaultValue={answers[k]} onBlur={e => setAnswers(a => ({ ...a, [k]: e.target.value }))} />
      }
    </>
  )
}

// ── Questionnaire sections ─────────────────────────────────────
function Sec0({ answers, setAnswers }) {
  return (
    <>
      <div style={s.qBlock}>
        <label style={s.qLabel}>What is your product called?</label>
        <Field k="product_name" answers={answers} setAnswers={setAnswers} placeholder="e.g. FlowVase, StemCutter Pro..." />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Describe your product in 1–2 sentences — what it is and what it does</label>
        <Field k="product_summary" answers={answers} setAnswers={setAnswers} area hint="Imagine describing it to someone who cannot see it at all" placeholder='e.g. "A glass vase with a rotating mechanism in its base that cuts flower stems when you twist it"' />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>What is the primary shape?</label>
        <Chips k="primary_shape" opts={['Cylindrical / tube','Rectangular box','Sphere / oval','Cone / tapered','Flat / disc-like','L-shaped or angled','Ring or donut','Irregular / organic','Wearable — follows body shape','Other']} answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Secondary shapes or protrusions? <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 300 }}>(select all)</span></label>
        <Chips k="secondary_shapes" opts={['Handle or grip','Lid or cap','Spout or nozzle','Buttons or knobs','Fins or ridges','Legs or feet','Openings or slots','Transparent window','Recessed areas']} multi answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>How big is it?</label>
        <Chips k="size_ref" opts={['Coin / finger-sized','Palm-sized (like a phone)','Bottle or vase sized','Shoe-box sized','Backpack sized','Appliance sized','Furniture sized','Room scale']} answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Specific size details? <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional)</span></label>
        <Field k="size_custom" answers={answers} setAnswers={setAnswers} placeholder='e.g. "about 30cm tall, 12cm wide"' />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Overall proportions?</label>
        <Chips k="proportions" opts={['Tall and narrow','Short and wide','Roughly cube-like','Long and flat','Wide at top narrow at bottom','Wide at bottom narrow at top','Uniform all the way','Pinched in the middle']} answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Any other outer appearance details?</label>
        <Field k="silhouette_notes" answers={answers} setAnswers={setAnswers} area hint="Curves, transparent sections, visible seams, decorative elements" placeholder="e.g. clear glass top third, matte black base, chrome accent ring at the join..." />
      </div>
    </>
  )
}

function Sec1({ answers, setAnswers }) {
  function addPart() { setAnswers(a => ({ ...a, parts_named: [...a.parts_named, ''] })) }
  function setPart(i, v) { setAnswers(a => { const p = [...a.parts_named]; p[i] = v; return { ...a, parts_named: p } }) }
  function rmPart(i) { setAnswers(a => ({ ...a, parts_named: a.parts_named.filter((_, j) => j !== i) })) }
  return (
    <>
      <div style={s.qBlock}>
        <label style={s.qLabel}>How many distinct physical parts?</label>
        <span style={s.qHint}>If you disassembled it completely, how many separate pieces?</span>
        <Chips k="part_count" opts={['1 — single piece','2–3 parts','4–6 parts','7–10 parts','More than 10','I\'m not sure']} answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Name or describe the main parts</label>
        <span style={s.qHint}>Informal names are fine — "the twisty bottom bit" works perfectly</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {answers.parts_named.map((p, i) => (
            <div key={i} style={s.partRow}>
              <input style={{ ...s.input, flex: 1 }} type="text" placeholder="Part name or description..." defaultValue={p} onBlur={e => setPart(i, e.target.value)} />
              <button style={s.rmBtn} onClick={() => rmPart(i)}>×</button>
            </div>
          ))}
        </div>
        <button style={s.addBtn} onClick={addPart}>+ Add part</button>
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Hidden internal components not visible from outside?</label>
        <Chips k="has_internal" opts={['Yes — hidden internal parts','No — everything visible','I\'m not sure']} answers={answers} setAnswers={setAnswers} />
      </div>
      {answers.has_internal === 'Yes — hidden internal parts' && (
        <div style={s.qBlock}>
          <label style={s.qLabel}>Describe those internal parts</label>
          <Field k="internal_desc" answers={answers} setAnswers={setAnswers} area hint='Even a guess helps — e.g. "a spinning blade on a shaft inside the base"' placeholder="e.g. rotating blade at bottom, central shaft, spring mechanism..." />
        </div>
      )}
      <div style={s.qBlock}>
        <label style={s.qLabel}>Is the product symmetrical?</label>
        <Chips k="symmetry" opts={['Identical from all sides','Same front/back, different sides','Same sides, different front/back','Clear front and different back','Completely asymmetrical','I\'m not sure']} answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>What's inside if you open it or look inside?</label>
        <span style={s.qHint}>This helps show internal structure on the blueprint</span>
        <Chips k="interior_view" opts={['Completely hollow / empty','Hollow and holds contents (like a bottle)','Solid all the way through','Has a central shaft or column','Has nested layers or shells','Has separate chambers','Has visible mechanical parts inside','Sealed — cannot be opened']} answers={answers} setAnswers={setAnswers} />
      </div>
    </>
  )
}

function Sec2({ answers, setAnswers }) {
  return (
    <>
      <div style={s.qBlock}>
        <label style={s.qLabel}>What type of mechanism does it use?</label>
        <Chips k="mechanism_type" opts={['Rotation / spinning','Linear push or pull','Sliding / telescoping','Folding / hinging','Magnetic','Spring-loaded','Gravity-driven','Pneumatic','Electronic / motorized','No mechanism — passive','I\'m not sure']} answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Describe how it works in plain everyday language</label>
        <Field k="mechanism_plain" answers={answers} setAnswers={setAnswers} area hint='"When you do X, Y happens" — no technical knowledge needed' placeholder='e.g. "When you rotate the base, a blade inside spins and cuts the flower stems. Release and it stops."' />
        <button style={s.idkBtn(answers.mechanism_idk)} onClick={() => setAnswers(a => ({ ...a, mechanism_idk: !a.mechanism_idk }))}>
          I don't know — leave it to AI
        </button>
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>What triggers or activates the mechanism?</label>
        <Chips k="trigger" opts={['User applies direct force (twist, push, pull)','Button or switch','Automatic — weight or pressure','Timer','Sensor','Voice or app','Continuous while in use','Other']} answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>What parts move and how?</label>
        <Field k="moving_parts" answers={answers} setAnswers={setAnswers} area placeholder='e.g. "base rotates 360°, blade spins horizontally, glass body stays still"' />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>What powers the mechanism?</label>
        <Chips k="energy_source" opts={['Human force only','Battery / rechargeable','Plugged in','Solar','Compressed air','Spring / clockwork','Gravity','No power — passive']} answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>How are the internal parts arranged spatially?</label>
        <Field k="internal_layout" answers={answers} setAnswers={setAnswers} area hint="Think: if you could see through the walls, where is each component?" placeholder='e.g. "blade at the very bottom, shaft runs up the center, hollow glass section above"' />
      </div>
    </>
  )
}

function Sec3({ answers, setAnswers }) {
  function addStep() { if (answers.use_steps.length < 6) setAnswers(a => ({ ...a, use_steps: [...a.use_steps, ''] })) }
  function setStep(i, v) { setAnswers(a => { const st = [...a.use_steps]; st[i] = v; return { ...a, use_steps: st } }) }
  return (
    <>
      <div style={s.qBlock}>
        <label style={s.qLabel}>How does the user interact with it? <span style={{ color: 'rgba(255,255,255,0.3)' }}>(select all)</span></label>
        <Chips k="interaction_primary" opts={['Hold and rotate','Press down','Squeeze or pinch','Swipe or slide','Lift and carry','Place or set down','Pour into','Pull apart / snap together','Wear on body','Tap a button','App-controlled']} multi answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>How does the user hold or grip it?</label>
        <Chips k="grip_style" opts={['Full hand grip (like a bottle)','Fingertip pinch','Two hands required','Set on surface — not held','Worn on body','Clipped to something','Self-standing']} answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Walk through how someone uses it — one action per step</label>
        <span style={s.qHint}>Think of it like writing a recipe: step 1, step 2...</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {answers.use_steps.map((st, i) => (
            <div key={i} style={s.stepRow}>
              <div style={s.stepNum}>{i + 1}</div>
              <input style={{ ...s.input, flex: 1 }} type="text" placeholder="What happens in this step..." defaultValue={st} onBlur={e => setStep(i, e.target.value)} />
            </div>
          ))}
        </div>
        {answers.use_steps.length < 6 && <button style={s.addBtn} onClick={addStep}>+ Add step</button>}
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Where is it when being used?</label>
        <Chips k="use_position" opts={['On a table or counter','Held in hand','Mounted on a wall','On the floor','Outdoors','In a vehicle','Worn while moving','Inside another object']} answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>What feedback does the user get when it works? <span style={{ color: 'rgba(255,255,255,0.3)' }}>(select all)</span></label>
        <Chips k="feedback_type" opts={['Click or snap','Vibration','Visual indicator','Resistance then release','Motor sound','Silent and smooth','Temperature change','App notification']} multi answers={answers} setAnswers={setAnswers} />
      </div>
    </>
  )
}

function Sec4({ answers, setAnswers }) {
  return (
    <>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Outer shell material? <span style={{ color: 'rgba(255,255,255,0.3)' }}>(select all)</span></label>
        <Chips k="materials_outer" opts={['Clear glass','Frosted glass','Hard plastic','Flexible plastic','Polished metal','Brushed metal','Anodized aluminum','Ceramic','Wood','Rubber or silicone','Fabric','Carbon fiber','I don\'t know']} multi answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Internal components material? <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional)</span></label>
        <Field k="materials_inner" answers={answers} setAnswers={setAnswers} area placeholder='e.g. "stainless steel blade, nylon gear, ABS plastic housing"' />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Surface finish or texture? <span style={{ color: 'rgba(255,255,255,0.3)' }}>(select all)</span></label>
        <Chips k="finish" opts={['Smooth and glossy','Matte / flat','Soft-touch / rubberized','Textured grip','Mirror polished','Sandblasted / frosted','Embossed or patterned','Raw / industrial']} multi answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Color or color scheme?</label>
        <Field k="color_intent" answers={answers} setAnswers={setAnswers} area placeholder='e.g. "clear glass body with a matte black base and chrome accent ring"' />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>How should it feel when held?</label>
        <Chips k="weight_feel" opts={['Very light','Light and easy','Solid and reassuring','Heavy and robust','Perfectly balanced','Top-heavy','Bottom-heavy','Haven\'t thought about this']} answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Other tactile or sensory details?</label>
        <Field k="tactile_notes" answers={answers} setAnswers={setAnswers} area placeholder='e.g. "ribbed base for grip, blade is hidden and never touched, lid clicks into place"' />
      </div>
    </>
  )
}

function Sec5({ answers, setAnswers }) {
  return (
    <>
      <div style={s.qBlock}>
        <label style={s.qLabel}>What problem does this solve that nothing else does?</label>
        <Field k="problem_solved" answers={answers} setAnswers={setAnswers} area placeholder='e.g. "Flower stems need re-cutting every few days — current tools require removing stems and create mess. This integrates cutting into the vase itself."' />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Does it look or work like anything that already exists?</label>
        <Field k="existing_similar" answers={answers} setAnswers={setAnswers} area hint="References help the AI draw it more accurately" placeholder='e.g. "looks like a tall flower vase, mechanism similar to a pepper grinder"' />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>What makes it visually or functionally different from those?</label>
        <Field k="differentiator" answers={answers} setAnswers={setAnswers} area placeholder='e.g. "the mechanism is completely hidden — it looks like a normal premium vase from the outside"' />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Who is the primary user?</label>
        <Chips k="user_type" opts={['Home consumer','Professional / commercial','Children','Elderly or limited mobility','Athletes','Medical context','Industrial worker','General — anyone']} answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>Where is it primarily used? <span style={{ color: 'rgba(255,255,255,0.3)' }}>(select all)</span></label>
        <Chips k="use_environment" opts={['Home kitchen','Home living space','Bathroom','Office','Outdoors / garden','Gym or studio','Hospital / clinic','Vehicle','Retail','Industrial']} multi answers={answers} setAnswers={setAnswers} />
      </div>
      <div style={s.qBlock}>
        <label style={s.qLabel}>What feeling or aesthetic should it convey?</label>
        <Chips k="emotional_intent" opts={['Clean and clinical','Warm and homey','Premium / luxury','Playful and fun','Minimal and invisible','Robust and industrial','Natural / organic','High-tech']} answers={answers} setAnswers={setAnswers} />
      </div>
    </>
  )
}

// ── Editable SVG layer ─────────────────────────────────────────
function BlueprintEditor({ svg, onSave, saving }) {
  const containerRef = useRef(null)
  const [tool, setTool] = useState('select') // 'select' | 'add-pointer'
  const [annotations, setAnnotations] = useState([]) // [{id,x,y,tx,ty,label,editing}]
  const [selected, setSelected] = useState(null)
  const [dragging, setDragging] = useState(null) // {id, offsetX, offsetY, part: 'dot'|'label'}
  const nextId = useRef(1)

  function getSVGPoint(e) {
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const inv = ctm.inverse()
    const transformed = pt.matrixTransform(inv)
    return { x: transformed.x, y: transformed.y }
  }

  function handleSVGClick(e) {
    if (tool !== 'add-pointer') return
    const { x, y } = getSVGPoint(e)
    const id = nextId.current++
    setAnnotations(a => [...a, { id, x, y, tx: x + 60, ty: y - 30, label: 'Label', editing: true }])
    setTool('select')
    setSelected(id)
  }

  function startDrag(e, id, part) {
    e.stopPropagation()
    const { x, y } = getSVGPoint(e)
    const ann = annotations.find(a => a.id === id)
    if (!ann) return
    setDragging({
      id, part,
      offsetX: x - (part === 'dot' ? ann.x : ann.tx),
      offsetY: y - (part === 'dot' ? ann.y : ann.ty),
    })
    setSelected(id)
  }

  function onMouseMove(e) {
    if (!dragging) return
    const { x, y } = getSVGPoint(e)
    setAnnotations(a => a.map(ann => {
      if (ann.id !== dragging.id) return ann
      if (dragging.part === 'dot') return { ...ann, x: x - dragging.offsetX, y: y - dragging.offsetY }
      return { ...ann, tx: x - dragging.offsetX, ty: y - dragging.offsetY }
    }))
  }

  function onMouseUp() { setDragging(null) }

  function finishEdit(id, val) {
    setAnnotations(a => a.map(ann => ann.id === id ? { ...ann, label: val || ann.label, editing: false } : ann))
  }

  function deleteAnnotation(id) {
    setAnnotations(a => a.filter(ann => ann.id !== id))
    setSelected(null)
  }

  function startEdit(id) {
    setAnnotations(a => a.map(ann => ann.id === id ? { ...ann, editing: true } : ann))
  }

  const overlayStyle = {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    cursor: tool === 'add-pointer' ? 'crosshair' : 'default',
    pointerEvents: 'all',
  }

  return (
    <div>
      <div style={s.toolBar}>
        <button style={s.toolBtn(tool === 'select')} onClick={() => setTool('select')}>↖ Select</button>
        <button style={s.toolBtn(tool === 'add-pointer')} onClick={() => setTool('add-pointer')}>+ Add pointer</button>
        {selected && (
          <>
            <button style={s.toolBtn(false)} onClick={() => startEdit(selected)}>✎ Edit label</button>
            <button style={{ ...s.toolBtn(false), color: '#ff6b7a' }} onClick={() => deleteAnnotation(selected)}>✕ Delete</button>
          </>
        )}
        <button style={{ ...s.saveBtn, marginLeft: 'auto' }} onClick={() => onSave(annotations)} disabled={saving}>
          {saving ? 'Saving...' : 'Save blueprint'}
        </button>
      </div>

      <div
        style={{ ...s.bpWrap, cursor: tool === 'add-pointer' ? 'crosshair' : 'default' }}
        ref={containerRef}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        {/* Base SVG */}
        <div dangerouslySetInnerHTML={{ __html: svg }} style={{ width: '100%', pointerEvents: 'none' }} />

        {/* Annotation overlay */}
        <svg
          style={overlayStyle}
          viewBox="0 0 800 580"
          preserveAspectRatio="xMidYMid meet"
          onClick={handleSVGClick}
        >
          {annotations.map(ann => (
            <g key={ann.id}>
              <line
                x1={ann.x} y1={ann.y} x2={ann.tx} y2={ann.ty}
                stroke={selected === ann.id ? '#fff' : '#5a9fd8'}
                strokeWidth="0.8"
                strokeDasharray="3,3"
              />
              {/* Dot — draggable */}
              <circle
                cx={ann.x} cy={ann.y} r="4"
                fill={selected === ann.id ? '#fff' : '#7eb8f7'}
                style={{ cursor: 'move' }}
                onMouseDown={e => startDrag(e, ann.id, 'dot')}
                onClick={e => { e.stopPropagation(); setSelected(ann.id) }}
              />
              {/* Label — draggable */}
              {ann.editing ? (
                <foreignObject x={ann.tx - 2} y={ann.ty - 16} width="140" height="28">
                  <input
                    style={{ background: '#0d1b3e', border: '0.5px solid #7b9ff7', color: '#c8dff8', fontSize: 11, fontFamily: 'monospace', padding: '2px 6px', width: '100%', outline: 'none' }}
                    defaultValue={ann.label}
                    autoFocus
                    onBlur={e => finishEdit(ann.id, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') finishEdit(ann.id, e.target.value) }}
                    onClick={e => e.stopPropagation()}
                  />
                </foreignObject>
              ) : (
                <text
                  x={ann.tx} y={ann.ty}
                  fontFamily="monospace" fontSize="11" fill={selected === ann.id ? '#fff' : '#c8dff8'}
                  style={{ cursor: 'move', userSelect: 'none' }}
                  onMouseDown={e => startDrag(e, ann.id, 'label')}
                  onClick={e => { e.stopPropagation(); setSelected(ann.id) }}
                  onDoubleClick={e => { e.stopPropagation(); startEdit(ann.id) }}
                >
                  {ann.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
        Click "Add pointer" then click anywhere on the blueprint to place an annotation. Drag the dot or label to reposition. Double-click a label to edit text.
      </div>
    </div>
  )
}

// ── Main Blueprint page ────────────────────────────────────────
export default function Blueprint({ session }) {
  const { ideaId } = useParams()
  const navigate = useNavigate()
  const [sec, setSec] = useState(0)
  const [answers, setAnswers] = useState(EMPTY_ANSWERS)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [svg, setSvg] = useState('')
  const [regenCount, setRegenCount] = useState(0)
  const [genErr, setGenErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const MAX_REGEN = 3

  // Load existing blueprint if present
  useEffect(() => {
    if (!ideaId) return
    supabase.from('ideas').select('blueprint_2d, title').eq('id', ideaId).single().then(({ data }) => {
      if (!data) return
      if (data.blueprint_2d?.answers) setAnswers(a => ({ ...a, ...data.blueprint_2d.answers }))
      if (data.blueprint_2d?.svg) { setSvg(data.blueprint_2d.svg); setGenerated(true); setRegenCount(data.blueprint_2d.regen_count || 0) }
    })
  }, [ideaId])

  async function generate() {
    setGenerating(true); setGenErr('')
    try {
      const { data: { session: s } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-blueprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.access_token}` },
        body: JSON.stringify({ answers }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      if (!json.svg) throw new Error('No SVG returned')
      setSvg(json.svg)
      setGenerated(true)
      setRegenCount(c => c + 1)
      // Auto-save answers + svg
      await supabase.from('ideas').update({
        blueprint_2d: { answers, svg: json.svg, regen_count: regenCount + 1 }
      }).eq('id', ideaId)
    } catch (e) {
      setGenErr('Generation failed: ' + e.message)
    }
    setGenerating(false)
  }

  async function handleSave(userAnnotations) {
    setSaving(true)
    await supabase.from('ideas').update({
      blueprint_2d: { answers, svg, regen_count: regenCount, user_annotations: userAnnotations }
    }).eq('id', ideaId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const pct = Math.round((sec / SECTIONS.length) * 100)
  const sectionComponents = [Sec0, Sec1, Sec2, Sec3, Sec4, Sec5]
  const SecComponent = sectionComponents[sec]

  if (generating) {
    return (
      <div style={s.wrap}>
        <div style={{ ...s.inner, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '6rem' }}>
          <div style={{ width: 48, height: 48, border: '2px solid rgba(123,159,247,0.2)', borderTopColor: '#7b9ff7', borderRadius: '50%', animation: 'spin 0.9s linear infinite', marginBottom: '1.5rem' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <div style={{ fontSize: 18, color: '#fff', marginBottom: 8 }}>Generating your blueprint...</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Drawing front view + mechanism detail — about 30 seconds</div>
        </div>
      </div>
    )
  }

  if (generated && svg) {
    return (
      <div style={s.wrap}>
        <div style={s.inner}>
          <button style={{ ...s.btnBack, marginBottom: '1.5rem' }} onClick={() => navigate(`/idea/${ideaId}`)}>← Back to idea</button>
          <div style={s.sectionLabel}>Blueprint — Sheet 1 of 3</div>
          <div style={{ ...s.sectionTitle, marginBottom: '0.25rem' }}>{answers.product_name || 'Your product'}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>Front view + mechanism detail</div>
          {genErr && <div style={s.errorBox}>{genErr}</div>}
          <BlueprintEditor svg={svg} onSave={handleSave} saving={saving} />
          {saved && <div style={{ fontSize: 13, color: '#7b9ff7', marginTop: 8 }}>Saved ✓</div>}
          <div style={s.regenRow}>
            {regenCount < MAX_REGEN
              ? <button style={s.btnGen} onClick={generate}>↺ Regenerate</button>
              : <button style={{ ...s.btnGen, opacity: 0.4, pointerEvents: 'none' }}>No regenerations left</button>
            }
            <span style={s.regenCount}>{MAX_REGEN - regenCount} of {MAX_REGEN} remaining</span>
            <button style={{ ...s.btnBack, marginLeft: 'auto' }} onClick={() => setGenerated(false)}>← Edit answers</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <div style={s.inner}>
        <button style={{ ...s.btnBack, marginBottom: '1.5rem' }} onClick={() => navigate(`/idea/${ideaId}`)}>← Back to idea</button>
        <div style={s.progress}><div style={s.progressFill(pct)} /></div>
        <div style={s.tabs}>
          {SECTIONS.map((sec_, i) => (
            <span key={sec_.id} style={s.tab(i === sec, i < sec)}>{i < sec ? '✓ ' : ''}{sec_.label}</span>
          ))}
        </div>
        <div style={s.sectionLabel}>Section {sec + 1} of {SECTIONS.length}</div>
        <div style={s.sectionTitle}>{TITLES[sec][0]}</div>
        <div style={s.sectionSub}>{TITLES[sec][1]}</div>
        <SecComponent answers={answers} setAnswers={setAnswers} />
        {genErr && <div style={s.errorBox}>{genErr}</div>}
        <div style={s.navRow}>
          {sec > 0
            ? <button style={s.btnBack} onClick={() => setSec(s => s - 1)}>← Back</button>
            : <div />
          }
          {sec === SECTIONS.length - 1
            ? <button style={s.btnGen} onClick={generate}>Generate blueprint →</button>
            : <button style={s.btnNext} onClick={() => setSec(s => s + 1)}>Next →</button>
          }
        </div>
      </div>
    </div>
  )
}
