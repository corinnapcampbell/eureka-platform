const MARKER = '/storage/v1/object/public/idea-assets/'

export function ideaAssetPath(url) {
  if (!url || typeof url !== 'string') return null
  const idx = url.indexOf(MARKER)
  if (idx === -1) return null
  const path = decodeURIComponent(url.slice(idx + MARKER.length).split('?')[0])
  if (!path) return null
  return path
}

export async function signIdeaAssetUrls(supabase, urls) {
  const toSign = []
  const originals = {}
  for (const url of urls) {
    const path = ideaAssetPath(url)
    if (!path) continue
    toSign.push(path)
    originals[path] = url
  }
  if (toSign.length === 0) return {}
  const { data } = await supabase.storage.from('idea-assets').createSignedUrls(toSign, 3600)
  if (!data) return {}
  const map = {}
  for (const item of data) {
    if (item.signedUrl && item.path && originals[item.path]) map[originals[item.path]] = item.signedUrl
  }
  return map
}
