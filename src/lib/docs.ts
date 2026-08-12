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
  const titledDoc = docs.find((doc) => {
    const parts = getDocParts(doc);
    return parts.section === section && parts.slug === 'title';
  });

  return titledDoc?.data.title ?? section;
}

export function getSectionDescription(section: string, docs: DocEntry[]) {
  const describedDoc = docs.find(
    (doc) => {
      const parts = getDocParts(doc);
      return parts.section === section && parts.slug === 'title';
    }
  );

  return describedDoc?.data.description ?? '';
}

export function getPublishedDocs(docs: DocEntry[]) {
  return docs.filter((doc) => {
    const { slug } = getDocParts(doc);
    return !doc.data.draft && slug.length > 0 && slug !== 'title';
  });
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
