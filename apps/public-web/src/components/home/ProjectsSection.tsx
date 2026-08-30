export function ProjectsSection() {
  return (
    <section
      id="projets"
      className="reveal-section mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-28"
    >
      <div className="projects-heading">
        <div>
          <p className="eyebrow">À venir</p>
          <h2 className="section-title">
            Des projets qui
            <br />
            <i>prennent forme.</i>
          </h2>
        </div>
        <p className="projects-intro">Des projets pensés avec soin, pour créer de la valeur dans le temps.</p>
      </div>
      <div className="projects-grid mt-10">
        <article className="project-card project-card-featured">
          <img
            src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=85"
            alt="Projet résidentiel en préparation"
          />
          <div className="project-card-content">
            <span className="project-status">En préparation</span>
            <h3>Les résidences du Lac</h3>
            <p>Dakar · Programme résidentiel</p>
          </div>
        </article>
        <article id="realisations" className="project-card">
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=85"
            alt="Réalisation immobilière MTM"
          />
          <div className="project-card-content">
            <span className="project-status">Nos réalisations</span>
            <h3>Des lieux pour durer</h3>
            <p>Découvrez l'univers des projets accompagnés par MTM.</p>
          </div>
        </article>
      </div>
    </section>
  );
}
