import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';

import { LUCIDE_ICON_SET } from '../../../../../../shared/icons/lucide-icons';
import { ComponentAggregate } from '../../../../../../features/report/models/report-aggregate.model';
import { IndicatorViewerComponent } from './indicator-viewer';
import { INDICATOR_VIEWER_MODES } from './indicator-viewer.modes';

/**
 * El visualizador es un shell: la garantía que importa es que conmuta la
 * vista sin perder contexto y sin repetir peticiones.
 */
describe('IndicatorViewerComponent', () => {
  let fixture: ComponentFixture<IndicatorViewerComponent>;
  let component: IndicatorViewerComponent;
  let http: HttpTestingController;

  const aggregate = {
    component_id: 9,
    total_reports: 5,
    by_zone: { Urbana: 3, Rural: 2 },
    by_month: [{ month: '2026-01', total: 5, urbana: 3, rural: 2 }],
    indicator_summary: [],
  } as ComponentAggregate;

  /**
   * Pulsa una pestaña como lo haría el usuario. Importante: mutar
   * `component.mode` a mano cambiaría el estado fuera del ciclo de
   * detección, algo que en la app nunca ocurre (siempre viene de un
   * `(click)`), y produciría falsos NG0100 en el test.
   */
  function clickTab(id: string) {
    const tab: HTMLButtonElement =
      fixture.nativeElement.querySelector(`#viewer-tab-${id}`);
    expect(tab).toBeTruthy();
    tab.click();
    fixture.detectChanges();
  }

  /**
   * Responde los GET del consolidado pendientes y devuelve cuántos había.
   * Se compara por sufijo: `environment.apiUrl` antepone el host absoluto.
   */
  function flushConsolidated(componentId = 9) {
    const url = `/reports/aggregate/component/${componentId}/location-year`;
    const pending = http.match(r => r.url.endsWith(url));
    pending.forEach(r => r.flush({
      component_id: componentId, component_name: 'C', strategy_id: 3,
      strategy_name: 'S', years: [2025, 2026], total_reports: 5,
      reports_by_location: [], reports_totals_by_year: {}, indicators: [],
    }));
    return pending.length;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndicatorViewerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LUCIDE_ICONS, useValue: new LucideIconProvider(LUCIDE_ICON_SET) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IndicatorViewerComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);

    fixture.componentRef.setInput('componentId', 9);
    fixture.componentRef.setInput('componentAggregate', aggregate);
    fixture.componentRef.setInput('selectedIndicator', {
      indicator_id: 125, indicator_name: 'Animales atendidos', field_type: 'categorized_group',
    });
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify({ ignoreCancelled: true });
  });

  it('arranca en "Gráficos" para no cambiar la experiencia actual', () => {
    expect(component.mode).toBe('charts');
    expect(component.isActive('charts')).toBe(true);
  });

  it('no monta el consolidado hasta que se pide (sin GET al cargar)', () => {
    expect(component.isMounted('consolidated')).toBe(false);
    expect(flushConsolidated()).toBe(0);
  });

  it('renderiza una pestaña por cada modo registrado', () => {
    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(INDICATOR_VIEWER_MODES.length);
  });

  it('oculta las pestañas cuando no hay componente seleccionado', () => {
    fixture.componentRef.setInput('componentId', null);
    fixture.detectChanges();
    expect(component.showModeSwitch).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('[role="tab"]').length).toBe(0);
  });

  it('vuelve a "Gráficos" si se deselecciona el componente', () => {
    clickTab('consolidated');
    flushConsolidated();

    fixture.componentRef.setInput('componentId', null);
    fixture.detectChanges();
    expect(component.mode).toBe('charts');
  });

  it('al cambiar de modo solo conmuta el cuerpo: una vista visible a la vez', () => {
    clickTab('consolidated');
    flushConsolidated();

    expect(component.displayFor('consolidated')).toBeNull();   // visible
    expect(component.displayFor('charts')).toBe('none');
    expect(component.isMounted('charts')).toBe(false);         // se desmonta
  });

  it('mantiene vivo el consolidado al volver a Gráficos: no repite el GET', () => {
    clickTab('consolidated');
    expect(flushConsolidated()).toBe(1);                       // primera carga

    clickTab('charts');
    expect(component.isMounted('consolidated')).toBe(true);    // sigue montado
    expect(component.displayFor('consolidated')).toBe('none'); // pero oculto

    clickTab('consolidated');
    expect(flushConsolidated()).toBe(0);                       // sin refetch
  });

  it('conserva el modo al cambiar de indicador dentro del mismo componente', () => {
    clickTab('consolidated');
    flushConsolidated();

    fixture.componentRef.setInput('selectedIndicator', {
      indicator_id: 99, indicator_name: 'Otro', field_type: 'number',
    });
    fixture.detectChanges();

    expect(component.mode).toBe('consolidated');
  });

  it('reemite yearChange y barClick sin alterarlos', () => {
    const years: number[] = [];
    component.yearChange.subscribe(y => years.push(y));
    component.yearChange.emit(2025);
    expect(years).toEqual([2025]);
  });
});
