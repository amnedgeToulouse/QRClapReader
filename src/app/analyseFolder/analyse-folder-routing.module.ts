import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { AnalyseFolderComponent } from './analyse-folder.component';

const routes: Routes = [
  {
    path: 'analyseFolder',
    component: AnalyseFolderComponent
  }
];

@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AnalyseFolderRoutingModule { }
