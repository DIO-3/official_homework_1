async function request(path, method = 'GET', body) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    let response
    try {
      response = await fetch(`/api/${path}`, {
        method,
        signal: controller.signal,
        ...(body === undefined ? {} : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
      })
    } catch {
      throw new Error(controller.signal.aborted
        ? 'The request timed out. Please try again.'
        : 'Cannot reach the server. Check that the backend is running.')
    }
    let data
    try { data = await response.json() }
    catch {
      throw new Error(controller.signal.aborted
        ? 'The request timed out. Please try again.'
        : 'The server returned an unreadable response. Please try again.')
    }
    if (!response.ok) throw new Error(data?.error || `The request failed (${response.status}).`)
    return data
  } finally {
    clearTimeout(timeout)
  }
}

export const get = path => request(path)
export const post = (path, body) => request(path, 'POST', body)
export const remove = path => request(path, 'DELETE')
