const prefix = "spiderportfolio:page-draft:";

export function localDraftKey(pageId) {
  return `${prefix}${pageId}`;
}

export function sameData(a, b) {
  try {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  } catch {
    return false;
  }
}

export function readLocalDraft(pageId) {
  try {
    const raw = localStorage.getItem(localDraftKey(pageId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalDraft(pageId, data) {
  try {
    localStorage.setItem(
      localDraftKey(pageId),
      JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        data,
      }),
    );
  } catch {
    return false;
  }
  return true;
}

export function clearLocalDraft(pageId) {
  try {
    localStorage.removeItem(localDraftKey(pageId));
  } catch {
    return false;
  }
  return true;
}

export function countBlocks(data) {
  let total = 0;
  function walk(items = []) {
    items.forEach((item) => {
      total += 1;
      walk(item.props?.content || []);
    });
  }
  walk(data?.content || []);
  return total;
}
