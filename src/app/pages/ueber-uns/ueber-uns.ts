import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';

@Component({
  selector: 'app-ueber-uns',
  standalone: true,
  imports: [RouterLink, Navbar],
  templateUrl: './ueber-uns.html',
  styleUrl: './ueber-uns.scss'
})
export class UeberUns {}
