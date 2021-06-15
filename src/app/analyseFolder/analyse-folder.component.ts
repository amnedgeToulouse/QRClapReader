import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IpcRenderer } from 'electron';
import { ElectronService } from 'ngx-electron';
import { ConnexionComponent } from '../connexion/connexion.component';
import { HomeComponent } from '../home/home.component';
import { ProjectSelectedComponent } from '../projectSelected/project-selected.component';
import { ModalComponent } from '../shared/components/modal/modal.component';
import { GetParamService } from '../shared/service/get-param.service';
import { SaveParamService } from '../shared/service/save-param';

@Component({
  selector: 'app-analyse-folder',
  templateUrl: './analyse-folder.component.html',
  styleUrls: ['./analyse-folder.component.scss']
})
export class AnalyseFolderComponent implements OnInit, OnDestroy {

  folderToAnalyse = "";
  projectSelected = "";

  faSearch = faSearch;
  public renderer: IpcRenderer;
  status = "";
  type = "";
  interval = null;
  idProject = -1;

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
      if (this.type == "finish" && this.idProject != -1) {
        clearInterval(this.interval);
        this.router.navigate(['/analyseFinish'], this.getParam.GetQueryParams({ idProject: this.idProject }));
      }
    }, 200);
  }

  ngOnDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  ngOnInit(): void {
    if (this.getParam.GetParam("idProject") != "") {
      this.router.navigate(['/analyseFinish'], this.getParam.GetQueryParams());
      return;
    }
    this.renderer.send('analyse-folder', {
      folderToAnalyse: this.getParam.GetParam('folderToAnalyse'),
      projectName: this.getParam.GetParam('projectSelected'),
      token: this.saveParam.GetParam('token')
    });
    this.renderer.removeAllListeners('debug');
    this.renderer.removeAllListeners('onComplete');
    this.renderer.removeAllListeners('endProcess');
    this.renderer.on("debug", (event, arg) => {
      console.log(arg);
    });
    this.renderer.on("onComplete", (event, arg) => {
      this.status = arg.message;
      this.type = arg.type;
      if (this.type == "finish") {
        this.idProject = arg.idProject;
      }
    });
    this.renderer.on("endProcess", (event, arg) => {
      const modalRef = this.modalService.open(ModalComponent, { backdrop: 'static' });
      modalRef.componentInstance.title = "Cancel Analyse";
      modalRef.componentInstance.message = "No file analysable found in this folder.";
      modalRef.componentInstance.canConfirm = false;
      modalRef.componentInstance.actionCancelButtonMessage = "Cancel Analyse";
      modalRef.result.then(
        result => { },
        reason => {
          this.renderer.send('cancel-analyse-folder');
          this.router.navigate(['/projectSelected'], this.getParam.GetQueryParams());
        }
      );
    });
  }

  getFolderAnalysed() {
    return this.folderToAnalyse;
  }

  getStatus() {
    return this.status == "" ? "Initializing.." : this.status;
  }

  cancel() {
    const modalRef = this.modalService.open(ModalComponent);
    modalRef.componentInstance.title = "Cancel Analyse";
    modalRef.componentInstance.message = "Are you sure to cancel analyse in progress ?";
    modalRef.componentInstance.actionButtonMessage = "Cancel Analyse";
    modalRef.componentInstance.actionButtonType = 1;
    modalRef.componentInstance.actionCancelButtonMessage = "No";
    modalRef.result.then(
      result => { },
      reason => {
        if (reason === "confirm") {
          this.renderer.send('cancel-analyse-folder');
          this.router.navigate(['/projectSelected'], this.getParam.GetQueryParams());
        }
      }
    );
  }

}
