import { describe, expect, it } from 'vitest';
import { FileBarChart2, FileSignature, FileText, Receipt } from 'lucide-react';
import { documentIcone } from './documentIcon';

describe('documentIcone', () => {
  it('reconnaît contrats, reçus et rapports', () => {
    expect(documentIcone('contrat')).toBe(FileSignature);
    expect(documentIcone('quittance')).toBe(Receipt);
    expect(documentIcone('recu')).toBe(Receipt);
    expect(documentIcone('releve_gestion')).toBe(FileBarChart2);
    expect(documentIcone('rapport')).toBe(FileBarChart2);
  });

  it('retombe sur un document ordinaire', () => {
    expect(documentIcone('autre')).toBe(FileText);
    expect(documentIcone(null)).toBe(FileText);
  });
});
