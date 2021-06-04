import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProjectSelectedComponent } from './project-selected.component';
import { ProjectSelectedRoutingModule } from './project-selected-routing.module';
import { SharedModule } from '../shared/shared.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ModalProjectSelectProtectionComponent } from './project-selected-protection.component';

@NgModule({
  declarations: [ProjectSelectedComponent, ModalProjectSelectProtectionComponent],
  imports: [CommonModule, SharedModule, ProjectSelectedRoutingModule, FontAwesomeModule]
})
export class ProjectSelectedModule { }
