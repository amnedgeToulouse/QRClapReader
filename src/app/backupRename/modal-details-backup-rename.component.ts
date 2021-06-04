import { Component, OnInit } from '@angular/core';
import { faSave } from '@fortawesome/free-solid-svg-icons';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'ng-modal-details-backup-rename',
  templateUrl: './modal-details-backup-rename.component.html'
})
export class ModalDetailsBackupRenameComponent implements OnInit {

  faSave = faSave;
  folder = "";
  missingFile = [];

  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit() {
  }

  cancel() {
    this.activeModal.dismiss('cancel');
  }

}
