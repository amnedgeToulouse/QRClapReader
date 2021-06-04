import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { faSearch, faTrash } from '@fortawesome/free-solid-svg-icons';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ElectronService } from 'ngx-electron';
import { ProjectFull } from '../analyseFinish/analyse-finish.component';
import { Constant } from '../constant';
import { ModalComponent } from '../shared/components/modal/modal.component';
import { GetParamService } from '../shared/service/get-param.service';
import { HttpRequestService } from '../shared/service/http-request.service';
import { SaveParamService } from '../shared/service/save-param';
import { ModalProjectSelectProtectionComponent } from './project-selected-protection.component';

@Component({
  selector: 'app-project-selected',
  templateUrl: './project-selected.component.html',
  styleUrls: ['./project-selected.component.scss']
})
export class ProjectSelectedComponent implements OnInit {

  public renderer: Electron.IpcRenderer;
  public remote: Electron.Remote;
  projectSelected = "";
  faSearch = faSearch;
  idProject = "";
  loading = true;
  project: ProjectFull
  canBeBackupRename = false;

  constructor(private router: Router,
    private getParam: GetParamService,
    private saveParam: SaveParamService,
    private modalService: NgbModal,
    private httpRequest: HttpRequestService,
    electronServiceInstance: ElectronService) {
    this.renderer = electronServiceInstance.ipcRenderer;
    this.remote = electronServiceInstance.remote;
  }

  ngOnInit(): void {
    this.projectSelected = this.getParam.GetParam('projectSelected');
    this.idProject = this.getParam.GetParam('idProject');
    if (this.idProject != "") {
      const folderAnalyze = this.saveParam.GetProjectFolder(this.idProject);
      this.httpRequest.SendRequest({
        host: Constant.HOST_API,
        port: Constant.PORT_API,
        data: null,
        method: "GET",
        path: "/qrclap/getprojectnoqr/" + this.idProject,
        token: this.saveParam.GetParam('token'),
        processOtherError: true
      }).then((project: ProjectFull) => {
        this.project = project;
        this.loading = false;
        for (const file of this.project.files) {
          if (file.type == 0 && file.finalName != null && file.finalName != "") {
            file.customRename = file.finalName;
          }
        }
        this.loading = false;
        this.canBeBackupRename = project.state == 1;
      });
    } else {
      this.loading = false;
    }
  }

  validateFolder(folder): boolean {
    if (this.idProject == "") {
      return true;
    }
    const filesList = this.renderer.sendSync("list-file-folder", folder);
    const listRelative = [];
    for (const elem of filesList) {
      listRelative.push(elem.fullpath.replace(folder.replaceAll("\\", "/"), ""));
    }
    const fileMissing = [];
    for (const elem of this.project.files) {
      if (elem.type != 0 && elem.type != 3) continue;
      const split = elem.relativePath.split("/");
      const splitExt = elem.relativePath.split(".");
      const ext = "." + splitExt[splitExt.length - 1];
      const finalRelative = elem.relativePath.replace(split[split.length - 1], "") + (elem.finalName != null && typeof elem.finalName != "undefined" ? elem.finalName : "") + ext;
      if (!listRelative.includes(finalRelative) && !listRelative.includes(elem.relativePath)) {
        fileMissing.push({ name: elem.finalName != null && typeof elem.finalName != "undefined" ? finalRelative : elem.relativePath, ignore: false });
      }
    }
    if (fileMissing.length == 0) {
      return true;
    }
    const modalRef = this.modalService.open(ModalProjectSelectProtectionComponent, { size: "lg" });
    modalRef.componentInstance.fileMissing = fileMissing;
    modalRef.componentInstance.parentFolder = folder;
    modalRef.result.then(
      result => { },
      reason => { }
    );
    return false;
  }

  selectFolder(force = false) {
    if (!force) {
      if (this.idProject != "") {
        const folderAnalyze = this.saveParam.GetProjectFolder(this.idProject);
        if (folderAnalyze != "") {
          const modalRef = this.modalService.open(ModalComponent);
          modalRef.componentInstance.title = "Reopen previous folder";
          modalRef.componentInstance.message = "The last time you open this project with the folder : " + folderAnalyze;
          modalRef.componentInstance.actionButtonMessage = "Reopen this folder";
          modalRef.componentInstance.actionButtonType = 0;
          modalRef.componentInstance.actionCancelButtonMessage = "Another";
          modalRef.result.then(
            result => { },
            reason => {
              if (reason == "confirm" && this.validateFolder(folderAnalyze)) {
                this.router.navigate(['/analyseFolder'], this.getParam.GetQueryParams({ folderToAnalyse: folderAnalyze }));
              } else if (reason == "cancel") {
                this.selectFolder(true);
              }
            }
          );
          return;
        }
      }
    }
    this.remote.require('electron').dialog.showOpenDialog({
      properties: ['openDirectory']
    }).then((result) => {
      if (result.canceled || !this.validateFolder(result.filePaths[0])) {
        return;
      }
      this.router.navigate(['/analyseFolder'], this.getParam.GetQueryParams({ folderToAnalyse: result.filePaths[0] }));
    });
  }

  backupRename() {
    this.router.navigate(['/backupRename'], this.getParam.GetQueryParams());
  }

}
