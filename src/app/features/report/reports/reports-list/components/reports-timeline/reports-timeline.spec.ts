import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsTimeline } from './reports-timeline';

describe('ReportsTimeline', () => {
  let component: ReportsTimeline;
  let fixture: ComponentFixture<ReportsTimeline>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsTimeline]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsTimeline);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
