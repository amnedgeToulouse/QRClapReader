import { Injectable } from '@angular/core';
import { IpcRenderer } from 'electron';
import { ElectronService } from 'ngx-electron';

@Injectable({ providedIn: 'root' })
export class ArgAppService {

    renderer: IpcRenderer;

    constructor(electronServiceInstance: ElectronService) {
        this.renderer = electronServiceInstance.ipcRenderer;
    }

    getQrcFileArg() {
        const args = this.renderer.sendSync("get-arg-process", null);
        for (const arg of args) {
            if (arg.substr(arg.length - 4, 4)
                .toLowerCase()
                .includes(".qrc")) {
                return arg;
            }
        }
        return "";
    }

}