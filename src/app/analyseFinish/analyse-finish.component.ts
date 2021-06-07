import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { faClock, faFolderOpen, faBars } from '@fortawesome/free-solid-svg-icons';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IpcRenderer } from 'electron';
import { ElectronService } from 'ngx-electron';
import { Constant } from '../constant';
import { ModalComponent } from '../shared/components/modal/modal.component';
import { GetParamService } from '../shared/service/get-param.service';
import { HttpRequestService } from '../shared/service/http-request.service';
import { ModalRenameComponent } from './modal-rename.component';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SaveParamService } from '../shared/service/save-param';
import { Utils } from '../shared/service/utils';

@Component({
  selector: 'app-analyse-finish',
  templateUrl: './analyse-finish.component.html',
  styleUrls: ['./analyse-finish.component.scss']
})
export class AnalyseFinishComponent implements OnInit, OnDestroy {

  public renderer: IpcRenderer;
  idProject = -1;
  project: ProjectFull = null;
  loaded = false;
  showFalseTake = false;
  showAutoTakeRename = false;
  interval = null;

  faClock = faClock;
  faBars = faBars;
  faFolderOpen = faFolderOpen;
  loading = false;

  constructor(private router: Router,
    private getParam: GetParamService,
    private httpRequest: HttpRequestService,
    private modalService: NgbModal,
    private electronServiceInstance: ElectronService,
    readonly snackBar: MatSnackBar,
    private ref: ChangeDetectorRef,
    private saveParam: SaveParamService) {
    this.renderer = electronServiceInstance.ipcRenderer;
    this.interval = setInterval(() => {
      this.ref.detectChanges();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  updateFile() {
    for (var i = 0; i < this.project.files.length; i++) {
      this.nameByBefore(this.project.files[i], i);
    }
  }

  ngOnInit(): void {
    this.idProject = this.getParam.GetParam('idProject');
    this.updateProject();
    this.saveParam.SetProjectFolder(this.idProject, this.getParam.GetParam('folderToAnalyse'));

  }

  drop(event: CdkDragDrop<string[]>) {
    if (event.previousIndex != event.currentIndex) {
      moveItemInArray(this.project.files, event.previousIndex, event.currentIndex);
      this.saveOrder();
    }
  }

  saveOrder() {
    this.updateFile();
    this.calculProjectStat();
    this.loading = true;
    var project = JSON.parse(JSON.stringify(this.project))
    project.files = [];
    for (var i = 0; i < this.project.files.length; i++) {
      project.files.push({
        id: this.project.files[i].id,
        order: i
      })
    }
    this.httpRequest.SendRequest({
      host: Constant.HOST_API,
      port: Constant.PORT_API,
      data: project,
      method: "POST",
      path: "/qrclap/reorderfiles",
      token: this.saveParam.GetParam('token'),
      processOtherError: true
    }).then((project: ProjectFull) => {
      this.loading = false;
      this.snackBar.open('Saved in the cloud!', '', {
        duration: 3000,
        verticalPosition: 'top'
      });
    });
  }

  getRenameName(f: FileFull, withoutDupli = false) {
    if (f.needManualRename) return "Need manual rename";
    var toReturn = "";
    if (f.customRename != '' && typeof f.customRename != "undefined") {
      toReturn = f.customRename;
    }
    if (toReturn == "")
      toReturn = f.nameAfterRename == null || typeof f.nameAfterRename == "undefined" ? '' : f.nameAfterRename;
    if (withoutDupli) {
      const split = toReturn.split("_");
      if (split.length > 1 && !isNaN(+split[split.length - 1])) {
        toReturn = toReturn.replace("_" + split[split.length - 1], "");
      }
    }
    return toReturn;
  }

  zoomImage(imageToPrint, i) {
    const modalRef = this.modalService.open(ModalRenameComponent, { size: 'xl' });
    modalRef.componentInstance.i = i;
    modalRef.componentInstance.parent = this;
    modalRef.componentInstance.project = this.project;
    modalRef.componentInstance.imageToPrint = imageToPrint;
    modalRef.result.then(
      result => {
        this.updateFile();
      },
      reason => { }
    );
  }

  getRelativeFolderOfFile(f: FileFull) {
    const split = f.relativePath.split("/");
    return f.relativePath.replace(split[split.length - 1], "");
  }

  formatDuration(file: FileFull) {
    return Utils.ConvertSecondToTimeLeft(file.duration);
  }

  rowClass(file: FileFull) {
    if (!this.canBeShow(file)) return "d-none"
    var suffix = "row-valid";
    if (file.type == 2) {
      suffix = "row-invalid";
    } else {
      if (file.needManualRename) {
        suffix = "row-warning";
      } else if (file.isChild) {
        suffix = "row-valid-child";
        if (!this.showAutoTakeRename) {
          suffix += " row-margin";
        }
      }
    }
    if (!file.renameIt && file.type != 2) {
      suffix += " row-disabled";
    }
    return "d-flex flex-row align-items-center row-project drag-box " + suffix;
  }

  findPreviousValidFile(i): FileFull {
    if (i == 0) {
      return null;
    }
    i--;
    while (i >= 0) {
      if (this.getRenameName(this.project.files[i]) != '' && this.getRenameName(this.project.files[i]) != 'Need manual rename' && this.project.files[i].renameIt) {
        return this.project.files[i];
      }
      i--;
    }
    return null;
  }

  findPreviousSameFile(i): FileFull {
    const baseFile = this.project.files[i];
    if (i == 0) {
      return null;
    }
    i--;
    while (i >= 0) {
      if (this.getRenameName(this.project.files[i]) != '' &&
        this.getRenameName(this.project.files[i]) != 'Need manual rename' &&
        this.project.files[i].renameIt &&
        (this.getRenameName(this.project.files[i], true) == this.getRenameName(baseFile, true)) &&
        this.getRelativeFolderOfFile(this.project.files[i]) == this.getRelativeFolderOfFile(baseFile)) {
        return this.project.files[i];
      }
      i--;
    }
    return null;
  }

  openDirectory(f: FileFull, event = null) {
    var filePath = this.getParam.GetParam('folderToAnalyse') + f.relativePath;
    if (this.project.state == 1 && f.finalName != null) {
      const split = f.relativePath.split("/");
      filePath = this.getParam.GetParam('folderToAnalyse') + this.addExtension(split[split.length - 1], f.relativePath.replace(split[split.length - 1], f.finalName));
    }
    console.log(filePath);
    this.renderer.send("open-directory", filePath);
    if (event != null) {
      event.stopPropagation();
    }
  }

  renameCustomFile(f: FileFull, i: number) {
    if (f.type == 2) {
      this.openDirectory(f);
    } else if (this.project.state != 1) {
      const modalRef = this.modalService.open(ModalRenameComponent);
      modalRef.componentInstance.i = i;
      modalRef.componentInstance.parent = this;
      modalRef.componentInstance.project = this.project;
      modalRef.result.then(
        result => { },
        reason => {
          this.saveFileStatus();
        }
      );
    }
  }

  calculProjectStat(projectCustom = null) {
    if (projectCustom == null) projectCustom = this.project
    projectCustom.total = 0;
    projectCustom.plan = 0;
    projectCustom.prise = 0;
    projectCustom.divers = 0;
    projectCustom.scene = 0;
    const plan = [];
    const scene = [];
    for (const file of projectCustom.files) {
      if (file.type == 0 || file.type == 3) {
        const fileName = this.getRenameName(file, true);
        const cinemaFormat = this.isCinemaFormat(fileName);
        if (cinemaFormat != null) {
          const cinemaSplit = this.cinemaSplit(cinemaFormat.value, cinemaFormat.i);
          if (!scene.includes(cinemaSplit.scene)) {
            scene.push(cinemaSplit.scene);
            projectCustom.scene++;
          }
          if (!plan.includes(cinemaSplit.scene + "_" + cinemaSplit.plan)) {
            plan.push(cinemaSplit.scene + "_" + cinemaSplit.plan);
            projectCustom.plan++;
          }
          projectCustom.prise++;
        } else {
          projectCustom.divers++;
        }
        projectCustom.total++;
      }
    }
    return projectCustom;
  }

  saveFileStatus() {
    if (this.project.state == 1) return;
    this.updateFile();
    this.loading = true;
    var projectClone: ProjectFull = JSON.parse(JSON.stringify(this.project));
    for (var i = 0; i < projectClone.files.length; i++) {
      if (projectClone.files[i].type == 1 && projectClone.files[i].renameIt) {
        projectClone.files[i].type = 0;
      }
      if ((projectClone.files[i].type == 0 || projectClone.files[i].type == 3) && !projectClone.files[i].renameIt) {
        projectClone.files[i].type = 1;
      } else if (projectClone.files[i].renameIt && projectClone.files[i].isChild && projectClone.files[i].type != 2) {
        projectClone.files[i].type = 3;
      }
      projectClone.files[i].tmpName = projectClone.files[i].type == 0 ? projectClone.files[i].customRename : null;
      projectClone.files[i].needTmpName = true;
      projectClone.files[i].qrs = [];
    }
    projectClone = this.calculProjectStat(projectClone);
    this.loading = true;
    this.httpRequest.SendRequest({
      host: Constant.HOST_API,
      port: Constant.PORT_API,
      data: projectClone,
      method: "POST",
      path: "/qrclap/renamefiles",
      token: this.saveParam.GetParam('token'),
      processOtherError: true
    }).then((project: ProjectFull) => {
      this.loading = false;
      this.snackBar.open('Saved in the cloud!', '', {
        duration: 3000,
        verticalPosition: 'top'
      });
    });
  }

  restoreByDateOrder() {
    const modalRef = this.modalService.open(ModalComponent);
    modalRef.componentInstance.title = "Restore initial file order";
    modalRef.componentInstance.message = "Are you sure to restore initial file order of all file ?";
    modalRef.componentInstance.actionButtonMessage = "Restore order";
    modalRef.componentInstance.actionButtonType = 0;
    modalRef.componentInstance.actionCancelButtonMessage = "No";
    modalRef.result.then(
      result => { },
      reason => {
        if (reason == "confirm") {
          this.project.files.sort(function (a: FileFull, b: FileFull) { return new Date(a.createdDate).getTime() > new Date(b.createdDate).getTime() ? 1 : -1 });
          this.saveOrder();
        }
      }
    );
  }

  nameByBefore(file, i) {
    if (file.type == 2) return;
    file.needManualRename = false;
    const previousFile = this.findPreviousValidFile(i);
    const fileName = this.getRenameName(file);
    if (previousFile != null && (fileName == '' || fileName == 'Need manual rename' || file.isChild)) {
      file.isChild = true;
      const previousName = this.getRenameName(previousFile);
      const cinemaFormat = this.isCinemaFormat(previousName);
      if (cinemaFormat != null) {
        const cinemaSplit = this.cinemaSplit(cinemaFormat.value, cinemaFormat.i);
        cinemaSplit.prise = +cinemaSplit.prise + 1 + "";
        cinemaSplit.suffix = this.getSuffixCinema(previousName, cinemaFormat.value);
        file.customRename = this.getCinemaName(cinemaSplit);
      } else {
        file.customRename = this.getRenameName(previousFile, true);
      }
    } else if (file.isChild) {
      file.customRename = "";
      file.isChild = false;
    }
    const previousSameFile = this.findPreviousSameFile(i);
    if (previousSameFile != null) {
      const previousName = this.getRenameName(previousSameFile);
      const split = previousName.split("_");
      var newName = this.getRenameName(previousSameFile, true);
      if (split.length > 1 && !isNaN(+split[split.length - 1])) {
        newName = newName + "_" + (+split[split.length - 1] + 1);
      } else {
        newName += "_1"
      }
      file.customRename = newName;
      file.wasDuplicate = true;
      return;
    } else if (file.wasDuplicate) {
      file.wasDuplicate = false;
      file.customRename = this.getRenameName(file, true);
    }
    file.needManualRename = this.getRenameName(file) == '';
  }

  getCinemaName(cinemaValue) {
    var addScene = +cinemaValue.scene <= 9 ? "0" : "";
    var addPlan = +cinemaValue.plan <= 9 ? "0" : "";
    var addPrise = +cinemaValue.prise <= 9 ? "0" : "";
    return ("S" + addScene + cinemaValue.scene + cinemaValue.sceneSuffix +
      "_P" + addPlan + cinemaValue.plan + cinemaValue.planSuffix +
      "_P" + addPrise + cinemaValue.prise + cinemaValue.priseSuffix).toUpperCase() +
      cinemaValue.suffix;
  }

  actionAllSelect(select: boolean) {
    for (const file of this.project.files) {
      if (this.canBeShow(file)) {
        file.renameIt = select;
      }
    }
  }

  addExtension(ext, t) {
    if (t == "Need manual rename") return t;
    const splitT = ext.split(".");
    return t + "." + splitT[splitT.length - 1];
  }

  cinemaSplit(value: string, i: number) {
    var regexList = [/[S]|[0-9][0-9]|[A-Z]|[_][P]|[0-9][0-9]|[A-Z]|[_][P]|[0-9][0-9]|[A-Z]/gi, //S01E_P15A_P16A
      /[S]|[0-9][0-9]|[A-Z]|[_][P]|[0-9][0-9]|[A-Z]|[_][P]|[0-9][0-9]/gi, //S01E_P15A_P16
      /[S]|[0-9][0-9]|[A-Z]|[_][P]|[0-9][0-9]|[_][P]|[0-9][0-9]/gi, //S01E_P15_P16
      /[S]|[0-9][0-9]|[_][P]|[0-9][0-9]|[_][P]|[0-9][0-9]/gi, //S01_P15_P16
      /[S]|[0-9][0-9]|[_][P]|[0-9][0-9]|[A-Z]|[_][P]|[0-9][0-9]/gi, //S01_P15A_P16
      /[S]|[0-9][0-9]|[_][P]|[0-9][0-9]|[_][P]|[0-9][0-9]|[A-Z]/gi, //S01_P15_P16A
      /[S]|[0-9][0-9]|[A-Z]|[_][P]|[0-9][0-9]|[_][P]|[0-9][0-9]|[A-Z]/gi, //S01A_P15_P16A
      /[S]|[0-9][0-9]|[_][P]|[0-9][0-9]|[A-Z]|[_][P]|[0-9][0-9]|[A-Z]/gi, //S01_P15A_P16A
    ];
    const splitRegex = value.match(regexList[i]);
    const finalCinema = {
      scene: +splitRegex[1] + "",
      sceneSuffix: "",
      plan: "",
      planSuffix: "",
      prise: "",
      priseSuffix: "",
      suffix: ""
    };
    var i = 2;
    if (splitRegex[i].toUpperCase() != "_P") {
      finalCinema.sceneSuffix = splitRegex[i];
      i++;
    }
    i++;
    finalCinema.plan = +splitRegex[i] + "";
    i++;
    if (splitRegex[i].toUpperCase() != "_P") {
      finalCinema.planSuffix = splitRegex[i];
      i++;
    }
    i++;
    finalCinema.prise = +splitRegex[i] + "";
    i++;
    if (splitRegex.length > i) {
      finalCinema.priseSuffix = splitRegex[i];
    }
    return finalCinema;
  }

  isCinemaFormat(value: string) {
    if (typeof value == "undefined" || value == null) return null;
    var regexList = [/[S][0-9][0-9][A-Z][_][P][0-9][0-9][A-Z][_][P][0-9][0-9][A-Z]/gi, //S01E_P15A_P16A
      /[S][0-9][0-9][A-Z][_][P][0-9][0-9][A-Z][_][P][0-9][0-9]/gi, //S01E_P15A_P16
      /[S][0-9][0-9][A-Z][_][P][0-9][0-9][_][P][0-9][0-9]/gi, //S01E_P15_P16
      /[S][0-9][0-9][_][P][0-9][0-9][_][P][0-9][0-9]/gi, //S01_P15_P16
      /[S][0-9][0-9][_][P][0-9][0-9][A-Z][_][P][0-9][0-9]/gi, //S01_P15A_P16
      /[S][0-9][0-9][_][P][0-9][0-9][_][P][0-9][0-9][A-Z]/gi, //S01_P15_P16A
      /[S][0-9][0-9][A-Z][_][P][0-9][0-9][_][P][0-9][0-9][A-Z]/gi, //S01A_P15_P16A
      /[S][0-9][0-9][_][P][0-9][0-9][A-Z][_][P][0-9][0-9][A-Z]/gi, //S01_P15A_P16A
    ];
    var i = 0;
    for (const regex of regexList) {
      var match = value.match(regex);
      if (match != null) {
        return {
          value: match[0],
          i: i
        };
      }
      i++;
    }
    return null;
  }

  getSuffixCinema(value: string, regexResult: string) {
    return value.split(regexResult)[1];
  }

  updateProject() {
    this.loading = true;
    this.httpRequest.SendRequest({
      host: Constant.HOST_API,
      port: Constant.PORT_API,
      data: null,
      method: "GET",
      path: "/qrclap/project/" + this.idProject,
      token: this.saveParam.GetParam('token'),
      processOtherError: true
    }).then((project: ProjectFull) => {
      this.project = project;
      this.loaded = true;
      const qrMissing: ImageFull[] = [];
      for (const file of this.project.files) {
        file.renameIt = file.type != 1;
        file.isChild = false;
        file.needManualRename = false;
        file.wasDuplicate = false;
        if (file.tmpName != null && file.tmpName != "") {
          file.customRename = file.tmpName;
        } else if (file.type == 0 && file.finalName != null && file.finalName != "") {
          file.customRename = file.finalName;
        }
        for (const qr of file.qrs) {
          const qrData = this.renderer.sendSync("get-image-data", {
            projectName: this.getParam.GetParam('selectedProject'),
            relativePath: qr.relativePath
          });
          if (qrData == "") {
            qrMissing.push(qr);
          } else {
            qr.dataBase64 = "data:image/jpg;base64," + qrData;
          }
        }
      }
      if (qrMissing.length != 0) {
        this.httpRequest.SendRequest({
          host: Constant.HOST_API,
          port: Constant.PORT_API,
          data: {
            id: project.id,
            qrData: qrMissing
          },
          method: "POST",
          path: "/qrclap/getqrdata",
          token: this.saveParam.GetParam('token'),
          processOtherError: true
        }).then((projectQrData: ProjectQrData) => {
          for (const qrMiss of projectQrData.qrData) {
            for (const file of this.project.files) {
              for (const qr of file.qrs) {
                if (qr.id == qrMiss.id) {
                  qr.dataBase64 = "data:image/jpg;base64," + qrMiss.dataBase64;
                  const err = this.renderer.sendSync("save-base64-image-disk", {
                    projectName: this.getParam.GetParam('selectedProject'),
                    path: qr.relativePath,
                    base64Data: qrMiss.dataBase64
                  });
                  if (err) {
                    console.log(err);
                  }
                }
              }
            }
          }
          this.updateFile();
          this.loading = false;
        });
      } else {
        this.updateFile();
        this.loading = false;
      }
    });
  }

  renameFiles() {
    if (this.loading) return;
    const projectClone: ProjectFull = JSON.parse(JSON.stringify(this.project));
    var canBeSend = true;
    for (var i = 0; i < projectClone.files.length; i++) {
      if (projectClone.files[i].renameIt && projectClone.files[i].needManualRename) {
        canBeSend = false;
        break;
      }
    }
    if (!canBeSend) {
      const modalRef = this.modalService.open(ModalComponent);
      modalRef.componentInstance.title = "Warning";
      modalRef.componentInstance.message = "You can't rename files because orange files are still need to be manual renamed, please rename it before trying to rename files.";
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
    const modalRef = this.modalService.open(ModalComponent);
    modalRef.componentInstance.title = "Rename files";
    modalRef.componentInstance.message = "Are you sure to rename all files selected ?";
    modalRef.componentInstance.actionButtonMessage = "Rename files";
    modalRef.componentInstance.actionButtonType = 0;
    modalRef.componentInstance.actionCancelButtonMessage = "No";
    modalRef.result.then(
      result => { },
      reason => {
        if (reason === "confirm") {
          for (var i = 0; i < projectClone.files.length; i++) {
            if (projectClone.files[i].type == 1 && projectClone.files[i].renameIt) {
              projectClone.files[i].type = 0;
            }
            if ((projectClone.files[i].type == 0 || projectClone.files[i].type == 3) && !projectClone.files[i].renameIt) {
              projectClone.files[i].type = 1;
            } else if (projectClone.files[i].renameIt && projectClone.files[i].isChild && projectClone.files[i].type != 2) {
              projectClone.files[i].type = 3;
            }
            if (projectClone.state == 1) {
              projectClone.files[i].tmpName = projectClone.files[i].type == 0 || projectClone.files[i].type == 3 ? this.getRenameName(projectClone.files[i]) : null;
            } else {
              projectClone.files[i].finalName = projectClone.files[i].type == 0 || projectClone.files[i].type == 3 ? this.getRenameName(projectClone.files[i]) : null;
            }
            projectClone.files[i].needTmpName = false;
            projectClone.files[i].qrs = [];
          }
          this.loading = true;
          this.renderer.send("rename-files", {
            idProject: this.idProject,
            folderToAnalyse: this.getParam.GetParam('folderToAnalyse'),
            token: this.saveParam.GetParam("token"),
            project: projectClone
          });
          this.renderer.once("rename-file-finished", (event, arg) => {
            const modalRef = this.modalService.open(ModalComponent);
            modalRef.componentInstance.title = "Rename finished";
            modalRef.componentInstance.message = "The rename has been completed successfully !";
            modalRef.componentInstance.cancelButtonType = 1;
            modalRef.componentInstance.canConfirm = false;
            modalRef.componentInstance.actionCancelButtonMessage = "Go to backup rename";
            modalRef.result.then(
              result => { },
              reason => {
                this.loading = false;
                this.router.navigate(['/backupRename'], this.getParam.GetQueryParams());
              }
            );
          });
        }
      }
    );
  }

  cancelAnalyze() {
    if (this.loading) return;
    const modalRef = this.modalService.open(ModalComponent);
    modalRef.componentInstance.title = "Delete Analyse";
    modalRef.componentInstance.message = "Are you sure to delete analyse in progress ?";
    modalRef.componentInstance.actionButtonMessage = "Delete Analyse";
    modalRef.componentInstance.actionButtonType = 1;
    modalRef.componentInstance.actionCancelButtonMessage = "No";
    modalRef.result.then(
      result => { },
      reason => {
        if (reason === "confirm") {
          this.loading = true;
          this.httpRequest.SendRequest({
            host: Constant.HOST_API,
            port: Constant.PORT_API,
            data: null,
            method: "DELETE",
            path: "/qrclap/removeproject/" + this.idProject,
            token: this.saveParam.GetParam('token'),
            processOtherError: true
          }).then((project: ProjectFull) => {
            const queryParams = this.getParam.GetQueryParams();
            delete queryParams.queryParams.idProject;
            this.router.navigate(['/projectSelected'], queryParams);
            this.loading = false;
          });
        }
      }
    );
  }

  styleQr(qri) {
    return {
      width: "96px",
      height: "54px",
      cursor: "pointer",
      "margin-left": qri == 5 ? "10px" : "0px"
    }
  }

  classActive(isActive) {
    return isActive ? "btn btn-warning active" : "btn btn-outline-warning";
  }

  activateReorder = false;
  textActivateReorder() {
    return !this.activateReorder ? "Activate reorder" : "Deactivate reorder";
  }

  actionActivateReorder() {
    this.activateReorder = !this.activateReorder;
  }

  textShowAutoTakeRename() {
    return "Show auto take rename";
  }

  actionShowAutoTakeRename() {
    this.showAutoTakeRename = !this.showAutoTakeRename;
    this.showFalseTake = false;
  }

  textShowFalseTake() {
    return "Show false take (<10s)";
  }

  actionShowFalseTake() {
    this.showFalseTake = !this.showFalseTake;
    this.showAutoTakeRename = false;
  }

  canBeShow(file: FileFull) {
    return (!this.showFalseTake && !this.showAutoTakeRename) ||
      (this.showFalseTake && file.duration < 10 && file.type == 0) ||
      (this.showAutoTakeRename && file.isChild);
  }

}

export class ProjectFull {
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
  files: FileFull[];
}

export class FileFull {
  id: number;
  relativePath: string;
  createdDate;
  duration: number;
  type: number;
  nameBeforeRename: string;
  nameAfterRename: string;
  finalName: string;
  customRename: string;
  renameIt: boolean;
  qrs: ImageFull[];
  isChild: boolean;
  needManualRename: boolean;
  wasDuplicate: boolean;
  tmpName: string;
  needTmpName: boolean;
}

export class ImageFull {
  id: number;
  relativePath: string;
  type: number;
  dataBase64: string;
  dataContentType: string;
}

export class ProjectQrData {
  id: number;
  qrData: ImageFull[];
}