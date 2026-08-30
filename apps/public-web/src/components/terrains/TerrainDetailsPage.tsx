import { ArrowLeft, ArrowRight, FileText, MapPin, ShieldCheck } from 'lucide-react';
import type { Terrain } from '../../domain/terrains/types';
import { MapView, type MapMarker } from '../map/MapView';

type TerrainDetailsPageProps = {
  terrain: Terrain;
  onBack: () => void;
  onContact: () => void;
};

export function TerrainDetailsPage({
  terrain,
  onBack,
  onContact,
}: Readonly<TerrainDetailsPageProps>) {
  const gallery = terrain.media?.filter((media) => media.secureUrl && media.type !== 'video') ?? [];
  const mainImage = gallery[0]?.secureUrl ?? terrain.image;
  const terrainLat = Number(terrain.latitude);
  const terrainLng = Number(terrain.longitude);
  const hasCoords = Number.isFinite(terrainLat) && Number.isFinite(terrainLng);

  const mapMarkers: MapMarker[] = [];
  const routePoints: Array<[number, number]> = [];
  if (hasCoords) {
    mapMarkers.push({
      id: 'terrain',
      lat: terrainLat,
      lng: terrainLng,
      title: terrain.name,
      color: '#e2603f',
      popupHtml: `<strong>${terrain.name}</strong><br/>${terrain.location}`,
    });
    routePoints.push([terrainLat, terrainLng]);
  }

  terrain.pointsInteret?.forEach((point, index) => {
    const entry = point as Record<string, unknown>;
    const lat = Number(entry.latitude ?? entry.lat);
    const lng = Number(entry.longitude ?? entry.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const label = String(
      entry.nom ??
        entry.name ??
        entry.libelle ??
        entry.titre ??
        entry.label ??
        entry.type ??
        entry.categorie ??
        'Point d’intérêt',
    );
    mapMarkers.push({
      id: `poi-${index}`,
      lat,
      lng,
      title: label,
      color: '#1f6f54',
      popupHtml: `<strong>${label}</strong>`,
    });
    routePoints.push([lat, lng]);
  });

  return (
    <main className="terrain-details-page">
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-12">
        <button type="button" className="detail-back-link" onClick={onBack}>
          <ArrowLeft size={17} /> Retour aux terrains
        </button>
        <div className="mt-8 grid gap-10 lg:grid-cols-[1.12fr_.88fr] lg:items-start">
          <div>
            <div className="detail-hero-image">
              <img src={mainImage} alt={`${terrain.name}, ${terrain.location}`} />
              <span className="detail-status">{terrain.status}</span>
            </div>
            {gallery.length > 1 && (
              <div className="detail-gallery">
                {gallery.slice(0, 4).map((media, index) => (
                  <img key={media.secureUrl} src={media.secureUrl} alt={`${terrain.name}, vue ${index + 1}`} />
                ))}
              </div>
            )}
          </div>
          <div className="detail-intro">
            <p className="eyebrow">Référence {terrain.id}</p>
            <h1>{terrain.name}</h1>
            <p className="detail-location"><MapPin size={17} /> {terrain.location}</p>
            <p className="detail-price">{terrain.price}</p>
            <p className="detail-description">{terrain.detail ?? 'Une opportunité foncière sélectionnée par MTM Immobilier, avec un accompagnement transparent à chaque étape de votre projet.'}</p>
            <div className="detail-actions">
              <button type="button" className="detail-primary-action" onClick={onContact}>Demander des informations <ArrowRight size={16} /></button>
              <button type="button" className="detail-secondary-action" onClick={onContact}>Planifier une visite</button>
              <button type="button" className="detail-tertiary-action" onClick={onContact}>Réserver <ArrowRight size={16} /></button>
            </div>
            <div className="detail-trust"><ShieldCheck size={19} /><span>Informations publiques vérifiées par MTM Immobilier</span></div>
          </div>
        </div>
        <div className="mt-14 grid gap-10 lg:grid-cols-[1.12fr_.88fr]">
          <section className="detail-panel">
            <p className="eyebrow">Caractéristiques</p>
            <h2>Tout savoir sur ce terrain</h2>
            <div className="detail-spec-grid">
              <DetailSpec label="Superficie" value={terrain.size} />
              <DetailSpec label="Statut juridique" value={terrain.legalStatus} />
              <DetailSpec label="Accès routier" value={terrain.access ?? 'Sur demande'} />
              <DetailSpec label="Eau" value={terrain.waterAvailable ? 'Disponible' : 'Sur demande'} />
              <DetailSpec label="Électricité" value={terrain.electricityAvailable ? 'Disponible' : 'Sur demande'} />
              <DetailSpec label="Région" value={terrain.region || 'Sénégal'} />
            </div>
          </section>
          <section className="detail-panel">
            <p className="eyebrow">Documents</p>
            <h2>Pièces publiques</h2>
            {terrain.documents?.length ? <div className="detail-documents">{terrain.documents.map((document) => <a href={document.secureUrl} target="_blank" rel="noopener noreferrer" key={document.secureUrl}><FileText size={17} />{document.title || 'Télécharger le document'}<ArrowRight size={14} /></a>)}</div> : <p className="detail-muted">Les documents publics sont disponibles sur demande auprès de notre équipe.</p>}
          </section>
        </div>
        {terrain.pointsInteret?.length ? (
          <section className="detail-panel detail-poi">
            <p className="eyebrow">Points d'intérêt</p>
            <h2>À proximité</h2>
            <ul className="detail-poi-list">
              {terrain.pointsInteret.map((point, index) => {
                const entry = point as Record<string, unknown>;
                const label = String(
                  entry.nom ??
                    entry.name ??
                    entry.libelle ??
                    entry.titre ??
                    entry.label ??
                    entry.type ??
                    entry.categorie ??
                    'Point d’intérêt',
                );
                const meta = [entry.distance, entry.description]
                  .filter(Boolean)
                  .map(String)
                  .join(' · ');
                return (
                  <li className="detail-poi-item" key={index}>
                    <span className="detail-poi-dot" aria-hidden="true" />
                    <div>
                      <strong>{label}</strong>
                      {meta && <span>{meta}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
        {hasCoords && (
          <section className="detail-map-section">
            <p className="eyebrow">Localisation</p>
            <h2>Un emplacement à découvrir</h2>
            <MapView
              markers={mapMarkers}
              height={380}
              route={routePoints.length > 1 ? routePoints : undefined}
            />
            <a
              className="detail-map-link"
              href={`https://www.openstreetmap.org/directions?to=${terrainLat},${terrainLng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ouvrir l'itinéraire dans OpenStreetMap <ArrowRight size={14} />
            </a>
          </section>
        )}
      </div>
    </main>
  );
}

function DetailSpec({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div className="detail-spec"><span>{label}</span><strong>{value}</strong></div>;
}
