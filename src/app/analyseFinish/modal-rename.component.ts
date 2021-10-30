import { Component, OnInit } from '@angular/core';
import { faCamera, faCameraRetro } from '@fortawesome/free-solid-svg-icons';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from '../shared/components/modal/modal.component';
import { FileFull, ProjectFull } from './analyse-finish.component';
import { AnalyseFinishComponent } from './analyse-finish.component';

@Component({
  selector: 'ng-modal-rename',
  templateUrl: './modal-rename.component.html'
})
export class ModalRenameComponent implements OnInit {

  canConfirm = false;
  project: ProjectFull;
  file: FileFull;
  i: number;
  customRename = "";
  parent: AnalyseFinishComponent;
  isCinema = true;
  cinemaValue = {
    scene: "1",
    sceneSuffix: "",
    scenePrefix: "",
    prise: "1",
    priseSuffix: "",
    prisePrefix: "",
    plan: "1",
    planSuffix: "",
    planPrefix: "",
    suffix: ""
  }
  zoom = false;

  imageToPrint = "";

  faCamera = faCamera;

  numbers = [];
  letters = [
    '',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z'
  ];

  constructor(public activeModal: NgbActiveModal,
    private modalService: NgbModal) { }

  ngOnInit() {
    this.file = this.parent.project.files[this.i];
    this.customRename = this.file.customRename != "" && typeof this.file.customRename != "undefined" ? this.file.customRename :
      this.file.nameAfterRename != "" ? this.file.nameAfterRename : "";
    console.log(this.customRename);
    const regexCinema = this.parent.isCinemaFormat(this.customRename);
    if (regexCinema != null) {
      this.cinemaValue = this.parent.cinemaSplit(this.customRename, regexCinema.i);
      //this.cinemaValue.suffix = this.parent.getSuffixCinema(this.customRename, regexCinema.value);
      this.customRename = "";
    } else {
      this.isCinema = false;
    }
    for (var i = 1; i < 100; i++) {
      this.numbers.push(i + "");
    }
  }

  confirm() {
    if (this.isCinema && !this.parent.isCinemaFormat(this.parent.getCinemaName(this.cinemaValue))) {
      const modalRef = this.modalService.open(ModalComponent);
      modalRef.componentInstance.title = "Error during apply";
      modalRef.componentInstance.message = "The format title need 3 letters or 3 empty letters in prefix: S01_R01_T01 or 01_01_01.";
      modalRef.componentInstance.actionButtonType = 0;
      modalRef.componentInstance.canConfirm = false;
      modalRef.componentInstance.actionCancelButtonMessage = "Understand";
      modalRef.componentInstance.cancelButtonType = 2;
      modalRef.result.then(
        result => { },
        reason => { }
      );
    } else {
      this.parent.project.files[this.i].customRename = this.isCinema ? this.parent.getCinemaName(this.cinemaValue) : this.customRename;
      this.parent.project.files[this.i].isChild = false;
      this.parent.project.files[this.i].renameByHand = 1;
      this.activeModal.dismiss('confirm');
    }
  }

  cancel() {
    this.activeModal.dismiss('cancel');
  }

  revert() {
    this.parent.project.files[this.i].customRename = this.parent.project.files[this.i].finalName != null ? this.parent.project.files[this.i].finalName : "";
    this.parent.project.files[this.i].renameByHand = 0;
    this.activeModal.dismiss('confirm');
  }

  classNav(isCinema) {
    if (isCinema && this.isCinema) {
      return "nav-link active cursor-pointer";

    } else if (!isCinema && !this.isCinema) {
      return "nav-link active cursor-pointer";
    }
    return "nav-link cursor-pointer";
  }

  switchMode(isCinema) {
    this.isCinema = isCinema;
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
      'user-select': 'none',
      'max-height': '623px'
    }
  }

}
