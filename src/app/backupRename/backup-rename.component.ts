import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { faFolderMinus, faFolderPlus, faSave, faList } from '@fortawesome/free-solid-svg-icons';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IpcRenderer, Remote } from 'electron';
import { ElectronService } from 'ngx-electron';
import { ProjectFull } from '../analyseFinish/analyse-finish.component';
import { Constant } from '../constant';
import { ModalComponent } from '../shared/components/modal/modal.component';
import { ArgAppService } from '../shared/service/arg-app.service';
import { GetParamService } from '../shared/service/get-param.service';
import { HttpRequestService } from '../shared/service/http-request.service';
import { SaveParamService } from '../shared/service/save-param';
import { ModalDetailsBackupRenameComponent } from './modal-details-backup-rename.component';

@Component({
  selector: 'app-backup-rename',
  templateUrl: './backup-rename.component.html',
  styleUrls: ['./backup-rename.component.scss']
})
export class BackupRenameComponent implements OnInit, OnDestroy {

  public renderer: IpcRenderer;
  public remote: Remote;
  public destinations: any[] = [{
    destination: "",
    files: [],
    missingFilesList: [],
    missingFiles: 0,
    matching: 0,
    alreadyRename: 0,
    total: 0
  }];

  loading = true;
  faFolderMinus = faFolderMinus;
  faFolderPlus = faFolderPlus;
  faList = faList;
  faSave = faSave;

  idProject = "";
  project: ProjectFull = null;

  lastCompare = {};

  compareStatus = "";

  interval = null;

  constructor(private router: Router,
    private electronServiceInstance: ElectronService,
    private modalService: NgbModal,
    private getParam: GetParamService,
    private saveParam: SaveParamService,
    private httpRequest: HttpRequestService,
    private ref: ChangeDetectorRef,
    private argApp: ArgAppService) {
    this.renderer = this.electronServiceInstance.ipcRenderer;
    ref.detach();
    this.interval = setInterval(() => {
      this.ref.detectChanges();
    }, 100);
    this.renderer = this.electronServiceInstance.ipcRenderer;
    this.remote = this.electronServiceInstance.remote;
  }

  ngOnDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  calculMissingFiles() {
    if (this.project == null) return;
    for (const destination of this.destinations) {
      if (destination.destination == "") {
        continue;
      }
      destination.missingFiles = 0;
      destination.missingFilesList = [];
      destination.matching = 0;
      destination.total = 0;
      destination.alreadyRename = 0;
      const filesList = this.renderer.sendSync("list-file-folder", destination.destination);
      destination.files = [];
      for (const elem of filesList) {
        destination.files.push(elem.fullpath.replace(destination.destination.replaceAll("\\", "/"), ""));
      }
      for (const sourceFile of this.project.files) {
        if (sourceFile.type == 0 || sourceFile.type == 3) {
          destination.total++;
          const split = sourceFile.relativePath.split("/");
          const relativePath = sourceFile.relativePath.replace(split[split.length - 1], "");
          if (destination.files.includes(sourceFile.relativePath)) {
            destination.matching++;
          } else if (destination.files.includes(this.addExtension(sourceFile.nameBeforeRename, relativePath + sourceFile.finalName))) {
            destination.alreadyRename++;
          } else {
            destination.missingFiles++;
            destination.missingFilesList.push(sourceFile.relativePath);
          }
        }
      }
    }
  }

  addExtension(ext, t) {
    if (t == "Need manual rename") return t;
    const splitT = ext.split(".");
    return t + "." + splitT[splitT.length - 1];
  }

