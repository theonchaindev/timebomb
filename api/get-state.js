const { readGist } = require('./state')

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')
  try {
    const state = await readGist()
    res.json(state)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
