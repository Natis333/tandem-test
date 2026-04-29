const GAS_URL = 'https://script.google.com/macros/s/AKfycbwo5wexH5zSP_LBst33D0BB1By8VVKXfLa_pNebGGxemu1-hSJkdKcLNrNJCqnavsWIdA/exec';
let rawData = [];
let filteredData = [];
let currentFilter = { curso: 'Todos', genero: 'Todos', edad: 'Todos', dominio: 'Todos' };
let currentView = 'general';
let dynamicCharts = [];
let microCharts = {};

const DOMAINS = {
    'Seguridad': ['seguro/a', 'físicamente', 'emocionalmente', 'críticas', 'etiquetas', 'cuidado', 'presencia'],
    'Clima': ['chisme', 'respeto', 'hablar mal', 'excluidas', 'unión', 'comportamientos'],
    'Regulacion': ['herramientas', 'calma', 'frustrado/a', 'malentendido', 'anclajes', 'conflictos']
};

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
    currentFilter.dominio = document.getElementById('filtro-dominio').value;
    applyFiltersAndRender();
}

function setView(viewMode, evt) {
    currentView = viewMode;
    document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
    if(evt) evt.currentTarget.classList.add('active');
    
    const fd = document.getElementById('filtro-dominio');
    if (viewMode === 'exploratoria') {
        fd.style.display = 'inline-block';
    } else {
        fd.style.display = 'none';
        currentFilter.dominio = 'Todos';
        fd.value = 'Todos';
    }
    applyFiltersAndRender();
}

function getQuestionDomain(questionText) {
    const lower = questionText.toLowerCase();
    for (const [dom, keywords] of Object.entries(DOMAINS)) {
        if (keywords.some(kw => lower.includes(kw))) return dom;
    }
    return 'Otros';
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

    renderMainQuestions(dataPre, dataPost);
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

function renderMainQuestions(dataPre, dataPost) {
    dynamicCharts.forEach(c => c.destroy());
    dynamicCharts = [];
    
    const preContainer = document.getElementById('pre-questions');
    const postContainer = document.getElementById('post-questions');
    preContainer.innerHTML = ''; postContainer.innerHTML = '';

    const ignore = ['nombre', 'apellido', 'comentarios', 'timestamp', 'survey_type', 'una palabra sentimiento', 'sentimiento_post_taller', 'sentimiento_una_palabra', 'espacio_libre', 'pre_opcional'];

    let allQuestions = new Set();
    [...dataPre, ...dataPost].forEach(row => {
        Object.keys(row).forEach(k => {
            if(!ignore.includes(k.toLowerCase()) && k.length > 5) allQuestions.add(k);
        });
    });

    let questionsToRender = Array.from(allQuestions);

    if (currentView === 'exploratoria' && currentFilter.dominio !== 'Todos') {
        questionsToRender = questionsToRender.filter(q => getQuestionDomain(q) === currentFilter.dominio);
    }

    if (currentView === 'dominios') {
        const domPre = aggregateDomains(dataPre, questionsToRender);
        const domPost = aggregateDomains(dataPost, questionsToRender);
        
        renderDomainCharts(domPre, preContainer, 'pre');
        renderDomainCharts(domPost, postContainer, 'post');
        return;
    }

    if(questionsToRender.length === 0) {
        preContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted)">No hay datos.</p>';
        postContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted)">No hay datos.</p>';
        return;
    }

    questionsToRender.forEach((q, idx) => {
        createBarChart(q, dataPre, preContainer, `dyn_pre_${idx}`, 'dynamic', idx);
        createBarChart(q, dataPost, postContainer, `dyn_post_${idx}`, 'dynamic', idx);
    });
}

