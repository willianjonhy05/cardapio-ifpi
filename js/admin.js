// ==========================================================================
// LÓGICA DO PAINEL ADMINISTRATIVO - CARDÁPIO REFEITÓRIO IFPI
// Desenvolvido por: Primeira Classe - Desenvolvimento de Sistemas
// ==========================================================================

import { supabase } from './supabase-config.js';

// ==========================================================================
// 1. PROTEÇÃO DE ROTA E LOGOUT
// ==========================================================================

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = './login.html';
        return false;
    }
    return true;
}

document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = './login.html';
});

// ==========================================================================
// 2. FEEDBACK VISUAL E UTILITÁRIOS
// ==========================================================================

const feedbackEl = document.getElementById('admin-feedback');

function showFeedback(message, type = 'success') {
    feedbackEl.className = `alert alert-${type} shadow-sm rounded-3`;
    feedbackEl.innerHTML = `<i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2"></i>${message}`;
    feedbackEl.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
        feedbackEl.classList.add('d-none');
    }, 4500);
}

function getCurrentWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    const friday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4);

    const toISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const toBR = iso => {
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    };

    return { start: toISO(monday), end: toISO(friday), toBR };
}

function formatDateBR(isoDate) {
    const [y, m, d] = isoDate.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return `${dias[dateObj.getDay()]} (${d}/${m}/${y})`;
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ==========================================================================
// 3. CATÁLOGO DE PORÇÕES E SELETOR DE ÍCONES
// ==========================================================================

const AVAILABLE_ICONS = [
    'bi-egg-fried', 'bi-cup-hot', 'bi-cup-straw', 'bi-apple',
    'bi-fire', 'bi-flower1', 'bi-stars', 'bi-circle-half',
    'bi-bezier2', 'bi-droplet-fill', 'bi-heart-fill', 'bi-award',
    'bi-basket2-fill', 'bi-brightness-high', 'bi-check2-circle', 'bi-bookmark-star'
];

let allPortions = [];

function renderIconPicker(selectedIcon = 'bi-egg-fried') {
    const grid = document.getElementById('icon-picker-grid');
    const hiddenInput = document.getElementById('portion-icon');
    hiddenInput.value = selectedIcon;
    grid.innerHTML = '';

    AVAILABLE_ICONS.forEach(iconClass => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `icon-option-btn ${iconClass === selectedIcon ? 'selected' : ''}`;
        btn.innerHTML = `<i class="bi ${iconClass}"></i>`;
        btn.addEventListener('click', () => {
            renderIconPicker(iconClass);
        });
        grid.appendChild(btn);
    });
}

async function loadPortions() {
    const { data, error } = await supabase
        .from('porcoes')
        .select('*')
        .order('nome', { ascending: true });

    if (error) {
        showFeedback('Erro ao carregar porções.', 'danger');
        return;
    }

    allPortions = data || [];
    renderPortionsAdminList();
    renderMealPortionCheckboxes();
}

