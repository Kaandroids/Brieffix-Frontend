import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-ueber-uns',
  standalone: true,
  imports: [RouterLink, Navbar, Footer],
  templateUrl: './ueber-uns.html',
  styleUrl: './ueber-uns.scss'
})
export class UeberUns {}
