import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapDetail } from './map-detail';

describe('MapDetail', () => {
  let component: MapDetail;
  let fixture: ComponentFixture<MapDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
