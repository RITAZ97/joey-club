import { config } from 'dotenv'

config({ path: '.env.local' })

async function run(): Promise<void> {
  const argumentsList = process.argv.slice(2).filter((argument) => argument !== '--')
  const limitFlagIndex = argumentsList.indexOf('--limit')
  const requestedLimit = limitFlagIndex >= 0 ? Number(argumentsList[limitFlagIndex + 1]) : 3
  const limit = Number.isInteger(requestedLimit) && requestedLimit >= 1 && requestedLimit <= 3 ? requestedLimit : 3
  const query = argumentsList
    .filter((argument, index) => index !== limitFlagIndex && index !== limitFlagIndex + 1)
    .join(' ')
    .trim()
  if (!query) {
    throw new Error('Provide a discovery query. Example: pnpm ai:import -- "sensory play for toddlers"')
  }

  const { discoverActivityUrls, reviewAndStoreActivityUrl } = await import('../lib/ai/resource-importer')
  const candidates = await discoverActivityUrls(query, limit)
  const imported = []

  for (const candidate of candidates) {
    try {
      imported.push(await reviewAndStoreActivityUrl(candidate.url, candidate))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown import error.'
      console.error(`Skipped ${candidate.url}: ${message}`)
    }
  }

  console.table(imported)
}

run().catch((error: unknown) => {
  if (error instanceof Error && /limit:\s*0|free.?tier.*requests.*0/i.test(error.message)) {
    console.error('AI import paused: this Gemini project has no free Search grounding quota. Add Gemini billing or use a non-search discovery source, then rerun the command.')
    process.exitCode = 1
    return
  }

  if (error instanceof Error && /429|RESOURCE_EXHAUSTED|quota/i.test(error.message)) {
    console.error('AI import paused: Gemini free-tier quota has been reached. Wait for the quota reset or enable Gemini billing, then rerun the command.')
    process.exitCode = 1
    return
  }

  console.error('AI import failed.', error)
  process.exitCode = 1
})
