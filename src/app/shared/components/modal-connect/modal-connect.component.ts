import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpRequestService } from '../../service/http-request.service';

@Component({
  selector: 'ng-modal-connect',
  templateUrl: './modal-connect.component.html',
  styleUrls: ['modal-connect.component.scss']
})
export class ModalConnectComponent implements OnInit {

  mail: string = '';
  password: string = '';
  error: string = '';
  loading = false;
  type = 0;

  constructor(private activeModal: NgbActiveModal,
    private httpRequest: HttpRequestService) { }

  ngOnInit() {

  }

  connect() {
    if (this.validateForm()) {
      this.loading = true;
      this.type = Math.round(Math.random());
      this.httpRequest.Connexion(this.mail, this.password, this.validateEmail(this.mail) ? this.mail : null).then(() => {
        this.error = "";
        this.activeModal.dismiss('connected');
      }).catch((error) => {
        this.error = error;
      }).finally(() => {
        this.loading = false;
      });
    }
  }

  validateForm() {
    return this.password != '' && this.mail != '';//this.validateEmail(this.mail);
  }

  validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }

}
