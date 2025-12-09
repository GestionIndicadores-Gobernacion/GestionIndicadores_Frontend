import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvanceIndicadoresSection } from './avance-indicadores-section';

describe('AvanceIndicadoresSection', () => {
  let component: AvanceIndicadoresSection;
  let fixture: ComponentFixture<AvanceIndicadoresSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvanceIndicadoresSection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvanceIndicadoresSection);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
