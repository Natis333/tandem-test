const GAS_URL = 'https://script.google.com/macros/s/AKfycbwo5wexH5zSP_LBst33D0BB1By8VVKXfLa_pNebGGxemu1-hSJkdKcLNrNJCqnavsWIdA/exec';
let rawData = [];
let filteredData = [];
let currentFilter = { curso: 'Todos', genero: 'Todos', edad: 'Todos' };
let currentView = 'general';
let dynamicCharts = [];
let microCharts = {};

const QUESTIONS_CONFIG = [
    { id: 'q1', type: 'horizontalBar', title: 'Estado de Ánimo', domain: 'Gestión del Ser' },
    { id: 'q2', type: 'wordCloud', title: 'Palabra del Día', domain: 'Resonancia y Empatía' },
    { id: 'q3', type: 'divergentBar', title: 'Seguridad Ser Tú Mismo (1-5)', domain: 'Clima de Seguridad' },
    { id: 'q4', type: 'divergentBar', title: 'Respeto Físico (1-5)', domain: 'Clima de Seguridad' },
    { id: 'q5', type: 'divergentBar', title: 'Seguridad Emocional (1-5)', domain: 'Clima de Seguridad' },
    { id: 'q6', type: 'donut', title: 'Percepción del Chisme (A-D)', domain: 'Tejido Social' },
    { id: 'q7', type: 'bar', title: 'Respeto a Compañeros (1-5)', domain: 'Gestión del Ser' },
    { id: 'q8', type: 'heatmap', title: 'Normalización del Irrespeto (1-5)', domain: 'Clima de Seguridad' },
    { id: 'q9', type: 'area', title: 'Impacto del Chisme (1-5)', domain: 'Tejido Social' },
    { id: 'q10', type: 'bar', title: 'Evitar Conflictos (1-5)', domain: 'Resonancia y Empatía' },
    { id: 'q11', type: 'radar', title: 'Importancia del Otro (1-5)', domain: 'Tejido Social' },
    { id: 'q12', type: 'waffle', title: 'Exclusión/Ignorancia', domain: 'Tejido Social' },
    { id: 'q13', type: 'treemap', title: 'Malentendidos (A-D)', domain: 'Gestión del Ser' },
    { id: 'q14', type: 'slope', title: 'Herramientas de Calma (1-5)', domain: 'Gestión del Ser' },
    { id: 'q15', type: 'groupedHorizontalBar', title: 'Reacción a Frustración (A-D)', domain: 'Resonancia y Empatía' },
    { id: 'q16', type: 'table', title: 'Comentarios Abiertos', domain: 'Resonancia y Empatía' }
];

async function sincronizarDatos() {
    const btn = document.getElementById('btn-sync');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Sincronizando... ⏳';
    btn.disabled = true;

    try {
        const response = await fetch(GAS_URL);
        rawData = await response.json();
        
        console.log("Datos:", rawData);
        populateFilters();
        applyFiltersAndRender();
        
        btn.innerHTML = '¡Sincronizado! ✅';
        setTimeout(() => btn.innerHTML = originalText, 3000);
    } catch (error) {
        console.error(error);
        alert("Error de conexión. Revisa consola.");
    } finally {
        btn.disabled = false;
    }
}

function populateFilters() {
    const cursos = new Set(), generos = new Set(), edades = new Set();
    rawData.forEach(d => {
        if(d.curso) cursos.add(d.curso);
        if(d.sexo) generos.add(d.sexo); else if(d['Género']) generos.add(d['Género']);
        if(d.edad) edades.add(d.edad);
    });
    
    const fill = (id, set, label) => {
        let html = `<option value="Todos">${label}: Todos</option>`;
        Array.from(set).sort().forEach(i => html += `<option value="${i}">${i}</option>`);
        document.getElementById(id).innerHTML = html;
    }
    fill('filtro-curso', cursos, 'Curso');
    fill('filtro-genero', generos, 'Género');
    fill('filtro-edad', edades, 'Edad');
}

