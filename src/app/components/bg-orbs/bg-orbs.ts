import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-bg-orbs',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="bg-orbs">
      <div class="orb orb--1"></div>
      <div class="orb orb--2"></div>
      <div class="orb orb--3"></div>
    </div>
  `
})
export class BgOrbs {}
