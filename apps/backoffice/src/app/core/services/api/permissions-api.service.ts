import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { Permission } from '../../models/role.model';

@Injectable({ providedIn: 'root' })
export class PermissionsApiService {
  private readonly http = inject(HttpClient);

  findAll(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${environment.apiUrl}/permissions`);
  }
}