function renderPortionsAdminList() {
    const container = document.getElementById('admin-portions-list');
    container.innerHTML = '';

    if (allPortions.length === 0) {
        container.innerHTML = '<p class="text-muted small mb-0">Nenhuma porção cadastrada.</p>';
        return;
    }

    allPortions.forEach(p => {
        const col = document.createElement('div');
        col.className = 'col-12 col-sm-6';
        col.innerHTML = `
            <div class="d-flex align-items-center justify-content-between p-2 px-3 border rounded-3 bg-light">
                <div class="d-flex align-items-center gap-2 text-truncate">
                    <i class="bi ${p.icone} text-ifpi-green fs-5"></i>
                    <span class="fw-medium text-truncate">${escapeHTML(p.nome)}</span>
                </div>
                <div class="d-flex gap-1 flex-shrink-0">
                    <button type="button" class="btn btn-sm btn-outline-secondary btn-edit-portion" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger btn-del-portion" title="Excluir">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;

        col.querySelector('.btn-edit-portion').addEventListener('click', () => startEditPortion(p));
        col.querySelector('.btn-del-portion').addEventListener('click', () => deletePortion(p));
        container.appendChild(col);
    });
}

function startEditPortion(portion) {
    document.getElementById('editing-portion-id').value = portion.id;
    document.getElementById('portion-name').value = portion.nome;
    document.getElementById('portion-form-title').textContent = 'Editar Porção';
    document.getElementById('btn-cancel-edit-portion').classList.remove('d-none');
    renderIconPicker(portion.icone);
}

function resetPortionForm() {
    document.getElementById('portion-form').reset();
    document.getElementById('editing-portion-id').value = '';
    document.getElementById('portion-form-title').textContent = 'Nova Porção';
    document.getElementById('btn-cancel-edit-portion').classList.add('d-none');
    renderIconPicker('bi-egg-fried');
}

document.getElementById('btn-cancel-edit-portion').addEventListener('click', resetPortionForm);

document.getElementById('portion-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editing-portion-id').value;
    const nome = document.getElementById('portion-name').value.trim();
    const icone = document.getElementById('portion-icon').value;

    if (!nome) return;

    let error;
    if (id) {
        ({ error } = await supabase.from('porcoes').update({ nome, icone }).eq('id', id));
    } else {
        ({ error } = await supabase.from('porcoes').insert([{ nome, icone }]));
    }

    if (error) {
        showFeedback('Erro ao salvar porção. Verifique se o nome já existe.', 'danger');
    } else {
        showFeedback(id ? 'Porção atualizada com sucesso!' : 'Nova porção cadastrada!');
        resetPortionForm();
        await loadPortions();
        await loadAdminMeals();
    }
});

async function deletePortion(portion) {
    if (!confirm(`Deseja excluir a porção "${portion.nome}"? Ela também será removida das refeições em que aparece.`)) return;

    const { error } = await supabase.from('porcoes').delete().eq('id', portion.id);
    if (error) {
        showFeedback('Erro ao excluir porção.', 'danger');
    } else {
        showFeedback('Porção excluída.');
        await loadPortions();
        await loadAdminMeals();
    }
}

// ==========================================================================
// 4. GERENCIAMENTO DE REFEIÇÕES (CADASTRAR, EDITAR, EXCLUIR)
// ==========================================================================

function renderMealPortionCheckboxes(selectedIds = []) {
    const container = document.getElementById('meal-portions-selector');
    container.innerHTML = '';

    allPortions.forEach(p => {
        const isChecked = selectedIds.includes(p.id);
        const col = document.createElement('div');
        col.className = 'col-12 col-sm-6';
        col.innerHTML = `
            <label class="w-100 mb-0">
                <input type="checkbox" class="d-none portion-check-input" value="${p.id}" ${isChecked ? 'checked' : ''}>
                <div class="portion-check-card d-flex align-items-center gap-2">
                    <i class="bi ${p.icone} text-ifpi-green"></i>
                    <span class="small text-truncate">${escapeHTML(p.nome)}</span>
                </div>
            </label>
        `;
        col.querySelector('input').addEventListener('change', updateSelectedCountBadge);
        container.appendChild(col);
    });

    updateSelectedCountBadge();
}

function updateSelectedCountBadge() {
    const count = document.querySelectorAll('.portion-check-input:checked').length;
    document.getElementById('selected-count-badge').textContent = `${count} selecionada${count === 1 ? '' : 's'}`;
}

async function loadAdminMeals() {
    const week = getCurrentWeekRange();
    document.getElementById('admin-week-label').textContent = `${week.toBR(week.start)} a ${week.toBR(week.end)}`;

    const { data, error } = await supabase
        .from('refeicoes')
        .select(`
            id,
            data,
            tipo,
            refeicao_porcoes (
                porcao_id,
                porcoes ( id, nome, icone )
            )
        `)
        .gte('data', week.start)
        .lte('data', week.end)
        .order('data', { ascending: true })
        .order('tipo', { ascending: true });

    if (error) {
        showFeedback('Erro ao carregar refeições da semana.', 'danger');
        return;
    }

    const listEl = document.getElementById('admin-meals-list');
    listEl.innerHTML = '';

    if (!data || data.length === 0) {
        listEl.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="bi bi-calendar2-plus fs-2 d-block mb-2"></i>
                Nenhuma refeição cadastrada para a semana vigente.
            </div>
        `;
        return;
    }

    data.forEach(meal => {
        const isAlmoco = meal.tipo === 'almoco';
        const portions = meal.refeicao_porcoes.map(rp => rp.porcoes).filter(Boolean);

        const card = document.createElement('div');
        card.className = 'border rounded-4 p-3 bg-light';
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                <div>
                    <span class="badge ${isAlmoco ? 'bg-ifpi-green' : 'bg-ifpi-dark'} mb-1">
                        <i class="bi ${isAlmoco ? 'bi-brightness-high-fill' : 'bi-moon-stars-fill'} me-1"></i>
                        ${isAlmoco ? 'Almoço' : 'Jantar'}
                    </span>
                    <h3 class="h6 fw-bold mb-0">${formatDateBR(meal.data)}</h3>
                </div>
                <div class="d-flex gap-1">
                    <button type="button" class="btn btn-sm btn-outline-primary btn-edit-meal">
                        <i class="bi bi-pencil-square"></i> Editar
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-danger btn-del-meal">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <div class="d-flex flex-wrap gap-1 mt-2">
                ${portions.map(p => `
                    <span class="badge bg-white text-dark border fw-normal py-1 px-2">
                        <i class="bi ${p.icone} text-ifpi-green me-1"></i>${escapeHTML(p.nome)}
                    </span>
                `).join('')}
            </div>
        `;

        card.querySelector('.btn-edit-meal').addEventListener('click', () => startEditMeal(meal));
        card.querySelector('.btn-del-meal').addEventListener('click', () => deleteMeal(meal));
        listEl.appendChild(card);
    });
}

function startEditMeal(meal) {
    document.getElementById('editing-meal-id').value = meal.id;
    document.getElementById('meal-date').value = meal.data;
    document.getElementById('meal-type').value = meal.tipo;
    document.getElementById('meal-form-title').innerHTML = '<i class="bi bi-pencil-square text-primary me-1"></i> Editando Refeição';
    document.getElementById('btn-cancel-edit-meal').classList.remove('d-none');

    const portionIds = meal.refeicao_porcoes.map(rp => rp.porcao_id);
    renderMealPortionCheckboxes(portionIds);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetMealForm() {
    document.getElementById('meal-form').reset();
    document.getElementById('editing-meal-id').value = '';
    document.getElementById('meal-form-title').innerHTML = '<i class="bi bi-plus-circle-fill text-ifpi-green me-1"></i> Cadastrar / Editar Refeição';
    document.getElementById('btn-cancel-edit-meal').classList.add('d-none');
    renderMealPortionCheckboxes([]);
}

document.getElementById('btn-cancel-edit-meal').addEventListener('click', resetMealForm);

document.getElementById('meal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editingId = document.getElementById('editing-meal-id').value;
    const data = document.getElementById('meal-date').value;
    const tipo = document.getElementById('meal-type').value;
    const selectedPortionIds = Array.from(document.querySelectorAll('.portion-check-input:checked')).map(cb => cb.value);

    if (selectedPortionIds.length === 0) {
        showFeedback('Selecione pelo menos uma porção para esta refeição.', 'warning');
        return;
    }

    const btnSave = document.getElementById('btn-save-meal');
    btnSave.disabled = true;

    try {
        let mealId = editingId;

        if (editingId) {
            // Atualiza data/tipo da refeição existente
            const { error: updateErr } = await supabase
                .from('refeicoes')
                .update({ data, tipo })
                .eq('id', editingId);

            if (updateErr) throw updateErr;

            // Remove associações antigas para inserir as novas
            const { error: delRelErr } = await supabase
                .from('refeicao_porcoes')
                .delete()
                .eq('refeicao_id', editingId);

            if (delRelErr) throw delRelErr;
        } else {
            // Insere nova refeição (ou falha se já existir data + tipo)
            const { data: inserted, error: insertErr } = await supabase
                .from('refeicoes')
                .insert([{ data, tipo }])
                .select('id')
                .single();

            if (insertErr) {
                if (insertErr.code === '23505') {
                    throw new Error('Já existe uma refeição deste tipo cadastrada para esta data. Clique em "Editar" na lista ao lado.');
                }
                throw insertErr;
            }
            mealId = inserted.id;
        }

        // Insere os vínculos na tabela associativa refeicao_porcoes
        const relations = selectedPortionIds.map(porcao_id => ({
            refeicao_id: mealId,
            porcao_id
        }));

        const { error: relErr } = await supabase.from('refeicao_porcoes').insert(relations);
        if (relErr) throw relErr;

        showFeedback(editingId ? 'Refeição atualizada com sucesso!' : 'Refeição cadastrada no cardápio!');
        resetMealForm();
        await loadAdminMeals();

    } catch (err) {
        showFeedback(err.message || 'Erro ao salvar refeição.', 'danger');
    } finally {
        btnSave.disabled = false;
    }
});

async function deleteMeal(meal) {
    const label = `${meal.tipo === 'almoco' ? 'Almoço' : 'Jantar'} de ${formatDateBR(meal.data)}`;
    if (!confirm(`Tem certeza que deseja excluir o ${label}?`)) return;

    const { error } = await supabase.from('refeicoes').delete().eq('id', meal.id);
    if (error) {
        showFeedback('Erro ao excluir refeição.', 'danger');
    } else {
        showFeedback('Refeição removida do cardápio.');
        await loadAdminMeals();
    }
}

// ==========================================================================
// 5. GERENCIAMENTO DE DIAS NÃO LETIVOS
// ==========================================================================

async function loadNonSchoolDays() {
    const { data, error } = await supabase
        .from('dias_nao_letivos')
        .select('*')
        .order('data', { ascending: false });

    if (error) return;

    const listEl = document.getElementById('admin-non-school-list');
    listEl.innerHTML = '';

    if (!data || data.length === 0) {
        listEl.innerHTML = '<p class="text-muted small mb-0">Nenhum dia não letivo registrado.</p>';
        return;
    }

    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'd-flex align-items-center justify-content-between p-3 border rounded-3 bg-light';
        div.innerHTML = `
            <div>
                <strong class="d-block text-dark">${formatDateBR(item.data)}</strong>
                <span class="small text-secondary">${escapeHTML(item.justificativa)}</span>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger">
                <i class="bi bi-trash"></i>
            </button>
        `;
        div.querySelector('button').addEventListener('click', async () => {
            if (!confirm('Remover esta justificativa de dia não letivo?')) return;
            await supabase.from('dias_nao_letivos').delete().eq('data', item.data);
            showFeedback('Registro removido.');
            loadNonSchoolDays();
        });
        listEl.appendChild(div);
    });
}

document.getElementById('non-school-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = document.getElementById('non-school-date').value;
    const justificativa = document.getElementById('non-school-reason').value.trim();

    const { error } = await supabase
        .from('dias_nao_letivos')
        .upsert([{ data, justificativa }], { onConflict: 'data' });

    if (error) {
        showFeedback('Erro ao salvar dia não letivo.', 'danger');
    } else {
        showFeedback('Dia não letivo registrado com sucesso!');
        e.target.reset();
        loadNonSchoolDays();
    }
});

// ==========================================================================
// INICIALIZAÇÃO DO PAINEL
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

    renderIconPicker('bi-egg-fried');
    await loadPortions();
    await loadAdminMeals();
    await loadNonSchoolDays();
});