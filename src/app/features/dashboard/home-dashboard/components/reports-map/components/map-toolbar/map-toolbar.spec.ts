import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapToolbar } from './map-toolbar';

describe('MapToolbar', () => {
  let component: MapToolbar;
  let fixture: ComponentFixture<MapToolbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapToolbar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapToolbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
