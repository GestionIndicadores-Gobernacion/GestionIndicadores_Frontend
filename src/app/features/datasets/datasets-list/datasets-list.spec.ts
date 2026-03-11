import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetsListComponent } from './datasets-list';

describe('DatasetsListComponent', () => {
  let component: DatasetsListComponent;
  let fixture: ComponentFixture<DatasetsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatasetsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatasetsListComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
