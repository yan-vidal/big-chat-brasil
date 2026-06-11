import 'zone.js';
import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

void bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideTranslateService({
      fallbackLang: 'pt-BR',
      lang: 'pt-BR',
    }),
  ],
});
