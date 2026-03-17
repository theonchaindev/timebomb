// Issues subscribe-only Ably tokens for browser clients
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  const key = process.env.ABLY_API_KEY
  if (!key) return res.status(500).json({ error: 'ABLY_API_KEY not set' })

  const encoded = Buffer.from(key).toString('base64')
  const resp = await fetch('https://rest.ably.io/keys/' + key.split(':')[0] + '/requestToken', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      capability: JSON.stringify({ timebomb: ['subscribe', 'history'] }),
      ttl: 3600000, // 1 hour
    }),
  })

  if (!resp.ok) return res.status(500).json({ error: 'token request failed' })
  const token = await resp.json()
  res.json(token)
}
