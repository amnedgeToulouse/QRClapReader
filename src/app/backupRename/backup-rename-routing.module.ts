import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { BackupRenameComponent } from './backup-rename.component';

const routes: Routes = [
  {
    path: 'backupRename',
    component: BackupRenameComponent
  }
];

@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BackupRenameRoutingModule { }
