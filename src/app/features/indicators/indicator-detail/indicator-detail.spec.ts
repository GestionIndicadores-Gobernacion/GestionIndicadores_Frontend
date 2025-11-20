import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndicatorDetail } from './indicator-detail';

describe('IndicatorDetail', () => {
  let component: IndicatorDetail;
  let fixture: ComponentFixture<IndicatorDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndicatorDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IndicatorDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