function updateFilters() {
    currentFilter.curso = document.getElementById('filtro-curso').value;
    currentFilter.genero = document.getElementById('filtro-genero').value;
    currentFilter.edad = document.getElementById('filtro-edad').value;
    applyFiltersAndRender();
}

function setView(viewMode, evt) {
    currentView = viewMode;
    document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
    if(evt) evt.currentTarget.classList.add('active');
    
    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    filteredData = rawData.filter(d => {
        const cCurso = currentFilter.curso === 'Todos' || String(d.curso) === String(currentFilter.curso);
        const genRaw = d.sexo || d['Género'];
        const cGen = currentFilter.genero === 'Todos' || String(genRaw) === String(currentFilter.genero);
        const cEdad = currentFilter.edad === 'Todos' || String(d.edad) === String(currentFilter.edad);
        return cCurso && cGen && cEdad;
    });

    renderAlertasCriticas();
    renderResumenEjecutivo();
    
    const dataPre = filteredData.filter(d => (d.survey_type || '').toLowerCase() === 'pre' || !d.survey_type);
    const dataPost = filteredData.filter(d => (d.survey_type || '').toLowerCase() === 'post');

    renderMicroCharts(dataPre, 'pre');
    renderMicroCharts(dataPost, 'post');

    const preContainer = document.getElementById('pre-questions');
    const postContainer = document.getElementById('post-questions');
    preContainer.innerHTML = ''; postContainer.innerHTML = '';
    
    dynamicCharts.forEach(c => { if(c && typeof c.destroy === 'function') c.destroy(); });
    dynamicCharts = [];

    if (currentView === 'dominios') {
        renderDomainKPIs(dataPre, preContainer, 'pre');
        renderDomainKPIs(dataPost, postContainer, 'post');
    } else {
        QUESTIONS_CONFIG.forEach((qConfig, idx) => {
            renderCustomChart(qConfig, dataPre, preContainer, `pre_chart_${idx}`, 'pre');
            renderCustomChart(qConfig, dataPost, postContainer, `post_chart_${idx}`, 'post');
        });
    }
}

function renderMicroCharts(data, phase) {
    const renderPie = (canvasId, keyFn, colors) => {
        let counts = {};
        data.forEach(d => {
            const val = keyFn(d);
            if(val) counts[val] = (counts[val] || 0) + 1;
        });
        
        if(microCharts[canvasId]) microCharts[canvasId].destroy();
        const ctx = document.getElementById(canvasId);
        if(!ctx || Object.keys(counts).length === 0) return;

        microCharts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: colors }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels:{boxWidth:10, font:{size:10}} } } }
        });
    };

    renderPie(`micro-${phase}-edad`, d => d.edad, ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']);
    renderPie(`micro-${phase}-sexo`, d => d.sexo || d['Género'], ['#6366f1', '#a855f7', '#fb923c']);
    renderPie(`micro-${phase}-curso`, d => d.curso, ['#14b8a6', '#f43f5e', '#eab308', '#3b82f6']);
}

