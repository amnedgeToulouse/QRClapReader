import { Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class GetParamService {

    constructor(private activatedRoute: ActivatedRoute) { }

    GetParams(): any {
        return this.activatedRoute.snapshot.queryParams;
    }

    GetQueryParams(paramToAdd = {}): any {
        return { queryParams: { ...this.GetParams(), ...paramToAdd } };
    }

    GetParam(param): any {
        return typeof this.GetParams()[param] != 'undefined' ? this.GetParams()[param] : "";
    }
}
