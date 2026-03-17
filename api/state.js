const GIST_ID = process.env.GIST_ID
const GH_TOKEN = process.env.GITHUB_TOKEN
const START_SECONDS = 60

async function readGist() {
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: { Authorization: `Bearer ${GH_TOKEN}`, 'User-Agent': 'timebomb' },
  })
  const json = await r.json()
  return JSON.parse(json.files['state.json'].content)
}

async function writeGist(state) {
  await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      'User-Agent': 'timebomb',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files: { 'state.json': { content: JSON.stringify(state) } } }),
  })
}

module.exports = { readGist, writeGist, START_SECONDS }
