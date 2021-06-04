import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { AnalyseFinishComponent } from './analyse-finish.component';

const routes: Routes = [
  {
    path: 'analyseFinish',
    component: AnalyseFinishComponent
  }
];

@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AnalyseFinishRoutingModule { }
