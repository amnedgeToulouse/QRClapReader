import { Component, OnInit } from '@angular/core';
import { faSave } from '@fortawesome/free-solid-svg-icons';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DoBackupComponent } from './do-backup.component';

@Component({
  selector: 'ng-modal-compare',
  templateUrl: './modal-compare.component.html'
})
export class ModalCompareComponent implements OnInit {

  fileState = {};
  faSave = faSave;
  parent: DoBackupComponent;

  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit() {
  }

  confirm() {
    console.log(this.fileState);
    const filter = [];
    for (const destination in this.fileState['diskError']) {
      for (const file of this.fileState['diskError'][destination]) {
        filter.push(destination + file['file']);
      }
    }
    console.log(filter);
    this.parent.startBackup(filter);
    this.activeModal.dismiss('confirm');
  }

  cancel() {
    this.activeModal.dismiss('cancel');
  }

  getListDisk() {
    const listDisk = [];
    for (const disk in this.fileState['diskError']) {
      listDisk.push(disk);
    }
    return listDisk;
  }

  getTotalInDisk(disk, isMissing) {
    var total = 0;
    for (var file of this.fileState['diskError'][disk]) {
      if (file.isMissing && isMissing) {
        total++;
      } else if (file.isDifferent && !isMissing) {
        total++;
      }
    }
    return total;
  }

  diskContainError(disk) {
    return this.getTotalInDisk(disk, true) != 0 || this.getTotalInDisk(disk, false) != 0;
  }

  needRecopy() {
    for (const destination in this.fileState['diskError']) {
      if (this.fileState['diskError'][destination].length != 0) {
        return true;
      }
    }
    return false;
  }

}
