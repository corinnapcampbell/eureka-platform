import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import SubmitIdea from './pages/SubmitIdea'
import IdeaDetail from './pages/IdeaDetail'
import SharedIdea from './pages/SharedIdea'
import TradeSecrets from './pages/legal/TradeSecrets'
import NDA from './pages/legal/NDA'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Terms from './pages/Terms'
import PitchPDF from './pages/PitchPDF'
import PitchBuilder from './pages/PitchBuilder'
import DeckBuilder from './pages/DeckBuilder'
import DeckViewer from './pages/DeckViewer'
import Profile from './pages/Profile'
import Pricing from './pages/Pricing'
import Settings from './pages/Settings'
import Notifications from './pages/Notifications'
import NotFound from './pages/NotFound'
import InventorProfile from './pages/InventorProfile'
import Blueprint from './pages/Blueprint'
 
function ProtectedRoute({ session, children }) {
  if (!session) return <Navigate to="/auth" replace />
  return children
}
 
export default function App() {
  const [session, setSession] = useState(undefined)
 
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])
 
  if (session === undefined) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }
 
  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/auth" element={session ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route path="/dashboard" element={
        <ProtectedRoute session={session}>
          <Dashboard session={session} />
        </ProtectedRoute>
      } />
      <Route path="/submit" element={
        <ProtectedRoute session={session}>
          <SubmitIdea session={session} />
        </ProtectedRoute>
      } />
      <Route path="/idea/:id" element={
        <ProtectedRoute session={session}>
          <IdeaDetail session={session} />
        </ProtectedRoute>
      } />
      <Route path="/share/:token" element={<SharedIdea />} />
      <Route path="/inventor/:userId" element={<InventorProfile />} />
      <Route path="/deck/view/:shareToken" element={<DeckViewer />} />
      <Route path="/pitch/:ideaId" element={<PitchPDF session={session} />} />
      <Route path="/pitch-builder/:ideaId" element={<PitchBuilder session={session} />} />
      <Route path="/deck/:ideaId" element={<DeckBuilder session={session} />} />
      <Route path="/profile" element={<ProtectedRoute session={session}><Profile session={session} /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute session={session}><Settings session={session} /></ProtectedRoute>} />
      <Route path="/pricing" element={<Pricing session={session} />} />
      <Route path="/legal/trade-secrets" element={<TradeSecrets />} />
      <Route path="/legal/nda" element={<NDA />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/notifications" element={<Notifications session={session} />} />
      <Route path="/blueprint/:ideaId" element={<ProtectedRoute session={session}><Blueprint session={session} /></ProtectedRoute>} />
      <Route path="*" element={<NotFound session={session} />} />
    </Routes>
  )
}
 