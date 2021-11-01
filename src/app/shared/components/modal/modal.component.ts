import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'ng-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['modal.component.scss']
})
export class ModalComponent implements OnInit {

  projectName = ""
  title = "Create new project"
  message = ""
  actionButtonMessage = "Create";
  actionCancelButtonMessage = "Cancel";
  actionSecondButtonMessage = "Cancel";
  actionButtonType = 0;
  cancelButtonType = 0;
  secondButtonType = 0;
  centerText = false;
  canConfirm = true;
  canSecondAction = false;
  imageToPrint = "";
  zoom = false;
  removeClose = false;
  closeOnConfirm = true;
  funcToCall = () => { };

  isCreateProject = false;

  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit() {

  }

  classMessage() {
    return this.centerText ? "text-center" : "";
  }

  secondConfirm() {
    if (this.isCreateProject) {
      this.activeModal.dismiss({
        reason: 'secondConfirm',
        value: this.projectName
      });
    } else {
      this.activeModal.dismiss('secondConfirm');
    }
  }

  confirm() {
    if (this.isCreateProject) {
      this.activeModal.dismiss({
        reason: 'confirm',
        value: this.projectName
      });
    } else {
      if (this.closeOnConfirm) {
        this.activeModal.dismiss('confirm');
      } else {
        this.funcToCall();
      }
    }
  }

  cancel() {
    if (this.isCreateProject) {
      this.activeModal.dismiss({
        reason: 'cancel',
        value: this.projectName
      });
    } else {
      this.activeModal.dismiss('cancel');
    }
  }

  close() {
    if (this.isCreateProject) {
      this.activeModal.dismiss({
        reason: 'close',
        value: this.projectName
      });
    } else {
      this.activeModal.dismiss('close');
    }
  }

  classButtonAction() {
    if (this.actionButtonType == 0) {
      return "btn btn-success";
    } else if (this.actionButtonType == 1) {
      return "btn btn-danger";
    }
  }

  classButtonCancel() {
    if (this.cancelButtonType == 0) {
      return "btn btn-secondary";
    } else if (this.cancelButtonType == 1) {
      return "btn btn-success";
    } else if (this.cancelButtonType == 2) {
      return "btn btn-warning";
    } else if (this.cancelButtonType == 3) {
      return "btn btn-danger";
    }
  }

  classSecondButtonAction() {
    if (this.secondButtonType == 0) {
      return "btn btn-success";
    } else if (this.secondButtonType == 1) {
      return "btn btn-warning";
    } else if (this.secondButtonType == 2) {
      return "btn btn-danger";
    }
  }

  zoomAction() {
    this.zoom = !this.zoom;
  }

  zoomText() {
    return this.zoom ? "Dezoom" : "Zoom";
  }

  zoomStyle() {
    return {
      width: this.zoom ? '200%' : '100%',
      'user-select': 'none'
    }
  }
}
