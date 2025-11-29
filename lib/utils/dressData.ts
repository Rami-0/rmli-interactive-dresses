import { characterData, type Dress } from '@/lib/constants/characters';

interface ColumnData {
  type: 'left' | 'middle' | 'right';
  content: {
    text: string;
    [key: string]: any;
  };
}

export function getDressById(id: string | number): Dress | null {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return characterData.find(dress => dress.id === numericId) || null;
}

export function prepareDressColumns(dress: Dress): ColumnData[] {
  return [
    {
      type: 'left' as const,
      content: {
        text: 'Dress Illustration',
        image: `/${dress.image}`,
        dressName: dress.name,
      },
    },
    {
      type: 'middle' as const,
      content: {
        text: dress.name,
        region: dress.region,
        regionImage: `/${dress.regionImage}`,
        fabrics: dress.fabrics,
        colors: dress.colors,
      },
    },
    {
      type: 'right' as const,
      content: {
        text: dress.paragraphs.join('\n\n'),
        paragraphs: dress.paragraphs,
      },
    },
  ];
}

