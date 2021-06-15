import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Constant } from '../../../constant';
import { HttpRequestService } from '../../service/http-request.service';
import { SaveParamService } from '../../service/save-param';

@Component({
  selector: 'ng-modal-suggestion',
  templateUrl: './modal-suggestion.component.html',
  styleUrls: ['modal-suggestion.component.scss']
})
export class ModalSuggestionComponent implements OnInit {

  mail: string = '';
  suggestionText: string = '';
  loading = false;

  constructor(private activeModal: NgbActiveModal,
    private httpRequest: HttpRequestService,
    private saveParam: SaveParamService) { }

  ngOnInit() {
    this.mail = this.saveParam.GetParam("mailSuggestion");
  }

  send() {
    if (!this.validateForm()) {
      return;
    }
    this.loading = true;
    this.httpRequest.SendRequest({
      host: Constant.HOST_API,
      port: 443,
      data: {
        email: this.mail,
        suggestion: this.suggestionText,
        subject: "Suggestion for QRClap Reader, from " + this.mail,
      },
      method: "POST",
      path: "/addsuggestion",
      token: null,
      processOtherError: true
    }).then((data) => {
      const json = this.saveParam.GetParams();
      json["mailSuggestion"] = this.mail;
      this.saveParam.SaveParams(json);
      this.activeModal.dismiss("confirm");
    }).finally(() => {
      this.loading = false;
    });
  }

  close() {
    this.activeModal.dismiss("close");
  }

  validateForm() {
    return this.suggestionText != '' && this.validateEmail(this.mail);
  }

  validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }

}
