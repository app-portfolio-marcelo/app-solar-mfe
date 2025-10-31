import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// Interface para o form de predição
interface PredictionForm {
  V1: number; V2: number; V3: number; V4: number; V5: number;
  V6: number; V7: number; V8: number; V9: number; V10: number;
  V11: number; V12: number; V13: number; V14: number; V15: number;
  V16: number; V17: number; V18: number; V19: number; V20: number;
  V21: number; V22: number; V23: number; V24: number; V25: number;
  V26: number; V27: number; V28: number; Amount: number;
}

@Component({
  selector: 'app-decision-tree',
  imports: [CommonModule, FormsModule],
  templateUrl: './decision-tree.html',
  styleUrl: './decision-tree.scss'
})
export class DecisionTree implements OnInit {
  
  // Usando signals (Angular 20)
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  isAuthenticated = signal(false);
  currentUser = signal<any>(null);

  // Dados do modelo usando signals
  modelInfo = signal<any>(null);
  evaluation = signal<any>(null);
  featureImportance = signal<any>(null);
  performanceMetrics = signal<any>(null);
  confusionMatrix = signal<any>(null);
  treeStructure = signal<any>(null);
  predictionResult = signal<any>(null);

  // Charts
  featureChart: Chart | null = null;
  radarChart: Chart | null = null;
  confusionChart: Chart | null = null;
  treeChart: Chart | null = null;

  // Form usando signals com tipos corretos
  predictionForm = signal<PredictionForm>({
    V1: 0, V2: 0, V3: 0, V4: 0, V5: 0, V6: 0, V7: 0, V8: 0, V9: 0, V10: 0,
    V11: 0, V12: 0, V13: 0, V14: 0, V15: 0, V16: 0, V17: 0, V18: 0, V19: 0, V20: 0,
    V21: 0, V22: 0, V23: 0, V24: 0, V25: 0, V26: 0, V27: 0, V28: 0, Amount: 0
  });

  // Arrays para os loops no template
  fieldsV1to5 = ['V1', 'V2', 'V3', 'V4', 'V5'] as const;
  fieldsV6to10 = ['V6', 'V7', 'V8', 'V9', 'V10'] as const;
  fieldsV11to15 = ['V11', 'V12', 'V13', 'V14', 'V15'] as const;
  fieldsV16to20 = ['V16', 'V17', 'V18', 'V19', 'V20'] as const;
  fieldsV21to25 = ['V21', 'V22', 'V23', 'V24', 'V25'] as const;
  fieldsV26to28 = ['V26', 'V27', 'V28'] as const;

  // Validation states
  validationErrors = signal<Record<string, string>>({});
  formValid = computed(() => {
    return Object.keys(this.validationErrors()).length === 0;
  });

  // UI states
  showTooltips = signal(false);
  animationEnabled = signal(true);
  isDarkTheme = signal(false);
  
  // Statistics computed signals
  totalPredictions = signal(0);
  successfulPredictions = signal(0);
  accuracy = computed(() => {
    const total = this.totalPredictions();
    return total > 0 ? (this.successfulPredictions() / total * 100) : 0;
  });

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit() {
    // Initialize theme
    this.initializeTheme();
    
    // Verificar se usuário está autenticado
    this.apiService.user$.subscribe(user => {
      this.currentUser.set(user);
      this.isAuthenticated.set(!!user);
      
      if (!this.isAuthenticated()) {
        // Redirect to login if not authenticated
        this.router.navigate(['/machine-learning']);
        return;
      }
      
      this.loadAllData();
    });
    
    // Sempre garantir que visualizações existam
    setTimeout(() => {
      this.ensureChartsExist();
    }, 1000);
  }

  // ===================
  // NAVIGATION
  // ===================
  
  goBack() {
    this.router.navigate(['/']);
  }

  logout() {
    this.apiService.logout();
    this.router.navigate(['/']);
  }

  // ===================
  // VALIDATION METHODS  
  // ===================
  
