import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapaValle } from './mapa-valle';

describe('MapaValle', () => {
  let component: MapaValle;
  let fixture: ComponentFixture<MapaValle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapaValle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapaValle);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
