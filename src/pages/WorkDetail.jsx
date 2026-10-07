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

  async function deleteFile(file) {
    if (!confirm(`Delete "${file.name}"?`)) return
    await supabase.storage.from('work-assets').remove([file.storage_path])
    await supabase.from('work_files').delete().eq('id', file.id)
    setFiles(prev => prev.filter(f => f.id !== file.id))
    setSignedUrls(prev => { const n = { ...prev }; delete n[file.storage_path]; return n })
  }

  async function deleteWork() {
    if (!confirm('Delete this work and all its files? This cannot be undone.')) return
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

        <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginTop: '2.5rem', marginBottom: '2.5rem' }}>
          Sharing, access codes and the access log arrive in the next update.
        </p>

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
