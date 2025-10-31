import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import { catchError, throwError, Observable, BehaviorSubject, tap } from 'rxjs';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  message: string;
  user: {
    username: string;
    name: string;
    role: string;
  };
}

export interface ModelInfo {
  model_id: string;
  name: string;
  description: string;
  algorithm_type: string;
  category: string;
  model_trained: boolean;
  hyperparameters: any;
  training_info?: any;
}

export interface PredictionRequest {
  transaction: any;
}

export interface PredictionResponse {
  prediction: {
    class: number;
    label: string;
    confidence: number;
  };
  probabilities: {
    normal: number;
    fraud: number;
  };
  model_id: string;
  predicted_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly apiUrl = environment.apiUrl;
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private userSubject = new BehaviorSubject<any>(null);

  public token$ = this.tokenSubject.asObservable();
  public user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    // Verificar se há token salvo no localStorage
    const savedToken = localStorage.getItem('access_token');
    if (savedToken) {
      this.tokenSubject.next(savedToken);
    }
  }

  // Headers com autenticação
  private getAuthHeaders(): HttpHeaders {
    const token = this.tokenSubject.value;
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  // ===================
  // AUTENTICAÇÃO
  // ===================
  
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials, { headers })
      .pipe(
        tap(response => {
          // Salvar token no localStorage e BehaviorSubject
          localStorage.setItem('access_token', response.access_token);
          this.tokenSubject.next(response.access_token);
          this.userSubject.next(response.user);
        }),
        catchError(this.handleError)
      );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.tokenSubject.next(null);
    this.userSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!this.tokenSubject.value;
  }

  getCurrentUser(): any {
    return this.userSubject.value;
  }

  // ===================
  // HEALTH CHECK
  // ===================
  
  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`)
      .pipe(catchError(this.handleError));
  }

  // ===================
  // MODELOS
  // ===================
  
  getModels(): Observable<any> {
    return this.http.get(`${this.apiUrl}/models/`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  getDecisionTreeInfo(): Observable<ModelInfo> {
    return this.http.get<ModelInfo>(`${this.apiUrl}/models/decision_tree/info`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  trainDecisionTree(parameters?: any): Observable<any> {
    const body = parameters ? { parameters } : {};
    return this.http.post(`${this.apiUrl}/models/decision_tree/train`, body, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  evaluateDecisionTree(): Observable<any> {
    return this.http.get(`${this.apiUrl}/models/decision_tree/evaluate`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  getFeatureImportance(): Observable<any> {
    return this.http.get(`${this.apiUrl}/models/decision_tree/feature-importance`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  predictFraud(transaction: any): Observable<PredictionResponse> {
    const body: PredictionRequest = { transaction };
    return this.http.post<PredictionResponse>(`${this.apiUrl}/models/decision_tree/predict`, body, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  // ===================
  // VISUALIZAÇÕES
  // ===================
  
  getConfusionMatrix(): Observable<any> {
    return this.http.get(`${this.apiUrl}/visualization/decision_tree/confusion-matrix`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  getProbabilityDistribution(): Observable<any> {
    return this.http.get(`${this.apiUrl}/visualization/decision_tree/probability-distribution`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  getFeatureDistribution(): Observable<any> {
    return this.http.get(`${this.apiUrl}/visualization/decision_tree/feature-distribution`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  getPerformanceMetrics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/visualization/decision_tree/performance-metrics`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  getTreeStructure(): Observable<any> {
    return this.http.get(`${this.apiUrl}/visualization/decision_tree/tree-structure`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  // ===================
  // GEMINI (EXISTENTE)
  // ===================
  
  consultGemini(question: string): Observable<any> {
    return this.http.post<{ response: string}>(`${this.apiUrl}/auth/gemini`, { question })
      .pipe(catchError(this.handleError));
  }

  // ===================
  // TRATAMENTO DE ERROS
  // ===================
  
  private handleError(error: any) {
    console.error('API Error Details:', {
      status: error.status,
      statusText: error.statusText,
      error: error.error,
      message: error.message,
      url: error.url
    });
    
    // Se erro 401, fazer logout
    if (error.status === 401) {
      this.logout();
    }
    
    // Diferentes tipos de erro
    let errorMessage = 'Unknown error occurred';
    
    if (error.status === 0) {
      errorMessage = 'Cannot connect to server. Please check if the backend is running and CORS is configured correctly.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.statusText) {
      errorMessage = `HTTP ${error.status}: ${error.statusText}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}