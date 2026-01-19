interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appUrl: string;
  env: 'development' | 'production';
}

export const config: AppConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  appUrl: import.meta.env.VITE_APP_URL ?? 'http://localhost:5173',
  env: import.meta.env.PROD ? 'production' : 'development',
};

// Validation (fail fast in development)
if (config.env === 'development') {
  const required = ['supabaseUrl', 'supabaseAnonKey'] as const;
  for (const key of required) {
    if (!config[key]) {
      console.warn(`Missing required config: ${key}`);
    }
  }
}
