let currentVersion: string | null = null
let polling = false

async function checkVersion() {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json() as { version: string }
    if (!currentVersion) {
      currentVersion = data.version
      return
    }
    if (data.version !== currentVersion) {
      window.location.reload()
    }
  } catch {
    // network error, ignore and retry next cycle
  }
}

export function initVersionCheck() {
  if (polling) return
  polling = true
  checkVersion()
  setInterval(checkVersion, 60_000)
}
