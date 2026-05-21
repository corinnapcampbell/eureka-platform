import { useNavigate } from 'react-router-dom'
import Logo from '../../components/Logo'

export default function TradeSecrets() {
  const navigate = useNavigate()

  const section = (num, title, children) => (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: '0.75rem' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#7b9ff7', textTransform: 'uppercase', letterSpacing: '0.8px', flexShrink: 0 }}>§ {num}</span>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>{title}</h2>
      </div>
      <div style={{ paddingLeft: '1.5rem', borderLeft: '2px solid rgba(123,159,247,0.2)' }}>
        {children}
      </div>
    </div>
  )

  const p = (text, highlight) => (
    <p style={{ fontSize: 14, color: highlight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)', lineHeight: 1.8, margin: '0 0 0.75rem', fontWeight: highlight ? 500 : 400 }}>{text}</p>
  )

  const def = (term, definition) => (
    <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(123,159,247,0.05)', borderRadius: 8, border: '0.5px solid rgba(123,159,247,0.12)' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#7b9ff7' }}>"{term}"</span>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}> — {definition}</span>
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
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 0.75rem', letterSpacing: '-0.3px' }}>California Uniform Trade Secrets Act</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: '0 0 1.5rem' }}>California Civil Code §§ 3426–3426.11 · Adopted 1984 · Verified May 2025</p>

          {/* eurekAIdea context box */}
          <div style={{ background: 'rgba(123,159,247,0.08)', border: '1px solid rgba(123,159,247,0.2)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#7b9ff7', margin: '0 0 0.5rem' }}>📋 How this protects your ideas on eurekAIdea</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: 0 }}>Every idea submitted on eurekAIdea qualifies as a trade secret under California law provided it has economic value and you take reasonable steps to maintain its secrecy. Our blockchain timestamp, NDA-gated sharing, and access logs constitute those "reasonable steps" under §3426.1(d). Any unauthorized disclosure or use of your idea by a viewer may constitute misappropriation under §3426.1(b), entitling you to injunctive relief, damages, and attorney's fees.</p>
          </div>
        </div>

        {/* Sections */}
        {section('3426', 'Title', <>
          {p('This title may be cited as the Uniform Trade Secrets Act.', true)}
          {p('(Added by Stats. 1984, Ch. 1724, Sec. 1.)')}
        </>)}

        {section('3426.1', 'Definitions', <>
          {p('As used in this title, unless the context requires otherwise:')}
          {def('Improper means', 'Includes theft, bribery, misrepresentation, breach or inducement of a breach of a duty to maintain secrecy, or espionage through electronic or other means. Reverse engineering or independent derivation alone shall not be considered improper means.')}
          {def('Misappropriation', 'Acquisition of a trade secret of another by a person who knows or has reason to know that the trade secret was acquired by improper means; or disclosure or use of a trade secret without express or implied consent by a person who used improper means to acquire it, or knew the secret was acquired under circumstances giving rise to a duty to maintain secrecy.')}
          {def('Trade secret', 'Information, including a formula, pattern, compilation, program, device, method, technique, or process, that: (1) derives independent economic value, actual or potential, from not being generally known to the public or to other persons who can obtain economic value from its disclosure or use; and (2) is the subject of efforts that are reasonable under the circumstances to maintain its secrecy.')}
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(74,222,128,0.05)', borderRadius: 8, border: '0.5px solid rgba(74,222,128,0.15)' }}>
            <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, margin: '0 0 4px' }}>✓ Your ideas qualify</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>Business ideas, product concepts, processes, and methods submitted on eurekAIdea meet this definition — they have commercial value and are kept secret via NDA-gated access and blockchain-timestamped records.</p>
          </div>
        </>)}

        {section('3426.2', 'Injunctive Relief', <>
          {p('Actual or threatened misappropriation may be enjoined. Upon application to the court, an injunction shall be terminated when the trade secret has ceased to exist, but the injunction may be continued for an additional period of time in order to eliminate commercial advantage that otherwise would be derived from the misappropriation.', true)}
          {p('If the court determines that it would be unreasonable to prohibit future use, an injunction may condition future use upon payment of a reasonable royalty for no longer than the period of time the use could have been prohibited.')}
          {p('In appropriate circumstances, affirmative acts to protect a trade secret may be compelled by court order.')}
        </>)}

        {section('3426.3', 'Damages', <>
          {p('A complainant may recover damages for the actual loss caused by misappropriation. A complainant also may recover for the unjust enrichment caused by misappropriation that is not taken into account in computing damages for actual loss.', true)}
          {p('If willful and malicious misappropriation exists, the court may award exemplary damages in an amount not exceeding twice any award made under subdivision (a).')}
        </>)}

        {section('3426.4', 'Attorney\'s Fees', <>
          {p('If a claim of misappropriation is made in bad faith, a motion to terminate an injunction is made or resisted in bad faith, or willful and malicious misappropriation exists, the court may award reasonable attorney\'s fees and costs to the prevailing party.', true)}
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(123,159,247,0.05)', borderRadius: 8, border: '0.5px solid rgba(123,159,247,0.12)', marginTop: '0.5rem' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>This means that if someone misappropriates your idea willfully, you may be entitled not only to damages but also to recover your legal costs.</p>
          </div>
        </>)}

        {section('3426.5', 'Preservation of Secrecy', <>
          {p('In an action under this title, a court shall preserve the secrecy of an alleged trade secret by reasonable means, which may include granting protective orders in connection with discovery proceedings, holding in-camera hearings, sealing the records of the action, and ordering any person involved in the litigation not to disclose an alleged trade secret without prior court approval.', true)}
        </>)}

        {section('3426.6', 'Statute of Limitations', <>
          {p('An action for misappropriation must be brought within three years after the misappropriation is discovered or by the exercise of reasonable diligence should have been discovered.', true)}
          {p('For the purposes of this section, a continuing misappropriation constitutes a single claim.')}
        </>)}

        {section('3426.7', 'Effect on Other Law', <>
          {p('Except as otherwise expressly provided, this title does not supersede any statute relating to misappropriation of a trade secret, or any statute otherwise regulating trade secrets.')}
          {p('This title does not affect: (1) contractual remedies, whether or not based upon misappropriation of a trade secret; (2) other civil remedies that are not based upon misappropriation of a trade secret; or (3) criminal remedies, whether or not based upon misappropriation of a trade secret.')}
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(123,159,247,0.05)', borderRadius: 8, border: '0.5px solid rgba(123,159,247,0.12)', marginTop: '0.5rem' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>Note: California also provides criminal penalties for trade secret theft under Penal Code §499c, and federal protection under the Defend Trade Secrets Act (DTSA, 18 U.S.C. §1836) allows claims to be filed directly in federal court.</p>
          </div>
        </>)}

        {section('3426.8', 'Uniformity', <>
          {p('This title shall be applied and construed to effectuate its general purpose to make uniform the law with respect to the subject of this title among states enacting it.')}
        </>)}

        {section('3426.9', 'Severability', <>
          {p('If any provision of this title or its application to any person or circumstances is held invalid, the invalidity does not affect other provisions or applications of the title which can be given effect without the invalid provision or application, and to this end the provisions of this title are severable.')}
        </>)}

        {section('3426.10', 'Application', <>
          {p('This title does not apply to misappropriation occurring prior to January 1, 1985.')}
        </>)}

        {section('3426.11', 'Scope', <>
          {p('This title applies to the misappropriation of a trade secret when the matter at issue relates to a product or service in commerce.')}
        </>)}

        {/* Disclaimer */}
        <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: 1.7 }}>
            <strong style={{ color: 'rgba(255,255,255,0.4)' }}>Legal Disclaimer:</strong> This page presents the California Uniform Trade Secrets Act (Cal. Civil Code §§ 3426–3426.11) for informational purposes only. It does not constitute legal advice. eurekAIdea is not a law firm and does not provide legal representation. The law displayed here was verified against official California legislative sources as of May 2025. For legal advice specific to your situation, please consult a licensed attorney. You can find a certified lawyer referral service at <a href="https://www.calbar.ca.gov/Public/Need-Legal-Help/Lawyer-Referral-Service" target="_blank" rel="noopener noreferrer" style={{ color: '#7b9ff7' }}>calbar.ca.gov</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
