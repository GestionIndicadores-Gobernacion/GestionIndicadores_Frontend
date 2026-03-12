import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsExplorerComponent } from './reports-explorer';

describe('ReportsExplorerComponent', () => {
  let component: ReportsExplorerComponent;
  let fixture: ComponentFixture<ReportsExplorerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsExplorerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsExplorerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
