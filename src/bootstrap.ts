import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Adicionar provideHttpClient() ao appConfig
const updatedAppConfig = {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),
    provideHttpClient()
  ]
};

bootstrapApplication(App, updatedAppConfig)
  .catch((err) => console.error(err));