import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ContactApiService, ContactMessage } from '../../core/services/api/contact-api.service';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-contacts',
  imports: [DatePipe, MatButtonModule, MatCardModule, MatTableModule],
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss',
})
export class Contacts implements OnInit {
  private readonly contactApi = inject(ContactApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  protected readonly session = inject(SessionService);

  protected readonly contacts = signal<ContactMessage[]>([]);
  protected readonly loading = signal(true);
  protected readonly filterLu = signal<boolean | undefined>(undefined);
  protected readonly displayedColumns = ['nom', 'email', 'telephone', 'sujet', 'date', 'statut', 'actions'];

  ngOnInit(): void {
    this.loadContacts();
  }

  loadContacts(): void {
    this.loading.set(true);
    this.contactApi.findAll({ lu: this.filterLu() }).subscribe({
      next: (data) => {
        this.contacts.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Erreur lors du chargement des messages de contact', 'Fermer', { duration: 4000 });
      },
    });
  }

  markAsRead(contact: ContactMessage): void {
    this.contactApi.markRead(contact.id).subscribe({
      next: () => {
        this.snackBar.open('Message marqué comme lu', 'Fermer', { duration: 3000 });
        this.loadContacts();
      },
    });
  }

  convertToProspect(contact: ContactMessage): void {
    this.contactApi.convertToProspect(contact.id).subscribe({
      next: () => {
        this.snackBar.open('Prospect CRM créé avec succès !', 'Voir CRM', { duration: 4000 }).onAction().subscribe(() => {
          void this.router.navigate(['/crm/prospects']);
        });
        this.loadContacts();
      },
      error: () => {
        this.snackBar.open('Impossible de convertir le contact', 'Fermer', { duration: 4000 });
      },
    });
  }

  setFilter(lu?: boolean): void {
    this.filterLu.set(lu);
    this.loadContacts();
  }
}
