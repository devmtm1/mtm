import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-dashboard',
  imports: [
    MatCardModule,
    MatButtonModule,
  ],
  template: `
    <div class="dashboard-page">
      <h1 class="dashboard-title">Bienvenue sur MTM Immobilier</h1>
      En cours de développement, cette page sera bientôt enrichie de statistiques et d'informations utiles pour la gestion de vos terrains et projets.
    </div>
  `,
  styleUrl: './dashboard.scss',
})
export class Dashboard {
}
