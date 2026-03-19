// Variables de estado
let database = null;
let currentItem = null;
let currentResults = {};

// 1. Cargar el JSON (Asegúrate de que data.json esté en la misma carpeta)
async function loadData() {
    try {
        const response = await fetch('data.json');
        database = await response.json();
    } catch (error) {
        console.error("Error cargando el JSON:", error);
    }
}

// 2. Lógica del Buscador
const searchInput = document.getElementById('main-search');
const suggestions = document.getElementById('suggestions');

searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    suggestions.innerHTML = '';
    
    if (val.length < 2) {
        suggestions.classList.add('hidden');
        return;
    }

    // Buscar en todas las categorías del JSON
    let matches = [];
    database.categorias.forEach(cat => {
        cat.items.forEach(item => {
            if (item.label.toLowerCase().includes(val)) {
                matches.push(item);
            }
        });
    });

    if (matches.length > 0) {
        matches.forEach(item => {
            const div = document.createElement('div');
            div.className = "p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50 text-left";
            div.innerText = item.label;
            div.onclick = () => buildConfigStep(item);
            suggestions.appendChild(div);
        });
        suggestions.classList.remove('hidden');
    } else {
        suggestions.classList.add('hidden');
    }
});

// 3. Construir Sliders Dinámicamente
function buildConfigStep(item) {
    currentItem = item;
    suggestions.classList.add('hidden');
    document.getElementById('step-search').classList.add('hidden');
    
    const container = document.getElementById('config-container'); // Un div vacío en tu HTML
    container.innerHTML = ''; // Limpiar anteriores
    
    document.getElementById('config-title').innerText = `Configurando ${item.label}`;

    item.sliders.forEach(s => {
        const sliderDiv = document.createElement('div');
        sliderDiv.className = "mb-8";
        
        // Crear labels de extremos si existen
        const labelsHtml = s.labels 
            ? `<div class="flex justify-between slider-label mt-1"><span>${s.labels[0]}</span><span>${s.labels[1]}</span></div>`
            : `<div class="flex justify-between slider-label mt-1"><span>${s.min}</span><span>${s.max}</span></div>`;

        sliderDiv.innerHTML = `
            <label class="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-widest">
                ${s.label}: <span id="val-${s.id}" class="text-black">${s.default}</span>
            </label>
            <input type="range" id="input-${s.id}" min="${s.min}" max="${s.max}" step="${s.step || 1}" value="${s.default}" 
                   oninput="document.getElementById('val-${s.id}').innerText = this.value"
                   class="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer">
            ${labelsHtml}
        `;
        container.appendChild(sliderDiv);
    });

    document.getElementById('step-config').classList.remove('hidden');
}

// 4. Lógica de Cálculo Centralizada
function calculate() {
    const resultsContainer = document.getElementById('results-list');
    resultsContainer.innerHTML = '';
    
    // Obtener valores de los sliders actuales
    let params = {};
    currentItem.sliders.forEach(s => {
        params[s.id] = parseFloat(document.getElementById(`input-${s.id}`).value);
    });

    // Simulador de fórmulas (Aquí irían las matemáticas de cada ítem)
    // Para el prototipo, usamos una lógica genérica ajustable por ID
    currentItem.resultados.forEach((res, index) => {
        let baseVal = 100; // Valor base por defecto
        
        // Ejemplo específico para Arroz
        if (currentItem.id === 'arroz') {
            if (res.id === 'principal') baseVal = params.personas * 80;
            if (res.id === 'liquido') baseVal = (params.personas * 80) * (1.8 + (params.textura * 0.2));
            if (res.id === 'condimento') baseVal = params.personas * (1 + (params.sabor * 0.5));
        } 
        // Ejemplo genérico para otros (puedes expandir esto)
        else {
            baseVal = (params[Object.keys(params)[0]] || 1) * 50; 
        }

        currentResults[res.id] = { val: baseVal, units: res.unidades, currentUnit: 0 };
        renderResultItem(res, index);
    });

    document.getElementById('step-config').classList.add('hidden');
    document.getElementById('step-results').classList.remove('hidden');
}

function renderResultItem(res, index) {
    const resultsContainer = document.getElementById('results-list');
    const data = currentResults[res.id];
    
    const div = document.createElement('div');
    div.className = "flex justify-between items-end mb-8";
    div.innerHTML = `
        <div>
            <p class="text-zinc-500 text-xs uppercase mb-1">${res.label}</p>
            <p class="text-3xl font-light">${convertValue(data.val, res.id, data.currentUnit)}</p>
        </div>
        <span class="unit-badge text-zinc-400 text-sm mb-1" onclick="cycleUnit('${res.id}', ${index})">
            ${data.units[data.currentUnit]}
        </span>
    `;
    resultsContainer.appendChild(div);
}

function cycleUnit(resId, index) {
    const data = currentResults[resId];
    data.currentUnit = (data.currentUnit + 1) % data.units.length;
    
    // Re-renderizar solo la lista de resultados
    document.getElementById('results-list').innerHTML = '';
    currentItem.resultados.forEach((res, idx) => renderResultItem(res, idx));
}

// Función auxiliar para conversiones (puedes ampliarla)
function convertValue(val, resId, unitIndex) {
    // Aquí implementas la lógica de conversión basada en el nombre de la unidad
    // Por simplicidad, devolvemos el valor base o una conversión simple
    return val.toFixed(1); 
}

// Inicializar
loadData();
