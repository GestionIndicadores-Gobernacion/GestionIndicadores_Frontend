import { Component } from '@angular/core';
import { LoaderService } from '../../../core/services/loader.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  imports: [
    CommonModule
  ],
  templateUrl: './loader.html',
  styleUrl: './loader.css',
})
export class LoaderComponent {
  constructor(public loader: LoaderService) { }
}