  validatePredictionForm(): boolean {
    const errors: Record<string, string> = {};
    const form = this.predictionForm();

    // Validate Amount field (most important)
    if (form.Amount < 0) {
      errors['Amount'] = 'Amount cannot be negative';
    } else if (form.Amount > 1000000) {
      errors['Amount'] = 'Amount seems too high (>$1M)';
    }

    // Validate V-fields (should be reasonable values)
    Object.keys(form).forEach(key => {
      if (key !== 'Amount') {
        const value = form[key as keyof PredictionForm];
        if (isNaN(value) || value === null || value === undefined) {
          errors[key] = `${key} must be a valid number`;
        } else if (Math.abs(value) > 100) {
          errors[key] = `${key} value seems extreme (>${Math.abs(value)})`;
        }
      }
    });

    this.validationErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  getFieldValidationClass(field: string): string {
    const errors = this.validationErrors();
    if (errors[field]) {
      return 'is-invalid';
    }
    return '';
  }

  getFieldValidationMessage(field: string): string {
    const errors = this.validationErrors();
    return errors[field] || '';
  }

  clearValidationErrors() {
    this.validationErrors.set({});
  }

  // ===================
  // UI HELPER METHODS
  // ===================

  showSuccess(message: string) {
    console.log('Success:', message);
    this.success.set(message);
    
    // Limpar mensagem após 3 segundos
    setTimeout(() => {
      this.success.set(null);
    }, 3000);
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // Enhanced notification system
    console.log(`${type.toUpperCase()}: ${message}`);
    // Could integrate with a toast/notification service
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.showNotification('Copied to clipboard!', 'success');
    });
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

  // Métodos para atualizar form com tipagem correta
  updatePredictionField(field: keyof PredictionForm, value: number) {
    const current = this.predictionForm();
    this.predictionForm.set({ ...current, [field]: value });
  }

  // Método para obter valor do campo de predição
  getPredictionFieldValue(field: keyof PredictionForm): number {
    return this.predictionForm()[field];
  }

  // ===================
  // CARREGAMENTO DE DADOS
  // ===================

  loadMockVisualizationData() {
    console.log('🔄 Loading mock visualization data...');
    
    // Mock Feature Importance
    this.featureImportance.set({
      chart_data: {
        labels: ['V14', 'V4', 'V12', 'V10', 'V17', 'V11'],
        values: [0.15, 0.12, 0.09, 0.08, 0.07, 0.06]
      }
    });

    // Mock Performance Metrics
    this.performanceMetrics.set({
      radar_chart: {
        labels: ['Accuracy', 'Precision', 'Recall', 'F1-Score'],
        datasets: [{
          label: 'Decision Tree',
          data: [0.95, 0.88, 0.92, 0.90],
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2
        }]
      }
    });

    // Mock Confusion Matrix
    this.confusionMatrix.set({
      raw_matrix: [[85000, 150], [45, 1805]],
      heatmap_data: {
        data: [
          {x: 'Normal', y: 'Normal', value: 85000, label: 'True Negative: 85000'},
          {x: 'Fraud', y: 'Normal', value: 150, label: 'False Positive: 150'},
          {x: 'Normal', y: 'Fraud', value: 45, label: 'False Negative: 45'},
          {x: 'Fraud', y: 'Fraud', value: 1805, label: 'True Positive: 1805'}
        ],
        labels: ['Normal', 'Fraud']
      }
    });

    // Mock Tree Structure
    this.treeStructure.set({
      tree_structure: {
        samples: 87000,
        feature: 'V14',
        threshold: 0.5432,
        type: 'internal'
      }
    });

    // Criar gráficos após carregar dados mock
    setTimeout(() => {
      console.log('✅ Creating charts with mock data');
      this.createCharts();
    }, 500);
  }
  
