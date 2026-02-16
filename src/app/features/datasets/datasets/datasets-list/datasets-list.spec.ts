import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetsList } from './datasets-list';

describe('DatasetsList', () => {
  let component: DatasetsList;
  let fixture: ComponentFixture<DatasetsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatasetsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatasetsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
