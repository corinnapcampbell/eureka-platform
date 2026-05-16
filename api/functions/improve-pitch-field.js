export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { idea, field, currentValue } = req.body || {}
  if (!idea?.title || !field) return res.status(400).json({ error: 'idea.title and field are required' })

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const instructions = {
    tagline:               'One punchy sentence (max 15 words) capturing the essence of the idea.',
    problem:               'Two or three sentences describing the core pain point this idea solves.',
    solution:              'Two or three sentences describing how the idea solves the problem.',
    how_it_works:          'Exactly 3 numbered steps, one per line, starting with "1. ", "2. ", "3. ".',
    market_size:           'One to two sentences including at least one dollar figure with B/M suffix (e.g. "$4.2B global market").',
    target_audience:       'Comma-separated list of 3-5 specific audience segments.',
    business_model:        'Two lines: first starting with "Free: ...", second starting with "Paid: ...".',
    competitive_advantage: 'Two or three sentences on what makes this uniquely positioned to win.',
    risks:                 'Exactly 3 risks, one per line, each starting with the risk name followed by a colon.',
    next_steps:            'Exactly 3 action items, one per line, each starting with a verb.',
  }

  const contextLines = Object.entries(idea)
    .filter(([k, v]) => typeof v === 'string' && v.trim() && k !== field && k !== 'id' && k !== 'user_id')
    .map(([k, v]) => `${k}: ${v.slice(0, 300)}`)
    .join('\n\n')

  const prompt = `You are a startup pitch writer. Improve the "${field}" section of a pitch document.

IDEA TITLE: ${idea.title}

FULL IDEA CONTEXT:
${contextLines || '(only the title is provided)'}

CURRENT VALUE:
${currentValue?.trim() || '(empty)'}

INSTRUCTION: ${instructions[field] || 'Write 2-3 clear, professional sentences.'}

Return ONLY the improved text. No explanation, no label, no markdown, no surrounding quotes.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      console.error('Anthropic error:', await response.text())
      return res.status(502).json({ error: 'AI API error' })
    }

    const data = await response.json()
    const improved = data.content?.[0]?.text?.trim() || ''
    return res.status(200).json({ improved })
  } catch (err) {
    console.error('improve-pitch-field error:', err)
    return res.status(500).json({ error: 'Failed to improve field' })
  }
}
