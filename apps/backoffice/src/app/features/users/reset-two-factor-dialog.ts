import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LucideShieldCheck } from '@lucide/angular';

@Component({
  selector: 'app-reset-two-factor-dialog',
  imports: [MatButtonModule, MatDialogModule, LucideShieldCheck],
  templateUrl: './reset-two-factor-dialog.html',
  styleUrl: './reset-two-factor-dialog.scss',
})
export class ResetTwoFactorDialog {
  protected readonly email = inject<string>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ResetTwoFactorDialog>);

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  protected confirm(): void {
    this.dialogRef.close(true);
  }
}
