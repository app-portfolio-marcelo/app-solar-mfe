import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-solar',
  imports: [ReactiveFormsModule],
  templateUrl: './solar.html'
})
export class Solar {
  response: string = '';
  questionForm: FormGroup;
  
  constructor(private fb: FormBuilder, private ApiService: ApiService) {
    this.questionForm = this.fb.group({
      question: ['']
    });
  }

  onSubmit() {
    const questionValue = this.questionForm.value.question;
    this.ApiService.consultGemini(questionValue).subscribe({
      next: (response) => {
        this.response = response;
      },
      error: (error) => {
        console.error('Erro no login:', error);
      }
    });
  }
  
}
