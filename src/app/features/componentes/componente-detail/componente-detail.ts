import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ComponentModel } from '../../../core/models/component.model';
import { ComponentsService } from '../../../core/services/components.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-componente-detail',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './componente-detail.html',
  styleUrl: './componente-detail.css',
})
export class ComponenteDetailComponent implements OnInit {
  componente?: ComponentModel;
  loading = true;   // 👈 ESTA LÍNEA ES LA QUE FALTABA

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private componentsService: ComponentsService
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.componentsService.getById(id).subscribe({
      next: (res) => {
        this.componente = res;
        this.loading = false;
      },
      error: () => {
        alert('Error cargando componente');
        this.loading = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard/componentes']);
  }
}