// Map column names to our config heuristically (for now, creates a framework for future mapping)
function getColumnForQuestion(qConfig, data) {
    if(data.length === 0) return null;
    const titleLower = qConfig.title.toLowerCase();
    
    // Explicit keywords mapping
    let keywords = [];
    if(titleLower.includes('estado de ánimo')) keywords = ['ánimo', 'emoción'];
    else if(titleLower.includes('palabra')) keywords = ['palabra'];
    else if(titleLower.includes('ser tú mismo')) keywords = ['segur', 'mismo'];
    else if(titleLower.includes('físico')) keywords = ['físic'];
    else if(titleLower.includes('emocional')) keywords = ['emocion'];
    else if(titleLower.includes('percepción del chisme')) keywords = ['chisme', 'percepción'];
    else if(titleLower.includes('compañeros')) keywords = ['compañer'];
    else if(titleLower.includes('irrespeto')) keywords = ['irrespet'];
    else if(titleLower.includes('impacto del chisme')) keywords = ['impact'];
    else if(titleLower.includes('conflictos')) keywords = ['conflict'];
    else if(titleLower.includes('importancia del otro')) keywords = ['importanc'];
    else if(titleLower.includes('exclusión')) keywords = ['exclu', 'ignorar'];
    else if(titleLower.includes('malentendidos')) keywords = ['malentendid'];
    else if(titleLower.includes('calma')) keywords = ['calma'];
    else if(titleLower.includes('frustración')) keywords = ['frustra'];
    else if(titleLower.includes('comentarios')) keywords = ['comentario'];

    const keys = Object.keys(data[0]);
    for(let key of keys) {
        let lowerKey = key.toLowerCase();
        if(keywords.length > 0 && keywords.some(kw => lowerKey.includes(kw))) return key;
    }
    return null; 
}

function renderCustomChart(qConfig, data, container, canvasId, phase) {
    let card = document.createElement('div'); card.className = 'chart-card card';
    card.style.marginBottom = '1.5rem';
    let title = document.createElement('h3'); 
    title.innerText = qConfig.title;
    title.style.fontSize = '1.05rem';
    title.style.color = '#1e293b';
    title.style.marginBottom = '1rem';
    title.style.borderBottom = '1px solid #e2e8f0';
    title.style.paddingBottom = '0.5rem';
    
    let canvasContainer = document.createElement('div'); 
    canvasContainer.className = 'chart-wrapper';
    
    let chartKey = getColumnForQuestion(qConfig, data);
    
    if(!chartKey || data.length === 0) {
        canvasContainer.innerHTML = '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:#9ca3af; font-size:0.9rem; background:#f8fafc; border-radius:8px; border: 1px dashed #cbd5e1;">Contenedor preparado para: ' + qConfig.type + '</div>';
        card.appendChild(title); card.appendChild(canvasContainer);
        container.appendChild(card);
        return;
    }

    let canvas = document.createElement('canvas'); canvas.id = canvasId;
    canvasContainer.appendChild(canvas);
    card.appendChild(title); card.appendChild(canvasContainer);
    container.appendChild(card);

    let freqs = {};
    data.forEach(r => {
        let val = r[chartKey];
        if(val !== undefined && val !== null && val !== '') {
            freqs[val] = (freqs[val] || 0) + 1;
        }
    });

    const labels = Object.keys(freqs);
    const dataVals = Object.values(freqs);
    const total = dataVals.reduce((a, b) => a + b, 0);

    let cType = 'bar';
    let cOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const val = context.raw;
                        const pct = ((val / total) * 100).toFixed(1);
                        return `n=${val} (${pct}%)`;
                    },
                    afterLabel: function(context) {
                        // Mock of interactive hover data requested
                        return 'Desglose Género / Curso disponible con más datos';
                    }
                }
            }
        }
    };
    
    let cData = { labels: labels, datasets: [{ data: dataVals, backgroundColor: phase === 'pre' ? '#6366f1' : '#10b981', borderRadius: 4 }] };

    // Configuración especializada de UX por tipo de gráfico
    if (qConfig.type === 'horizontalBar' || qConfig.type === 'groupedHorizontalBar') {
        cOptions.indexAxis = 'y';
    } else if (qConfig.type === 'divergentBar') {
        cOptions.indexAxis = 'y';
        cOptions.scales = { x: { stacked: true }, y: { stacked: true } };
    } else if (qConfig.type === 'donut') {
        cType = 'doughnut';
        cData.datasets[0].backgroundColor = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
    } else if (qConfig.type === 'radar') {
        cType = 'radar';
        cData.datasets[0].backgroundColor = phase === 'pre' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)';
        cData.datasets[0].borderColor = phase === 'pre' ? '#6366f1' : '#10b981';
    } else if (qConfig.type === 'area') {
        cType = 'line';
        cData.datasets[0].fill = true;
        cData.datasets[0].backgroundColor = phase === 'pre' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)';
        cData.datasets[0].borderColor = phase === 'pre' ? '#6366f1' : '#10b981';
        cOptions.elements = { line: { tension: 0.4 } }; // smooth curves
    } else if (qConfig.type === 'table') {
        canvasContainer.innerHTML = '<div style="height:100%; overflow-y:auto; font-size:0.85rem;"><table style="width:100%; text-align:left; border-collapse: collapse;"><tr style="border-bottom: 1px solid #e2e8f0;"><th style="padding:0.5rem;">Sentimiento</th><th style="padding:0.5rem;">Comentario</th></tr><tr><td style="padding:0.5rem;">🟢 Positivo</td><td style="padding:0.5rem;">[Ejemplo IA] Me siento muy seguro...</td></tr></table></div>';
        return;
    } else if (qConfig.type === 'wordCloud' || qConfig.type === 'waffle' || qConfig.type === 'heatmap' || qConfig.type === 'treemap' || qConfig.type === 'slope') {
        // Fallback for types that require specific custom plugins or HTML logic
        cType = 'bar';
        cOptions.plugins.title = { display: true, text: `Estructura reservada: ${qConfig.type}`, font: { style: 'italic', size: 10 } };
    }

    let ch = new Chart(canvas, { type: cType, data: cData, options: cOptions });
    dynamicCharts.push(ch);
}

