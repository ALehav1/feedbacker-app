interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  openaiApiKey: string;
  resendApiKey: string;
  appUrl: string;
  env: 'development' | 'production';
}

export const config: AppConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY ?? '',
  resendApiKey: import.meta.env.VITE_RESEND_API_KEY ?? '',
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
