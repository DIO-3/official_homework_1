export async function post(path, body) {
  let response
  try {
    response = await fetch(`/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running.')
  }
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'The request failed.')
  return data
}
