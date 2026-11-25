-- ==============================================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS - REFEITÓRIO IFPI (CAMPUS TERESINA CENTRAL)
-- Desenvolvido por: Primeira Classe - Desenvolvimento de Sistemas
-- ==============================================================================

-- 1. TABELA DE PORÇÕES PRÉ-CADASTRADAS
CREATE TABLE IF NOT EXISTS public.porcoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    icone TEXT NOT NULL DEFAULT 'bi-egg-fried',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABELA DE REFEIÇÕES (ALMOÇO E JANTAR)
CREATE TABLE IF NOT EXISTS public.refeicoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('almoco', 'jantar')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_data_tipo UNIQUE (data, tipo)
);

-- 3. TABELA ASSOCIATIVA (REFEIÇÃO <-> PORÇÕES)
CREATE TABLE IF NOT EXISTS public.refeicao_porcoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refeicao_id UUID NOT NULL REFERENCES public.refeicoes(id) ON DELETE CASCADE,
    porcao_id UUID NOT NULL REFERENCES public.porcoes(id) ON DELETE CASCADE,
    CONSTRAINT unique_refeicao_porcao UNIQUE (refeicao_id, porcao_id)
);

-- 4. TABELA DE DIAS NÃO LETIVOS (COM JUSTIFICATIVA)
CREATE TABLE IF NOT EXISTS public.dias_nao_letivos (
    data DATE PRIMARY KEY,
    justificativa TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- ÍNDICES PARA PERFORMANCE NAS CONSULTAS SEMANAIS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_refeicoes_data ON public.refeicoes(data);
CREATE INDEX IF NOT EXISTS idx_refeicao_porcoes_refeicao ON public.refeicao_porcoes(refeicao_id);

-- ==============================================================================
-- SEGURANÇA: ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.porcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refeicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refeicao_porcoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dias_nao_letivos ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE LEITURA PÚBLICA (Qualquer visitante pode ver o cardápio)
CREATE POLICY "Leitura publica de porcoes"
    ON public.porcoes FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Leitura publica de refeicoes"
    ON public.refeicoes FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Leitura publica de refeicao_porcoes"
    ON public.refeicao_porcoes FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Leitura publica de dias_nao_letivos"
    ON public.dias_nao_letivos FOR SELECT
    TO anon, authenticated
    USING (true);

-- POLÍTICAS DE ESCRITA RESTRITA (Apenas administradores autenticados)
-- Tabela: porcoes
CREATE POLICY "Admin insere porcoes"
    ON public.porcoes FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admin atualiza porcoes"
    ON public.porcoes FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admin exclui porcoes"
    ON public.porcoes FOR DELETE
    TO authenticated
    USING (true);

-- Tabela: refeicoes
CREATE POLICY "Admin insere refeicoes"
    ON public.refeicoes FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admin atualiza refeicoes"
    ON public.refeicoes FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admin exclui refeicoes"
    ON public.refeicoes FOR DELETE
    TO authenticated
    USING (true);

-- Tabela: refeicao_porcoes
CREATE POLICY "Admin insere refeicao_porcoes"
    ON public.refeicao_porcoes FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admin atualiza refeicao_porcoes"
    ON public.refeicao_porcoes FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admin exclui refeicao_porcoes"
    ON public.refeicao_porcoes FOR DELETE
    TO authenticated
    USING (true);

-- Tabela: dias_nao_letivos
CREATE POLICY "Admin insere dias_nao_letivos"
    ON public.dias_nao_letivos FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admin atualiza dias_nao_letivos"
    ON public.dias_nao_letivos FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admin exclui dias_nao_letivos"
    ON public.dias_nao_letivos FOR DELETE
    TO authenticated
    USING (true);

-- ==============================================================================
-- DADOS INICIAIS (SEED): PORÇÕES COMUNS COM ÍCONES DO BOOTSTRAP ICONS
-- ==============================================================================
INSERT INTO public.porcoes (nome, icone) VALUES
    ('Arroz Branco', 'bi-bowl-rice'),
    ('Feijão Carioca', 'bi-cup-hot'),
    ('Frango Assado', 'bi-fire'),
    ('Carne Moída Refogada', 'bi-egg-fried'),
    ('Macarrão Espaguete', 'bi-bezier2'),
    ('Farofa Temperada', 'bi-stars'),
    ('Salada Crua (Alface e Tomate)', 'bi-flower1'),
    ('Purê de Batata', 'bi-circle-half'),
    ('Suco Natural de Fruta', 'bi-cup-straw'),
    ('Fruta da Estação (Sobremesa)', 'bi-apple')
ON CONFLICT (nome) DO NOTHING;