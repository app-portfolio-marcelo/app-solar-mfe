import { Routes } from '@angular/router';
import { MachineLearning } from './components/machine-learning/machine-learning';
import { DecisionTree } from './components/decision-tree/decision-tree';

export const routes: Routes = [
    { path: '', component: MachineLearning },
    { path: 'decision-tree', component: DecisionTree }
];
