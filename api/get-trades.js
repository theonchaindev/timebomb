module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { mint } = req.query
  if (!mint) return res.status(400).json({ error: 'missing mint' })

  try {
    const r = await fetch(`https://frontend-api.pump.fun/trades/all?mint=${mint}&limit=25`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://pump.fun/',
        'Origin': 'https://pump.fun',
      },
    })
    if (!r.ok) return res.status(r.status).json({ error: `upstream ${r.status}` })
    const data = await r.json()
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
