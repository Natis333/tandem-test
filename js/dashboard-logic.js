const GAS_URL = 'https://script.google.com/macros/s/AKfycbwo5wexH5zSP_LBst33D0BB1By8VVKXfLa_pNebGGxemu1-hSJkdKcLNrNJCqnavsWIdA/exec';
let rawData = [];
let filteredData = [];
let currentFilter = { curso: 'Todos', genero: 'Todos' };
let manualCharts = {};
let dynamicCharts = [];

async function sincronizarDatos() {
    const btn = document.getElementById('btn-sync');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Sincronizando... ⏳';
    btn.disabled = true;

    try {
        const response = await fetch(GAS_URL);
        rawData = await response.json();
        
        console.log("Datos (TANDEM):", rawData);
        populateFilters();
        applyFiltersAndRender();
        alert("¡Datos sincronizados! Pestañas PRE y POST activadas con todas sus preguntas.");
    } catch (error) {
        console.error(error);
        alert("Error de conexión. Revisa consola.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function populateFilters() {
    const cursos = new Set();
    const generos = new Set();
    rawData.forEach(d => {
        if(d.curso) cursos.add(d.curso);
        if(d.sexo) generos.add(d.sexo);
        else if(d['Género']) generos.add(d['Género']);
    });
    
    let htmlCurso = `<option value="Todos">Todos los Cursos</option>`;
    Array.from(cursos).sort().forEach(c => htmlCurso += `<option value="${c}">${c}</option>`);
    document.getElementById('filtro-curso').innerHTML = htmlCurso;

    let htmlGen = `<option value="Todos">Todos los Géneros</option>`;
    Array.from(generos).sort().forEach(g => htmlGen += `<option value="${g}">${g}</option>`);
    document.getElementById('filtro-genero').innerHTML = htmlGen;
}

function updateFilters() {
    currentFilter.curso = document.getElementById('filtro-curso').value;
    currentFilter.genero = document.getElementById('filtro-genero').value;
    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    filteredData = rawData.filter(d => {
        const cCurso = currentFilter.curso === 'Todos' || d.curso === currentFilter.curso;
        const genRaw = d.sexo || d['Género'];
        const cGen = currentFilter.genero === 'Todos' || genRaw === currentFilter.genero;
        return cCurso && cGen;
    });

    renderAlertasCriticas();
    renderResumenEjecutivo();
    renderCrossCharts();
    renderDynamicQuestions();
}

function renderCrossCharts() {
    // 1. Exclusión
    let percepciones = {};
    filteredData.forEach(d => {
        const val = d['Percepcion de exclusion'];
        if(val) percepciones[val] = (percepciones[val] || 0) + 1;
    });
    if(manualCharts['chartPercepcion']) manualCharts['chartPercepcion'].destroy();
    manualCharts['chartPercepcion'] = new Chart(document.getElementById('chartPercepcion'), {
        type: 'pie', data: { labels: Object.keys(percepciones), datasets: [{ data: Object.values(percepciones), backgroundColor: ['#ef4444', '#f59e0b', '#10b981'] }] }
    });

    // 2. Seguridad Curso
    let cursoData = {};
    filteredData.forEach(d => {
        let c = d.curso || 'N/A';
        if(!cursoData[c]) cursoData[c] = { seg: 0, count: 0 };
        const seg = parseInt(d['Seguridad de si mismo']);
        if(!isNaN(seg)) { cursoData[c].seg += seg; cursoData[c].count++; }
    });
    let cLabels = Object.keys(cursoData).sort();
    let cVals = cLabels.map(c => cursoData[c].count ? (cursoData[c].seg / cursoData[c].count).toFixed(2) : 0);
    if(manualCharts['chartCruzadoCurso']) manualCharts['chartCruzadoCurso'].destroy();
    manualCharts['chartCruzadoCurso'] = new Chart(document.getElementById('chartCruzadoCurso'), {
        type: 'bar', data: { labels: cLabels, datasets: [{ label: 'Promedio Seguridad (1-5)', data: cVals, backgroundColor: '#6366f1' }] }
    });

    // 3. Edad Resiliencia
    let edadData = {};
    filteredData.forEach(d => {
        let e = d.edad || 'N/A';
        if(!edadData[e]) edadData[e] = { val:0, count:0 };
        const c = d['Solucion a ataque'] ? String(d['Solucion a ataque']) : '';
        let puntaje = c.includes('calmarme') ? 3 : (c.includes('Técnicas claras') ? 4 : (c.includes('Reacciono') ? 1 : 2));
        edadData[e].val += puntaje;
        edadData[e].count++;
    });
    let eLabels = Object.keys(edadData).sort();
    let eVals = eLabels.map(e => edadData[e].count ? (edadData[e].val / edadData[e].count).toFixed(2) : 0);
    if(manualCharts['chartCruzadoEdad']) manualCharts['chartCruzadoEdad'].destroy();
    manualCharts['chartCruzadoEdad'] = new Chart(document.getElementById('chartCruzadoEdad'), {
        type: 'line', data: { labels: eLabels, datasets: [{ label: 'Nivel Resiliencia', data: eVals, borderColor: '#ec4899', backgroundColor: 'rgba(236,72,153,0.2)', fill:true }] }
    });

    // 4. Nube Palabras
    let palabras = {};
    filteredData.forEach(d => {
        const w = d['una palabra sentimiento'];
        if(w) { let cl = w.trim().toLowerCase(); palabras[cl] = (palabras[cl]||0)+1; }
    });
    const nube = document.getElementById('nubePalabrasData');
    nube.innerHTML = '';
    Object.keys(palabras).forEach(w => {
        const sp = document.createElement('span'); sp.innerText = w;
        sp.style.fontSize = (1 + palabras[w]*0.4)+'rem'; sp.style.margin = '4px';
        sp.style.fontWeight = 'bold'; sp.style.color = `hsl(${Math.random()*360}, 70%, 50%)`;
        nube.appendChild(sp);
    });
}

function renderDynamicQuestions() {
    dynamicCharts.forEach(c => c.destroy());
    dynamicCharts = [];
    const containerPre = document.getElementById('container-pre-charts');
    const containerPost = document.getElementById('container-post-charts');
    containerPre.innerHTML = '';
    containerPost.innerHTML = '';

    // Separamos PRE y POST basándonos en la columna 'survey_type' que manda tu plataforma.
    // Si la hoja no tiene la columna, asumiremos que todos son PRE para mostrar algo seguro
    const dataPre = filteredData.filter(d => (d.survey_type || '').toLowerCase() === 'pre' || !d.survey_type);
    const dataPost = filteredData.filter(d => (d.survey_type || '').toLowerCase() === 'post');

    // Columnas a ignorar (Metadata pura)
    const ignore = ['nombre', 'apellido', 'comentarios', 'Timestamp', 'survey_type', 'una palabra sentimiento', 'sentimiento_post_taller', 'sentimiento_una_palabra'];

    function createChartsFor(groupData, containerElement) {
        if(groupData.length === 0) {
            containerElement.innerHTML = '<p style="color:var(--text-muted); width:100%; text-align:center;">No hay registros disponibles para esta fase todavía.</p>';
            return;
        }
        
        let sampleRow = groupData[0];
        let keys = Object.keys(sampleRow).filter(k => !ignore.includes(k.toLowerCase()));

        keys.forEach((questionKey, idx) => {
            // Contar frecuencias
            let freqs = {};
            groupData.forEach(r => {
                let val = r[questionKey];
                if(val !== undefined && val !== null && val !== '') {
                    freqs[val] = (freqs[val] || 0) + 1;
                }
            });
            
            if(Object.keys(freqs).length > 0) {
                // Crear DOM Card
                let card = document.createElement('div');
                card.className = 'card';
                let title = document.createElement('h2');
                title.innerText = questionKey;
                title.style.fontSize = "0.9rem";
                let canvasContainer = document.createElement('div');
                canvasContainer.style.position = "relative";
                canvasContainer.style.height = "250px";
                let canvas = document.createElement('canvas');
                let cId = 'dyn_chart_' + containerElement.id + '_' + idx;
                canvas.id = cId;

                canvasContainer.appendChild(canvas);
                card.appendChild(title);
                card.appendChild(canvasContainer);
                containerElement.appendChild(card);

                // Dibujar Gráfica
                let ch = new Chart(canvas, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(freqs),
                        datasets: [{
                            label: 'Votos',
                            data: Object.values(freqs),
                            backgroundColor: `hsl(${(idx * 45) % 360}, 70%, 60%)`
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                    }
                });
                dynamicCharts.push(ch);
            }
        });
    }

    createChartsFor(dataPre, containerPre);
    createChartsFor(dataPost, containerPost);
}

function renderAlertasCriticas() {
    const list = document.getElementById('alertasCriticas');
    list.innerHTML = '';
    const criticos = filteredData.filter(d => {
        let seg = parseInt(d['Seguridad de si mismo']); let fis = parseInt(d['seguridad fisica y emocional']);
        return (seg <= 2 || fis <= 2);
    });

    if(criticos.length === 0) list.innerHTML = '<li style="color:var(--success)">✅ Todo en orden.</li>';
    else criticos.forEach(c => {
        let li = document.createElement('li'); li.style.color = 'var(--danger)';
        li.innerText = `⚠️ ${c.nombre} ${c.apellido || ''} (${c.curso}) - Riesgo en Seguridad.`;
        list.appendChild(li);
    });
}

function renderResumenEjecutivo() {
    document.getElementById('resumenEjecutivo').innerHTML = `<p><strong>🧠 AI INSIGHT:</strong> Con ${filteredData.length} registros analizados, observa el menú de PRE y POST para contrastar cómo cambian absolutamente todos los parámetros de seguridad e interacción.</p>`;
}
