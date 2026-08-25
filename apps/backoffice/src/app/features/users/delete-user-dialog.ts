import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LucideTrash2 } from '@lucide/angular';

@Component({
  selector: 'app-delete-user-dialog',
  imports: [MatButtonModule, MatDialogModule, LucideTrash2],
  templateUrl: './delete-user-dialog.html',
  styleUrl: './delete-user-dialog.scss',
})
export class DeleteUserDialog {
  protected readonly email = inject<string>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<DeleteUserDialog>);

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  protected confirm(): void {
    this.dialogRef.close(true);
  }
}