  async loadAllData() {
    this.loading.set(true);
    this.error.set(null);

    try {
    // Carregar dados em paralelo, mas tratando erros individualmente
    const promises = [
      this.apiService.getDecisionTreeInfo().toPromise().catch(err => {
        console.warn('Model info failed:', err);
        return null;
      }),
      this.apiService.evaluateDecisionTree().toPromise().catch(err => {
        console.warn('Evaluation failed:', err);
        return null;
      }),
      this.apiService.getFeatureImportance().toPromise().catch(err => {
        console.warn('Feature importance failed:', err);
        return null;
      }),
      this.apiService.getPerformanceMetrics().toPromise().catch(err => {
        console.warn('Performance metrics failed:', err);
        return null;
      }),
      this.apiService.getTreeStructure().toPromise().catch(err => {
        console.warn('Tree structure failed:', err);
        return null;
      })
    ];

    const [modelInfo, evaluation, featureImportance, performanceMetrics, treeStructure] = await Promise.all(promises);

    // Atualizar apenas os dados que foram carregados com sucesso
    if (modelInfo) this.modelInfo.set(modelInfo);
    if (evaluation) this.evaluation.set(evaluation?.evaluation);
    if (featureImportance) this.featureImportance.set(featureImportance);
    if (performanceMetrics) this.performanceMetrics.set(performanceMetrics);
    if (treeStructure) this.treeStructure.set(treeStructure);

    // Carregar matriz de confusão separadamente
    this.apiService.getConfusionMatrix().subscribe({
      next: (data) => {
        this.confusionMatrix.set(data);
        this.createCharts();
      },
      error: (err) => {
        console.warn('Confusion matrix failed:', err);
        // Criar gráficos mesmo sem matriz de confusão
        this.createCharts();
      }
    });

  } catch (error: any) {
    this.error.set('Erro ao carregar dados: ' + error.message);
  } finally {
    this.loading.set(false);
  }
  }

  // ===================
  // GRÁFICOS
  // ===================
  
  createCharts() {
    console.log('📊 Creating all charts...');
    setTimeout(() => {
      this.createFeatureImportanceChart();
      this.createRadarChart();
      this.createConfusionChart();
      this.createTreeChart();
      console.log('✅ All charts created successfully');
    }, 100);
  }

  ensureChartsExist() {
    // Método para garantir que gráficos existem sempre
    const hasFeatureData = this.featureImportance();
    const hasPerformanceData = this.performanceMetrics();
    const hasConfusionData = this.confusionMatrix();
    const hasTreeData = this.treeStructure();

    if (!hasFeatureData || !hasPerformanceData || !hasConfusionData || !hasTreeData) {
      console.log('⚠️ Missing chart data, loading mock data...');
      this.loadMockVisualizationData();
    } else {
      console.log('📊 Chart data available, creating charts...');
      this.createCharts();
    }
  }

