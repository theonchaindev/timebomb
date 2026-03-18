const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://pump.fun/',
  'Origin': 'https://pump.fun',
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { mint } = req.query
  if (!mint) return res.status(400).json({ error: 'missing mint' })

  // Try bonding curve API first, then PumpSwap API as fallback
  const urls = [
    `https://frontend-api.pump.fun/trades/all?mint=${mint}&limit=25`,
    `https://frontend-api-v3.pump.fun/trades/all?mint=${mint}&limit=25`,
    `https://frontend-api.pump.fun/pumpswap/trades?mint=${mint}&limit=25`,
  ]

  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: HEADERS })
      if (!r.ok) continue
      const data = await r.json()
      if (Array.isArray(data) && data.length > 0) return res.json(data)
      if (Array.isArray(data)) return res.json(data) // empty but valid
    } catch (_) {}
  }

  res.status(502).json({ error: 'all upstream APIs failed' })
}
