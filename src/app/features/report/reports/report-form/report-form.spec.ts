import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportFormComponent } from './report-form';


describe('ReportForm', () => {
  let component: ReportFormComponent;
  let fixture: ComponentFixture<ReportFormComponent>;  
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
