const ENDPOINT = '/api/data';

export async function fetchRemote(signal) {
  const res = await fetch(ENDPOINT, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal
  });
  if (!res.ok) throw new Error(`GET /api/data ${res.status}`);
  return await res.json();
}

export async function pushRemote(payload, signal) {
  const res = await fetch(ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal
  });
  if (!res.ok) throw new Error(`PUT /api/data ${res.status}`);
  return await res.json();
}
