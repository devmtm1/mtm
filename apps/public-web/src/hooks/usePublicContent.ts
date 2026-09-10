import { useEffect, useState } from 'react';
import { getContentBlocks } from '../services/public-api';

export function usePublicContent() {
  const [contentBlocks, setContentBlocks] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void getContentBlocks()
      .then((blocks) => {
        if (!active) return;
        setContentBlocks(blocks);
      })
      .catch(() => {
        if (!active) return;
        setError('Le contenu public n’a pas pu être chargé.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { contentBlocks, loading, error };
}
