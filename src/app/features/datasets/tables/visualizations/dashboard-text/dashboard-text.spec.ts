import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardText } from './dashboard-text';

describe('DashboardText', () => {
  let component: DashboardText;
  let fixture: ComponentFixture<DashboardText>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardText]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardText);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
