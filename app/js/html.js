// Tiny helpers for building markup safely.
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

export function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function pathOf(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.host.replace(/^www\./, '')}${parsed.pathname}`;
  } catch {
    return url;
  }
}
