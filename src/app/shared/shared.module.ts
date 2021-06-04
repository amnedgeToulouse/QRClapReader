import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TranslateModule } from '@ngx-translate/core';

import { NavBarComponent, PageNotFoundComponent } from './components/';
import { WebviewDirective } from './directives/';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from './components/modal/modal.component';
import { LoaderComponent } from './components/loader/loader.component';
import { ModalConnectComponent } from './components/modal-connect/modal-connect.component';

@NgModule({
  declarations: [PageNotFoundComponent, WebviewDirective, NavBarComponent, ModalComponent, ModalConnectComponent, LoaderComponent],
  imports: [CommonModule, TranslateModule, FormsModule],
  exports: [TranslateModule, WebviewDirective, FormsModule, LoaderComponent,]
})
export class SharedModule { }
