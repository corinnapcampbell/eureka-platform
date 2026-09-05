import { useNavigate } from 'react-router-dom'
import Logo from '../../components/Logo'

export default function NDA() {
  const navigate = useNavigate()

  const clause = (num, title, body) => (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: '0.5rem' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#7b9ff7', flexShrink: 0 }}>{num}.</span>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>{title}</h2>
      </div>
      <div style={{ paddingLeft: '1.5rem', borderLeft: '2px solid rgba(123,159,247,0.15)' }}>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, margin: 0 }}>{body}</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e1f', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
      {/* Nav */}
      <div style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><Logo size={20} variant="dark" /></span>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer' }}>← Back</button>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 2rem 6rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'inline-block', background: 'rgba(123,159,247,0.1)', border: '0.5px solid rgba(123,159,247,0.25)', borderRadius: 20, padding: '4px 14px', fontSize: 11, color: '#7b9ff7', fontWeight: 600, marginBottom: '1rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Legal Protection</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 0.75rem', letterSpacing: '-0.3px' }}>Non-Disclosure Agreement</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '0 0 1.5rem' }}>Viewer NDA · Accepted electronically upon accessing a shared idea · Governed by California law</p>

          <div style={{ background: 'rgba(123,159,247,0.08)', border: '1px solid rgba(123,159,247,0.2)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#7b9ff7', margin: '0 0 0.5rem' }}>📋 What this means for idea owners</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: 0 }}>When NDA-gating is on, every person who accesses your shared idea link must provide their name and email address, and by doing so electronically accepts this NDA. The name and email they enter, the time of access, and the IP address the request came from are all recorded. This creates a documented record of their acceptance and their confidentiality obligation.</p>
          </div>
          <div style={{ background: 'rgba(123,159,247,0.08)', border: '1px solid rgba(123,159,247,0.2)', borderRadius: 12, padding: '1.25rem 1.5rem', marginTop: '1rem' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: 0 }}>This NDA is optional and can be turned on for any individual idea you choose to protect. When enabled, anyone viewing that idea must accept these terms before seeing it.</p>
          </div>
        </div>

        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: '2.5rem' }}>
          This Non-Disclosure Agreement ("Agreement") is entered into electronically between the idea owner ("Disclosing Party") and the person accessing the shared idea link ("Receiving Party"). By submitting your name and email address and accessing the shared content, the Receiving Party agrees to be bound by the terms of this Agreement.
        </p>

        {clause('1', 'Definition of Confidential Information', 'For purposes of this Agreement, "Confidential Information" means any and all information, ideas, concepts, inventions, processes, methods, business plans, technical data, financial information, or other materials disclosed by the Disclosing Party through the eurekAIdea platform, whether in written, oral, electronic, or any other form. This includes the idea title, description, tagline, problem statement, solution, business model, market analysis, competitive advantage, and any other section of the shared idea.')}

        {clause('2', 'Obligations of Receiving Party', 'The Receiving Party agrees to: (a) hold all Confidential Information in strict confidence; (b) not disclose any Confidential Information to any third party without the prior written consent of the Disclosing Party; (c) not use any Confidential Information for any purpose other than evaluating a potential business relationship with the Disclosing Party; (d) not copy, reproduce, or distribute the Confidential Information in any form; and (e) promptly notify the Disclosing Party of any unauthorized disclosure or use of the Confidential Information.')}

        {clause('3', 'Electronic Acceptance', 'The Receiving Party acknowledges that by providing their name and email address and accessing the shared idea link on the eurekAIdea platform, they are electronically signing and accepting this Agreement. This electronic acceptance constitutes a legally binding signature under the Electronic Signatures in Global and National Commerce Act (E-SIGN Act, 15 U.S.C. §7001) and the California Uniform Electronic Transactions Act (Cal. Civil Code §1633.1 et seq.).')}

        {clause('4', 'Access Logging', 'The Receiving Party acknowledges and consents to eurekAIdea recording and storing: (a) their name and email address; (b) the date and time of access; (c) their IP address; and (d) any other access metadata. This record constitutes evidence of their acceptance of this Agreement and their access to the Confidential Information.')}

        {clause('5', 'Term', 'The obligations of confidentiality set forth in this Agreement shall commence upon electronic acceptance and shall continue for a period of five (5) years, or for as long as the Confidential Information remains a trade secret under applicable law, whichever is longer.')}

        {clause('6', 'Exceptions', 'The obligations of this Agreement shall not apply to information that: (a) is or becomes publicly available through no fault of the Receiving Party; (b) was rightfully known to the Receiving Party prior to disclosure; (c) is independently developed by the Receiving Party without use of the Confidential Information; or (d) is required to be disclosed by law or court order, provided the Receiving Party gives prompt written notice to the Disclosing Party.')}

        {clause('7', 'Remedies', 'The Receiving Party acknowledges that any breach of this Agreement may cause irreparable harm to the Disclosing Party for which monetary damages would be inadequate. Accordingly, the Disclosing Party shall be entitled to seek injunctive relief and other equitable remedies in addition to all other remedies available at law, including damages under the California Uniform Trade Secrets Act (Cal. Civil Code §§ 3426–3426.11) and attorney\'s fees under §3426.4.')}

        {clause('8', 'Governing Law', 'This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions. Any dispute arising under this Agreement shall be subject to the exclusive jurisdiction of the state and federal courts located in California.')}

        {clause('9', 'Entire Agreement', 'This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior and contemporaneous agreements, understandings, negotiations, and discussions, whether oral or written, between the parties relating to the subject matter hereof.')}

        {/* Disclaimer */}
        <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: 1.7 }}>
            <strong style={{ color: 'rgba(255,255,255,0.4)' }}>Legal Disclaimer:</strong> This NDA template is provided for informational purposes and represents the agreement viewers accept when accessing shared ideas on eurekAIdea. It does not constitute legal advice. eurekAIdea is not a law firm. Please consult a licensed attorney to review this agreement for your specific circumstances before relying on it for legal protection.
          </p>
        </div>
      </div>
    </div>
  )
}
