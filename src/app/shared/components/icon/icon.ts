import { Component, Input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

/**
 * Wrapper alrededor de lucide-icon que aplica los defaults visuales del proyecto:
 *   - strokeWidth: 1.8
 *   - color: currentColor (hereda del contenedor)
 *   - size: 16px
 *
 * Uso:
 *   <app-icon name="search" />                 — icono por defecto 16px
 *   <app-icon name="plus" [size]="20" />        — tamaño personalizado
 *   <app-icon name="x" [size]="14" [strokeWidth]="2" />
 *
 * Alternativa directa (también válida):
 *   <lucide-icon name="search" [size]="16" strokeWidth="1.8" color="currentColor"></lucide-icon>
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [LucideAngularModule],
  template: `<lucide-icon
    [name]="name"
    [size]="size"
    [strokeWidth]="strokeWidth"
    [color]="color"
  ></lucide-icon>`,
  host: { 'class': 'inline-flex items-center justify-center shrink-0' },
})
export class IconComponent {
  @Input({ required: true }) name!: string;
  @Input() size: number = 16;
  @Input() strokeWidth: number = 1.8;
  @Input() color: string = 'currentColor';
}
