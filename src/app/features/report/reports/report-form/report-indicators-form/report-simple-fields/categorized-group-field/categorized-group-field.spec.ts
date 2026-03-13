import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategorizedGroupField } from './categorized-group-field';

describe('CategorizedGroupField', () => {
  let component: CategorizedGroupField;
  let fixture: ComponentFixture<CategorizedGroupField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategorizedGroupField]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategorizedGroupField);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
