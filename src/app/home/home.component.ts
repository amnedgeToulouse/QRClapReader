import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IpcRenderer } from 'electron';
import { ElectronService } from 'ngx-electron';
import { Constant } from '../constant';
import { ModalComponent } from '../shared/components/modal/modal.component';
import { GetParamService } from '../shared/service/get-param.service';
import { HttpRequestService } from '../shared/service/http-request.service';
import { SaveParamService } from '../shared/service/save-param';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  loading = true;
  projectSelected = "";
  searchValue = "";
  projects: Project[] = [];
  projectsFiltered = [];
  projectsArchivedFiltered = [];
  faSearch = faSearch;
  projectLoaded = false;
  public renderer: IpcRenderer;

  constructor(private modalService: NgbModal,
    private router: Router,
    private httpRequest: HttpRequestService,
    private saveParam: SaveParamService,
    private electronServiceInstance: ElectronService,
    private getParam: GetParamService) {
    this.renderer = this.electronServiceInstance.ipcRenderer;
  }

  ngOnInit(): void {
    this.checkIsSubscribe();
  }

  checkIsSubscribe(): void {
    this.httpRequest.SendRequest({
      host: Constant.HOST_API,
      port: Constant.PORT_API,
      data: null,
      method: "GET",
      path: "/qrclap/issubscribe",
      token: this.saveParam.GetParam('token'),
      processOtherError: true
    }).then((subscription) => {
      if (subscription.id == null) {
        const modalRef = this.modalService.open(ModalComponent, { backdrop: 'static' });
        modalRef.componentInstance.title = "Subscription to QRClap is needed";
        modalRef.componentInstance.message = "You can't access to the application because you need to be subscribed, you can access subscribe page by clicking \"Subscription\" button.";
        modalRef.componentInstance.actionButtonMessage = "Subscription"
        modalRef.componentInstance.actionButtonType = 0;
        modalRef.componentInstance.removeClose = true;
        modalRef.componentInstance.actionCancelButtonMessage = "Disconnect";
        modalRef.componentInstance.cancelButtonType = 3;
        modalRef.componentInstance.canSecondAction = true;
        modalRef.componentInstance.closeOnConfirm = false;
        modalRef.componentInstance.actionSecondButtonMessage = "Retry";
        modalRef.componentInstance.secondButtonType = 1;
        modalRef.componentInstance.funcToCall = () => {
          this.renderer.send("get-qr-clap");
        };
        modalRef.result.then(
          result => { },
          reason => {
            if (reason == "cancel") {
              this.httpRequest.Logout();
            } else if (reason == "secondConfirm") {
              this.checkIsSubscribe();
            }
          }
        );
      } else {
        this.updateProject();
      }
    });
  }

  updateProject() {
    this.loading = true;
    this.httpRequest.SendRequest({
      host: Constant.HOST_API,
      port: Constant.PORT_API,
      data: null,
      method: "GET",
      path: "/qrclap/projects",
      token: this.saveParam.GetParam('token'),
      processOtherError: true
    }).then((projects: Project[]) => {
      if (typeof projects != "undefined") {
        this.projects = projects;
        for (const elem of this.projects) {
          elem.date = new Date(elem.date);
        }
        this.projectLoaded = true;
        this.updateFilter();
        this.loading = false;
      }
    });
  }

  newProject() {
    const modalRef = this.modalService.open(ModalComponent);
    modalRef.componentInstance.isCreateProject = true;
    modalRef.result.then(
      result => { },
      reason => {
        if (reason.reason === "confirm") {
          console.log(reason.value);
          this.router.navigate(["/projectSelected"], this.getParam.GetQueryParams({ projectSelected: reason.value }));
        }
      }
    );
  }

  doBackup() {
    this.router.navigate(["/doBackup"]);
  }

  getStateProject(p: Project) {
    switch (p.state) {
      case 0:
        return "Analyzing"
      case 1:
        return "Renamed"
      case 2:
        return "Archived"
    }
    return "Unknow state";
  }

  getClassStateProject(p: Project) {
    switch (p.state) {
      case 0:
        return "yellow-text"
      case 1:
        return "green-text"
      case 2:
        return "success-text"
    }
    return "red-text";
  }

  formatDate(d) {
    let ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(d);
    let mo = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(d);
    let da = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(d);
    return `${da}/${mo}/${ye}`;
  }

  updateFilter() {
    if (this.searchValue === "") {
      this.projectsFiltered = this.projects.filter(project => project.state != 2);
      this.projectsArchivedFiltered = this.projects.filter(project => project.state == 2);
      return;
    }
    this.projectsFiltered = [];
    this.projectsArchivedFiltered = [];
    for (const elem of this.projects) {
      if (elem.name.toLowerCase().includes(this.searchValue.toLowerCase()) ||
        (elem.total + "").toLowerCase().includes(this.searchValue.toLowerCase()) ||
        (elem.scene + "").toLowerCase().includes(this.searchValue.toLowerCase()) ||
        (elem.plan + "").toLowerCase().includes(this.searchValue.toLowerCase()) ||
        (elem.prise + "").toLowerCase().includes(this.searchValue.toLowerCase()) ||
        (elem.divers + "").toLowerCase().includes(this.searchValue.toLowerCase()) ||
        this.getStateProject(elem).toLowerCase().includes(this.searchValue.toLowerCase()) ||
        this.formatDate(elem.date).toLowerCase().includes(this.searchValue.toLowerCase())) {
        if (elem.state == 2) {
          this.projectsArchivedFiltered.push(elem);
        } else {
          this.projectsFiltered.push(elem);
        }
      }
    }
  }

  openProject(project: Project) {
    const modalRef = this.modalService.open(ModalComponent);
    modalRef.componentInstance.title = "Project action";
    if (project.state == 1) {
      modalRef.componentInstance.message = 'Do you want to open or archive the project "' + project.name + '"';
    } else if (project.state == 0) {
      modalRef.componentInstance.message = 'Do you want to open or delete the project "' + project.name + '"';
    } else if (project.state == 2) {
      modalRef.componentInstance.message = 'Do you want to restore the project "' + project.name + '"';
    }
    modalRef.componentInstance.actionButtonMessage = "Open project"
    modalRef.componentInstance.actionButtonType = 0;
    if (project.state == 1) {
      modalRef.componentInstance.actionCancelButtonMessage = "Archive";
      modalRef.componentInstance.cancelButtonType = 2;
    } else if (project.state == 0) {
      modalRef.componentInstance.actionCancelButtonMessage = "Delete";
      modalRef.componentInstance.cancelButtonType = 3;
    } else if (project.state == 2) {
      modalRef.componentInstance.actionButtonMessage = "Restore project"
      modalRef.componentInstance.actionCancelButtonMessage = "Cancel";
      modalRef.componentInstance.cancelButtonType = 0;
    }
    modalRef.result.then(
      result => { },
      reason => {
        if (reason === "confirm") {
          if (project.state == 2) {
            this.loading = true;
            this.httpRequest.SendRequest({
              host: Constant.HOST_API,
              port: Constant.PORT_API,
              data: {
                id: project.id,
                state: 1
              },
              method: "POST",
              path: "/qrclap/updatestateproject",
              token: this.saveParam.GetParam('token'),
              processOtherError: true
            }).then(() => {
              this.updateProject();
            });
          } else {
            this.router.navigate(["/projectSelected"], this.getParam.GetQueryParams({ projectSelected: project.name, idProject: project.id, projectState: project.state }));
          }
        } else if (reason === "cancel") {
          if (project.state == 1) {
            this.loading = true;
            this.httpRequest.SendRequest({
              host: Constant.HOST_API,
              port: Constant.PORT_API,
              data: {
                id: project.id,
                state: 2
              },
              method: "POST",
              path: "/qrclap/updatestateproject",
              token: this.saveParam.GetParam('token'),
              processOtherError: true
            }).then(() => {
              this.updateProject();
            });
          } else if (project.state == 0) {
            const modalConfirm = this.modalService.open(ModalComponent);
            modalConfirm.componentInstance.title = "Delete Project";
            modalConfirm.componentInstance.message = "Are you sure to delete the project " + project.name + " ?";
            modalConfirm.componentInstance.actionButtonMessage = "Delete project";
            modalConfirm.componentInstance.actionButtonType = 1;
            modalConfirm.componentInstance.actionCancelButtonMessage = "No";
            modalConfirm.result.then(
              result => { },
              reason => {
                if (reason === "confirm") {
                  this.loading = true;
                  this.httpRequest.SendRequest({
                    host: Constant.HOST_API,
                    port: Constant.PORT_API,
                    data: null,
                    method: "DELETE",
                    path: "/qrclap/removeproject/" + project.id,
                    token: this.saveParam.GetParam('token'),
                    processOtherError: true
                  }).then(() => {
                    this.updateProject();
                  });
                }
              }
            );
          }
        }
      }
    );
  }

}

export class Project {
  id: number;
  name: string;
  user: number;
  date: Date;
  total: number;
  scene: number;
  plan: number;
  prise: number;
  divers: number;
  state: number;
}