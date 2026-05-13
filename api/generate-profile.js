export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { title, problem, solution, target_audience, market_size } = req.body

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are a professional startup analyst. Given an idea, write a concise, compelling 3-paragraph executive summary suitable for presenting to investors or companies. Be specific, professional, and focus on the problem, solution, and market opportunity. Return only the summary text, no headers or markdown.',
        messages: [{
          role: 'user',
          content: `Idea title: ${title}\nTarget audience: ${target_audience}\nProblem: ${problem}\nSolution: ${solution}\nMarket size: ${market_size}`
        }]
      })
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    res.status(200).json({ profile: text })
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate profile' })
  }
}