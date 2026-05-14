const TERMLY_HTML = `
<div class="termly-embed" data-id="your-termly-policy-id" data-type="iframe"></div>
<script type="text/javascript">(function(d, s, id) {
  var js, tjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s); js.id = id;
  js.src = "https://app.termly.io/embed-policy.min.js";
  tjs.parentNode.insertBefore(js, tjs);
}(document, 'script', 'termly-jssdk'));</script>
`

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div
        style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 2rem' }}
        dangerouslySetInnerHTML={{ __html: TERMLY_HTML }}
      />
    </div>
  )
}