function createBarChart(questionKey, data, container, canvasId, colorBase, idx) {
    let freqs = {};
    data.forEach(r => {
        let val = r[questionKey];
        if(val !== undefined && val !== null && val !== '') {
            freqs[val] = (freqs[val] || 0) + 1;
        }
    });

    if(Object.keys(freqs).length === 0) return;

    let card = document.createElement('div'); card.className = 'chart-card';
    let title = document.createElement('h3'); title.innerText = questionKey;
    let canvasContainer = document.createElement('div'); canvasContainer.className = 'chart-wrapper';
    let canvas = document.createElement('canvas'); canvas.id = canvasId;

    canvasContainer.appendChild(canvas);
    card.appendChild(title); card.appendChild(canvasContainer);
    container.appendChild(card);

    let bgColor = colorBase === 'dynamic' ? `hsl(${(idx * 45) % 360}, 70%, 60%)` : colorBase;

    let ch = new Chart(canvas, {
        type: 'bar',
        data: { labels: Object.keys(freqs), datasets: [{ data: Object.values(freqs), backgroundColor: bgColor, borderRadius: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
    dynamicCharts.push(ch);
}

function aggregateDomains(data, allQuestions) {
    let domainScores = {};
    data.forEach(row => {
        allQuestions.forEach(q => {
            let val = parseFloat(row[q]);
            if (!isNaN(val)) {
                let dom = getQuestionDomain(q);
                if (dom !== 'Otros') {
                    if(!domainScores[dom]) domainScores[dom] = { sum: 0, count: 0 };
                    domainScores[dom].sum += val;
                    domainScores[dom].count++;
                }
            }
        });
    });
    
    let result = {};
    for (let dom in domainScores) {
        result[dom] = (domainScores[dom].sum / domainScores[dom].count).toFixed(2);
    }
    return result;
}

function renderDomainCharts(domainAverages, container, phase) {
    if(Object.keys(domainAverages).length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted)">No hay datos numéricos suficientes.</p>';
        return;
    }

    let card = document.createElement('div'); card.className = 'chart-card';
    let title = document.createElement('h3'); title.innerText = 'Promedio por Dominios (1-5)';
    let canvasContainer = document.createElement('div'); canvasContainer.className = 'chart-wrapper';
    let canvas = document.createElement('canvas'); canvas.id = `dom_${phase}_chart`;

    canvasContainer.appendChild(canvas);
    card.appendChild(title); card.appendChild(canvasContainer);
    container.appendChild(card);

    let ch = new Chart(canvas, {
        type: 'radar',
        data: { 
            labels: Object.keys(domainAverages), 
            datasets: [{ 
                label: 'Promedio Dominio',
                data: Object.values(domainAverages), 
                backgroundColor: phase === 'pre' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                borderColor: phase === 'pre' ? '#6366f1' : '#10b981',
                pointBackgroundColor: phase === 'pre' ? '#6366f1' : '#10b981',
            }] 
        },
        options: { 
            responsive: true, maintainAspectRatio: false, 
            scales: { r: { min: 0, max: 5, ticks: { stepSize: 1 } } }
        }
    });
    dynamicCharts.push(ch);
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
        list.innerHTML = '<div class="alert-item" style="color:#166534; border:none;">✅ No se detectan alertas críticas en esta segmentación.</div>';
    } else {
        criticos.forEach(c => {
            let item = document.createElement('div'); item.className = 'alert-item';
            item.innerText = `⚠️ ${c.nombre} ${c.apellido || ''} (Curso: ${c.curso}) - Reporta inseguridad o vulnerabilidad (Valor ≤ 2).`;
            list.appendChild(item);
        });
    }
}

function renderResumenEjecutivo() {
    const box = document.getElementById('resumenEjecutivo');
    if (filteredData.length === 0) {
        box.innerHTML = 'No hay suficientes datos para generar un resumen.';
        return;
    }
    
    const preCount = filteredData.filter(d => (d.survey_type || '').toLowerCase() === 'pre' || !d.survey_type).length;
    const postCount = filteredData.filter(d => (d.survey_type || '').toLowerCase() === 'post').length;

    box.innerHTML = `<p><strong>🧠 AI INSIGHT:</strong> El Dashboard está analizando a <strong>${filteredData.length} estudiantes</strong> (${preCount} encuestas PRE y ${postCount} POST).</p>
    <p>Observa el "Espejo" visual: Las gráficas de la izquierda representan el diagnóstico inicial, mientras que la derecha mide el impacto tras la intervención. Explora la vista "Por Dominios" para entender rápidamente el desarrollo general por pilares.</p>`;
}
