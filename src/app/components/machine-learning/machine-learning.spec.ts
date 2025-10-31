import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineLearning } from './machine-learning';

describe('MachineLearning', () => {
  let component: MachineLearning;
  let fixture: ComponentFixture<MachineLearning>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MachineLearning]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MachineLearning);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
