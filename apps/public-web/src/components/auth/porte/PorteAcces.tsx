import { useState } from 'react';
import { mouvementReduit, type EtatPorte } from './porte-sequence';

const MESSAGES: Record<'attente' | 'ouvert', Record<'staff' | 'client', string>> = {
  attente: { staff: 'Vérification de vos accès…', client: 'Vérification de vos accès…' },
  ouvert: { staff: 'Accès autorisé', client: 'Bienvenue chez vous' },
};

/**
 * La porte à deux battants de l'écran de connexion : une clé s'approche de la serrure, tourne, et les battants s'écartent
 * sur une pièce lumineuse. Composant de présentation pur : il ne connaît ni l'authentification ni la navigation.
 */
export function PorteAcces({ etat, variante = 'client' }: { etat: EtatPorte; variante?: 'staff' | 'client' }) {
  const [reduit] = useState(mouvementReduit);
  const message = etat === 'approche' || etat === 'attente' ? MESSAGES.attente[variante] : etat === 'ouverture' || etat === 'ouvert' ? MESSAGES.ouvert[variante] : '';
  const succes = etat === 'ouverture' || etat === 'ouvert';
  const degrade = { current: 'porte-cle-degrade' };

  return (
    <div className="porte" data-etat={etat} data-variante={variante} data-reduit={reduit}>
      <div className="porte__scene" aria-hidden="true">
        <div className="porte__cadre" />
        <div className="porte__lumiere" />
        <div className="porte__halo" />
        {/* Les noms de classe sont écrits en entier : Tailwind retire de ses couches les classes qu'il ne voit pas telles quelles. */}
        {['porte__battant porte__battant--g', 'porte__battant porte__battant--d'].map((classe) => (
          <div key={classe} className={classe}>
            <i className="porte__panneau" />
            <i className="porte__panneau" />
            <b className="porte__poignee" />
            <u className="porte__charniere" />
            <u className="porte__charniere" />
            <u className="porte__charniere" />
          </div>
        ))}
        <div className="porte__serrure">
          <span className="porte__anneau" />
        </div>
        <svg className="porte__cle" viewBox="0 0 132 40" focusable="false">
          <defs>
            <linearGradient id={degrade.current} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.55" stopColor="#c9d6e4" />
              <stop offset="1" stopColor="#8fa3b8" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="16" fill={`url(#${degrade.current})`} stroke="#6b819a" strokeWidth="1.5" />
          <circle cx="20" cy="20" r="6" fill="#b52c36" />
          <rect x="34" y="16" width="96" height="8" rx="3" fill={`url(#${degrade.current})`} stroke="#6b819a" strokeWidth="1.2" />
          <path d="M92 24v9h7v-9M106 24v6h6v-6" fill={`url(#${degrade.current})`} stroke="#6b819a" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="porte__simple" aria-hidden="true">
        {succes ? (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        )}
      </div>

      <p className="porte__message" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
