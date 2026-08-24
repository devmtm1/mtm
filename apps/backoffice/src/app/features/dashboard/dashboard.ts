import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import {
  LucideBuilding2,
  LucideLandmark,
  LucideHardHat,
  LucideBanknote,
  LucideCheckCircle2,
  LucidePhoneCall,
  LucideMail,
  LucideArrowUpRight,
  LucideClock,
} from '@lucide/angular';

@Component({
  selector: 'app-dashboard',
  imports: [
    MatCardModule,
    MatButtonModule,
    LucideBuilding2,
    LucideLandmark,
    LucideHardHat,
    LucideBanknote,
    LucideCheckCircle2,
    LucidePhoneCall,
    LucideMail,
    LucideArrowUpRight,
    LucideClock,
  ],
  template: `
    <div class="dashboard-page">
      <!-- Banner Header Executive -->
      <div class="dashboard-hero-card">
        <div class="dashboard-hero-content">
          <div class="dashboard-brand-pill">
            <span class="dot"></span>
            CABINET MTM IMMOBILIER
          </div>
          <h1>Tableau de bord de Gestion ERP</h1>
          <p>
            Supervision globale des opérations d'Achat, Vente, Gérance Immobilière, BTP &amp; Lotissements.
          </p>
        </div>
        <div class="dashboard-hero-contacts">
          <div class="contact-chip">
            <svg lucidePhoneCall class="icon-sm"></svg>
            <span>78 522 65 65 / 78 366 26 51</span>
          </div>
          <div class="contact-chip">
            <svg lucideMail class="icon-sm"></svg>
            <span>cabinetmtm1&#64;gmail.com</span>
          </div>
        </div>
      </div>

      <!-- KPI Metrics Cards Grid -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon-wrapper purple">
            <svg lucideBuilding2 class="kpi-icon"></svg>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Biens sous Gérance</span>
            <span class="kpi-value">148</span>
            <span class="kpi-trend positive">
              <svg lucideArrowUpRight class="trend-icon"></svg> +12% ce mois
            </span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrapper red">
            <svg lucideLandmark class="kpi-icon"></svg>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Lotissements &amp; Terrains</span>
            <span class="kpi-value">34 Parcelles</span>
            <span class="kpi-subtext">8 projets en cours</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrapper dark">
            <svg lucideHardHat class="kpi-icon"></svg>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Projets Construction / BTP</span>
            <span class="kpi-value">19 Chantiers</span>
            <span class="kpi-subtext">Terrassement &amp; Plan</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrapper red-outline">
            <svg lucideBanknote class="kpi-icon"></svg>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Recouvrement de Dettes</span>
            <span class="kpi-value">94.2%</span>
            <span class="kpi-trend positive">Taux de recouvrement</span>
          </div>
        </div>
      </div>

      <!-- Main Layout Grid (Services + Activity stream) -->
      <div class="dashboard-body-grid">
        <!-- 10 Core Services Overview -->
        <div class="dashboard-main-column">
          <mat-card class="section-card">
            <div class="section-header">
              <h2>Pôles de Compétences MTM Immobilier</h2>
              <span class="badge-count">10 Services</span>
            </div>
            <mat-card-content>
              <div class="services-list-grid">
                @for (service of services; track service.title) {
                  <div class="service-item-chip">
                    <svg lucideCheckCircle2 class="check-icon"></svg>
                    <div class="service-text">
                      <span class="service-title">{{ service.title }}</span>
                      <span class="service-desc">{{ service.category }}</span>
                    </div>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Right Side: Recent Activity Stream -->
        <div class="dashboard-side-column">
          <mat-card class="section-card">
            <div class="section-header">
              <h2>Activité Récente</h2>
              <svg lucideClock class="header-icon"></svg>
            </div>
            <mat-card-content>
              <div class="activity-timeline">
                <div class="activity-item">
                  <div class="activity-marker red"></div>
                  <div class="activity-content">
                    <span class="activity-title">Nouveau Titre Foncier Validé</span>
                    <span class="activity-meta">Démarche administrative pour lotissement Diamniadio</span>
                    <span class="activity-time">Il y a 25 min</span>
                  </div>
                </div>

                <div class="activity-item">
                  <div class="activity-marker purple"></div>
                  <div class="activity-content">
                    <span class="activity-title">Paiement de Loyer Perçu</span>
                    <span class="activity-meta">Recouvrement automatique — Villa Mermoz</span>
                    <span class="activity-time">Il y a 2 heures</span>
                  </div>
                </div>

                <div class="activity-item">
                  <div class="activity-marker dark"></div>
                  <div class="activity-content">
                    <span class="activity-title">Plan Architectural Déposé</span>
                    <span class="activity-meta">Conception de plan 3D — Résidence Saly</span>
                    <span class="activity-time">Il y a 5 heures</span>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly services = [
    { title: 'Bâtiment Travaux Publics', category: 'Infrastructure & BTP' },
    { title: 'Terrassement & Lotissement', category: 'Aménagement Foncier' },
    { title: 'Construction Bâtiment', category: 'Gros & Second Œuvre' },
    { title: 'Conception de Plan', category: 'Architecture & 3D' },
    { title: 'Conseil en Immobilier', category: 'Investissement & Expertise' },
    { title: 'Démarches Administratives', category: 'Titres Fonciers & Permis' },
    { title: 'Recherche de Logement', category: 'Achat & Location' },
    { title: 'Recouvrement de Dettes', category: 'Gestion Contentieuse' },
    { title: 'Intermédiation', category: 'Négociation Immobilière' },
    { title: 'Accompagnement', category: 'Suivi Sur-Mesure' },
  ];
}
