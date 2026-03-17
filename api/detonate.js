const { readGist, writeGist } = require('./state')

const TOKEN      = '6c8Hi9DYc4zznGyN5hMYwuq6QpFC74SpChxJisXWpump'
const DEV_WALLET = 'Gp2e7TqSav3ZzXZNkfJ3c4psZZzH2jsES72P6vBMNhdf'
const RPC_URL    = 'https://api.mainnet-beta.solana.com'

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const privKey = process.env.DEV_WALLET_PRIVATE_KEY
  if (!privKey) return res.status(500).json({ error: 'DEV_WALLET_PRIVATE_KEY not configured' })

  try {
    // Guard: read state, mark detonated to prevent double-execution
    const state = await readGist()
    if (state.detonated) return res.json({ ok: true, already: true })
    await writeGist({ ...state, detonated: true })

    // Load heavy deps lazily (avoids slowing down other endpoints on cold start)
    const { VersionedTransaction, Keypair, Connection } = require('@solana/web3.js')
    const bs58 = require('bs58')

    // Accept private key as base58 string or JSON array (both common export formats)
    const pk = privKey.trim()
    const secretKey = pk.startsWith('[')
      ? new Uint8Array(JSON.parse(pk))
      : bs58.decode(pk)
    const keypair = Keypair.fromSecretKey(secretKey)

    // Get unsigned transaction from PumpPortal
    const ppRes = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: DEV_WALLET,
        action:    'sell',
        mint:      TOKEN,
        amount:    '100%',         // sell entire balance
        denominatedInSol: 'false',
        slippage:  50,             // aggressive slippage to ensure execution
        priorityFee: 0.005,
        pool: 'pump',
      }),
    })

    if (!ppRes.ok) {
      const detail = await ppRes.text()
      return res.status(500).json({ error: 'PumpPortal request failed', detail })
    }

    const txBytes = await ppRes.arrayBuffer()
    const tx = VersionedTransaction.deserialize(new Uint8Array(txBytes))
    tx.sign([keypair])

    // Submit — don't await confirmation to stay within serverless timeout
    const connection = new Connection(RPC_URL, 'confirmed')
    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    })

    res.json({ ok: true, sig })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
