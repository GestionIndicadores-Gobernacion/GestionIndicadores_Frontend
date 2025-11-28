import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StrategyForm } from './strategy-form';

describe('StrategyForm', () => {
  let component: StrategyForm;
  let fixture: ComponentFixture<StrategyForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrategyForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StrategyForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
