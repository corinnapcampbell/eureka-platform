import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import NavBar from '../components/NavBar'
import { ImageMosaic, ImageViewer } from '../components/WorkImages'
import CoverCropper from '../components/CoverCropper'

export default function WorkDetail({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [work, setWork] = useState(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState([])
  const [signedUrls, setSignedUrls] = useState({})
  const [viewerIndex, setViewerIndex] = useState(null)
  const [pendingCover, setPendingCover] = useState(null)
  const [codes, setCodes] = useState([])
  const [accessLog, setAccessLog] = useState([])
  const [copied, setCopied] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newOpenings, setNewOpenings] = useState('1')
  const [addingCode, setAddingCode] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [editingCodeId, setEditingCodeId] = useState(null)
  const [editOpenings, setEditOpenings] = useState('')
  const [editUnlimited, setEditUnlimited] = useState(false)
  const [confirmState, setConfirmState] = useState(null)
  const fileInputRef = useRef()
  const coverInputRef = useRef()
  const userId = session.user.id

  useEffect(() => {
    async function load() {
      const { data: w } = await supabase
        .from('works')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()
      if (!w) { navigate('/dashboard'); return }
      setWork(w)
      setTitle(w.title || '')
      setDescription(w.description || '')
      const { data: f } = await supabase
        .from('work_files')
        .select('*')
        .eq('work_id', id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      const fileList = f || []
      setFiles(fileList)
      if (fileList.length > 0) {
        const paths = fileList.map(x => x.storage_path)
        const { data: signed } = await supabase.storage.from('work-assets').createSignedUrls(paths, 3600)
        if (signed) {
          const map = {}
          signed.forEach(({ path, signedUrl }) => { if (signedUrl) map[path] = signedUrl })
          setSignedUrls(map)
        }
      }
      const { data: c } = await supabase.from('work_access_codes').select('*').eq('work_id', id).order('created_at', { ascending: true })
      setCodes(c || [])
      const { data: l } = await supabase.from('work_access_log').select('*').eq('work_id', id).order('opened_at', { ascending: false })
      setAccessLog(l || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function saveWork() {
    setSaving(true)
    await supabase.from('works').update({ title, description, updated_at: new Date().toISOString() }).eq('id', id)
    setSaving(false)
    setWork(w => ({ ...w, title, description }))
  }

  async function uploadCover(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingCover(file)
    e.target.value = ''
  }

  async function saveCroppedCover(blob) {
    setUploadingCover(true)
    const path = `${userId}/${id}/cover.jpg`
    const { error } = await supabase.storage.from('work-covers').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (!error) {
      const { data } = supabase.storage.from('work-covers').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()
      await supabase.from('works').update({ cover_url: url, updated_at: new Date().toISOString() }).eq('id', id)
      if (work.cover_url) {
        const oldExt = work.cover_url.split('?')[0].split('.').pop()
        if (oldExt !== 'jpg') {
          await supabase.storage.from('work-covers').remove([`${userId}/${id}/cover.${oldExt}`])
        }
      }
      setWork(w => ({ ...w, cover_url: url }))
    }
    setPendingCover(null)
    setUploadingCover(false)
  }

  async function uploadFiles(e) {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return
    for (const file of selected) {
      const fileId = crypto.randomUUID()
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
      const path = `${userId}/${id}/${fileId}.${ext}`
      setUploadingFiles(prev => [...prev, { name: file.name }])
      const { error: uploadError } = await supabase.storage.from('work-assets').upload(path, file, { upsert: false, contentType: file.type })
      if (uploadError) {
        setUploadingFiles(prev => prev.filter(u => u.name !== file.name))
        continue
      }
      const { data: row, error: rowError } = await supabase.from('work_files').insert({
        work_id: id,
        user_id: userId,
        storage_path: path,
        name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      }).select().single()
      if (rowError) {
        await supabase.storage.from('work-assets').remove([path])
        if (rowError.message?.includes('WORK_STORAGE_LIMIT_REACHED')) {
          alert('This Work has reached its 1 GB limit.')
        }
      } else {
        setFiles(prev => [...prev, row])
        const { data: signed } = await supabase.storage.from('work-assets').createSignedUrls([path], 3600)
        if (signed?.[0]?.signedUrl) {
          setSignedUrls(prev => ({ ...prev, [path]: signed[0].signedUrl }))
        }
      }
      setUploadingFiles(prev => prev.filter(u => u.name !== file.name))
    }
    e.target.value = ''
  }

  async function saveCaption(fileId, caption) {
    await supabase.from('work_files').update({ caption }).eq('id', fileId)
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, caption } : f))
  }

  function askConfirm(message) {
    return new Promise(resolve => setConfirmState({ message, resolve }))
  }

  async function deleteFile(file) {
    if (!await askConfirm(`Delete "${file.name}"?`)) return
    await supabase.storage.from('work-assets').remove([file.storage_path])
    await supabase.from('work_files').delete().eq('id', file.id)
    setFiles(prev => prev.filter(f => f.id !== file.id))
    setSignedUrls(prev => { const n = { ...prev }; delete n[file.storage_path]; return n })
  }

  async function deleteWork() {
    if (!await askConfirm('Delete this work and all its files? This cannot be undone.')) return
    if (files.length > 0) {
      await supabase.storage.from('work-assets').remove(files.map(f => f.storage_path))
    }
    if (work.cover_url) {
      const ext = work.cover_url.split('?')[0].split('.').pop()
      await supabase.storage.from('work-covers').remove([`${userId}/${id}/cover.${ext}`])
    }
    await supabase.from('works').delete().eq('id', id)
    navigate('/dashboard')
  }

  async function toggleWorkField(field, value) {
    await supabase.from('works').update({ [field]: value }).eq('id', id)
    setWork(w => ({ ...w, [field]: value }))
  }

  async function toggleCode(codeId, active) {
    await supabase.from('work_access_codes').update({ active }).eq('id', codeId)
    setCodes(prev => prev.map(c => c.id === codeId ? { ...c, active } : c))
  }

  async function saveCodeOpenings(c) {
    const max = editUnlimited ? null : parseInt(editOpenings)
    if (!editUnlimited && (isNaN(max) || max < 1 || max < (c.uses_count ?? 0))) {
      setCodeError(`Openings can't be lower than the ${c.uses_count ?? 0} already used.`)
      return
    }
    await supabase.from('work_access_codes').update({ max_uses: max }).eq('id', c.id)
    setCodes(prev => prev.map(x => x.id === c.id ? { ...x, max_uses: max } : x))
    setCodeError('')
    setEditingCodeId(null)
  }

  async function deleteCode(c) {
    if (!await askConfirm(`Delete the code ${c.code}? Anyone using it loses access. The access log keeps its history.`)) return
    await supabase.from('work_access_codes').delete().eq('id', c.id)
    setCodes(prev => prev.filter(x => x.id !== c.id))
  }

  async function addCode() {
    if (newCode.length < 6) { setCodeError('Code must be at least 6 characters.'); return }
    setAddingCode(true)
    const openings = newOpenings === 'unlimited' ? null : parseInt(newOpenings)
    const { data, error } = await supabase.from('work_access_codes').insert({
      work_id: id,
      user_id: userId,
      code: newCode.toUpperCase(),
      label: newLabel.trim() || null,
      max_uses: openings,
      active: true,
    }).select().single()
    setAddingCode(false)
    if (error) {
      setCodeError(error.message?.includes('unique') || error.message?.includes('duplicate') ? 'This code already exists.' : (error.message || 'Error adding code.'))
      return
    }
    setCodes(prev => [...prev, data])
    setNewCode('')
    setNewLabel('')
    setNewOpenings('1')
    setCodeError('')
  }

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/w/${work.share_token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function exportCsv() {
    const header = 'Given to,Name,Email,Date,IP,NDA\n'
    const rows = accessLog.map(r => [
      r.code_label || '',
      r.viewer_name || '',
      r.viewer_email || '',
      r.opened_at ? new Date(r.opened_at).toLocaleString() : '',
      r.ip_address || '',
      r.nda_accepted ? 'Yes' : 'No',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `access-log-${id}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function formatStorage(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const storageUsed = files.reduce((sum, f) => sum + (f.size_bytes || 0), 0)
  const imageFiles = files.filter(f => f.mime_type?.startsWith('image/'))
  const videoFiles = files.filter(f => f.mime_type?.startsWith('video/'))
  const audioFiles = files.filter(f => f.mime_type?.startsWith('audio/'))
  const otherFiles = files.filter(f => !f.mime_type?.startsWith('image/') && !f.mime_type?.startsWith('video/') && !f.mime_type?.startsWith('audio/'))

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <div style={{ background: 'var(--ink)', padding: '0' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 2rem' }}>
          <NavBar
            session={session}
            rightExtra={
              <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer' }}>← Back to dashboard</button>
            }
          />
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '3rem 2rem' }}>

        {/* Cover */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
            Cover <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(visible to anyone with the link)</span>
          </label>
          {work.cover_url && (
            <img src={work.cover_url} alt="cover" style={{ width: '100%', aspectRatio: '2 / 1', objectFit: 'cover', display: 'block', borderRadius: 10, marginBottom: 10, border: '0.5px solid var(--border)' }} />
          )}
          <button onClick={() => coverInputRef.current?.click()} disabled={uploadingCover} style={{
            background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, color: 'var(--muted)', cursor: 'pointer',
          }}>
            {uploadingCover ? 'Uploading...' : work.cover_url ? 'Replace cover' : 'Upload cover'}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadCover} />
        </div>

        {/* Title */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ width: '100%', border: '0.5px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: 'var(--ink)', background: 'var(--white)', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            style={{ width: '100%', border: '0.5px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: 'var(--ink)', background: 'var(--white)', outline: 'none', lineHeight: 1.5, resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        <button onClick={saveWork} disabled={saving} style={{
          background: 'var(--ink)', color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 500,
          opacity: saving ? 0.6 : 1, cursor: 'pointer', marginBottom: '2.5rem',
        }}>
          {saving ? 'Saving...' : 'Save'}
        </button>

        {/* Files section */}
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h2 className="serif" style={{ fontSize: 22, margin: 0 }}>Files</h2>
            <button onClick={() => fileInputRef.current?.click()} style={{
              background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>+ Add files</button>
          </div>
          <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={uploadFiles} />

          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: '1.25rem' }}>
            {formatStorage(storageUsed)} of 1 GB used
          </p>

          {uploadingFiles.map(u => (
            <div key={u.name} style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
              Uploading {u.name}...
            </div>
          ))}

          {imageFiles.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '0.75rem' }}>Images</p>
              <ImageMosaic images={imageFiles} urls={signedUrls} onOpen={setViewerIndex} />
            </div>
          )}

          {videoFiles.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '0.75rem' }}>Video</p>
              {videoFiles.map(f => (
                <FileMediaCard key={f.id} file={f} url={signedUrls[f.storage_path]} type="video" onSaveCaption={saveCaption} onDelete={deleteFile} />
              ))}
            </div>
          )}

          {audioFiles.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '0.75rem' }}>Audio</p>
              {audioFiles.map(f => (
                <FileMediaCard key={f.id} file={f} url={signedUrls[f.storage_path]} type="audio" onSaveCaption={saveCaption} onDelete={deleteFile} />
              ))}
            </div>
          )}

          {otherFiles.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '0.75rem' }}>Files</p>
              {otherFiles.map(f => (
                <FileRowCard key={f.id} file={f} url={signedUrls[f.storage_path]} onSaveCaption={saveCaption} onDelete={deleteFile} />
              ))}
            </div>
          )}

          {files.length === 0 && uploadingFiles.length === 0 && (
            <p style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', padding: '2rem 0' }}>No files yet. Click "+ Add files" to upload.</p>
          )}
        </div>

        {/* Card: Share this work */}
        <div style={{ background: '#0e0e1f', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.75rem', marginTop: '2.5rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: '0 0 1rem' }}>Share this work</p>
          {work.share_token && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px', marginBottom: '1.25rem' }}>
              <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {`${window.location.origin}/w/${work.share_token}`}
              </span>
              <button onClick={copyLink} style={{
                background: copied ? '#EAF3DE' : 'linear-gradient(90deg, #7b9ff7, #9b7ff7)',
                color: copied ? '#3B6D11' : '#fff',
                border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
              }}>{copied ? 'Copied!' : 'Copy'}</button>
            </div>
          )}
          {[
            { field: 'code_required', label: 'Require access code', sub: 'Viewers must enter a code to open this work' },
            { field: 'nda_required', label: 'Require NDA signature', sub: 'Viewers must sign an NDA and provide their name and email' },
            { field: 'allow_download', label: 'Allow download', sub: 'Viewers can download files and save media' },
          ].map(({ field, label, sub }) => (
            <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <p style={{ fontSize: 14, color: '#fff', margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{sub}</p>
              </div>
              <div
                onClick={() => toggleWorkField(field, !work[field])}
                style={{
                  width: 40, height: 22, borderRadius: 11, position: 'relative', cursor: 'pointer', flexShrink: 0, marginLeft: 16,
                  background: work[field] ? 'linear-gradient(90deg, #7b9ff7, #9b7ff7)' : 'rgba(255,255,255,0.15)',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, left: work[field] ? 21 : 3,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </div>
            </div>
          ))}
          {work.code_required && !codes.some(c => c.active) && (
            <p style={{ fontSize: 12, color: '#f59e0b', margin: '0.25rem 0 0' }}>⚠ Require access code is on but you have no active codes. Add one below.</p>
          )}
        </div>

        {/* Card: Access codes */}
        <div style={{ background: '#0e0e1f', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.75rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: '0 0 1rem' }}>Access codes</p>
          {codes.length > 0 && (
            <div style={{ marginBottom: '1.25rem', maxHeight: 168, overflowY: 'auto' }}>
              {codes.map(c => (
                <div key={c.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{c.code}</span>
                      {c.label && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginLeft: 8 }}>{c.label}</span>}
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 8 }}>
                        {c.max_uses === null ? `${c.uses_count ?? 0} used · unlimited` : `${c.uses_count ?? 0} of ${c.max_uses} used`}
                      </span>
                    </div>
                    <button onClick={() => { setEditingCodeId(c.id); setEditUnlimited(c.max_uses === null); setEditOpenings(String(c.max_uses ?? Math.max(1, c.uses_count ?? 0))) }} style={{ fontSize: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => deleteCode(c)} style={{ fontSize: 12, background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>Delete</button>
                    <div
                      onClick={() => toggleCode(c.id, !c.active)}
                      style={{
                        width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer', flexShrink: 0,
                        background: c.active ? 'linear-gradient(90deg, #7b9ff7, #9b7ff7)' : 'rgba(255,255,255,0.12)',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 2, left: c.active ? 18 : 2,
                        width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.2s',
                      }} />
                    </div>
                  </div>
                  {editingCodeId === c.id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                      <input
                        type="number"
                        value={editOpenings}
                        onChange={e => setEditOpenings(e.target.value)}
                        min={Math.max(1, c.uses_count ?? 0)}
                        disabled={editUnlimited}
                        style={{ width: 80, border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.06)', outline: 'none', boxSizing: 'border-box' }}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={editUnlimited} onChange={e => setEditUnlimited(e.target.checked)} />
                        Unlimited
                      </label>
                      <button onClick={() => saveCodeOpenings(c)} style={{ background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Save</button>
                      <button onClick={() => setEditingCodeId(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 120 }}>
              <input
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase())}
                placeholder="Code (min 6 chars)"
                maxLength={20}
                style={{ width: '100%', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '9px 36px 9px 12px', fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.06)', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '0.05em' }}
              />
              <button
                onClick={() => setNewCode(generateCode())}
                title="Generate"
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}
              >⟳</button>
            </div>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Given to (name)"
              style={{ flex: 1, minWidth: 100, border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.06)', outline: 'none', boxSizing: 'border-box' }}
            />
            <select
              value={newOpenings}
              onChange={e => setNewOpenings(e.target.value)}
              style={{ border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '9px 10px', fontSize: 13, color: '#fff', background: '#1a1a2e', outline: 'none', cursor: 'pointer' }}
            >
              <option value="1">1 opening</option>
              <option value="2">2 openings</option>
              <option value="3">3 openings</option>
              <option value="5">5 openings</option>
              <option value="10">10 openings</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>
          {codeError && <p style={{ fontSize: 12, color: '#f87171', margin: '0 0 0.5rem' }}>{codeError}</p>}
          <button
            onClick={addCode}
            disabled={addingCode || !newCode.trim()}
            style={{
              background: newCode.trim() ? 'linear-gradient(90deg, #7b9ff7, #9b7ff7)' : 'rgba(255,255,255,0.08)',
              color: newCode.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
              border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 500, cursor: newCode.trim() && !addingCode ? 'pointer' : 'not-allowed',
            }}
          >{addingCode ? 'Adding...' : '+ Add code'}</button>
        </div>

        {/* Card: Who has opened this work */}
        <div style={{ background: '#0e0e1f', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.75rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>Who has opened this work</p>
            {accessLog.length > 0 && (
              <button onClick={exportCsv} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'none', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>Export CSV</button>
            )}
          </div>
          {accessLog.length === 0 ? (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', margin: 0 }}>No one has opened this work yet.</p>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.8fr 1.3fr 1.2fr 0.5fr', gap: '0 12px', padding: '6px 10px', marginBottom: 4 }}>
                {['Given to', 'Name / Email', 'Date', 'IP', 'NDA'].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</span>
                ))}
              </div>
              {accessLog.map((r, i) => (
                <div key={r.id || i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.8fr 1.3fr 1.2fr 0.5fr', gap: '0 12px', padding: '9px 10px', borderRadius: 8, background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.code_label || '—'}</span>
                  <div style={{ minWidth: 0 }}>
                    {r.viewer_name && <p style={{ fontSize: 12, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.viewer_name}</p>}
                    {r.viewer_email && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.viewer_email}</p>}
                    {!r.viewer_name && !r.viewer_email && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>—</span>}
                  </div>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{r.opened_at ? new Date(r.opened_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ip_address || '—'}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: r.nda_accepted ? '#86efac' : 'rgba(255,255,255,0.3)' }}>{r.nda_accepted ? 'YES' : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '1.5rem' }}>
          <button onClick={deleteWork} style={{
            background: 'none', border: '0.5px solid #f87171', borderRadius: 8,
            padding: '9px 20px', fontSize: 13, color: '#f87171', cursor: 'pointer',
          }}>Delete this work</button>
        </div>

      </div>

      {(() => {
        if (viewerIndex === null || imageFiles.length === 0) return null
        const safeIndex = Math.min(viewerIndex, imageFiles.length - 1)
        return (
          <ImageViewer
            images={imageFiles}
            urls={signedUrls}
            index={safeIndex}
            onIndex={setViewerIndex}
            onClose={() => setViewerIndex(null)}
            onSaveCaption={saveCaption}
            onDelete={deleteFile}
          />
        )
      })()}

      {pendingCover && (
        <CoverCropper file={pendingCover} onCancel={() => setPendingCover(null)} onSave={saveCroppedCover} />
      )}

      {confirmState && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,31,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', maxWidth: 360, width: '100%' }}>
            <p style={{ fontSize: 14, color: '#2c2c2a', lineHeight: 1.6, margin: '0 0 1.25rem' }}>{confirmState.message}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { confirmState.resolve(false); setConfirmState(null) }} style={{ background: 'none', border: '0.5px solid rgba(44,44,42,0.2)', borderRadius: 8, padding: '9px 18px', fontSize: 13, color: '#2c2c2a', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { confirmState.resolve(true); setConfirmState(null) }} style={{ background: '#f87171', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function FileMediaCard({ file, url, type, onSaveCaption, onDelete }) {
  const [caption, setCaption] = useState(file.caption || '')
  const [editing, setEditing] = useState(false)
  return (
    <div style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: '0.75rem', background: 'var(--white)', marginBottom: '0.75rem' }}>
      {url && type === 'video' && <video src={url} controls style={{ width: '100%', borderRadius: 6, marginBottom: 8 }} />}
      {url && type === 'audio' && <audio src={url} controls style={{ width: '100%', marginBottom: 8 }} />}
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 4px' }}>{file.name}</p>
      {editing ? (
        <div style={{ display: 'flex', gap: 4 }}>
          <input value={caption} onChange={e => setCaption(e.target.value)} style={{ flex: 1, fontSize: 12, border: '0.5px solid var(--border)', borderRadius: 4, padding: '4px 8px', outline: 'none' }} />
          <button onClick={() => { onSaveCaption(file.id, caption); setEditing(false) }} style={{ fontSize: 12, background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>Save</button>
        </div>
      ) : (
        <p onClick={() => setEditing(true)} style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 6px', cursor: 'pointer', fontStyle: caption ? 'normal' : 'italic' }}>{caption || 'Add caption'}</p>
      )}
      <button onClick={() => onDelete(file)} style={{ fontSize: 12, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
    </div>
  )
}

function FileRowCard({ file, url, onSaveCaption, onDelete }) {
  const [caption, setCaption] = useState(file.caption || '')
  const [editing, setEditing] = useState(false)
  return (
    <div style={{ border: '0.5px solid var(--border)', borderRadius: 10, padding: '0.75rem 1rem', background: 'var(--white)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
        {editing ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <input value={caption} onChange={e => setCaption(e.target.value)} style={{ flex: 1, fontSize: 12, border: '0.5px solid var(--border)', borderRadius: 4, padding: '3px 6px', outline: 'none' }} />
            <button onClick={() => { onSaveCaption(file.id, caption); setEditing(false) }} style={{ fontSize: 12, background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}>Save</button>
          </div>
        ) : (
          <p onClick={() => setEditing(true)} style={{ fontSize: 12, color: 'var(--muted)', margin: 0, cursor: 'pointer', fontStyle: caption ? 'normal' : 'italic' }}>{caption || 'Add caption'}</p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {url && <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#7b9ff7', textDecoration: 'none' }}>Open</a>}
        <button onClick={() => onDelete(file)} style={{ fontSize: 12, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
      </div>
    </div>
  )
}
