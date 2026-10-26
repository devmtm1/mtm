interface BandeauDemarchesProps {
  /** Texte de présentation, lu par les lecteurs d'écran et les moteurs de recherche (l'image porte le même texte). */
  description: string;
  /** Points de réassurance (« Réponse sous 24 à 48h »…), lus eux aussi à la place de l'image. */
  reassurance: string[];
  onDemande: () => void;
}

/**
 * Grand bandeau de la page « Démarches administratives » : l'image fournie par MTM, telle quelle, avec son
 * titre, ses trois engagements et son bouton « Faire une demande ».
 *
 * Le texte étant dans l'image, la page garde un vrai titre `h1` et sa description (masqués à l'écran,
 * lus par les lecteurs d'écran et les moteurs de recherche), et un vrai bouton posé exactement sur celui
 * de l'image. Si l'image est remplacée, recalculer la position du bouton (en pourcentages de l'image,
 * 1280 × 512 px : x 5 %, y 81,8 %, largeur 24,2 %, hauteur 9,6 %).
 *
 * Sur téléphone, l'image est trop large pour que son texte reste lisible : on la cadre à gauche, sur
 * 360 px de haut, pour garder le titre et le bouton ; le bouton se place alors en pixels.
 */
export function BandeauDemarches({ description, reassurance, onDemande }: BandeauDemarchesProps) {
  const bouton =
    'absolute z-10 cursor-pointer rounded-lg transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-accent';

  return (
    <header className="bg-white">
      <h1 className="sr-only">Démarches administratives</h1>
      <p className="sr-only">{description}</p>
      <ul className="sr-only">
        {reassurance.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <div className="relative mx-auto h-[340px] w-full max-w-[1600px] overflow-hidden md:h-auto md:aspect-[1280/512]">
        <img
          src="/bandeaux/demarches.jpg"
          alt=""
          width={1280}
          height={512}
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover object-left"
        />
        {/* Le même bouton, calé sur celui de l'image : en pixels sur téléphone, en pourcentages dès la tablette. */}
        <button
          type="button"
          onClick={onDemande}
          aria-label="Faire une demande"
          className={`${bouton} left-[43px] top-[278px] h-[33px] w-[206px] md:hidden`}
        />
        <button
          type="button"
          onClick={onDemande}
          aria-label="Faire une demande"
          className={`${bouton} hidden md:left-[5%] md:top-[81.8%] md:block md:h-[9.6%] md:w-[24.2%]`}
        />
      </div>
    </header>
  );
}
