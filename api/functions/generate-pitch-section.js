export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { section_name, existing_sections = {}, idea_context = {} } = req.body || {}

  if (!section_name) {
    return res.status(400).json({ error: 'section_name is required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Anthropic API key not configured' })
  }

  // Build a readable summary of what the user has already written
  const sectionLabels = {
    tagline: 'Tagline',
    problem: 'Problem',
    solution: 'Solution',
    how_it_works: 'How It Works',
    target_audience: 'Target Market',
    market_size: 'Market Size',
    business_model: 'Business Model',
    competitive_advantage: 'Competitive Advantage',
    risks: 'Risks & Challenges',
    next_steps: 'Next Steps',
  }

  const filledSections = Object.entries(existing_sections)
    .filter(([key, value]) => value?.trim() && key !== section_name)
    .map(([key, value]) => `${sectionLabels[key] || key}: ${value.trim()}`)
    .join('\n\n')

  const sectionLabel = sectionLabels[section_name] || section_name

  const prompt = `You are helping an entrepreneur refine their startup pitch. Based on what they have already written, suggest content for the "${sectionLabel}" section of their pitch deck.

This is a SUGGESTION to help them articulate their own thinking — not a replacement for their authentic voice. Ground the suggestion entirely in the context they have already provided. Do not invent facts, numbers, or claims that are not implied by their existing text. Keep it concise (2–4 sentences), written in a confident and professional pitch tone.

IDEA TITLE: ${idea_context.title || '(not provided)'}

WHAT THE FOUNDER HAS WRITTEN SO FAR:
${filledSections || '(No other sections completed yet — write a general suggestion based on the idea title.)'}

Write a suggestion for the "${sectionLabel}" section now. Return only the suggestion text — no preamble, no explanation, no quotation marks around it.`

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
      const detail = await response.text()
      console.error('Anthropic error:', detail)
      return res.status(502).json({ error: 'Anthropic API error' })
    }

    const data = await response.json()
    const suggestion = data.content?.[0]?.text?.trim() || ''
    return res.status(200).json({ suggestion })
  } catch (err) {
    console.error('generate-pitch-section error:', err)
    return res.status(500).json({ error: 'Failed to generate suggestion' })
  }
}
