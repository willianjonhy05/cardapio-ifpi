// ==========================================================================
// LÓGICA DA PÁGINA PÚBLICA - CARDÁPIO REFEITÓRIO IFPI (TERESINA CENTRAL)
// Desenvolvido por: Primeira Classe - Desenvolvimento de Sistemas
// ==========================================================================

import { supabase } from './supabase-config.js';

// Estado global da aplicação pública
let weekDays = [];          // Array com os 5 dias úteis da semana vigente
let selectedDateStr = '';   // Data selecionada no formato 'YYYY-MM-DD'
let weeklyMeals = [];       // Refeições carregadas do Supabase
let nonSchoolDays = {};     // Mapa { 'YYYY-MM-DD': 'Justificativa' }

// Referências do DOM
const statusBanner = document.getElementById('status-banner');
const statusIconBox = document.getElementById('status-icon-box');
const statusBadge = document.getElementById('status-badge');
const statusClock = document.getElementById('status-clock');
const statusMessage = document.getElementById('status-message');

const daysSelector = document.getElementById('days-selector');
const weekRangeLabel = document.getElementById('week-range-label');
const menuLoader = document.getElementById('menu-loader');
const mealsContainer = document.getElementById('meals-container');
const nonSchoolDayAlert = document.getElementById('non-school-day-alert');
const nonSchoolDayReason = document.getElementById('non-school-day-reason');

const almocoList = document.getElementById('almoco-list');
const almocoEmpty = document.getElementById('almoco-empty');
const jantarList = document.getElementById('jantar-list');
const jantarEmpty = document.getElementById('jantar-empty');

const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
const btnShareNative = document.getElementById('btn-share-native');

// ==========================================================================
// 1. UTILITÁRIOS DE DATA E HORA (FUSO HORÁRIO: TERESINA / FORTALEZA - UTC-3)
// ==========================================================================

/**
 * Retorna um objeto Date ajustado para o fuso America/Fortaleza (UTC-3),
 * independente do fuso configurado no dispositivo do usuário.
 */
function getTeresinaNow() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Fortaleza',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(now);
    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });

    return new Date(
        Number(map.year),
        Number(map.month) - 1,
        Number(map.day),
        Number(map.hour),
        Number(map.minute),
        Number(map.second)
    );
}

/**
 * Formata objeto Date local para string 'YYYY-MM-DD'
 */
