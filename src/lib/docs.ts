import type { CollectionEntry } from 'astro:content';

export type DocEntry = CollectionEntry<'docs'>;

export function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getDocParts(doc: DocEntry) {
  const [section, ...slugParts] = doc.id.split('/');
  const slug = slugParts.join('/');

  return { section, slug };
}

export function getDocUrl(doc: DocEntry) {
  const { section, slug } = getDocParts(doc);
  return `/${section}/${slug}/`;
}

export function getSectionUrl(section: string) {
  return `/${section}/`;
}

export function getSectionTitle(section: string, docs: DocEntry[]) {
  const titledDoc = docs.find((doc) => getDocParts(doc).section === section && doc.data.sectionTitle);
  return titledDoc?.data.sectionTitle ?? titleFromSlug(section);
}

export function getSectionDescription(section: string, docs: DocEntry[]) {
  const describedDoc = docs.find(
    (doc) => getDocParts(doc).section === section && doc.data.sectionDescription
  );

  return describedDoc?.data.sectionDescription ?? `Technical write-ups and notes about ${titleFromSlug(section)}.`;
}

export function getPublishedDocs(docs: DocEntry[]) {
  return docs.filter((doc) => !doc.data.draft && getDocParts(doc).slug.length > 0);
}

export function sortDocs(docs: DocEntry[]) {
  return [...docs].sort((a, b) => {
    if (a.data.order !== b.data.order) {
      return a.data.order - b.data.order;
    }

    return a.data.title.localeCompare(b.data.title);
  });
}

export function groupDocsBySection(docs: DocEntry[]) {
  return sortDocs(docs).reduce<Record<string, DocEntry[]>>((groups, doc) => {
    const { section } = getDocParts(doc);

    groups[section] ??= [];
    groups[section].push(doc);

    return groups;
  }, {});
}
