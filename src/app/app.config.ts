import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { onViewTransitionCreated } from './shared/motion/cover-morph';

export const appConfig: ApplicationConfig = {
  providers: [
    // The app still relies on zone.js-driven change detection in places
    // (setTimeout-based UI state). Keep it explicit: Angular 21 defaults to zoneless.
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      // Progressive enhancement: browsers without document.startViewTransition
      // navigate instantly, exactly as before.
      withViewTransitions({ skipInitialTransition: true, onViewTransitionCreated }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
