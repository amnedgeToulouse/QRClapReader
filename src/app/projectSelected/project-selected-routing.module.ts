import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { ProjectSelectedComponent } from './project-selected.component';

const routes: Routes = [
  {
    path: 'projectSelected',
    component: ProjectSelectedComponent
  }
];

@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProjectSelectedRoutingModule { }
