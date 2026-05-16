export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { idea } = req.body || {}
  if (!idea?.title) return res.status(400).json({ error: 'idea.title is required' })

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const FIELDS = ['tagline', 'problem', 'solution', 'how_it_works', 'market_size',
    'business_model', 'competitive_advantage', 'risks', 'next_steps', 'target_audience']

  const missing = FIELDS.filter(f => !idea[f]?.trim())
  if (missing.length === 0) return res.status(200).json({ filled: {} })

  const context = FIELDS
    .filter(f => idea[f]?.trim())
    .map(f => `${f}: ${idea[f].trim()}`)
    .join('\n\n')

  const fieldInstructions = {
    tagline: 'One punchy sentence (max 15 words) capturing the essence of the idea.',
    problem: 'Two or three sentences describing the core pain point.',
    solution: 'Two or three sentences describing the solution.',
    how_it_works: 'Exactly 3 numbered steps, one per line (e.g. "Step 1: User does X").',
    market_size: 'Include at least one dollar figure with B/M suffix (e.g. "$4.2B global market").',
    business_model: 'Start with "Free: ..." on the first line, "Paid: ..." on the second line.',
    competitive_advantage: 'Two or three sentences on what makes this uniquely positioned to win.',
    risks: 'Exactly 3 risks, one per line, each starting with the risk name.',
    next_steps: 'Exactly 3 or 4 action items, one per line, each starting with a verb.',
    target_audience: 'Comma-separated list of 3-5 audience segments (e.g. "Founders, Investors, Enterprises").',
  }

  const fieldList = missing.map(f => `- ${f}: ${fieldInstructions[f] || 'Write 2-3 sentences.'}`).join('\n')

  const prompt = `You are a startup pitch writer. Fill in the missing sections of a pitch document based on the context provided. Be specific, professional, and ground everything in the context. Do not invent numbers or facts not implied by the context.

IDEA TITLE: ${idea.title}

WHAT WE KNOW:
${context || '(only the title is provided)'}

MISSING SECTIONS TO FILL:
${fieldList}

Return ONLY a valid JSON object with the missing field names as keys and your generated text as string values. Use \\n for line breaks within a value. No explanation, no markdown, no surrounding text.`

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
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      console.error('Anthropic error:', await response.text())
      return res.status(502).json({ error: 'AI API error' })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text?.trim() || '{}'

    let filled = {}
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) filled = JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('JSON parse error:', e, text)
    }

    return res.status(200).json({ filled })
  } catch (err) {
    console.error('fill-pitch-fields error:', err)
    return res.status(500).json({ error: 'Failed to fill fields' })
  }
}
