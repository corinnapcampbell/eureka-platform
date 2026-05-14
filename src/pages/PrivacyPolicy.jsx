import { useNavigate } from 'react-router-dom'

const PRIVACY_HTML = `
<style>
  .pp h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; color: #2C2C2A; }
  .pp h2 { font-size: 1.15rem; font-weight: 600; margin: 2rem 0 0.5rem; color: #2C2C2A; }
  .pp p  { font-size: 0.9375rem; line-height: 1.75; color: #555; margin-bottom: 0.75rem; }
  .pp ul { padding-left: 1.5rem; margin-bottom: 0.75rem; }
  .pp li { font-size: 0.9375rem; line-height: 1.75; color: #555; margin-bottom: 0.25rem; }
  .pp a  { color: #3B5273; }
  .pp .meta { font-size: 0.8125rem; color: #888; margin-bottom: 2rem; }
  .pp hr { border: none; border-top: 1px solid #e8e8e6; margin: 2rem 0; }
</style>

<div class="pp">
  <h1>Privacy Policy</h1>
  <p class="meta">Last updated: May 14, 2026 &nbsp;·&nbsp; Effective: May 14, 2026</p>
  <p>
    This Privacy Policy describes how eurekAIdea ("we," "us," or "our"), operated at
    <strong>myeurekaidea.com</strong>, collects, uses, and shares information about you when you
    use our platform. By using eurekAIdea you agree to the practices described here.
  </p>

  <hr />

  <h2>1. Information We Collect</h2>
  <p><strong>Account information.</strong> When you create an account we collect your email address and any profile information you provide.</p>
  <p><strong>Idea content.</strong> We store the ideas, descriptions, attachments, and associated metadata (title, problem statement, solution, market size, target audience, pricing terms) that you submit to the platform.</p>
  <p><strong>Access logs.</strong> When a shared idea is viewed, we log the viewer's email address, IP address, and timestamp as part of the NDA-acceptance flow.</p>
  <p><strong>Usage data.</strong> We automatically collect information about how you interact with the platform, including pages visited, features used, browser type, device type, and referring URLs.</p>
  <p><strong>Communications.</strong> If you contact us by email or through a support channel, we retain those communications.</p>

  <h2>2. How We Use Your Information</h2>
  <ul>
    <li>To create and maintain your account and authenticate you.</li>
    <li>To store, timestamp, and display your submitted ideas.</li>
    <li>To generate AI-powered executive summaries of your ideas using third-party AI services.</li>
    <li>To enforce NDA terms and maintain legally meaningful access trails for shared ideas.</li>
    <li>To send transactional emails (e.g. magic-link sign-in, access notifications).</li>
    <li>To improve, debug, and secure the platform.</li>
    <li>To comply with applicable law and respond to lawful requests.</li>
  </ul>

  <h2>3. AI-Generated Content</h2>
  <p>
    When you click "Generate" on the idea submission form, the title, problem statement, solution,
    target audience, and market size fields are sent to a third-party AI service to produce an
    executive summary. We do not use your idea content to train AI models, and we do not sell
    this data to third parties. Please do not submit ideas that contain highly sensitive personal
    information, trade secrets under active litigation, or classified material.
  </p>

  <h2>4. Sharing of Information</h2>
  <p>We do not sell your personal information. We may share information in the following limited circumstances:</p>
  <ul>
    <li><strong>Service providers.</strong> We use Supabase (database and authentication), Vercel (hosting), and OpenAI / Anthropic (AI summary generation) as sub-processors. Each is bound by data processing agreements.</li>
    <li><strong>Idea recipients you choose.</strong> When you generate a share link and send it to a third party, that person's access (including their email and timestamp) is logged and visible to you.</li>
    <li><strong>Legal compliance.</strong> We may disclose information if required by law, subpoena, or court order, or to protect the rights and safety of our users.</li>
    <li><strong>Business transfers.</strong> In the event of a merger, acquisition, or sale of assets, user data may be transferred as part of that transaction. We will notify you via email and/or a prominent notice on the site.</li>
  </ul>

  <h2>5. Cryptographic Timestamping</h2>
  <p>
    On submission, each idea is hashed and the hash is recorded alongside a server timestamp. This
    record is used to establish a verifiable proof of creation date. It is not stored on a public
    blockchain unless otherwise stated. The hash and timestamp are retained indefinitely even if you
    delete the idea, to preserve the integrity of any prior sharing or access records.
  </p>

  <h2>6. Data Retention</h2>
  <p>
    We retain your account information and idea content for as long as your account is active. If
    you delete an idea, its content is removed from our primary database within 30 days; however,
    access logs and cryptographic hashes associated with that idea are retained for up to 7 years
    to support potential legal proceedings. If you close your account, we delete your personal
    data within 90 days except where retention is required by law.
  </p>

  <h2>7. Cookies and Tracking</h2>
  <p>
    We use essential cookies to maintain your authenticated session. We do not use third-party
    advertising cookies. We may use lightweight, privacy-respecting analytics (e.g. aggregate
    page-view counts) that do not track individuals across sites. You can disable cookies in your
    browser settings, but doing so will prevent you from logging in.
  </p>

  <h2>8. Security</h2>
  <p>
    All data is transmitted over TLS. Passwords are never stored — we use magic-link authentication
    via Supabase. Database access is restricted by row-level security policies so that users can
    only access their own data. Despite these measures, no system is perfectly secure; please
    contact us immediately at <a href="mailto:privacy@myeurekaidea.com">privacy@myeurekaidea.com</a>
    if you suspect unauthorized access to your account.
  </p>

  <h2>9. Your Rights</h2>
  <p>Depending on your location, you may have the right to:</p>
  <ul>
    <li>Access the personal data we hold about you.</li>
    <li>Correct inaccurate personal data.</li>
    <li>Request deletion of your personal data (subject to legal retention requirements).</li>
    <li>Object to or restrict processing of your personal data.</li>
    <li>Receive a portable copy of your data.</li>
    <li>Withdraw consent where processing is based on consent.</li>
  </ul>
  <p>
    To exercise any of these rights, email us at
    <a href="mailto:privacy@myeurekaidea.com">privacy@myeurekaidea.com</a>. We will respond
    within 30 days.
  </p>

  <h2>10. Children's Privacy</h2>
  <p>
    eurekAIdea is not directed at children under 13 (or under 16 in the EU). We do not knowingly
    collect personal information from children. If you believe a child has provided us with personal
    information, please contact us and we will delete it promptly.
  </p>

  <h2>11. International Transfers</h2>
  <p>
    Our infrastructure is based in the United States. If you access eurekAIdea from outside the US,
    your information may be transferred to and processed in the US. We rely on standard contractual
    clauses and other lawful transfer mechanisms where required by applicable law.
  </p>

  <h2>12. Changes to This Policy</h2>
  <p>
    We may update this policy from time to time. When we make material changes, we will update the
    "Last updated" date above and notify you by email or by a notice on the platform. Your continued
    use of eurekAIdea after changes take effect constitutes acceptance of the revised policy.
  </p>

  <h2>13. Contact Us</h2>
  <p>
    If you have questions or concerns about this Privacy Policy, please contact us at:<br />
    <strong>eurekAIdea / myeurekaidea.com</strong><br />
    Email: <a href="mailto:privacy@myeurekaidea.com">privacy@myeurekaidea.com</a>
  </p>

  <hr />
  <p class="meta">&copy; ${new Date().getFullYear()} eurekAIdea. All rights reserved.</p>
</div>
`

export default function PrivacyPolicy() {
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
      <div dangerouslySetInnerHTML={{ __html: PRIVACY_HTML }} />
    </div>
  )
}