  ngOnInit(): void {
    //this.renderer.send("ask-for-full-permission");
    this.idProject = this.getParam.GetParam('idProject');
    if (this.idProject != "") {
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
        for (const file of this.project.files) {
          if (file.type == 0 && file.finalName != null && file.finalName != "") {
            file.customRename = file.finalName;
          }
        }
        this.loading = false;
      });
    } else {
      const qrcFile = this.argApp.getQrcFileArg();
      if (qrcFile != "") {
        this.project = this.renderer.sendSync("import-file-backup-rename", {
          filePath: qrcFile
        });
        this.loading = false;
      } else {
        this.remote.require('electron').dialog.showOpenDialog({
          filters: [
            { name: 'QRClapBackup', extensions: ['qrc'] },
          ],
          properties: ['openFile']
        }).then((result) => {
          if (result.canceled || result.filePaths.lengt == 0) {
            this.router.navigate(['/']);
            return;
          }
          this.project = this.renderer.sendSync("import-file-backup-rename", {
            filePath: result.filePaths[0]
          });
          this.loading = false;
        });
      }
    }
  }

  export() {
    this.remote.require('electron').dialog.showSaveDialog({
      filters: [
        { name: 'QRClapBackup', extensions: ['qrc'] },
      ],
      defaultPath: this.project.name + "_BackupRename.qrc"
    }).then((result) => {
      if (!result.canceled) {
        console.log(result.filePath);
        this.renderer.sendSync("export-file-backup-rename", {
          filePath: result.filePath,
          data: this.project
        });
        this.renderer.send("open-directory", result.filePath);
      }
    });
  }

  renameBackup() {
    if (!this.checkCanStart()) return;
    this.calculMissingFiles();
    var fileAreMissing = false;
    for (const destination of this.destinations) {
      if (destination.missingFiles != 0) {
        fileAreMissing = true;
        break;
      }
    }
    if (fileAreMissing) {
      const modalRef = this.modalService.open(ModalComponent);
      modalRef.componentInstance.title = "Rename backup";
      modalRef.componentInstance.message = "Some files are missing in backup folder, are you sure that you want to rename them ?";
      modalRef.componentInstance.actionButtonMessage = "Yes, still rename";
      modalRef.componentInstance.actionButtonType = 1;
      modalRef.componentInstance.actionCancelButtonMessage = "No";
      modalRef.result.then(
        result => { },
        reason => {
          if (reason == "confirm") {
            this.askForRename()
          }
        }
      );
    } else {
      this.askForRename()
    }
  }

  detailsFolder(i) {
    const modalRef = this.modalService.open(ModalDetailsBackupRenameComponent, { size: "lg" });
    modalRef.componentInstance.folder = this.destinations[i].destination;
    modalRef.componentInstance.missingFile = this.destinations[i].missingFilesList;
    modalRef.result.then(
      result => { },
      reason => { }
    );
  }

  askForRename() {
    const modalRef = this.modalService.open(ModalComponent);
    modalRef.componentInstance.title = "Rename backup";
    modalRef.componentInstance.message = "Are you sure to rename all backup folder ?";
    modalRef.componentInstance.actionButtonMessage = "Rename backup";
    modalRef.componentInstance.actionButtonType = 0;
    modalRef.componentInstance.actionCancelButtonMessage = "No";
    modalRef.result.then(
      result => { },
      reason => {
        if (reason == "confirm") {
          this.loading = true;
          this.compareStatus = "Renaming in progress";
          for (const destination of this.destinations) {
            this.renderer.sendSync("rename-local-files", {
              project: this.project,
              folderToAnalyse: destination.destination
            });
          }
          this.compareStatus = "Renaming finish!";
          setTimeout(() => {
            this.compareStatus = "";
            this.loading = false;
            this.calculMissingFiles();
          }, 4000);
        }
      }
    );
  }

  checkCanStart() {
    this.calculMissingFiles();
    var oneDestinationEmpty = false;
    for (const destination of this.destinations) {
      if (destination.destination == "") {
        oneDestinationEmpty = true;
        break;
      }
    }
    if (oneDestinationEmpty) {
      const modalRef = this.modalService.open(ModalComponent);
      modalRef.componentInstance.title = "Warning";
      modalRef.componentInstance.message = "At least one destination need to be choose before start backup rename. And destination cannot be empty.";
      modalRef.componentInstance.actionButtonType = 0;
      modalRef.componentInstance.canConfirm = false;
      modalRef.componentInstance.actionCancelButtonMessage = "Understand";
      modalRef.componentInstance.cancelButtonType = 2;
      modalRef.result.then(
        result => { },
        reason => { }
      );
      return false;
    }
    return true;
  }

  inSameFolder(destination, newFolder) {
    const splitDestination = destination.replaceAll("\\", "/").split("/");
    const splitNewFolder = newFolder.replaceAll("\\", "/").split("/");
    return destination.replace(splitDestination[splitDestination.length - 1]) == newFolder.replace(splitNewFolder[splitNewFolder.length - 1]);
  }

  selectFolder(i = -1) {
    this.remote.require('electron').dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    }).then((result) => {
      if (result.canceled) {
        return;
      }
      const newFolder = result.filePaths[0];
      //if (this.renderer.sendSync("ask-for-folder-permission", newFolder) == "ok") {
        var exist = false;
        for (var u = 0; u < this.destinations.length; u++) {
          const destination = this.destinations[u];
          if (destination.destination != "" &&
            u != i &&
            (((destination.destination.includes(newFolder) || newFolder.includes(destination.destination)) &&
              !this.inSameFolder(destination.destination, newFolder)) || destination.destination == newFolder)) {
            exist = true;
            break;
          }
        }
        if (exist) {
          const modalRef = this.modalService.open(ModalComponent);
          modalRef.componentInstance.title = "Warning";
          modalRef.componentInstance.message = "You cannot choose same or include folder destinations";
          modalRef.componentInstance.actionButtonType = 0;
          modalRef.componentInstance.canConfirm = false;
          modalRef.componentInstance.actionCancelButtonMessage = "Understand";
          modalRef.componentInstance.cancelButtonType = 2;
          modalRef.result.then(
            result => { },
            reason => { }
          );
          return;
        }
        this.destinations[i].destination = newFolder;
        this.calculMissingFiles();
      /*} else {
        this.router.navigate(['/'], this.getParam.GetQueryParams());
      }*/
    });
  }

  getFileRenamed() {
    const fileRenamed = [];
    if (this.project == null) return fileRenamed;
    for (const file of this.project.files) {
      if (file.finalName != null && file.finalName != "")
        fileRenamed.push(file);
    }
    return fileRenamed;
  }

  getTextFolder(i) {
    return this.destinations[i].destination != "" ? "Change" : "Select Destination Folder";
  }

  addDestination() {
    this.destinations.push({
      destination: "",
      files: [],
      missingFiles: 0,
      alreadyRename: 0,
      matching: 0,
      total: 0
    });
  }

  removeDestination(i) {
    this.destinations.splice(i, 1);
  }
}
