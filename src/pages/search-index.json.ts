import { getCollection } from 'astro:content';

export async function GET() {
  const karyaEntries = await getCollection('karya');
  const quotesEntries = await getCollection('quotes');

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

  const karyaIndex = karyaEntries.map(entry => ({
    title: entry.data.title,
    author: entry.data.author,
    category: entry.data.category,
    categoryLabel: entry.data.categoryLabel,
    description: entry.data.description,
    tags: entry.data.tags,
    url: `${basePath}/karya/${entry.id}`,
    type: 'karya',
  }));

  const quotesIndex = quotesEntries.map(entry => ({
    title: entry.data.quote.substring(0, 60) + '...',
    author: entry.data.author,
    category: 'quotes',
    categoryLabel: 'Quotes',
    description: entry.data.quote,
    tags: [entry.data.category || 'Quotes'],
    url: `${basePath}/quotes`,
    type: 'quote',
  }));

  const fullIndex = [...karyaIndex, ...quotesIndex];

  return new Response(JSON.stringify(fullIndex), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
