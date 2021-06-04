import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { DoBackupComponent } from './do-backup.component';

const routes: Routes = [
  {
    path: 'doBackup',
    component: DoBackupComponent
  }
];

@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DoBackupRoutingModule { }