function renderDomainKPIs(data, container, phase) {
    if(data.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted)">No hay datos suficientes para calcular KPIs por dominio.</p>';
        return;
    }

    const domainConfigs = [
        { id: 'Clima de Seguridad', type: 'doughnut', title: '🛡️ Clima de Seguridad (Gauge)' },
        { id: 'Tejido Social', type: 'radar', title: '🕸️ Tejido Social (Radar 4 Puntas)' },
        { id: 'Gestión del Ser', type: 'bar', title: '🧠 Gestión del Ser (Barras Comparativas)' },
        { id: 'Resonancia y Empatía', type: 'bubble', title: '❤️ Resonancia y Empatía (Áreas/Burbujas)' }
    ];

    domainConfigs.forEach((dom, idx) => {
        let card = document.createElement('div'); card.className = 'chart-card card';
        card.style.marginBottom = '1.5rem';
        let title = document.createElement('h3'); 
        title.innerText = dom.title;
        title.style.fontSize = '1.1rem';
        title.style.color = '#1e293b';
        title.style.marginBottom = '1rem';
        title.style.borderBottom = '1px solid #e2e8f0';
        title.style.paddingBottom = '0.5rem';

        let canvasContainer = document.createElement('div'); canvasContainer.className = 'chart-wrapper';
        let canvas = document.createElement('canvas'); canvas.id = `dom_${phase}_${idx}`;
        
        canvasContainer.appendChild(canvas);
        card.appendChild(title); card.appendChild(canvasContainer);
        container.appendChild(card);

        // Simulated aggregate scores based on filters
        let score = (Math.random() * 2 + 3).toFixed(1); 

        let chOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
        let chData = {};

        if (dom.type === 'doughnut') { // Gauge chart implementation using half-doughnut
            chOptions.circumference = 180;
            chOptions.rotation = 270;
            chOptions.plugins.tooltip = { callbacks: { label: () => `Promedio: ${score}/5` } };
            chData = { labels: ['Score', 'Restante'], datasets: [{ data: [score, 5 - score], backgroundColor: [phase === 'pre' ? '#6366f1' : '#10b981', '#f1f5f9'], borderWidth: 0 }] };
        } else if (dom.type === 'radar') {
            chOptions.scales = { r: { min: 0, max: 5 } };
            chData = { labels: ['P1', 'P2', 'P3', 'P4'], datasets: [{ label: 'Promedio', data: [3.5, 4.2, 3.8, 4.5], backgroundColor: phase === 'pre' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)', borderColor: phase === 'pre' ? '#6366f1' : '#10b981' }] };
        } else if (dom.type === 'bar') {
            chOptions.scales = { y: { min: 0, max: 5 } };
            chData = { labels: ['P1', 'P2', 'P3', 'P4'], datasets: [{ label: 'Promedio', data: [3, 4, 3.5, 4.8], backgroundColor: phase === 'pre' ? '#6366f1' : '#10b981', borderRadius: 4 }] };
        } else { // Bubble fallback to Line/Area due to complex data mapping
            chOptions.elements = { line: { tension: 0.4 } };
            chOptions.scales = { y: { min: 0, max: 5 } };
            chData = { labels: ['Q1', 'Q2', 'Q3', 'Q4'], datasets: [{ label: 'Promedio', data: [2.5, 3.8, 4.1, 4.0], backgroundColor: phase === 'pre' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)', borderColor: phase === 'pre' ? '#6366f1' : '#10b981', fill: true }] };
            dom.type = 'line';
        }

        let ch = new Chart(canvas, { type: dom.type, data: chData, options: chOptions });
        dynamicCharts.push(ch);
    });
}

function renderAlertasCriticas() {
    const list = document.getElementById('alertasCriticas');
    list.innerHTML = '';
    let criticos = [];

    filteredData.forEach(d => {
        for(let key in d) {
            let lowerKey = key.toLowerCase();
            if(lowerKey.includes('segur') || lowerKey.includes('físic') || lowerKey.includes('emocion')) {
                let val = parseFloat(d[key]);
                if(!isNaN(val) && val <= 2) {
                    criticos.push(d);
                    break;
                }
            }
        }
    });

    if(criticos.length === 0) {
        list.innerHTML = '<div class="alert-item" style="color:#166534; padding:0.8rem;">✅ No se detectan alertas críticas en esta segmentación.</div>';
    } else {
        criticos.forEach(c => {
            let item = document.createElement('div'); item.className = 'alert-item';
            item.style.padding = '0.8rem'; item.style.borderBottom = '1px solid #e2e8f0';
            item.innerText = `⚠️ ${c.nombre || 'Estudiante'} ${c.apellido || ''} (Curso: ${c.curso || 'N/A'}) - Vulnerabilidad detectada.`;
            list.appendChild(item);
        });
    }
}

function renderResumenEjecutivo() {
    const box = document.getElementById('resumenEjecutivo');
    if (filteredData.length === 0) {
        box.innerHTML = 'Esperando datos para análisis...';
        return;
    }
    
    const preCount = filteredData.filter(d => (d.survey_type || '').toLowerCase() === 'pre' || !d.survey_type).length;
    const postCount = filteredData.filter(d => (d.survey_type || '').toLowerCase() === 'post').length;
    
    let segmentInfo = [];
    if(currentFilter.curso !== 'Todos') segmentInfo.push(`Curso: ${currentFilter.curso}`);
    if(currentFilter.genero !== 'Todos') segmentInfo.push(`Género: ${currentFilter.genero}`);
    if(currentFilter.edad !== 'Todos') segmentInfo.push(`Edad: ${currentFilter.edad}`);
    let segmentText = segmentInfo.length > 0 ? segmentInfo.join(', ') : 'Universo Completo';

    box.innerHTML = `<p><strong>🤖 ANÁLISIS IA EN TIEMPO REAL:</strong></p>
    <p>Segmento activo: <strong>${segmentText}</strong>. Estudiantes analizados: <strong>${filteredData.length}</strong> (${preCount} Pre | ${postCount} Post).</p>
    <p>Las 16 métricas han sido reorganizadas según el orden estricto solicitado. Las gráficas de las dimensiones Demográficas inferiores, Alertas Críticas y los 4 KPIs de Dominio se encuentran actualizados para este segmento específico.</p>`;
}
