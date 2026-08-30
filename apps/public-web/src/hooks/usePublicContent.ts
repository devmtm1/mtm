import { useEffect, useState } from 'react';
import { getContentBlocks } from '../services/public-api';

export function usePublicContent() {
  const [contentBlocks, setContentBlocks] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    let active = true;
    void getContentBlocks()
      .then((blocks) => {
        if (active) setContentBlocks(blocks);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  return contentBlocks;
}
