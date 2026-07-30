import { writeFileSync } from 'fs'

const version = new Date().toISOString()

writeFileSync(
  'dist/version.json',
  JSON.stringify({ version, buildTime: version }),
)
