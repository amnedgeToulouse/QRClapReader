import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss']
})
export class LoaderComponent implements OnInit {
  @Input() loading: boolean;
  type = 0;

  constructor() { }

  ngOnInit(): void {
    this.type = Math.round(Math.random());
  }
}
