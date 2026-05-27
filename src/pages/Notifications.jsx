import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import NavBar from '../components/NavBar'

export default function Notifications({ session }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!session) { navigate('/auth'); return }
    fetchNotifications()
  }, [session])

  async function fetchNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    if (!error) setNotifications(data || [])
    setLoading(false)

    // Mark all as read
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('read', false)
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (mins > 0) return `${mins}m ago`
    return 'Just now'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e1f', color: '#fff' }}>
      <NavBar session={session} />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 32 }}>Notifications</h1>
        {loading ? (
          <p style={{ color: '#888' }}>Loading...</p>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔔</div>
            <p>No notifications yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notifications.map(n => (
              <div key={n.id} style={{
                background: n.read ? '#16162a' : '#1e1e35',
                border: `1px solid ${n.read ? '#2a2a3a' : '#7b9ff7'}`,
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16
              }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 4px', color: n.read ? '#ccc' : '#fff' }}>{n.title}</p>
                  <p style={{ fontSize: 14, color: '#888', margin: 0 }}>{n.message}</p>
                </div>
                <span style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>{timeAgo(n.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
