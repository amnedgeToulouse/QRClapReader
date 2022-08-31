import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IpcRenderer } from 'electron';
import { ElectronService } from 'ngx-electron';
import { ModalComponent } from '../components/modal/modal.component';
import jwt_decode from 'jwt-decode';
import { SaveParamService } from './save-param';
import { ModalConnectComponent } from '../components/modal-connect/modal-connect.component';
import { Constant } from '../../constant';

@Injectable({ providedIn: 'root' })
export class HttpRequestService {

    renderer: IpcRenderer;

    constructor(private activatedRoute: ActivatedRoute,
        electronServiceInstance: ElectronService,
        private modalService: NgbModal,
        private saveParam: SaveParamService,
        private router: Router) {
        this.renderer = electronServiceInstance.ipcRenderer;
        setInterval(() => {
            this.CheckNeedToken();
        }, 100)
        // const json = this.saveParam.GetParams();
        // json["token"] = "";
        // this.saveParam.SaveParams(json);
    }

    SendRequest(httpRequestParams: HttpRequestParams): Promise<any> {
        return new Promise((resolve, error) => {
            if (typeof httpRequestParams['processOtherError'] == "undefined") {
                httpRequestParams['processOtherError'] = true;
            }
            httpRequestParams['successIdRequest'] = (Math.random() * 1000000) + "-" + (Math.random() * 1000000) + "-" + (Math.random() * 1000000);
            httpRequestParams['errorIdRequest'] = (Math.random() * 1000000) + "-" + (Math.random() * 1000000) + "-" + (Math.random() * 1000000);
            this.renderer.send("http-request", httpRequestParams);
            this.renderer.once(httpRequestParams['successIdRequest'], (event, arg) => {
                resolve(arg);
            });
            this.renderer.once(httpRequestParams['errorIdRequest'], (event, errorRequest) => {
                this.ProcessError(errorRequest, httpRequestParams, error);
            });
        });
    }

    ProcessError(errorRequest, httpRequestParams, error) {
        if ((errorRequest + "").includes("ECONNREFUSED")) {
            const modalRef = this.modalService.open(ModalComponent, { backdrop: 'static' });
            modalRef.componentInstance.title = "Server down..";
            modalRef.componentInstance.message = "Server is down please retry later";
            modalRef.componentInstance.actionButtonMessage = "Retry"
            modalRef.componentInstance.actionButtonType = 0;
            modalRef.componentInstance.actionCancelButtonMessage = "Disconnect";
            modalRef.componentInstance.cancelButtonType = 3;
            modalRef.componentInstance.removeClose = true;
            modalRef.result.then(
                result => { },
                reason => {
                    if (reason == "confirm") {
                        this.renderer.send("http-request", httpRequestParams);
                        this.renderer.once(httpRequestParams['errorIdRequest'], (event, arg) => {
                            this.ProcessError(errorRequest, httpRequestParams, error);
                        });
                    } else if (reason == "cancel") {
                        this.Logout();
                    }
                }
            );
        } else if (httpRequestParams.processOtherError) {
            const modalRef = this.modalService.open(ModalComponent, { backdrop: 'static' });
            modalRef.componentInstance.title = "Unexpected error " + errorRequest;
            modalRef.componentInstance.message = "If this error persist please contact support";
            modalRef.componentInstance.actionButtonMessage = "Contact support (FR/EN)";
            modalRef.componentInstance.actionButtonType = 0;
            modalRef.componentInstance.actionSecondButtonMessage = "Retry";
            modalRef.componentInstance.secondButtonType = 1;
            modalRef.componentInstance.canSecondAction = true;
            modalRef.componentInstance.actionCancelButtonMessage = "Disconnect";
            modalRef.componentInstance.cancelButtonType = 3;
            modalRef.componentInstance.removeClose = true;
            modalRef.result.then(
                result => { },
                reason => {
                    if (reason == "confirm") {
                        //TODO: Contact support
                    } else if (reason == "secondConfirm") {
                        this.renderer.send("http-request", httpRequestParams);
                        this.renderer.once(httpRequestParams['errorIdRequest'], (event, arg) => {
                            this.ProcessError(errorRequest, httpRequestParams, error);
                        });
                    } else if (reason == "cancel") {
                        this.Logout();
                    }
                }
            );
        } else {
            error(errorRequest);
        }
    }

