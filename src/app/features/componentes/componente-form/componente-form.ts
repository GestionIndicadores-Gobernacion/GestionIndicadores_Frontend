import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ComponentsService } from '../../../core/services/components.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-componente-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterModule
  ],
  templateUrl: './componente-form.html',
  styleUrl: './componente-form.css',
})
export class ComponentesFormComponent implements OnInit {

  form!: FormGroup;
  loading = false;
  saving = false;
  isEdit = false;
  id?: number;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private componentsService: ComponentsService
  ) { }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      active: [true],
    });

    if (this.isEdit) {
      this.loadComponent();
    }
  }

  loadComponent() {
    this.loading = true;
    this.componentsService.getById(this.id!).subscribe({
      next: (data) => {
        this.form.patchValue(data);
        this.loading = false;
      },
      error: () => {
        alert('Error al cargar el componente');
        this.loading = false;
      }
    });
  }

  submit() {
    if (this.form.invalid) return;

    this.saving = true;
    const body = this.form.value;

    const req = this.isEdit
      ? this.componentsService.update(this.id!, body)
      : this.componentsService.create(body);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/dashboard/components']);
      },
      error: () => {
        this.saving = false;
        alert('Error al guardar el componente');
      }
    });
  }
}
