const ticketPreviewCache = new Map<string, string>();
const certificatePreviewCache = new Map<string, string>();

function cacheFor(kind: 'ticket' | 'certificate') {
  return kind === 'ticket' ? ticketPreviewCache : certificatePreviewCache;
}

export function getCachedPreviewUrl(kind: 'ticket' | 'certificate', id: string) {
  return cacheFor(kind).get(id) ?? null;
}

export function setCachedPreviewUrl(kind: 'ticket' | 'certificate', id: string, url: string) {
  cacheFor(kind).set(id, url);
}
