import { Login } from 'src/app/types/types';

/**
 * Public demo account seeded by the backend so visitors can try the full
 * flow (cart, publishing games) without registering. Not a secret.
 */
export const DEMO_CREDENTIALS: Readonly<Login> = {
  email: 'demo@worldofgames.dev',
  password: 'DemoPass123!',
};
