import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IpcRenderer } from 'electron';
import { ElectronService } from 'ngx-electron';
import { ArgAppService } from '../shared/service/arg-app.service';
import { HttpRequestService } from '../shared/service/http-request.service';
import { SaveParamService } from '../shared/service/save-param';

@Component({
  selector: 'app-connexion',
  templateUrl: './connexion.component.html',
  styleUrls: ['./connexion.component.scss']
})
export class ConnexionComponent implements OnInit {

  username = ""; //qrclap
  password = ""; //904054ff3a506f062af1b868463701e85095fd2523f99196bf6da11372d8d58f
  loading = true;
  error = "";
  renderer: IpcRenderer;

  constructor(private router: Router,
    private httpRequest: HttpRequestService,
    electronServiceInstance: ElectronService,
    private argApp: ArgAppService,
    private saveParam: SaveParamService) {
    this.renderer = electronServiceInstance.ipcRenderer;
  }

  ngOnInit(): void {
    this.renderer.send("check-mac-permission");
    this.loading = false;
    if (this.argApp.getQrcFileArg() != "") {
      this.router.navigate(['/backupRename']);
    } else if (this.httpRequest.CheckToken()) {
      this.router.navigate(['/home']);
    }
  }

  connect() {
    if (this.username == "" || this.password == "") return;
    this.loading = true;
    this.httpRequest.Connexion(this.username, this.password)
      .then(() => {
        this.router.navigate(['/home']);
      })
      .catch((error) => {
        this.error = error;
      }).finally(() => {
        this.loading = false;
      });
  }

  backupRename() {
    this.router.navigate(['/backupRename']);
  }

  doBackup() {
    this.router.navigate(['/doBackup']);
  }

  canDoBackup() {
    return this.saveParam.GetParam("firstConnexion") != "" || true;
  }

}