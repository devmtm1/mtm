export type ShowcaseCategory = 'realisation' | 'projet_a_venir';

export interface ShowcaseItem {
  id: string;
  category: ShowcaseCategory | string;
  title: string;
  description: string | null;
  location: string | null;
  date: string | null;
  ordre: number;
  imageUrl: string | null;
}
