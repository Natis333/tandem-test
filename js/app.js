/**
 * Lógica Universal Typeform - minders.psico
 * Fusión exhaustiva de preguntas de todas las versiones.
 * Jerarquía y Simetría mejorada.
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwo5wexH5zSP_LBst33D0BB1By8VVKXfLa_pNebGGxemu1-hSJkdKcLNrNJCqnavsWIdA/exec';

const baseQuestions = [
    { id: 'nombre', text: '¡Hola!<br><span class="sub-text">Para empezar, dinos tu nombre</span>', type: 'text', placeholder: 'Tu nombre aquí...' },
    { id: 'apellido', text: '<span class="sub-text">Y ahora, tus apellidos</span>', type: 'text', placeholder: 'Tus apellidos aquí...' },
    { id: 'sexo', text: '¿Cuál es tu sexo?', type: 'select', options: ['Femenino', 'Masculino'] },
    { id: 'edad', text: '¿Qué edad tienes?', type: 'select', options: ['11', '12', '13', '14', '15', '16', '17', '18', '+18'] },
    { id: 'curso', text: '¿En qué curso estás actualmente?', type: 'select', options: ['6º', '7º', '8º', '9º', '10º', '11º'] },
    { id: 'tiempo_colegio', text: '¿Cuánto tiempo llevas en el colegio?', type: 'select', options: ['Este es mi primer año', '1 a 2 años', '3 a 5 años', 'Más de 5 años', 'Desde pequeño/a (Toda la vida)'] }
];

const specificQuestions = {
    pre: [
        {
            id: 'estado_animo',
            text: '¿Cómo definirías tu estado de ánimo predominante en este momento?',
            type: 'mood',
            options: [
                { val: 'Motivado', emoji: '🚀', label: 'Motivado/a y con energía' },
                { val: 'Paz', emoji: '🧘', label: 'En paz y tranquilo/a' },
                { val: 'Estresado', emoji: '🤯', label: 'Estresado/a o abrumado/a' },
                { val: 'Cansado', emoji: '🪫', label: 'Sin energía / Cansado/a' },
                { val: 'Molesto', emoji: '😡', label: 'Molesto/a o irritable' }
            ]
        },
        {
            id: 'seguridad_ser_yo',
            text: '¿Qué tan seguro/a te sientes de ser tú mismo/a en el salón sin miedo a críticas o etiquetas?',
            type: 'likert',
            labels: { start: 'Nada seguro/a, me cuido mucho', end: 'Totalmente seguro/a' }
        },
        {
            id: 'seguridad_salon',
            text: '¿Qué tan seguro/a te sientes en tu salón de clases (física y emocionalmente)?',
            type: 'likert',
            labels: { start: 'Muy inseguro/a', end: 'Totalmente seguro/a' }
        },
        {
            id: 'percepcion_chisme',
            text: 'En mi salón, el chisme o hablar mal de otros se siente como:',
            type: 'choice',
            options: [
                'Una forma de pasar el tiempo o divertirse.',
                'Algo normal que pasa en todos los grupos.',
                'Algo que me molesta, pero prefiero no decir nada.',
                'Un problema serio que daña a las personas.'
            ]
        },
        {
            id: 'impacto_chismes',
            text: '¿Qué tanto impacta en ti lo que otros dicen de ti (chismes)?',
            type: 'likert',
            labels: { start: 'No me afecta en nada', end: 'Me afecta muchísimo' }
        },
        {
            id: 'evitacion_conflictos',
            text: '¿Prefieres no involucrarte en conflictos de compañeros para evitar problemas?',
            type: 'likert',
            labels: { start: 'No me importa involucrarme', end: 'Prefiero evitar problemas' }
        },
        {
            id: 'interes_companeros',
            text: '¿Sientes que a tus compañeros de curso les importa realmente cómo te sientes?',
            type: 'likert',
            labels: { start: 'A nadie le importa', end: 'Todos se preocupan' }
        },
        {
            id: 'exclusion_presenciada',
            text: '¿Sientes que en tu curso hay personas que son ignoradas o excluidas frecuentemente?',
            type: 'choice',
            options: [
                'Sí, lo veo pasar seguido.',
                'A veces, con personas específicas.',
                'No, siento que todos están integrados'
            ]
        },
        {
            id: 'reaccion_malentendido',
            text: 'Si hoy ocurriera un malentendido en el grupo, ¿qué es lo más probable que pase?',
            type: 'choice',
            options: [
                'Se crean bandos y se deja de hablar a alguien (Exclusión).',
                'El problema crece por comentarios en redes o grupos de WhatsApp.',
                'Se habla directamente con la persona involucrada.',
                'Nadie hace nada y el ambiente se pone pesado.'
            ]
        },
        {
            id: 'herramientas_calma',
            text: 'Si hoy tienes un momento difícil con un compañero, ¿qué tantas herramientas tienes para mantener la calma y no reaccionar mal?',
            type: 'likert',
            labels: { start: 'Ninguna, exploto o me guardo todo', end: 'Tengo técnicas claras' }
        },
        {
            id: 'accion_frustracion',
            text: 'Cuando te sientes frustrado/a o atacado/a por alguien en el colegio, ¿qué haces?',
            type: 'choice',
            options: [
                'Reacciono de inmediato (respondo igual o peor).',
                'Me guardo todo y me lleno de rabia.',
                'Trato de calmarme, pero no sé muy bien cómo.',
                'Tengo técnicas claras para recuperar mi centro.'
            ]
        },
        { id: 'sentimiento_una_palabra', text: 'Describe en UNA palabra cómo te sientes en el colegio hoy:', type: 'text', placeholder: 'Tu palabra aquí...' },
        { id: 'pre_opcional', text: '¿Hay algo más que quieras decirnos sobre cómo te sientes en el colegio hoy?', type: 'text', placeholder: 'Escribe aquí (opcional)...' }
    ],
    post: [
        {
            id: 'estado_animo_post',
            text: '¿Cómo definirías tu estado de ánimo predominante en este momento?',
            type: 'mood',
            options: [
                { val: 'Motivado', emoji: '🚀', label: 'Motivado/a y con energía' },
                { val: 'Paz', emoji: '🧘', label: 'En paz y tranquilo/a' },
                { val: 'Estresado', emoji: '🤯', label: 'Estresado/a o abrumado/a' },
                { val: 'Cansado', emoji: '🪫', label: 'Sin energía / Cansado/a' },
                { val: 'Molesto', emoji: '😡', label: 'Molesto/a o irritable' }
            ]
        },
        {
            id: 'mejora_seguridad',
            text: 'Tras participar en los talleres, ¿qué tan seguro/a te sientes ahora en tu salón?',
            type: 'likert',
            labels: { start: 'Muy inseguro/a', end: 'Totalmente seguro/a' }
        },
        {
            id: 'mejora_preocupacion',
            text: '¿Sientes que la preocupación y el cuidado entre compañeros mejoró gracias a lo que trabajamos?',
            type: 'likert',
            labels: { start: 'Sigue igual', end: 'Mejoró notablemente' }
        },
        {
            id: 'capacidad_anclajes',
            text: '¿Qué tan capaz te sientes de usar los \'Anclajes de Calma\' u otros ejercicios aprendidos en un momento de estrés real?',
            type: 'likert',
            labels: { start: 'No lo recuerdo/no me sale', end: 'Lo uso y me funciona' }
        },
        {
            id: 'guion_vida',
            text: 'Si tus palabras fueran el "guion" de tu vida, ¿qué tanto has empezado a editar ese guion para que sea más a tu favor?',
            type: 'choice',
            options: [
                'No he cambiado nada el guion (sigo usando las mismas etiquetas de siempre).',
                'Lo he pensado, pero me cuesta cambiar las palabras.',
                'A veces identifico una frase negativa y trato de frenarla.',
                'He empezado a cambiar el "soy" por el "estoy experimentando".',
                'He borrado etiquetas limitantes y escribí nuevas frases que me empoderan.'
            ]
        },
        {
            id: 'utilidad_dar_recibir',
            text: 'El ejercicio de dar y recibir palabras que sumen te sirvió para:',
            type: 'choice',
            options: [
                'Ser más cuidadoso/a con lo que digo a los demás.',
                'Darme cuenta de qué personas me "restan" energía.',
                'Entender por qué el chisme es "comida chatarra" para el vínculo.',
                'No me quedó claro el ejercicio.'
            ]
        },
        {
            id: 'mejora_respeto',
            text: '¿Sientes que el respeto y la unión del grupo mejoraron tras las sesiones?',
            type: 'choice',
            options: [
                'Sí, el ambiente se siente más liviano y seguro.',
                'Ha mejorado un poco, pero falta camino.',
                'Sigue igual que antes.'
            ]
        },
        {
            id: 'reaccion_chisme_post',
            text: 'Después de los talleres, si escuchas un chisme pesado sobre alguien, ¿cuál es tu reacción más probable?',
            type: 'choice',
            options: [
                'Me alejo y no participo de la cadena.',
                'Intento frenarlo o cuestionar si es verdad.',
                'Ahora soy más consciente del daño, aunque a veces es difícil no oír.',
                'Mi comportamiento no ha cambiado.'
            ]
        },
        {
            id: 'impacto_chismes_post',
            text: '¿Qué tanto impacta en ti lo que otros dicen de ti (chismes)?',
            type: 'likert',
            labels: { start: 'No me afecta en nada', end: 'Me afecta muchísimo' }
        },
        {
            id: 'evitacion_conflictos_post',
            text: '¿Prefieres no involucrarte en conflictos de compañeros para evitar problemas?',
            type: 'likert',
            labels: { start: 'No me importa involucrarme', end: 'Prefiero evitar problemas' }
        },
        { id: 'sentimiento_post_taller', text: 'Describe en UNA palabra cómo te sientes tras haber participado en los espacios de taller:', type: 'text', placeholder: 'Tu palabra aquí...' },
        { id: 'espacio_libre', text: 'Este es tu espacio: ¿Hay algo más que quieras compartir con nosotros?', type: 'text', placeholder: 'Escribe aquí...' }
    ]
};

const fullSurvey = [...baseQuestions, ...specificQuestions[window.SURVEY_TYPE]];
let currentIndex = 0;
let results = { survey_type: window.SURVEY_TYPE };


function showQuestion() {
    const q = fullSurvey[currentIndex];
    const container = document.getElementById('input-container');

    document.getElementById('current-number').innerText = currentIndex + 1;
    document.getElementById('question-text').innerHTML = q.text;
    container.innerHTML = '';

    if (q.type === 'text') {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'text-input';
        input.placeholder = q.placeholder;
        input.className = 'type-text-input';
        container.appendChild(input);
        input.focus();
    }
    else if (q.type === 'select') {
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select';
        wrapper.id = 'active-custom-select';

        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        trigger.innerHTML = `<span>Tu respuesta aquí...</span>`;

        const optionsList = document.createElement('div');
        optionsList.className = 'custom-select-options';

        q.options.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'custom-select-option';
            item.innerText = opt;
            item.onclick = (e) => {
                e.stopPropagation();
                trigger.querySelector('span').innerText = opt;
                wrapper.classList.remove('open');
                wrapper.classList.add('has-value');
                wrapper.dataset.value = opt;
                selectOption(opt);
            };
            optionsList.appendChild(item);
        });

        trigger.onclick = (e) => {
            e.stopPropagation();
            wrapper.classList.toggle('open');
        };

        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsList);
        container.appendChild(wrapper);
    }
    else if (q.type === 'likert') {
        const wrapper = document.createElement('div');
        wrapper.className = 'likert-wrapper';
        const scale = document.createElement('div');
        scale.className = 'likert-scale';
        for (let i = 1; i <= 5; i++) {
            const btn = document.createElement('button');
            btn.className = 'likert-num-btn';
            btn.innerText = i;
            btn.onclick = () => selectOption(i);
            scale.appendChild(btn);
        }
        const labels = document.createElement('div');
        labels.className = 'likert-labels';
        labels.innerHTML = `<span>${q.labels.start}</span><span>${q.labels.end}</span>`;
        wrapper.appendChild(scale);
        wrapper.appendChild(labels);
        container.appendChild(wrapper);
    }
    else if (q.type === 'choice') {
        const list = document.createElement('div');
        list.className = 'options-list';
        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            const letter = String.fromCharCode(65 + idx);
            btn.innerHTML = `<span class="option-key">${letter}</span> ${opt}`;
            btn.onclick = () => selectOption(opt);
            list.appendChild(btn);
        });
        container.appendChild(list);
    }
    else if (q.type === 'mood') {
        const grid = document.createElement('div');
        grid.className = 'mood-grid';
        q.options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'mood-option';
            btn.innerHTML = `<div class="emoji">${option.emoji}</div><div class="label">${option.label}</div>`;
            btn.onclick = () => selectOption(option.val);
            grid.appendChild(btn);
        });
        container.appendChild(grid);
    }

    updateProgress();
}

function selectOption(val) {
    saveStep(val);
    setTimeout(handleNext, 300);
}

function saveStep(val) {
    results[fullSurvey[currentIndex].id] = val;
}

function handleNext() {
    const q = fullSurvey[currentIndex];

    if (q.type === 'text') {
        const val = document.getElementById('text-input').value;
        if (!val && !q.id.includes('narrativa')) return;
        saveStep(val);
    } else if (q.type === 'select') {
        const wrapper = document.getElementById('active-custom-select');
        const val = wrapper ? wrapper.dataset.value : null;
        if (!val) return;
        saveStep(val);
    }

    if (currentIndex < fullSurvey.length - 1) {
        currentIndex++;
        animateTransition();
    } else {
        submitResults();
    }
}

function animateTransition() {
    const content = document.querySelector('.content');
    content.style.opacity = '0';
    content.style.transform = 'translateY(-10px)';
    setTimeout(() => {
        showQuestion();
        content.style.opacity = '1';
        content.style.transform = 'translateY(0)';
    }, 400);
}

function updateProgress() {
    const prog = ((currentIndex + 1) / fullSurvey.length) * 100;
    document.getElementById('progress-bar').style.width = `${prog}%`;
}

async function submitResults() {
    document.getElementById('question-screen').classList.remove('active');

    if (GAS_URL !== 'ESCRIBE_AQUI_TU_URL_DE_GOOGLE_APPS_SCRIPT') {
        try {
            await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(results) });
        } catch (e) { console.error(e); }
    }

    setTimeout(() => {
        document.getElementById('question-screen').style.display = 'none';
        document.getElementById('final-screen').style.display = 'flex';
        setTimeout(() => document.getElementById('final-screen').classList.add('active'), 50);
    }, 600);
}

function setupGlobalListeners() {
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
    });
}

function init() {
    // Solo iniciar encuesta si estamos en una pantalla de preguntas
    if (document.getElementById('question-text')) {
        showQuestion();
        setupGlobalListeners();
        window.onkeydown = (e) => {
            if (e.key === 'Enter') handleNext();
        };
    }

    // Convertir selects estáticos (Home)
    const staticSelects = document.querySelectorAll('select:not(.type-select)');
    staticSelects.forEach(sel => replaceWithCustom(sel));
}

function replaceWithCustom(nativeSelect) {
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select';

    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    trigger.innerHTML = `<span>${nativeSelect.options[nativeSelect.selectedIndex].text}</span>`;

    const optionsList = document.createElement('div');
    optionsList.className = 'custom-select-options';

    Array.from(nativeSelect.options).forEach(opt => {
        if (opt.disabled) return;
        const item = document.createElement('div');
        item.className = 'custom-select-option';
        item.innerText = opt.text;
        item.onclick = (e) => {
            e.stopPropagation();
            trigger.querySelector('span').innerText = opt.text;
            nativeSelect.value = opt.value;
            // Disparar evento change para que otras lógicas se enteren
            nativeSelect.dispatchEvent(new Event('change'));
            wrapper.classList.remove('open');
        };
        optionsList.appendChild(item);
    });

    trigger.onclick = (e) => {
        e.stopPropagation();
        const isOpen = wrapper.classList.contains('open');
        document.querySelectorAll('.custom-select.open').forEach(s => s.classList.remove('open'));
        if (!isOpen) wrapper.classList.add('open');
    };

    nativeSelect.style.display = 'none';
    nativeSelect.parentNode.insertBefore(wrapper, nativeSelect.nextSibling);
}

window.onload = init;