function formatDateISO(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Formata string 'YYYY-MM-DD' para 'DD/MM'
 */
function formatDayMonth(isoStr) {
    const [, m, d] = isoStr.split('-');
    return `${d}/${m}`;
}

// ==========================================================================
// 2. STATUS EM TEMPO REAL DO REFEITÓRIO (RN01, RN02, RN03)
// ==========================================================================

function updateCafeteriaStatus() {
    const now = getTeresinaNow();
    const dayOfWeek = now.getDay(); // 0 = Dom, 1 = Seg, ..., 5 = Sex, 6 = Sab
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const todayISO = formatDateISO(now);

    // Atualiza relógio discreto no banner
    statusClock.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    const ALMOCO_INICIO = 11 * 60 + 30; // 11h30 (690 min)
    const ALMOCO_FIM    = 13 * 60 + 30; // 13h30 (810 min)
    const JANTAR_INICIO = 17 * 60;      // 17h00 (1020 min)
    const JANTAR_FIM    = 19 * 60;      // 19h00 (1140 min)

    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isNonSchoolToday = Boolean(nonSchoolDays[todayISO]);

    let isOpen = false;
    let badgeText = '';
    let messageText = '';
    let iconClass = 'bi-clock';

    // Se hoje é dia não letivo cadastrado pelo admin
    if (isWeekday && isNonSchoolToday) {
        isOpen = false;
        badgeText = 'Fechado Hoje';
        messageText = `Dia não letivo (${nonSchoolDays[todayISO]}). Próxima refeição no próximo dia útil às 11h30.`;
        iconClass = 'bi-calendar-x';
    }
    // Dia útil normal (Segunda a Sexta)
    else if (isWeekday) {
        if (totalMinutes >= ALMOCO_INICIO && totalMinutes < ALMOCO_FIM) {
            isOpen = true;
            badgeText = 'Aberto Agora';
            messageText = 'Servindo: Almoço (encerra às 13h30)';
            iconClass = 'bi-brightness-high-fill';
        } else if (totalMinutes >= JANTAR_INICIO && totalMinutes < JANTAR_FIM) {
            isOpen = true;
            badgeText = 'Aberto Agora';
            messageText = 'Servindo: Jantar (encerra às 19h00)';
            iconClass = 'bi-moon-stars-fill';
        } else if (totalMinutes < ALMOCO_INICIO) {
            isOpen = false;
            badgeText = 'Fechado no Momento';
            messageText = 'Próxima refeição: Almoço hoje às 11h30';
            iconClass = 'bi-hourglass-split';
        } else if (totalMinutes >= ALMOCO_FIM && totalMinutes < JANTAR_INICIO) {
            isOpen = false;
            badgeText = 'Fechado no Momento';
            messageText = 'Próxima refeição: Jantar hoje às 17h00';
            iconClass = 'bi-hourglass-split';
        } else {
            // Após 19h00
            isOpen = false;
            badgeText = 'Fechado no Momento';
            if (dayOfWeek === 5) {
                messageText = 'Próxima refeição: Almoço na segunda-feira às 11h30';
            } else {
                messageText = 'Próxima refeição: Almoço amanhã às 11h30';
            }
            iconClass = 'bi-moon';
        }
    }
    // Sábado (6) ou Domingo (0)
    else {
        isOpen = false;
        badgeText = 'Fechado (Fim de Semana)';
        messageText = 'Próxima refeição: Almoço na segunda-feira às 11h30';
        iconClass = 'bi-calendar2-week';
    }

    // Aplica classes visuais no DOM
    statusBanner.classList.remove('status-loading', 'status-open', 'status-closed');
    statusBanner.classList.add(isOpen ? 'status-open' : 'status-closed');
    statusBadge.textContent = badgeText;
    statusMessage.textContent = messageText;
    statusIconBox.innerHTML = `<i class="bi ${iconClass} fs-4"></i>`;
}

// ==========================================================================
// 3. CÁLCULO DA SEMANA VIGENTE (SEGUNDA A SEXTA - SEM HISTÓRICO)
// ==========================================================================

function generateCurrentWeekDays() {
    const now = getTeresinaNow();
    const dayOfWeek = now.getDay(); // 0=Dom, 1=Seg ... 6=Sab

    // Calcula a segunda-feira da semana atual
    // Se for domingo (0), volta 6 dias; caso contrário, volta (dayOfWeek - 1) dias
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);

    const shortNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
    const fullNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

    weekDays = [];
    for (let i = 0; i < 5; i++) {
        const current = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        const iso = formatDateISO(current);
        weekDays.push({
            iso,
            shortName: shortNames[i],
            fullName: fullNames[i],
            dayMonth: formatDayMonth(iso)
        });
    }

    // Exibe o intervalo da semana no cabeçalho da seção (Ex: 23/11 a 27/11)
    weekRangeLabel.textContent = `${weekDays[0].dayMonth} a ${weekDays[4].dayMonth}`;

    // Define qual dia vem selecionado por padrão:
    // Se hoje estiver entre Seg e Sex, seleciona hoje; se for fim de semana, seleciona Segunda.
    const todayISO = formatDateISO(now);
    const foundToday = weekDays.find(d => d.iso === todayISO);
    selectedDateStr = foundToday ? foundToday.iso : weekDays[0].iso;

    renderDayButtons();
}

function renderDayButtons() {
    const todayISO = formatDateISO(getTeresinaNow());
    daysSelector.innerHTML = '';

    weekDays.forEach(day => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'day-btn';
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', day.iso === selectedDateStr ? 'true' : 'false');

        if (day.iso === selectedDateStr) btn.classList.add('active');
        if (day.iso === todayISO) btn.classList.add('is-today');

        btn.innerHTML = `
            <span class="day-name">${day.shortName}</span>
            <span class="day-date">${day.dayMonth}</span>
        `;

        btn.addEventListener('click', () => {
            selectedDateStr = day.iso;
            renderDayButtons();
            renderMealsForSelectedDay();
        });

        daysSelector.appendChild(btn);
    });
}

// ==========================================================================
// 4. BUSCA DE DADOS NO SUPABASE (APENAS SEMANA VIGENTE)
// ==========================================================================

async function loadWeeklyData() {
    const startDate = weekDays[0].iso;
    const endDate = weekDays[4].iso;

    try {
        // Executa as duas consultas em paralelo para máxima velocidade
        const [mealsResponse, nonSchoolResponse] = await Promise.all([
            supabase
                .from('refeicoes')
                .select(`
                    id,
                    data,
                    tipo,
                    refeicao_porcoes (
                        porcoes (
                            id,
                            nome,
                            icone
                        )
                    )
                `)
                .gte('data', startDate)
                .lte('data', endDate),

            supabase
                .from('dias_nao_letivos')
                .select('data, justificativa')
                .gte('data', startDate)
                .lte('data', endDate)
        ]);

        if (mealsResponse.error) throw mealsResponse.error;
        if (nonSchoolResponse.error) throw nonSchoolResponse.error;

        weeklyMeals = mealsResponse.data || [];

        nonSchoolDays = {};
        (nonSchoolResponse.data || []).forEach(item => {
            nonSchoolDays[item.data] = item.justificativa;
        });

        // Atualiza status (caso hoje seja um dia não letivo) e renderiza o dia
        updateCafeteriaStatus();
        renderMealsForSelectedDay();

    } catch (error) {
        console.error('Erro ao carregar cardápio do Supabase:', error);
        menuLoader.innerHTML = `
            <div class="alert alert-danger rounded-4 shadow-sm">
                <i class="bi bi-wifi-off fs-4 d-block mb-1"></i>
                Não foi possível carregar o cardápio agora. Verifique sua conexão e tente novamente.
            </div>
        `;
    }
}

