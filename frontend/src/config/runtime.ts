type DetectApi = () => Promise<unknown>

export async function initializeRepositoryMode(
  detectApi: DetectApi,
  staticDemo = import.meta.env.VITE_STATIC_DEMO,
): Promise<void> {
  if (staticDemo === 'true') return
  await detectApi()
}
