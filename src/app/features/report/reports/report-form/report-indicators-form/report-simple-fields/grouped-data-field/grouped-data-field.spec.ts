import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupedDataField } from './grouped-data-field';

describe('GroupedDataField', () => {
  let component: GroupedDataField;
  let fixture: ComponentFixture<GroupedDataField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupedDataField]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupedDataField);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
