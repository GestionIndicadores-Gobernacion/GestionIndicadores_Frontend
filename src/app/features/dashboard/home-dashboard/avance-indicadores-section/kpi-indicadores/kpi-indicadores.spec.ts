import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KpiIndicadores } from './kpi-indicadores';

describe('KpiIndicadores', () => {
  let component: KpiIndicadores;
  let fixture: ComponentFixture<KpiIndicadores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpiIndicadores]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KpiIndicadores);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
