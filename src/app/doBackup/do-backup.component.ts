import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { faFolderMinus, faFolderPlus, faSave } from '@fortawesome/free-solid-svg-icons';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IpcRenderer, Remote } from 'electron';
import { ElectronService } from 'ngx-electron';
import { ModalComponent } from '../shared/components/modal/modal.component';
import { GetParamService } from '../shared/service/get-param.service';
import { SaveParamService } from '../shared/service/save-param';
import { ModalCompareComponent } from './modal-compare.component';

@Component({
  selector: 'app-do-backup',
  templateUrl: './do-backup.component.html',
  styleUrls: ['./do-backup.component.scss']
})
export class DoBackupComponent implements OnInit, OnDestroy {

  public renderer: IpcRenderer;
  public remote: Remote;
  public sourceFolder: string = "F:\\Dropbox\\CameraQRCode\\LecteurElectron\\Test Copy 2";
  public destinations: string[] = ["F:\\Dropbox\\CameraQRCode\\LecteurElectron\\Test Copy 3"];

  loading = false;
  faFolderMinus = faFolderMinus;
  faFolderPlus = faFolderPlus;
  faSave = faSave;

  lastCompare = {};

  compareStatus = "";

  interval = null;

  constructor(private router: Router,
    private electronServiceInstance: ElectronService,
    private modalService: NgbModal,
    private activatedRoute: ActivatedRoute,
    private getParam: GetParamService,
    private saveParam: SaveParamService,
    private ref: ChangeDetectorRef) {
    this.renderer = this.electronServiceInstance.ipcRenderer;
    ref.detach();
    this.interval = setInterval(() => {
      this.ref.detectChanges();
    }, 500);
    this.renderer = this.electronServiceInstance.ipcRenderer;
    this.remote = this.electronServiceInstance.remote;
  }

  ngOnInit(): void {

  }

  ngOnDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  checkCanStart() {
    var oneDestinationEmpty = false;
    for (const destination of this.destinations) {
      if (destination == "") {
        oneDestinationEmpty = true;
        break;
      }
    }
    if (this.sourceFolder == "" || oneDestinationEmpty) {
      const modalRef = this.modalService.open(ModalComponent);
      modalRef.componentInstance.title = "Warning";
      modalRef.componentInstance.message = "At least one source and one destination need to be choose before start backup. And destination cannot be empty.";
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

  startBackup(filter = []) {
    if (!this.checkCanStart()) return;
    this.loading = true;
    this.renderer.removeAllListeners("backup-folder-status");
    this.compareStatus = "Start backup in " + this.destinations.length + " " + (this.destinations.length > 1 ? "folders" : "folder");
    setTimeout(async () => {
      this.renderer.send("backup-folder", {
        source: this.sourceFolder,
        destinations: this.destinations,
        filter: filter
      });
    }, 1000);
    this.renderer.on("backup-folder-status", (event, arg) => {
      this.compareStatus = "Copy file: " + arg.filename + " (" + arg.current + "/" + arg.total + ")";
      this.ref.detectChanges();
    });
    this.renderer.once("backup-complete", (event, arg) => {
      this.loading = false;
      this.compareStatus = "";
      this.compareFolder(filter);
      if (arg) {
        const modalRef = this.modalService.open(ModalComponent);
        modalRef.componentInstance.title = "Error - Contact support if error persist";
        modalRef.componentInstance.message = arg;
        modalRef.componentInstance.actionButtonType = 0;
        modalRef.componentInstance.canConfirm = false;
        modalRef.componentInstance.actionCancelButtonMessage = "Ok";
        modalRef.componentInstance.cancelButtonType = 2;
        modalRef.result.then(
          result => { },
          reason => { }
        );
      }
    });
  }

  inSameFolder(destination, newFolder) {
    const splitDestination = destination.replaceAll("\\", "/").split("/");
    const splitNewFolder = newFolder.replaceAll("\\", "/").split("/");
    return destination.replace(splitDestination[splitDestination.length - 1]) == newFolder.replace(splitNewFolder[splitNewFolder.length - 1]);
  }

  selectFolder(isSource, i = -1) {
    this.remote.require('electron').dialog.showOpenDialog({
      properties: ['openDirectory']
    }).then((result) => {
      if (result.canceled) {
        return;
      }
      const newFolder = result.filePaths[0];
      var exist = this.sourceFolder != "" && (this.sourceFolder.includes(newFolder) || newFolder.includes(this.sourceFolder));
      if (!exist) {
        for (var u = 0; u < this.destinations.length; u++) {
          const destination = this.destinations[u];
          if (destination != "" && u != i && (((destination.includes(newFolder) || newFolder.includes(destination)) && !this.inSameFolder(destination, newFolder)) || destination == newFolder)) {
            exist = true;
            break;
          }
        }
      }
      if (exist) {
        const modalRef = this.modalService.open(ModalComponent);
        modalRef.componentInstance.title = "Warning";
        modalRef.componentInstance.message = "You cannot choose same or include folder in source or destinations";
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
      if (isSource) {
        this.sourceFolder = newFolder;
      } else {
        this.destinations[i] = newFolder;
      }
    });
  }

  compareFolder(filter = [], autostart = false) {
    if (!this.checkCanStart()) return;
    if (filter.length == 0) this.lastCompare = {};
    this.renderer.removeAllListeners("compare-folder-status");
    this.loading = true;
    this.renderer.send("compare-folder", {
      source: this.sourceFolder,
      destinations: this.destinations,
      filter: filter
    });
    this.renderer.on("compare-folder-status", (event, arg) => {
      this.compareStatus = "Compare file : " + arg.current + "/" + arg.total;
    });
    this.renderer.once("compare-folder-completed", (event, arg) => {
      this.compareStatus = "Compare completed!";
      if (typeof this.lastCompare['md5Source'] == "undefined") {
        this.lastCompare = arg;
      } else {
        for (const destinationFoler in arg['md5Destination']) {
          for (const destinationMd5 in arg['md5Destination'][destinationFoler]) {
            this.lastCompare['md5Destination'][destinationFoler][destinationMd5] = arg['md5Destination'][destinationFoler][destinationMd5];
          }
        }
      }
      console.log(this.lastCompare);
      setTimeout(() => {
        this.compareStatus = "";
        this.loading = false;
        const fileState = {
          source: this.sourceFolder,
          destinations: this.destinations,
          diskError: {}
        };
        for (const destinationFolder in this.lastCompare['md5Destination']) {
          fileState.diskError[destinationFolder] = [];
        }
        for (const sourceFolder in this.lastCompare['md5Source']) {
          const md5Source = this.lastCompare['md5Source'][sourceFolder];
          for (const destinationFolder in this.lastCompare['md5Destination']) {
            const md5Destination = this.lastCompare['md5Destination'][destinationFolder];
            if (typeof md5Destination[sourceFolder] == "undefined") {
              fileState.diskError[destinationFolder].push({
                file: sourceFolder,
                isMissing: true,
                isDifferent: false
              });
            } else if (md5Destination[sourceFolder].md5 != md5Source.md5) {
              fileState.diskError[destinationFolder].push({
                file: sourceFolder,
                isMissing: false,
                isDifferent: true
              });
            }
          }
        }
        if (!autostart) {
          const modalRef = this.modalService.open(ModalCompareComponent, { size: "xl", backdrop: 'static' });
          modalRef.componentInstance.fileState = fileState;
          modalRef.componentInstance.parent = this;
          modalRef.result.then(
            result => { },
            reason => { }
          );
        } else {
          const filter = [];
          for (const destination in fileState['diskError']) {
            for (const file of fileState['diskError'][destination]) {
              filter.push(destination + file['file']);
            }
          }
          console.log(filter);
          this.startBackup(filter);
        }
        console.log(fileState);
      }, 1000);
    });
  }

  getTextFolder(isSource, i = 0) {
    return isSource ? this.sourceFolder != "" ? "Change" : "Select Source Folder" : this.destinations[i] != "" ? "Change" : "Select Destination Folder";
  }

  addDestination() {
    this.destinations.push("");
  }

  removeDestination(i) {
    this.destinations.splice(i, 1);
  }
}
