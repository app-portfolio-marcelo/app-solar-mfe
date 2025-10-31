import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';

interface LoginForm {
  username: string;
  password: string;
}

interface MLModel {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'available' | 'coming-soon';
  route?: string;
  accuracy?: number;
  pros?: string[];
  cons?: string[];
}

@Component({
  selector: 'app-machine-learning',
  imports: [CommonModule, FormsModule],
  templateUrl: './machine-learning.html',
  styleUrl: './machine-learning.scss'
})
export class MachineLearning implements OnInit {
  
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  isAuthenticated = signal(false);
  currentUser = signal<any>(null);
  showLogin = signal(true);
  
  loginForm = signal<LoginForm>({
    username: '',
    password: ''
  });
  
  validationErrors = signal<Record<string, string>>({});
  isDarkTheme = signal(false);
  
  mlModels = signal<MLModel[]>([
    {
      id: 'decision-tree',
      name: 'Decision Tree',
      description: 'Tree-based model for interpretable fraud detection with clear decision paths.',
      icon: '🌲',
      status: 'available',
      route: '/decision-tree',
      accuracy: 95.2,
      pros: ['Easy to interpret', 'Fast training', 'Handles mixed data types', 'No feature scaling needed'],
      cons: ['Prone to overfitting', 'Unstable predictions', 'Biased towards features with more levels']
    },
    {
      id: 'random-forest',
      name: 'Random Forest',
      description: 'Ensemble method combining multiple decision trees for improved accuracy.',
      icon: '🔢',
      status: 'coming-soon',
      pros: ['Reduces overfitting', 'High accuracy', 'Handles missing values', 'Feature importance ranking'],
      cons: ['Less interpretable', 'Memory intensive', 'Can overfit with noisy datasets']
    },
    {
      id: 'neural-network',
      name: 'Neural Network',
      description: 'Deep learning model with multiple layers to capture complex patterns.',
      icon: '🧠',
      status: 'coming-soon',
      pros: ['Captures complex patterns', 'High accuracy', 'Automatic feature extraction', 'Handles large datasets'],
      cons: ['Black box model', 'Requires large datasets', 'Computationally expensive', 'Prone to overfitting']
    },
    {
      id: 'svm',
      name: 'Support Vector Machine',
      description: 'SVM classifier optimized for high-dimensional fraud detection.',
      icon: '📐',
      status: 'coming-soon',
      pros: ['Effective in high dimensions', 'Memory efficient', 'Versatile kernel functions', 'Works well with small datasets'],
      cons: ['Slow on large datasets', 'Sensitive to feature scaling', 'No probabilistic output', 'Difficult parameter tuning']
    },
    {
      id: 'logistic-regression',
      name: 'Logistic Regression',
      description: 'Linear model providing probabilistic fraud predictions.',
      icon: '📊',
      status: 'coming-soon',
      pros: ['Fast and efficient', 'Probabilistic output', 'No tuning required', 'Less prone to overfitting'],
      cons: ['Assumes linear relationship', 'Sensitive to outliers', 'Requires feature scaling', 'Limited complexity']
    }
  ]);

  availableModels = computed(() => 
    this.mlModels().filter(m => m.status === 'available').length
  );

  comingSoonModels = computed(() =>
    this.mlModels().filter(m => m.status === 'coming-soon').length
  );

  averageAccuracy = computed(() => {
    const models = this.mlModels().filter(m => m.accuracy);
    if (models.length === 0) return '0.0';
    const sum = models.reduce((acc, m) => acc + (m.accuracy || 0), 0);
    return (sum / models.length).toFixed(1);
  });

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit() {
    this.initializeTheme();
    
    this.apiService.user$.subscribe(user => {
      this.currentUser.set(user);
      this.isAuthenticated.set(!!user);
      this.showLogin.set(!this.isAuthenticated());
    });
  }

  navigateToModel(model: MLModel) {
    if (model.status === 'available' && model.route) {
      this.router.navigate([model.route]);
    } else {
      this.showNotification(`${model.name} is coming soon!`, 'info');
    }
  }

  validateLoginForm(): boolean {
    const errors: Record<string, string> = {};
    const form = this.loginForm();

    if (!form.username.trim()) {
      errors['username'] = 'Username is required';
    } else if (form.username.length < 3) {
      errors['username'] = 'Username must be at least 3 characters';
    }

    if (!form.password.trim()) {
      errors['password'] = 'Password is required';
    } else if (form.password.length < 4) {
      errors['password'] = 'Password must be at least 4 characters';
    }

    this.validationErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  getFieldValidationClass(field: string): string {
    const errors = this.validationErrors();
    return errors[field] ? 'is-invalid' : '';
  }

  getFieldValidationMessage(field: string): string {
    const errors = this.validationErrors();
    return errors[field] || '';
  }

  clearValidationErrors() {
    this.validationErrors.set({});
  }

  showSuccess(message: string) {
    this.success.set(message);
    setTimeout(() => this.success.set(null), 3000);
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.success.set(message);
    setTimeout(() => this.success.set(null), 3000);
  }

  toggleTheme() {
    this.isDarkTheme.update(current => !current);
    document.documentElement.setAttribute('data-theme', this.isDarkTheme() ? 'dark' : 'light');
    localStorage.setItem('theme', this.isDarkTheme() ? 'dark' : 'light');
  }

  initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      this.isDarkTheme.set(savedTheme === 'dark');
    } else {
      this.isDarkTheme.set(systemDark);
    }
    
    document.documentElement.setAttribute('data-theme', this.isDarkTheme() ? 'dark' : 'light');
  }

  login() {
    this.clearValidationErrors();
    this.error.set(null);

    if (!this.validateLoginForm()) {
      return;
    }

    this.loading.set(true);
    const form = this.loginForm();

    this.apiService.login(form).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.showSuccess('Welcome! Successfully logged in.');
      },
      error: (error) => {
        this.error.set(error.message || 'Login failed. Please check your credentials.');
        this.loading.set(false);
      }
    });
  }

  logout() {
    this.apiService.logout();
    this.showLogin.set(true);
  }

  updateLoginField(field: keyof LoginForm, value: string) {
    const current = this.loginForm();
    this.loginForm.set({ ...current, [field]: value });
  }

  clearError() {
    this.error.set(null);
  }

  clearSuccess() {
    this.success.set(null);
  }

  getModelStatusClass(status: string): string {
    return status === 'available' ? 'available' : 'coming-soon';
  }

  getModelStatusText(status: string): string {
    return status === 'available' ? 'Available' : 'Coming Soon';
  }
}
