export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { businessModel } = req.body || {}
  if (!businessModel?.trim()) return res.status(400).json({ error: 'businessModel is required' })

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_KEY
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

  const prompt = `Split this business model description into two lists. Return JSON only with this exact format: {"free": ["item1", "item2"], "paid": ["item1", "item2"]}. Business model text: ${businessModel}`

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
    const text = data.content?.[0]?.text?.trim() || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return res.status(200).json({ free: [], paid: [] })

    const parsed = JSON.parse(jsonMatch[0])
    return res.status(200).json({
      free: Array.isArray(parsed.free) ? parsed.free : [],
      paid: Array.isArray(parsed.paid) ? parsed.paid : [],
    })
  } catch (err) {
    console.error('split-business-model error:', err)
    return res.status(500).json({ error: 'Failed to split business model' })
  }
}
