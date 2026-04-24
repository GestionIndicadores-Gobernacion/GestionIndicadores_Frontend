import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ReportsKpiService } from './reports-kpi.service';
import { environment } from '../../../../environments/environment';

describe('ReportsKpiService', () => {
  let service: ReportsKpiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ReportsKpiService,
      ],
    });
    service = TestBed.inject(ReportsKpiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ─── Mapper estático puro ────────────────────────────────────────────
  describe('fromApi', () => {
    it('mapea snake_case del backend a camelCase del frontend', () => {
      const snapshot = ReportsKpiService.fromApi({
        year: 2026,
        asistencias_tecnicas: 10,
        denuncias_reportadas: 5,
        personas_capacitadas: 871,
        ninos_sensibilizados: 100,
        animales_esterilizados: 250,
        refugios_impactados: 7,
        emprendedores_cofinanciados: 3,
      });

      expect(snapshot).toEqual({
        asistenciasTecnicas: 10,
        denunciasReportadas: 5,
        personasCapacitadas: 871,
        ninosSensibilizados: 100,
        animalesEsterilizados: 250,
        refugiosImpactados: 7,
        emprendedoresCofinanciados: 3,
      });
    });
  });

  // ─── HTTP: getSnapshotRemote ─────────────────────────────────────────
  describe('getSnapshotRemote', () => {
    it('llama GET /kpis/?year=YYYY y mapea la respuesta', async () => {
      const promise = new Promise<void>(resolve => {
        service.getSnapshotRemote(2026).subscribe(snapshot => {
          expect(snapshot.personasCapacitadas).toBe(871);
          expect(snapshot.asistenciasTecnicas).toBe(0);
          resolve();
        });
      });

      const req = httpMock.expectOne(
        r => r.url === `${environment.apiUrl}/kpis/`
          && r.params.get('year') === '2026'
      );
      expect(req.request.method).toBe('GET');
      req.flush({
        year: 2026,
        asistencias_tecnicas: 0,
        denuncias_reportadas: 0,
        personas_capacitadas: 871,
        ninos_sensibilizados: 0,
        animales_esterilizados: 0,
        refugios_impactados: 0,
        emprendedores_cofinanciados: 0,
      });

      await promise;
    });
  });

  // ─── Agregadores de subset (consumidos por el mapa) ─────────────────
  describe('asistenciasTecnicas', () => {
    it('cuenta 1 por reporte del componente ASISTENCIAS y suma valor del indicador 160 en JUNTAS', () => {
      const reports = [
        { component_id: 2, indicator_values: [] },
        { component_id: 2, indicator_values: [] },
        { component_id: 21, indicator_values: [{ indicator_id: 160, value: 5 }] },
      ] as any;
      expect(service.asistenciasTecnicas(reports)).toBe(7);
    });
  });

  describe('refugiosImpactados', () => {
    it('cuenta solo reportes cuyo indicador 102 cae en el set de espacios de acogida', () => {
      const reports = [
        { indicator_values: [{ indicator_id: 102, value: 'Albergue/Refugio' }] },
        { indicator_values: [{ indicator_id: 102, value: 'Otro' }] },
        { indicator_values: [{ indicator_id: 102, value: 'fundacion' }] },
      ] as any;
      expect(service.refugiosImpactados(reports)).toBe(2);
    });
  });
});
