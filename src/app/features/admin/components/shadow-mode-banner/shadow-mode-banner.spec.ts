import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';

import { ShadowModeBannerComponent } from './shadow-mode-banner';
import { LUCIDE_ICON_SET } from '../../../../shared/icons/lucide-icons';

describe('ShadowModeBannerComponent', () => {
  let fixture: ComponentFixture<ShadowModeBannerComponent>;
  let component: ShadowModeBannerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShadowModeBannerComponent],
      providers: [
        {
          provide: LUCIDE_ICONS,
          multi: true,
          useValue: new LucideIconProvider(LUCIDE_ICON_SET),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShadowModeBannerComponent);
    component = fixture.componentInstance;
  });

  function isRendered(): boolean {
    return !!fixture.nativeElement.querySelector('[data-testid="shadow-mode-banner"]');
  }

  it('se crea', () => {
    expect(component).toBeTruthy();
  });

  it('renderiza el banner cuando visible=true', () => {
    component.visible = true;
    fixture.detectChanges();
    expect(isRendered()).toBe(true);
  });

  it('oculta el banner cuando visible=false', () => {
    component.visible = false;
    fixture.detectChanges();
    expect(isRendered()).toBe(false);
  });

  it('si visible=null cae al feature flag (SHADOW_MODE_ENABLED=true en D1)', () => {
    component.visible = null;
    fixture.detectChanges();
    // El flag está hardcoded a `true` mientras dure la Fase C; si se apagara
    // en build, este test fallaría señalando que la D1 cerró su ciclo.
    expect(isRendered()).toBe(true);
  });

  it('muestra el texto canónico del modo paralelo', () => {
    component.visible = true;
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent || '';
    expect(text).toContain('Modo paralelo activo');
    expect(text.toLowerCase()).toContain('no son autoritativos');
  });
});
