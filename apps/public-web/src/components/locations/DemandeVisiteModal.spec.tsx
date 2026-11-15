import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DemandeVisiteModal } from './DemandeVisiteModal';

const envoyer = vi.hoisted(() => vi.fn());

vi.mock('../../api/contact', () => ({ sendContactMessage: (...args: unknown[]) => envoyer(...args) }));
vi.mock('../../contexts/auth-context-store', () => ({ useClientSession: () => null }));

function afficher(onClose = vi.fn()) {
  render(
    <DemandeVisiteModal
      bienLocatifId="loc-1"
      titre="Villa F4 avec jardin à Mermoz"
      reference="L-2026-0002"
      whatsapp="221783662651"
      messageWhatsapp="Bonjour"
      onClose={onClose}
    />,
  );
  return onClose;
}

async function remplir(utilisateur: ReturnType<typeof userEvent.setup>, { date = '2030-05-04', heure = '10 h 00' } = {}) {
  await utilisateur.type(screen.getByLabelText(/nom complet/i), 'Awa Diop');
  await utilisateur.type(screen.getByLabelText(/^téléphone/i), '771234567');
  if (date) await utilisateur.type(screen.getByLabelText(/date souhaitée/i), date);
  if (heure) await utilisateur.selectOptions(screen.getByLabelText(/heure souhaitée/i), heure);
}

describe('DemandeVisiteModal', () => {
  beforeEach(() => {
    envoyer.mockReset();
    envoyer.mockResolvedValue({});
  });

  it('présente une demande courte, avec le message facultatif et WhatsApp en dessous', () => {
    afficher();
    expect(screen.getByText('Organisons votre visite')).toBeTruthy();
    expect(screen.getByLabelText(/message \(facultatif\)/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /confirmer ma demande de visite/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /discuter avec un conseiller sur whatsapp/i }).getAttribute('href')).toContain('https://wa.me/221783662651');
  });

  it('envoie le bien, la date et l’heure souhaitées, sans exiger de message', async () => {
    const utilisateur = userEvent.setup();
    afficher();
    await remplir(utilisateur);
    await utilisateur.click(screen.getByRole('button', { name: /confirmer ma demande de visite/i }));

    await waitFor(() => expect(envoyer).toHaveBeenCalledTimes(1));
    const envoi = envoyer.mock.calls[0][0] as { bienLocatifId: string; sujet: string; message: string; nom: string; telephone: string };
    expect(envoi).toMatchObject({ bienLocatifId: 'loc-1', sujet: 'Visite — L-2026-0002', nom: 'Awa Diop' });
    expect(envoi.message).toContain('Villa F4 avec jardin à Mermoz');
    expect(envoi.message).toContain('L-2026-0002');
    expect(envoi.message).toMatch(/Visite souhaitée : .*mai 2030 à 10 h 00\./);
    expect(await screen.findByText('Demande envoyée')).toBeTruthy();
  });

  it('place le message du visiteur entre le début et la date souhaitée', async () => {
    const utilisateur = userEvent.setup();
    afficher();
    await remplir(utilisateur);
    await utilisateur.type(screen.getByLabelText(/message \(facultatif\)/i), 'Je cherche un bien avec parking.');
    await utilisateur.click(screen.getByRole('button', { name: /confirmer ma demande de visite/i }));

    await waitFor(() => expect(envoyer).toHaveBeenCalledTimes(1));
    const message = envoyer.mock.calls[0][0].message as string;
    expect(message.indexOf('je souhaite visiter')).toBeLessThan(message.indexOf('Je cherche un bien avec parking.'));
    expect(message.indexOf('Je cherche un bien avec parking.')).toBeLessThan(message.indexOf('Visite souhaitée'));
  });

  it('n’envoie rien sans date ni heure, et le dit', async () => {
    const utilisateur = userEvent.setup();
    afficher();
    await remplir(utilisateur, { date: '', heure: '' });
    await utilisateur.click(screen.getByRole('button', { name: /confirmer ma demande de visite/i }));

    expect(envoyer).not.toHaveBeenCalled();
    expect(screen.getByText('Choisissez une date.')).toBeTruthy();
    expect(screen.getByText('Choisissez une heure.')).toBeTruthy();
  });

  it('signale tout ce qui manque d’un seul clic, nom compris', async () => {
    const utilisateur = userEvent.setup();
    afficher();
    await utilisateur.click(screen.getByRole('button', { name: /confirmer ma demande de visite/i }));

    expect(envoyer).not.toHaveBeenCalled();
    expect(screen.getByText(/Indiquez votre nom/)).toBeTruthy();
    expect(screen.getByText('Le téléphone est requis.')).toBeTruthy();
    expect(screen.getByText('Choisissez une date.')).toBeTruthy();
    expect(screen.getByText('Choisissez une heure.')).toBeTruthy();
  });

  it('n’envoie rien sans téléphone', async () => {
    const utilisateur = userEvent.setup();
    afficher();
    await utilisateur.type(screen.getByLabelText(/nom complet/i), 'Awa Diop');
    await utilisateur.type(screen.getByLabelText(/date souhaitée/i), '2030-05-04');
    await utilisateur.selectOptions(screen.getByLabelText(/heure souhaitée/i), '10 h 00');
    await utilisateur.click(screen.getByRole('button', { name: /confirmer ma demande de visite/i }));

    expect(envoyer).not.toHaveBeenCalled();
    expect(screen.getByText('Le téléphone est requis.')).toBeTruthy();
  });

  it('garde les champs et propose de réessayer quand l’envoi échoue', async () => {
    envoyer.mockRejectedValueOnce(new Error('réseau'));
    const utilisateur = userEvent.setup();
    afficher();
    await remplir(utilisateur);
    await utilisateur.click(screen.getByRole('button', { name: /confirmer ma demande de visite/i }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect((screen.getByLabelText(/nom complet/i) as HTMLInputElement).value).toBe('Awa Diop');
    expect(screen.queryByText('Demande envoyée')).toBeNull();
  });
});
