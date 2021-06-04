import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { GetParamService } from '../../service/get-param.service';
import { HttpRequestService } from '../../service/http-request.service';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavBarComponent implements OnInit {

  validRoute = ['/home', '/projectSelected', '/analyseFinish', '/doBackup', '/backupRename'];
  validBackToProjectRoute = ['/projectSelected', '/analyseFinish', '/doBackup', '/backupRename'];

  constructor(private router: Router,
    private activatedRoute: ActivatedRoute,
    private modalService: NgbModal,
    private getParam: GetParamService,
    private httpRequest: HttpRequestService) { }

  ngOnInit(): void {
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