    Logout() {
        const json = this.saveParam.GetParams();
        delete json["token"];
        this.saveParam.SaveParams(json);
        this.router.navigate(['/']);
    }

    Connexion(username, password, email) {
        return new Promise((resolve, error) => {
            if (username == "" || password == "") return;
            let dataToSend: any = {
                username: username,
                password: password
            };
            if (email != null) {
                dataToSend = {
                    email: email,
                    password: password
                }
            }
            this.SendRequest({
                host: Constant.HOST_WORDPRESS,
                port: 443,
                data: dataToSend,
                method: "POST",
                path: "/?rest_route=/simple-jwt-login/v1/auth",
                token: null,
                processOtherError: false
            }).then((data: Token) => {
                if (typeof data != "undefined" && data.success) {
                    const json = this.saveParam.GetParams();
                    json["token"] = data.data.jwt;
                    json["firstConnexion"] = true;
                    json["username"] = email != null ? email : username;
                    json["password"] = password;
                    this.saveParam.SaveParams(json);
                }
                resolve(data);
            }).catch((errorCode) => {
                if (errorCode == 400) {
                    error("Your credentials are not correct.");
                }
                if (errorCode != 200) {
                    error("An error occured, please retry.");
                }
            })
        });
    }

    CreateAccount(email, password, firstname, lastname, company, why) {
        return new Promise((resolve, error) => {
            let dataToSend: any = {
                mail: email,
                password: password,
                firstname: firstname,
                lastname: lastname,
                company: company,
                why: why
            };
            this.SendRequest({
                host: Constant.HOST_API,
                port: Constant.PORT_API,
                data: dataToSend,
                method: "POST",
                path: "/wordpress/createaccount",
                token: null,
                processOtherError: false
            }).then((data: AccountRegisterWordpress) => {
                console.log(data);
                resolve(data);
            }).catch((errorCode) => {
                if (errorCode == 400) {
                    error("Your credentials are not correct.");
                }
                if (errorCode != 200) {
                    error("An error occured, please retry.");
                }
            })
        });
    }

    popupNeedToken = false;
    CheckNeedToken() {
        if (!this.router.url.includes("/connexion") && !this.CheckToken() && !this.popupNeedToken && !this.router.url.includes("/backupRename") && !this.router.url.includes("/doBackup")) {
            this.popupNeedToken = true;
            console.log("Open need token");
            const modalRef = this.modalService.open(ModalConnectComponent, { backdrop: 'static' });
            modalRef.result.then(
                result => { },
                reason => {
                    this.popupNeedToken = false;
                }
            );
        }
    }

    CheckToken() {
        var token = this.saveParam.GetParam("token");
        if (token != "") {
            let tokenInfo = this.getDecodedAccessToken(token) // decode token
            let expireDate = tokenInfo.exp;
            let timeLeft = expireDate - new Date().getTime() / 1000 - 10000;
            if (timeLeft > 0) {
                return true;
            }
        }
        return false;
    }

    getDecodedAccessToken(token: string): any {
        try {
            return jwt_decode(token);
        }
        catch (Error) {
            return null;
        }
    }
}


export class HttpRequestParams {
    host: string = "";
    port: number;
    token: string = "";
    data: any = null;
    path: string = "";
    method: string = "";
    processOtherError: boolean = true;
}

export interface Token {
    success: boolean;
    data: TokenData;
}

export interface AccountRegisterWordpress {
    id: number;
    message: string;
    data: DataRegister;
}

export interface DataRegister {
    message: string;
    errorCode: number;
}

export interface TokenData {
    jwt: string;
}