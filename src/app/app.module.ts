import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';

import { AppRoutingModule } from './app-routing.module';

// NG Translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { HomeModule } from './home/home.module';
import { ConnexionModule } from './connexion/connexion.module';
import { DetailModule } from './detail/detail.module';

import { AppComponent } from './app.component';
import { NavBarComponent } from './shared/components';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ProjectSelectedModule } from './projectSelected/project-selected.module';
import { NgxElectronModule } from 'ngx-electron';

import { AnalyseFolderModule } from './analyseFolder/analyse-folder.module';
import { AnalyseFinishModule } from './analyseFinish/analyse-finish.module';
import { DoBackupModule } from './doBackup/do-backup.module';
import { BackupRenameModule } from './backupRename/backup-rename.module';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    CoreModule,
    SharedModule,
    HomeModule,
    ConnexionModule,
    FontAwesomeModule,
    ProjectSelectedModule,
    AnalyseFinishModule,
    NgxElectronModule,
    AnalyseFolderModule,
    DoBackupModule,
    DetailModule,
    BackupRenameModule,
    NgbModule,
    AppRoutingModule,
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ],
  providers: [],
  bootstrap: [AppComponent, NavBarComponent],
})
export class AppModule { }
