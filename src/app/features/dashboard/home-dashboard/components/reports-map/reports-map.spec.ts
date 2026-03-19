import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsMapComponent } from './reports-map';

describe('ReportsMap', () => {
  let component: ReportsMapComponent;
  let fixture: ComponentFixture<ReportsMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsMapComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
