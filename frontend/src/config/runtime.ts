type DetectApi = () => Promise<unknown>

export function isStaticDemoBuild(value = import.meta.env.VITE_STATIC_DEMO): boolean {
  return value === 'true'
}

export async function initializeRepositoryMode(
  detectApi: DetectApi,
  staticDemo = import.meta.env.VITE_STATIC_DEMO,
): Promise<void> {
  if (isStaticDemoBuild(staticDemo)) return
  await detectApi()
}
