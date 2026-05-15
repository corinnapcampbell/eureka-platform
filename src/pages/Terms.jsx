import { useNavigate } from 'react-router-dom'

const TERMS_HTML = `
<style>
  .tos h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; color: #2C2C2A; }
  .tos h2 { font-size: 1.15rem; font-weight: 600; margin: 2rem 0 0.5rem; color: #2C2C2A; }
  .tos p  { font-size: 0.9375rem; line-height: 1.75; color: #555; margin-bottom: 0.75rem; }
  .tos ul { padding-left: 1.5rem; margin-bottom: 0.75rem; }
  .tos li { font-size: 0.9375rem; line-height: 1.75; color: #555; margin-bottom: 0.25rem; }
  .tos a  { color: #3B5273; }
  .tos .meta { font-size: 0.8125rem; color: #888; margin-bottom: 2rem; }
  .tos hr { border: none; border-top: 1px solid #e8e8e6; margin: 2rem 0; }
</style>

<div class="tos">
  <h1>Terms of Use</h1>
  <p class="meta">Last updated: May 15, 2026 &nbsp;·&nbsp; Effective: May 15, 2026</p>
  <p>
    These Terms of Use ("Terms") govern your access to and use of eurekAIdea, operated at
    <strong>myeurekaidea.com</strong> ("we," "us," or "our"). By creating an account or using the
    platform in any way, you agree to be bound by these Terms. If you do not agree, do not use the
    platform.
  </p>

  <hr />

  <h2>1. Eligibility</h2>
  <p>
    You must be at least 13 years old (or 16 in the EU) to use eurekAIdea. By using the platform
    you represent that you meet this requirement and that you have the legal capacity to enter into
    a binding agreement.
  </p>

  <h2>2. Your Account</h2>
  <p>
    You are responsible for maintaining the security of your account. We use magic-link
    authentication — no passwords are stored. You agree to notify us immediately at
    <a href="mailto:support@myeurekaidea.com">support@myeurekaidea.com</a> if you suspect
    unauthorized access. We are not liable for losses resulting from unauthorized use of your
    account.
  </p>

  <h2>3. Submitted Content</h2>
  <p>
    You retain full ownership of any ideas, text, or other content you submit to eurekAIdea
    ("Content"). By submitting Content, you grant us a limited, non-exclusive, royalty-free licence
    to store, display, and process it solely for the purpose of operating the platform — including
    generating AI summaries and creating share links on your behalf.
  </p>
  <p>
    You represent that you have the right to submit your Content and that it does not infringe any
    third-party intellectual property rights, violate any law, or contain malicious code.
  </p>

  <h2>4. AI-Generated Summaries</h2>
  <p>
    The "Generate" feature sends portions of your submitted Content to a third-party AI service to
    produce an executive summary. We do not guarantee the accuracy, completeness, or fitness for
    any purpose of AI-generated text. You should review any generated summary before sharing it.
    AI-generated content does not constitute legal, financial, or professional advice.
  </p>

  <h2>5. NDA-Gated Sharing</h2>
  <p>
    When you generate a share link, anyone who accesses it must confirm NDA terms before viewing
    your idea. You acknowledge that:
  </p>
  <ul>
    <li>The NDA confirmation is a digital acknowledgement by the viewer, not a formally executed legal contract.</li>
    <li>While the access log and NDA confirmation create a meaningful evidentiary record, eurekAIdea does not guarantee any specific legal outcome.</li>
    <li>You are responsible for deciding who to share your link with.</li>
  </ul>

  <h2>6. Cryptographic Timestamping</h2>
  <p>
    On submission, a cryptographic hash of your idea is generated and stored alongside a server
    timestamp. This provides a verifiable record of when content was submitted. We make no warranty
    that this timestamp will be accepted as evidence in any particular jurisdiction or legal
    proceeding, and you should consult a qualified attorney regarding your specific situation.
  </p>

  <h2>7. Prohibited Conduct</h2>
  <p>You agree not to:</p>
  <ul>
    <li>Submit content that is unlawful, defamatory, obscene, or infringes third-party rights.</li>
    <li>Use the platform to store or distribute malware, spam, or phishing content.</li>
    <li>Attempt to reverse-engineer, scrape, or circumvent any security feature of the platform.</li>
    <li>Create multiple accounts to abuse free-tier limits or evade a suspension.</li>
    <li>Impersonate another person or entity in any NDA-acceptance flow.</li>
  </ul>

  <h2>8. Intellectual Property</h2>
  <p>
    All platform software, design, trademarks, and branding (including the eurekAIdea name and
    logo) are owned by us and may not be used without prior written permission. Nothing in these
    Terms transfers any intellectual property rights to you beyond the limited licence to use the
    platform as intended.
  </p>

  <h2>9. Disclaimer of Warranties</h2>
  <p>
    The platform is provided "as is" and "as available" without warranties of any kind, express or
    implied, including but not limited to merchantability, fitness for a particular purpose, or
    non-infringement. We do not warrant that the platform will be uninterrupted, error-free, or
    free of harmful components.
  </p>

  <h2>10. Limitation of Liability</h2>
  <p>
    To the fullest extent permitted by law, eurekAIdea and its operators shall not be liable for
    any indirect, incidental, special, consequential, or punitive damages arising from your use of
    the platform, even if advised of the possibility of such damages. Our total liability to you
    for any claim shall not exceed the greater of $50 or the amount you paid us in the 12 months
    preceding the claim.
  </p>

  <h2>11. Indemnification</h2>
  <p>
    You agree to indemnify and hold harmless eurekAIdea and its operators from any claims, damages,
    or expenses (including reasonable legal fees) arising from your use of the platform, your
    Content, or your violation of these Terms.
  </p>

  <h2>12. Termination</h2>
  <p>
    We may suspend or terminate your account at any time if we reasonably believe you have violated
    these Terms. You may close your account at any time by contacting us. On termination, your
    Content will be deleted within 90 days, subject to legal retention obligations described in our
    Privacy Policy.
  </p>

  <h2>13. Changes to These Terms</h2>
  <p>
    We may update these Terms from time to time. When we make material changes, we will update the
    "Last updated" date above and notify you by email or by a notice on the platform. Continued use
    of the platform after the effective date constitutes acceptance of the updated Terms.
  </p>

  <h2>14. Governing Law</h2>
  <p>
    These Terms are governed by the laws of the State of Delaware, United States, without regard to
    conflict-of-law principles. Any disputes shall be resolved exclusively in the state or federal
    courts located in Delaware, and you consent to personal jurisdiction there.
  </p>

  <h2>15. Contact</h2>
  <p>
    For questions about these Terms, contact us at:<br />
    <strong>eurekAIdea / myeurekaidea.com</strong><br />
    Email: <a href="mailto:support@myeurekaidea.com">support@myeurekaidea.com</a>
  </p>

  <hr />
  <p class="meta">&copy; ${new Date().getFullYear()} eurekAIdea. All rights reserved.</p>
</div>
`

export default function Terms() {
  const navigate = useNavigate()
  return (
    <div style={{ backgroundColor: '#fff', maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
      <button
        onClick={() => navigate('/')}
        style={{
          background: '#2C2C2A', color: '#fff', border: 'none',
          borderRadius: 8, padding: '10px 20px', fontSize: 14,
          fontWeight: 500, cursor: 'pointer', marginBottom: 24,
        }}
      >
        ← Back to eurekAIdea
      </button>
      <div dangerouslySetInnerHTML={{ __html: TERMS_HTML }} />
    </div>
  )
}
