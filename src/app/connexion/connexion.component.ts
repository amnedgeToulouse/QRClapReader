import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IpcRenderer } from 'electron';
import { ElectronService } from 'ngx-electron';
import { Constant } from '../constant';
import { NavBarComponent } from '../shared/components/navbar/navbar.component';
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
  errorAccount = "";
  success = "";
  subscription = false;
  renderer: IpcRenderer;

  emailAccount = "";
  passwordAccount = "";
  firstnameAccount = "";
  lastnameAccount = "";
  companyAccount = "";
  whyAccount = "";

  constructor(private router: Router,
    private httpRequest: HttpRequestService,
    electronServiceInstance: ElectronService,
    private argApp: ArgAppService,
    private saveParam: SaveParamService) {
    this.renderer = electronServiceInstance.ipcRenderer;
  }

  getLogo() {
    return Constant.LOGO_WHITE;
  }

  ngOnInit(): void {
    this.username = this.saveParam.GetParam('username');
    this.password = this.saveParam.GetParam('password');
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
    this.httpRequest.Connexion(this.username, this.password, this.validateEmail(this.username) ? this.username : null)
      .then(() => {
        NavBarComponent.NAV_BAR.updateQrStock();
        this.router.navigate(['/home']);
      })
      .catch((error) => {
        this.error = error;
        this.success = "";
      }).finally(() => {
        this.loading = false;
      });
  }

  validateEmail(email): boolean {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  submitAccountCreation() {
    this.loading = true;
    this.httpRequest.CreateAccount(this.emailAccount, this.passwordAccount, this.firstnameAccount, this.lastnameAccount, this.companyAccount, this.whyAccount).then(data => {
      console.log(data);
      this.loading = false;
      this.errorAccount = "";
      this.error = "";
      this.success = "Your account has been successfully created ! You can connect now.";
      this.subscription = false;
    }).catch(error => {
      this.errorAccount = "This email is already taken or invalid or your password only contain 5 characters";
      this.success = "";
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

  createAccount() {
    this.subscription = true;
  }

  home() {
    this.subscription = false;
  }

  forgotPassword() {
    this.renderer.send("forgot-password");
  }

}