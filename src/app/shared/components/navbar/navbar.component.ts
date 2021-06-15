import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IpcRenderer } from 'electron';
import { ElectronService } from 'ngx-electron';
import { GetParamService } from '../../service/get-param.service';
import { HttpRequestService } from '../../service/http-request.service';
import { ModalSuggestionComponent } from '../modal-suggestion/modal-suggestion.component';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavBarComponent implements OnInit {

  validRoute = ['/home', '/projectSelected', '/analyseFinish', '/doBackup', '/backupRename'];
  validBackToProjectRoute = ['/projectSelected', '/analyseFinish', '/doBackup', '/backupRename'];
  public renderer: IpcRenderer;
  version = "";
  updateMessage = "";
  showNotification = false;
  canApplyMaj = false;
  interval = null;
  loading = false;

  constructor(private router: Router,
    private activatedRoute: ActivatedRoute,
    private modalService: NgbModal,
    private getParam: GetParamService,
    electronServiceInstance: ElectronService,
    readonly snackBar: MatSnackBar,
    private httpRequest: HttpRequestService) {
    this.renderer = electronServiceInstance.ipcRenderer;
  }

  ngOnInit(): void {
    this.renderer.send('app_version');
    this.renderer.on('app_version', (event, arg) => {
      this.renderer.removeAllListeners('app_version');
      this.version = arg.version;
    });
    this.renderer.on('update_available', () => {
      this.renderer.removeAllListeners('update_available');
      this.updateMessage = 'A new update is available. Downloading now...';
      this.showNotification = true;
    });
    this.renderer.on('update_downloaded', () => {
      this.renderer.removeAllListeners('update_downloaded');
      this.updateMessage = 'Update Downloaded. It will be installed on restart. Restart now?';
      this.showNotification = true;
      this.canApplyMaj = true;
    });
  }

  closeNotification() {
    this.showNotification = false;
  }

  restartApp() {
    this.loading = true;
    setTimeout(() => {
      this.renderer.send('restart_app');
    }, 1000);
  }

  isValidRoute() {
    for (const valid of this.validRoute) {
      if (this.router.url.includes(valid)) {
        return true;
      }
    }
    return false;
  }

  canDecconect() {
    return this.router.url.includes('/home');
  }

  logout() {
    this.httpRequest.Logout();
  }

  isBackup() {
    return this.router.url.includes('/doBackup');
  }

  getLeaveText() {
    return this.isBackup() ? "Leave Backup" : "Leave Project";
  }

  isValidBackToProjectRoute() {
    for (const valid of this.validBackToProjectRoute) {
      if (this.router.url.includes(valid)) {
        return true;
      }
    }
    return false;
  }

  suggestion() {
    const modalRef = this.modalService.open(ModalSuggestionComponent, { size: 'lg', backdrop: 'static' });
    modalRef.result.then(
      result => { },
      reason => {
        if (reason == "confirm") {
          this.snackBar.open('Suggestion sent!', '', {
            duration: 5000,
            verticalPosition: 'top'
          });
        }
      }
    );
  }

  leaveProject() {
    const modalRef = this.modalService.open(ModalComponent);
    modalRef.componentInstance.title = this.isBackup() ? "Leave backup" : "Leave the project";
    modalRef.componentInstance.message = this.isBackup() ? "Are you sure to leave the backup ?" : "Are you sure to leave the project " + this.getProjectName() + " ?";
    modalRef.componentInstance.actionButtonMessage = "Leave it";
    modalRef.componentInstance.actionButtonType = 1;
    modalRef.componentInstance.actionCancelButtonMessage = "No";
    modalRef.result.then(
      result => { },
      reason => {
        if (reason == "confirm") {
          if (!this.httpRequest.CheckToken()) {
            this.router.navigate(['/']);
          } else {
            this.router.navigate(['/home']);
          }
        }
      }
    );
  }

  getProjectName() {
    return typeof this.getParam.GetParam('projectSelected') != 'undefined' ? this.getParam.GetParam('projectSelected') : "";
  }

}
