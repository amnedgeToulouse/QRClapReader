import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ConnexionRoutingModule } from './connexion-routing.module';

import { ConnexionComponent } from './connexion.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [ConnexionComponent],
  imports: [CommonModule, SharedModule, ConnexionRoutingModule]
})
export class ConnexionModule { }
