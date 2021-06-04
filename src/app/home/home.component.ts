import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
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

  projectSelected = "";

  searchValue = "";

  projects: Project[] = [];

  projectsFiltered = [];

  faSearch = faSearch;

  projectLoaded = false;

  constructor(private modalService: NgbModal,
    private router: Router,
    private httpRequest: HttpRequestService,
    private saveParam: SaveParamService,
    private getParam: GetParamService) { }

  ngOnInit(): void {
    this.updateProject();
  }

  updateProject() {
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
      }
    });
  }

  newProject() {
    const modalRef = this.modalService.open(ModalComponent);
    modalRef.componentInstance.isCreateProject = true;
    modalRef.result.then(
      result => { },
      reason => {
        if (reason === "confirm") {
          console.log(this.getParam.GetQueryParams({ projectSelected: modalRef.componentInstance.projectName }));
          this.router.navigate(["/projectSelected"], this.getParam.GetQueryParams({ projectSelected: modalRef.componentInstance.projectName }));
        }
      }
    );
  }

  doBackup() {
    this.router.navigate(["/doBackup"]);
  }

  getStateProject(p: Project) {
    return p.state == 0 ? "Analysing" : "Renamed";
  }

  getClassStateProject(p: Project) {
    return p.state == 0 ? "yellow-text" : "green-text";
  }

  formatDate(d) {
    let ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(d);
    let mo = new Intl.DateTimeFormat('en', { month: '2-digit' }).format(d);
    let da = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(d);
    return `${da}/${mo}/${ye}`;
  }

  updateFilter() {
    if (this.searchValue === "") {
      this.projectsFiltered = this.projects;
      return;
    }
    this.projectsFiltered = [];
    for (const elem of this.projects) {
      if (elem.name.toLowerCase().includes(this.searchValue.toLowerCase()) ||
        (elem.total + "").toLowerCase().includes(this.searchValue.toLowerCase()) ||
        (elem.scene + "").toLowerCase().includes(this.searchValue.toLowerCase()) ||
        (elem.plan + "").toLowerCase().includes(this.searchValue.toLowerCase()) ||
        (elem.prise + "").toLowerCase().includes(this.searchValue.toLowerCase()) ||
        (elem.divers + "").toLowerCase().includes(this.searchValue.toLowerCase()) ||
        this.getStateProject(elem).toLowerCase().includes(this.searchValue.toLowerCase()) ||
        this.formatDate(elem.date).toLowerCase().includes(this.searchValue.toLowerCase())) {
        this.projectsFiltered.push(elem);
      }
    }
  }

  openProject(project: Project) {
    this.router.navigate(["/projectSelected"], this.getParam.GetQueryParams({ projectSelected: project.name, idProject: project.id, projectState: project.state }));
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