// ==========================================================================
// 5. RENDERIZAÇÃO DO CARDÁPIO DO DIA SELECIONADO
// ==========================================================================

function renderMealsForSelectedDay() {
    menuLoader.classList.add('d-none');

    // Verifica se a data selecionada é um Dia Não Letivo cadastrado
    if (nonSchoolDays[selectedDateStr]) {
        mealsContainer.classList.add('d-none');
        nonSchoolDayAlert.classList.remove('d-none');
        nonSchoolDayReason.textContent = `Motivo: ${nonSchoolDays[selectedDateStr]}`;
        return;
    }

    // Caso contrário, oculta o alerta de dia não letivo e mostra os cards
    nonSchoolDayAlert.classList.add('d-none');
    mealsContainer.classList.remove('d-none');

    const almocoData = weeklyMeals.find(m => m.data === selectedDateStr && m.tipo === 'almoco');
    const jantarData = weeklyMeals.find(m => m.data === selectedDateStr && m.tipo === 'jantar');

    renderSingleMealCard(almocoData, almocoList, almocoEmpty);
    renderSingleMealCard(jantarData, jantarList, jantarEmpty);
}

function renderSingleMealCard(mealRecord, listElement, emptyElement) {
    listElement.innerHTML = '';

    // Extrai as porções da relação aninhada
    const portions = mealRecord?.refeicao_porcoes
        ?.map(rp => rp.porcoes)
        .filter(Boolean) || [];

    if (portions.length === 0) {
        listElement.classList.add('d-none');
        emptyElement.classList.remove('d-none');
        return;
    }

    emptyElement.classList.add('d-none');
    listElement.classList.remove('d-none');

    portions.forEach(portion => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="portion-icon-wrapper">
                <i class="bi ${portion.icone || 'bi-check2-circle'}"></i>
            </div>
            <span>${escapeHTML(portion.nome)}</span>
        `;
        listElement.appendChild(li);
    });
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ==========================================================================
// 6. COMPARTILHAMENTO SOCIAL (WHATSAPP E WEB SHARE API)
// ==========================================================================

function buildShareText() {
    const dayObj = weekDays.find(d => d.iso === selectedDateStr);
    const header = `🍽️ *Cardápio Refeitório IFPI – Campus Teresina Central*\n📅 *${dayObj.fullName} (${dayObj.dayMonth})*\n\n`;

    if (nonSchoolDays[selectedDateStr]) {
        return `${header}⚠️ *Dia Não Letivo:* ${nonSchoolDays[selectedDateStr]}\n\nConfira em: ${window.location.href}`;
    }

    const almoco = weeklyMeals.find(m => m.data === selectedDateStr && m.tipo === 'almoco');
    const jantar = weeklyMeals.find(m => m.data === selectedDateStr && m.tipo === 'jantar');

    const almocoItens = almoco?.refeicao_porcoes?.map(rp => `• ${rp.porcoes.nome}`).join('\n') || '_Não há refeição cadastrada_';
    const jantarItens = jantar?.refeicao_porcoes?.map(rp => `• ${rp.porcoes.nome}`).join('\n') || '_Não há refeição cadastrada_';

    return `${header}☀️ *Almoço (11h30 às 13h30):*\n${almocoItens}\n\n🌙 *Jantar (17h00 às 19h00):*\n${jantarItens}\n\n📲 Acesse o cardápio completo: ${window.location.href}`;
}

btnShareWhatsapp.addEventListener('click', () => {
    const text = encodeURIComponent(buildShareText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
});

btnShareNative.addEventListener('click', async () => {
    const shareData = {
        title: 'Cardápio Refeitório IFPI - Teresina Central',
        text: buildShareText(),
        url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            // Usuário cancelou o compartilhamento
        }
    } else {
        // Fallback para desktop: copia o link para a área de transferência
        await navigator.clipboard.writeText(window.location.href);
        const originalHTML = btnShareNative.innerHTML;
        btnShareNative.innerHTML = '<i class="bi bi-check2 text-success"></i> Link Copiado!';
        setTimeout(() => {
            btnShareNative.innerHTML = originalHTML;
        }, 2500);
    }
});

// ==========================================================================
// 7. INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    generateCurrentWeekDays();
    updateCafeteriaStatus();
    loadWeeklyData();

    // Atualiza o relógio e o status aberto/fechado a cada 30 segundos
    setInterval(updateCafeteriaStatus, 30000);
});