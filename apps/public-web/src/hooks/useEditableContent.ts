import { useContentBlocks } from './useContentBlocks';

export interface EditableStep {
  title: string;
  description?: string;
}

/**
 * Contenus éditoriaux des pages de services, administrables via les blocs
 * de contenu du back-office (section 5 CDC : « contenus administrables sans
 * intervention du développeur »).
 *
 * Conventions de saisie :
 * - liste simple : une entrée par ligne ;
 * - liste d'étapes : une entrée par ligne au format « Titre | Description ».
 */
export function useEditableContent() {
  const { data, loading, error } = useContentBlocks();

  const raw = (key: string): string | undefined =>
    data?.find((block) => block.key === key)?.content?.trim() || undefined;

  const text = (key: string, fallback: string): string => raw(key) ?? fallback;

  const lines = (key: string, fallback: string[]): string[] => {
    const content = raw(key);
    if (!content) return fallback;
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  };

  const steps = (key: string, fallback: EditableStep[]): EditableStep[] => {
    const content = raw(key);
    if (!content) return fallback;
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, description] = line.split('|').map((part) => part.trim());
        return { title, description: description || undefined };
      });
  };

  return { text, lines, steps, loading, error };
}
