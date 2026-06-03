// Vercel serverless function — reads/writes the user's board data to a SEPARATE
// data repository on GitHub via the Contents API.
// The GitHub token lives only in process.env. It is NEVER returned to the client.

const GITHUB_API = 'https://api.github.com';

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function requireConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.DATA_REPO_OWNER;
  const repo = process.env.DATA_REPO_NAME;
  if (!token) throw new Error('Server misconfigured: GITHUB_TOKEN missing');
  if (!owner) throw new Error('Server misconfigured: DATA_REPO_OWNER missing');
  if (!repo) throw new Error('Server misconfigured: DATA_REPO_NAME missing');
  return {
    token,
    owner,
    repo,
    path: env('DATA_FILE_PATH', 'board-data.json'),
    branch: env('DATA_BRANCH', 'main')
  };
}

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'bulletin-board-app'
  };
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return await new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      if (!raw) return resolve(null);
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

async function fetchCurrent({ token, owner, repo, path, branch }) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: ghHeaders(token) });
  if (res.status === 404) return { data: null, sha: null };
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub GET failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const content = json.content || '';
  const decoded = Buffer.from(content, 'base64').toString('utf-8');
  let data = null;
  try { data = JSON.parse(decoded); } catch { data = null; }
  return { data, sha: json.sha };
}

async function writeFile({ token, owner, repo, path, branch }, payload, prevSha) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const body = {
    message: `Update board data ${new Date().toISOString()}`,
    content: Buffer.from(JSON.stringify(payload, null, 2), 'utf-8').toString('base64'),
    branch
  };
  if (prevSha) body.sha = prevSha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.content?.sha || null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const cfg = requireConfig();

    if (req.method === 'GET') {
      const { data, sha } = await fetchCurrent(cfg);
      return res.status(200).json({ data, sha });
    }

    if (req.method === 'PUT') {
      const payload = await readBody(req);
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
      const current = await fetchCurrent(cfg);
      const newSha = await writeFile(cfg, payload, current.sha);
      return res.status(200).json({ sha: newSha });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    const msg = (err && err.message) || 'Internal error';
    // Surface a generic error to the client; full details only in server logs.
    console.error('[api/data] error:', msg);
    return res.status(500).json({ error: 'Sync failed' });
  }
}
