import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { GetParamService } from '../shared/service/get-param.service';

@Component({
  selector: 'ng-modal-project-selected-protection',
  templateUrl: './project-selected-protection.component.html'
})
export class ModalProjectSelectProtectionComponent implements OnInit {

  faTrash = faTrash;
  parentFolder = "";
  fileMissing: [];

  constructor(private router: Router,
    private getParam: GetParamService,
    public activeModal: NgbActiveModal) { }

  ngOnInit() {

  }

  ignore() {
    this.router.navigate(['/analyseFolder'], this.getParam.GetQueryParams({ folderToAnalyse: this.parentFolder }));
    this.activeModal.dismiss('confirm');
  }

  classActive(isActive) {
    return isActive ? "btn btn-warning active" : "btn btn-outline-warning";
  }

  cancel() {
    this.activeModal.dismiss('cancel');
  }

}
