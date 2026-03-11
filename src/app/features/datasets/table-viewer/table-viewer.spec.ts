import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableViewerComponent } from './table-viewer';

describe('TableViewer', () => {
  let component: TableViewerComponent;
  let fixture: ComponentFixture<TableViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableViewerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