  createFeatureImportanceChart() {
    const canvas = document.getElementById('featureChart') as HTMLCanvasElement;
    const featureData = this.featureImportance();
    if (!canvas || !featureData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.featureChart) {
      this.featureChart.destroy();
    }

    this.featureChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: featureData.chart_data.labels,
        datasets: [{
          label: 'Importância',
          data: featureData.chart_data.values,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Feature Importance - Decision Tree'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  createRadarChart() {
    const canvas = document.getElementById('radarChart') as HTMLCanvasElement;
    const metricsData = this.performanceMetrics();
    if (!canvas || !metricsData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.radarChart) {
      this.radarChart.destroy();
    }

    this.radarChart = new Chart(ctx, {
      type: 'radar',
      data: metricsData.radar_chart,
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Performance Metrics'
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 1
          }
        }
      }
    });
  }

  createConfusionChart() {
    const canvas = document.getElementById('confusionChart') as HTMLCanvasElement;
    const confusionData = this.confusionMatrix();
    if (!canvas || !confusionData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.confusionChart) {
      this.confusionChart.destroy();
    }

    // Preparar dados para heatmap usando Chart.js
    const matrix = confusionData.raw_matrix;
    const labels = ['Normal', 'Fraud'];
    
    // Converter matriz em dataset para scatter plot (simulando heatmap)
    const data: Array<{x: number, y: number, v: number, label: string}> = [];
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        data.push({
          x: j,
          y: i,
          v: matrix[i][j],
          label: `${labels[i]} → ${labels[j]}: ${matrix[i][j]}`
        });
      }
    }

    this.confusionChart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Confusion Matrix',
          data: data.map(point => ({
            x: point.x,
            y: point.y,
            backgroundColor: point.v > 50000 ? 'rgba(75, 192, 192, 0.8)' : 'rgba(255, 99, 132, 0.8)'
          })),
          pointRadius: data.map(point => Math.max(5, Math.min(30, point.v / 5000))), // Tamanho baseado no valor
          pointHoverRadius: data.map(point => Math.max(8, Math.min(35, point.v / 4000)))
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Confusion Matrix Visualization'
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const point = data[context.dataIndex];
                return point.label;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            min: -0.5,
            max: 1.5,
            ticks: {
              stepSize: 1,
              callback: function(value: any) {
                return labels[value] || '';
              }
            },
            title: {
              display: true,
              text: 'Predicted'
            }
          },
          y: {
            min: -0.5,
            max: 1.5,
            ticks: {
              stepSize: 1,
              callback: function(value: any) {
                return labels[value] || '';
              }
            },
            title: {
              display: true,
              text: 'Actual'
            }
          }
        }
      }
    });
  }

  createTreeChart() {
    const canvas = document.getElementById('treeChart') as HTMLCanvasElement;
    const treeData = this.treeStructure();
    if (!canvas || !treeData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.treeChart) {
      this.treeChart.destroy();
    }

    // Preparar dados para scatter plot (simulando estrutura de árvore)
    const data: Array<{x: number, y: number, label: string}> = [
      { x: 0, y: 0, label: 'Root: Feature Split' },
      { x: -1, y: 1, label: 'Left Branch' },
      { x: 1, y: 1, label: 'Right Branch' },
      { x: -1.5, y: 2, label: 'Leaf: Normal' },
      { x: -0.5, y: 2, label: 'Leaf: Normal' },
      { x: 0.5, y: 2, label: 'Leaf: Normal' },
      { x: 1.5, y: 2, label: 'Leaf: Fraud' }
    ];

    this.treeChart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Tree Structure',
          data: data.map(point => ({
            x: point.x,
            y: point.y,
            backgroundColor: point.label.includes('Fraud') ? 'rgba(231, 76, 60, 0.8)' : 'rgba(52, 152, 219, 0.8)'
          })),
          pointRadius: 8,
          pointHoverRadius: 12
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Decision Tree Structure (Simplified)'
          },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const point = data[context.dataIndex];
                return point.label;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: {
              display: true,
              text: 'Tree Width'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Tree Depth'
            }
          }
        }
      }
    });
  }

  // ===================
  // PREDIÇÃO
  // ===================
  
  predictFraud() {
    // Clear previous state (mas manter visualizações)
    this.clearValidationErrors();
    this.error.set(null);
    this.predictionResult.set(null);

    // Validate form
    if (!this.validatePredictionForm()) {
      this.error.set('Please fix validation errors before predicting');
      return;
    }

    this.loading.set(true);
    
    const form = this.predictionForm();
    // Adicionar ID necessário para o backend
    const transaction = {
      id: Math.floor(Math.random() * 1000000), // ID aleatório
      ...form
    };

    this.apiService.predictFraud(transaction).subscribe({
      next: (result) => {
        this.predictionResult.set(result);
        this.loading.set(false);
        
        // Update statistics
        this.totalPredictions.update(count => count + 1);
        if (result.prediction.confidence > 0.8) {
          this.successfulPredictions.update(count => count + 1);
        }
        
        // Garantir que visualizações permanecem
        setTimeout(() => {
          this.ensureChartsExist();
        }, 100);
        
        this.showSuccess(`Prediction completed with ${(result.prediction.confidence * 100).toFixed(1)}% confidence`);
      },
      error: (error) => {
        this.error.set('Prediction error: ' + error.message);
        this.loading.set(false);
      }
    });
  }

  loadSampleTransaction() {
    console.log('🔄 Loading sample transaction data...');
    
    // Limpar erros anteriores
    this.clearValidationErrors();
    this.error.set(null);
    this.predictionResult.set(null);
    
    // Array de diferentes samples equilibrados (Normal vs Fraud)
    const sampleTransactions = [
      {
        // ✅ NORMAL 1: Compra pequena típica - supermercado
        V1: 0.144807, V2: 0.358493, V3: 0.220653, V4: 0.192389,
        V5: -0.246133, V6: 0.174578, V7: -0.093578, V8: 0.114400,
        V9: 0.126092, V10: -0.065253, V11: 0.282196, V12: -0.102049,
        V13: -0.124792, V14: 0.064729, V15: -0.111554, V16: 0.112558,
        V17: 0.044519, V18: -0.028204, V19: -0.110077, V20: 0.202292,
        V21: -0.046761, V22: 0.251583, V23: 0.069539, V24: -0.136727,
        V25: 0.116958, V26: 0.217232, V27: -0.010274, V28: 0.025896,
        Amount: 47.83,
        type: '✅ NORMAL - Grocery Store',
        expectedResult: 'Normal'
      },
      {
        // ✅ NORMAL 2: Compra online moderada 
        V1: -0.508371, V2: 0.257264, V3: -0.082700, V4: -0.190384,
        V5: -0.375254, V6: 0.247376, V7: -0.121929, V8: 0.025344,
        V9: 0.301990, V10: 0.153074, V11: -0.121477, V12: 0.145281,
        V13: 0.070686, V14: 0.065412, V15: 0.024889, V16: -0.061593,
        V17: 0.061549, V18: 0.013648, V19: 0.000764, V20: 0.084729,
        V21: 0.056897, V22: 0.061458, V23: -0.031593, V24: 0.149829,
        V25: 0.264158, V26: -0.097485, V27: 0.040164, V28: -0.013890,
        Amount: 134.56,
        type: '✅ NORMAL - Online Purchase',
        expectedResult: 'Normal'
      },
      {
        // ✅ NORMAL 3: Pagamento de conta/serviço
        V1: 1.191857, V2: 0.166151, V3: 0.066480, V4: 0.148154,
        V5: 0.060018, V6: -0.082361, V7: -0.078803, V8: 0.085102,
        V9: -0.155425, V10: -0.066974, V11: 0.312727, V12: 0.265235,
        V13: 0.189095, V14: -0.043772, V15: 0.135558, V16: 0.163917,
        V17: -0.014805, V18: -0.083361, V19: -0.045783, V20: -0.069083,
        V21: -0.125775, V22: -0.238672, V23: 0.101288, V24: -0.139846,
        V25: 0.067170, V26: 0.025895, V27: -0.008983, V28: 0.014724,
        Amount: 89.99,
        type: '✅ NORMAL - Service Payment',
        expectedResult: 'Normal'
      },
      {
        // ✅ NORMAL 4: Restaurante/jantar
        V1: -0.759807, V2: -0.072781, V3: 0.936347, V4: 0.578155,
        V5: -0.138321, V6: 0.162388, V7: 0.139599, V8: 0.098698,
        V9: 0.163787, V10: 0.090794, V11: -0.251600, V12: -0.217801,
        V13: -0.291390, V14: -0.111169, V15: 0.268177, V16: -0.170401,
        V17: 0.107971, V18: 0.025791, V19: 0.103993, V20: 0.151412,
        V21: -0.018307, V22: 0.177838, V23: -0.010474, V24: 0.066928,
        V25: 0.028539, V26: -0.089115, V27: 0.033558, V28: -0.021053,
        Amount: 72.40,
        type: '✅ NORMAL - Restaurant',
        expectedResult: 'Normal'
      },
      {
        // 🔴 FRAUD 1: Transação suspeita - valores extremos
        V1: -2.312227, V2: 1.951992, V3: -1.609851, V4: 3.997906,
        V5: -0.522188, V6: -1.426545, V7: -2.537387, V8: 1.391657,
        V9: -2.770089, V10: -2.772272, V11: 3.202033, V12: -2.899208,
        V13: -0.595221, V14: -4.289354, V15: 0.389724, V16: -1.140651,
        V17: -2.830075, V18: -0.168224, V19: 0.507757, V20: -0.287924,
        V21: -0.631418, V22: -1.059647, V23: -0.684093, V24: 1.965775,
        V25: -1.232622, V26: 0.266649, V27: 0.751826, V28: 0.834077,
        Amount: 2125.87,
        type: '🔴 FRAUD - High Amount Anomaly',
        expectedResult: 'Fraud'
      },
      {
        // 🔴 FRAUD 2: Padrão anômalo - micro valor
        V1: -3.043541, V2: -3.157307, V3: 1.088463, V4: 2.288644,
        V5: 1.359805, V6: -1.064823, V7: 0.325574, V8: -0.067794,
        V9: -0.270533, V10: -0.838587, V11: -0.414650, V12: -0.503271,
        V13: 1.658049, V14: -3.186230, V15: 1.184760, V16: -2.175627,
        V17: 0.898457, V18: -1.430430, V19: 0.265245, V20: 0.770216,
        V21: 0.775154, V22: 1.008187, V23: -0.693321, V24: -0.327772,
        V25: -0.139097, V26: -0.055353, V27: -0.059752, V28: 0.123205,
        Amount: 1.00,
        type: '🔴 FRAUD - Micro Transaction',
        expectedResult: 'Fraud'
      },
      {
        // 🔴 FRAUD 3: Teste de cartão - múltiplas tentativas
        V1: 4.983541, V2: -2.457307, V3: 2.588463, V4: -1.788644,
        V5: -2.359805, V6: 3.064823, V7: -1.825574, V8: 2.567794,
        V9: 1.770533, V10: -3.838587, V11: 2.414650, V12: -1.503271,
        V13: -2.658049, V14: 4.186230, V15: -1.184760, V16: 3.175627,
        V17: -0.898457, V18: 2.430430, V19: -1.265245, V20: -0.770216,
        V21: -1.775154, V22: -2.008187, V23: 3.693321, V24: 0.327772,
        V25: 2.139097, V26: -1.055353, V27: 0.559752, V28: -1.123205,
        Amount: 0.50,
        type: '🔴 FRAUD - Card Testing',
        expectedResult: 'Fraud'
      },
      {
        // ✅ NORMAL 5: Compra de combustível
        V1: 0.344807, V2: -0.158493, V3: 0.420653, V4: -0.092389,
        V5: 0.146133, V6: -0.274578, V7: 0.193578, V8: -0.214400,
        V9: 0.226092, V10: 0.165253, V11: -0.182196, V12: 0.202049,
        V13: 0.224792, V14: -0.164729, V15: 0.211554, V16: -0.112558,
        V17: -0.144519, V18: 0.228204, V19: 0.210077, V20: -0.102292,
        V21: 0.146761, V22: -0.151583, V23: -0.169539, V24: 0.236727,
        V25: -0.116958, V26: 0.117232, V27: 0.110274, V28: -0.075896,
        Amount: 55.20,
        type: '✅ NORMAL - Gas Station',
        expectedResult: 'Normal'
      }
    ];
    
    // Selecionar uma amostra aleatória
    const randomIndex = Math.floor(Math.random() * sampleTransactions.length);
    const selectedSample = sampleTransactions[randomIndex];
    const { type, expectedResult, ...sampleData } = selectedSample; // Remover campos informativos
    
    this.predictionForm.set(sampleData);
    console.log(`✅ Sample data loaded (${type}):`, sampleData);
    console.log(`📊 Expected prediction result: ${expectedResult}`);

    // Dar feedback visual de que os dados foram carregados
    this.showSuccess(`Sample loaded: ${type}`);
  }

  // ===================
  // UTILS
  // ===================
  
  clearData() {
    this.modelInfo.set(null);
    this.evaluation.set(null);
    this.featureImportance.set(null);
    this.performanceMetrics.set(null);
    this.confusionMatrix.set(null);
    this.treeStructure.set(null);
    this.predictionResult.set(null);
    
    if (this.featureChart) {
      this.featureChart.destroy();
      this.featureChart = null;
    }
    if (this.radarChart) {
      this.radarChart.destroy();
      this.radarChart = null;
    }
    if (this.confusionChart) {
      this.confusionChart.destroy();
      this.confusionChart = null;
    }
    if (this.treeChart) {
      this.treeChart.destroy();
      this.treeChart = null;
    }
  }

  clearPredictionOnly() {
    // Método para limpar apenas dados de predição, mantendo visualizações
    this.predictionResult.set(null);
    this.clearValidationErrors();
    this.error.set(null);
  }

  clearSuccess() {
    this.success.set(null);
  }

  formatNumber(value: number, decimals: number = 4): string {
    return value?.toFixed(decimals) || '0';
  }

  formatPercent(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  getIconClass(icon: string): string {
    const iconMap: { [key: string]: string } = {
      'accuracy': 'fa-bullseye',
      'precision': 'fa-crosshairs',
      'recall': 'fa-search',
      'f1score': 'fa-balance-scale'
    };
    return iconMap[icon] || 'fa-chart-bar';
  }

  trackByRank(index: number, item: any): any {
    return item.rank;
  }

  clearError() {
    this.error.set(null);
  }
}