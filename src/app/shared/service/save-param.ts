import { Injectable } from '@angular/core';
import { IpcRenderer } from 'electron';
import { ElectronService } from 'ngx-electron';

@Injectable({ providedIn: 'root' })
export class SaveParamService {

    renderer: IpcRenderer;

    constructor(electronServiceInstance: ElectronService) {
        this.renderer = electronServiceInstance.ipcRenderer;
    }

    GetParams(): any {
        return this.renderer.sendSync("get-saved-param");
    }

    SaveParams(json) {
        this.renderer.sendSync("set-saved-param", json);
    }

    GetParam(param) {
        const json = this.GetParams();
        return typeof json[param] != "undefined" ? json[param] : "";
    }

    GetProjectFolder(idProject) {
        const json = this.GetParams();
        if (typeof json["projectsFolder"] == "undefined") {
            json["projectsFolder"] = {};
            this.SaveParams(json);
        }
        if (typeof json["projectsFolder"][idProject] == "undefined") {
            json["projectsFolder"][idProject] = "";
            this.SaveParams(json);
        }
        return json["projectsFolder"][idProject];
    }

    SetProjectFolder(idProject, folder) {
        this.GetProjectFolder(idProject);
        const json = this.GetParams();
        json["projectsFolder"][idProject] = folder;
        this.SaveParams(json);
    }
}
