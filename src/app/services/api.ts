import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import { catchError, throwError, Observable } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class ApiService {
    private readonly apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}
    response = '';
    consultGemini(question: string): Observable<any>  {
            return this.http.post<{ response: string}>(
            `${this.apiUrl}/auth/gemini`,
            { question }
        ).pipe(
            catchError((error) => {
                console.error('Erro ao consultar Gemini:', error);
                return throwError(() => new Error('Falha ao consultar Gemini.'));
            })
        ); 
    }
}