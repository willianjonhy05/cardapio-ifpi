// ==========================================================================
// CONFIGURAÇÃO DO CLIENTE SUPABASE
// Desenvolvido por: Primeira Classe - Desenvolvimento de Sistemas
// ==========================================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Substitua pelos valores reais do seu projeto (Settings > API no Supabase)
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA-CHAVE-ANON-PUBLICA-AQUI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);