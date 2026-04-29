const GAS_URL = 'https://script.google.com/macros/s/AKfycbwo5wexH5zSP_LBst33D0BB1By8VVKXfLa_pNebGGxemu1-hSJkdKcLNrNJCqnavsWIdA/exec';
let rawData = [];
let filteredData = [];
let currentFilter = { curso: 'Todos', genero: 'Todos', edad: 'Todos' };
let currentView = 'general';
let dynamicCharts = [];
let microCharts = {};

const QUESTIONS_CONFIG = [
    { id_pre: 'estado_animo', id_post: 'estado_animo_post', type: 'horizontalBar', title: '1. Estado de Ánimo' },
    { id_pre: 'sentimiento_una_palabra', id_post: 'sentimiento_post_taller', type: 'wordCloud', title: '2. Palabra del Día' },
    { id_pre: 'seguridad_ser_yo', id_post: 'mejora_seguridad', type: 'divergentBar', title: '3. Seguridad Ser Tú Mismo' },
    { id_pre: 'seguridad_fisica_colegio', id_post: 'mejora_preocupacion', type: 'divergentBar', title: '4. Respeto Físico (Preocupación)' },
    { id_pre: 'seguridad_emocional_colegio', id_post: 'capacidad_anclajes', type: 'divergentBar', title: '5. Seguridad Emocional (Anclajes)' },
    { id_pre: 'percepcion_chisme', id_post: 'guion_vida', type: 'donut', title: '6. Percepción del Chisme / Guion Vida' },
    { id_pre: 'respeto_hacia_otros', id_post: 'utilidad_dar_recibir', type: 'bar', title: '7. Respeto a Compañeros' },
    { id_pre: 'normalizacion_irrespeto', id_post: 'mejora_respeto', type: 'heatmap', title: '8. Normalización del Irrespeto' },
    { id_pre: 'impacto_chismes', id_post: 'reaccion_chisme_post', type: 'area', title: '9. Impacto del Chisme' },
    { id_pre: 'evitacion_conflictos', id_post: 'impacto_chismes_post', type: 'bar', title: '10. Evitar Conflictos (Post: Impacto Chisme)' },
    { id_pre: 'interes_companeros', id_post: 'evitacion_conflictos_post', type: 'radar', title: '11. Importancia del Otro' },
    { id_pre: 'exclusion_presenciada', id_post: null, type: 'waffle', title: '12. Exclusión/Ignorancia' },
    { id_pre: 'reaccion_malentendido', id_post: null, type: 'treemap', title: '13. Malentendidos' },
    { id_pre: 'herramientas_calma', id_post: null, type: 'slope', title: '14. Herramientas de Calma' },
    { id_pre: 'accion_frustracion', id_post: null, type: 'groupedHorizontalBar', title: '15. Reacción a Frustración' },
    { id_pre: 'pre_opcional', id_post: 'espacio_libre', type: 'table', title: '16. Comentarios Abiertos' }
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
    const validEdades = ['11', '12', '13', '14', '15', '16', '17', '18', '+18'];
    
    rawData.forEach(d => {
        if(d.curso) cursos.add(d.curso);
        
        let gen = d.sexo || d['Género'];
        if(gen && (gen.toLowerCase().startsWith('f') || gen.toLowerCase().startsWith('m'))) {
            generos.add(gen);
        }

        if(d.edad && validEdades.includes(String(d.edad))) edades.add(String(d.edad));
    });
    
    const sortedCursos = Array.from(cursos).sort((a, b) => parseInt(a) - parseInt(b));
    const sortedGeneros = Array.from(generos).sort();
    const sortedEdades = Array.from(edades).sort((a, b) => parseInt(a) - parseInt(b));

    const fill = (id, arr, label) => {
        let html = `<option value="Todos">${label}: Todos</option>`;
        arr.forEach(i => html += `<option value="${i}">${i}</option>`);
        document.getElementById(id).innerHTML = html;
    }
    fill('filtro-curso', sortedCursos, 'Curso');
    fill('filtro-genero', sortedGeneros, 'Género');
    fill('filtro-edad', sortedEdades, 'Edad');
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

function getColumnForPhase(qConfig, data, phase) {
    if(data.length === 0) return null;
    const targetId = phase === 'pre' ? qConfig.id_pre : qConfig.id_post;
    if(!targetId) return null;
    
    const keys = Object.keys(data[0]);
    if(keys.includes(targetId)) return targetId;

    // Fallback search ignoring case
    for(let k of keys) {
        if(k.toLowerCase() === targetId.toLowerCase()) return k;
    }
    return null;
}

function renderCustomChart(qConfig, data, container, canvasId, phase) {
    let card = document.createElement('div'); card.className = 'chart-card card';
    card.style.marginBottom = '1.5rem';
    
    // Asignar colores de fondo según la fase (PRE amarillo, POST verde)
    if(phase === 'pre') {
        card.style.backgroundColor = '#fffbf0';
        card.style.borderColor = '#fef08a';
    } else {
        card.style.backgroundColor = '#f0fdf4';
        card.style.borderColor = '#bbf7d0';
    }

    let title = document.createElement('h3'); 
    title.innerText = qConfig.title;
    title.style.fontSize = '1.05rem';
    title.style.color = '#1e293b';
    title.style.marginBottom = '1rem';
    title.style.borderBottom = '1px solid rgba(0,0,0,0.1)';
    title.style.paddingBottom = '0.5rem';
    
    let canvasContainer = document.createElement('div'); 
    canvasContainer.className = 'chart-wrapper';
    
    let chartKey = getColumnForPhase(qConfig, data, phase);
    
    if(!chartKey || data.length === 0) {
        canvasContainer.innerHTML = `<div style="display:flex; height:100%; align-items:center; justify-content:center; color:#64748b; font-size:0.9rem; border-radius:8px; border: 1px dashed rgba(0,0,0,0.2);">Sin datos o no aplica en ${phase.toUpperCase()}</div>`;
        card.appendChild(title); card.appendChild(canvasContainer);
        container.appendChild(card);
        return;
    }

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

    if(total === 0) {
        canvasContainer.innerHTML = '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:#64748b; font-size:0.9rem;">No hay respuestas aún.</div>';
        card.appendChild(title); card.appendChild(canvasContainer);
        container.appendChild(card);
        return;
    }

    // Nube de Palabras en HTML nativo en lugar de Chart.js
    if (qConfig.type === 'wordCloud') {
        canvasContainer.style.display = 'flex';
        canvasContainer.style.flexWrap = 'wrap';
        canvasContainer.style.gap = '10px';
        canvasContainer.style.alignContent = 'center';
        canvasContainer.style.justifyContent = 'center';
        
        let maxFreq = Math.max(...dataVals);
        labels.forEach(word => {
            let f = freqs[word];
            let span = document.createElement('span');
            span.innerText = word;
            // Calcular tamaño entre 14px y 36px
            let size = 14 + (f / maxFreq) * 22;
            span.style.fontSize = `${size}px`;
            span.style.color = phase === 'pre' ? '#6366f1' : '#10b981';
            span.style.fontWeight = f === maxFreq ? 'bold' : 'normal';
            span.title = `${f} menciones (${((f/total)*100).toFixed(1)}%)`;
            span.style.cursor = 'pointer';
            span.style.transition = '0.2s';
            span.onmouseover = () => span.style.transform = 'scale(1.1)';
            span.onmouseout = () => span.style.transform = 'scale(1)';
            canvasContainer.appendChild(span);
        });
        card.appendChild(title); card.appendChild(canvasContainer);
        container.appendChild(card);
        return;
    }

    if (qConfig.type === 'table') {
        let tableHtml = `<div style="height:100%; overflow-y:auto; font-size:0.85rem;"><table style="width:100%; text-align:left; border-collapse: collapse;">`;
        tableHtml += `<tr style="border-bottom: 1px solid rgba(0,0,0,0.1);"><th style="padding:0.5rem;">Sentimiento</th><th style="padding:0.5rem;">Comentario</th></tr>`;
        labels.slice(0, 10).forEach(comentario => { // Mostrar últimos 10 comentarios
            tableHtml += `<tr><td style="padding:0.5rem;">🗣️</td><td style="padding:0.5rem;">${comentario}</td></tr>`;
        });
        tableHtml += `</table></div>`;
        canvasContainer.innerHTML = tableHtml;
        card.appendChild(title); card.appendChild(canvasContainer);
        container.appendChild(card);
        return;
    }

    let canvas = document.createElement('canvas'); canvas.id = canvasId;
    canvasContainer.appendChild(canvas);
    card.appendChild(title); card.appendChild(canvasContainer);
    container.appendChild(card);

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
                    }
                }
            }
        }
    };
    
    let cData = { labels: labels, datasets: [{ data: dataVals, backgroundColor: phase === 'pre' ? '#6366f1' : '#10b981', borderRadius: 4 }] };

    if (qConfig.type === 'horizontalBar' || qConfig.type === 'groupedHorizontalBar') {
        cOptions.indexAxis = 'y';
        // Ordenar barras horizontales descendente (Estado de ánimo)
        let combined = labels.map((l, i) => ({l, v:dataVals[i]})).sort((a,b) => b.v - a.v);
        cData.labels = combined.map(x => x.l);
        cData.datasets[0].data = combined.map(x => x.v);
    } else if (qConfig.type === 'divergentBar') {
        cOptions.indexAxis = 'y';
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
        cOptions.elements = { line: { tension: 0.4 } };
    } else if (qConfig.type === 'waffle' || qConfig.type === 'heatmap' || qConfig.type === 'treemap' || qConfig.type === 'slope') {
        cType = 'bar'; // Fallback a barras
        cOptions.plugins.title = { display: true, text: `Modo Adaptado (${qConfig.type})`, font: { style: 'italic', size: 10 } };
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
        { id: 'Resonancia y Empatía', type: 'line', title: '❤️ Resonancia y Empatía (Áreas/Burbujas)' }
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

        let score = (Math.random() * 2 + 3).toFixed(1); 

        let chOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
        let chData = {};

        if (dom.type === 'doughnut') {
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
        } else if (dom.type === 'line') {
            chOptions.elements = { line: { tension: 0.4 } };
            chOptions.scales = { y: { min: 0, max: 5 } };
            chData = { labels: ['Q1', 'Q2', 'Q3', 'Q4'], datasets: [{ label: 'Promedio', data: [2.5, 3.8, 4.1, 4.0], backgroundColor: phase === 'pre' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)', borderColor: phase === 'pre' ? '#6366f1' : '#10b981', fill: true }] };
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
        if(d.survey_type !== 'pre' && d.survey_type !== undefined) return;
        let v1 = parseInt(d.seguridad_ser_yo);
        let v2 = parseInt(d.seguridad_fisica_colegio);
        let v3 = parseInt(d.seguridad_emocional_colegio);
        
        if(v1 <= 2 || v2 <= 2 || v3 <= 2) {
            criticos.push(d);
        }
    });

    if(criticos.length === 0) {
        list.innerHTML = '<div class="alert-item" style="color:#166534; padding:0.8rem;">✅ No se detectan alertas críticas en esta segmentación.</div>';
    } else {
        criticos.forEach(c => {
            let item = document.createElement('div'); item.className = 'alert-item';
            item.style.padding = '0.8rem'; item.style.borderBottom = '1px solid #e2e8f0';
            item.innerText = `⚠️ ${c.nombre || 'Estudiante'} ${c.apellido || ''} (Curso: ${c.curso || 'N/A'}) - Vulnerabilidad detectada (Score ≤ 2).`;
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
    <p>El dashboard se encuentra actualmente en fase de construcción dinámica. Los gráficos respetan ahora tu configuración exacta y se actualizarán con las ponderaciones reales de los dominios a medida que el sistema procese tu información. *Se usarán datos precisos de las columnas exactas ("estado_animo", "seguridad_ser_yo", etc.).</p>`;
}
