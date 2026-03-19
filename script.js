// Variables de estado
let database = null;
let currentItem = null;
let currentResults = {};

// 1. Cargar el JSON
async function loadData() {
    try {
        const response = await fetch('data.json');
        database = await response.json();
        console.log("Base de datos cargada");
    } catch (error) {
        console.error("Error cargando el JSON:", error);
    }
}

// 2. Lógica del Buscador
const searchInput = document.getElementById('main-search');
const suggestions = document.getElementById('suggestions');

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        suggestions.innerHTML = '';
        
        if (val.length < 2) {
            suggestions.classList.add('hidden');
            return;
        }

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
                div.className = "p-4 hover:bg-gray-100 cursor-pointer border-b border-gray-50 text-left text-black";
                div.innerText = item.label;
                div.onclick = () => buildConfigStep(item);
                suggestions.appendChild(div);
            });
            suggestions.classList.remove('hidden');
        } else {
            suggestions.classList.add('hidden');
        }
    });
}

// 3. Construir Sliders Dinámicamente
function buildConfigStep(item) {
    currentItem = item;
    suggestions.classList.add('hidden');
    if(searchInput) searchInput.value = ''; // Limpiar buscador
    
    document.getElementById('step-search').classList.add('hidden');
    document.getElementById('step-config').classList.remove('hidden');
    
    const container = document.getElementById('config-container');
    container.innerHTML = ''; 
    
    document.getElementById('config-title').innerText = item.label;

    item.sliders.forEach(s => {
        const sliderDiv = document.createElement('div');
        sliderDiv.className = "mb-8";
        
        const labelsHtml = s.labels 
            ? `<div class="flex justify-between text-xs text-gray-400 mt-1"><span>${s.labels[0]}</span><span>${s.labels[1]}</span></div>`
            : `<div class="flex justify-between text-xs text-gray-400 mt-1"><span>${s.min}</span><span>${s.max}</span></div>`;

        sliderDiv.innerHTML = `
            <div class="flex justify-between mb-2">
                <label class="text-sm font-medium text-gray-500 uppercase tracking-widest">${s.label}</label>
                <span id="val-${s.id}" class="font-bold text-blue-600">${s.default}</span>
            </div>
            <input type="range" id="input-${s.id}" min="${s.min}" max="${s.max}" step="${s.step || 1}" value="${s.default}" 
                   class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                   oninput="document.getElementById('val-${s.id}').innerText = this.value">
            ${labelsHtml}
        `;
        container.appendChild(sliderDiv);
    });
}

// 4. Lógica de Cálculo y Proporciones
function calculate() {
    const resultsContainer = document.getElementById('results-list');
    resultsContainer.innerHTML = '';
    
    let params = {};
    currentItem.sliders.forEach(s => {
        params[s.id] = parseFloat(document.getElementById(`input-${s.id}`).value);
    });

    // Cálculos Proporcionales Reales
    currentItem.resultados.forEach((res) => {
        let finalVal = 0;
        
        // Lógica de Proporciones según el ítem
        if (currentItem.id === 'arroz') {
            const baseGramos = params.personas * 80; // 80g por persona
            if (res.id === 'principal') finalVal = baseGramos;
            if (res.id === 'liquido') {
                // Ratio base 1:2, ajustado por textura (0=seco, 5=caldoso)
                const ratio = 2 + (params.textura * 0.5);
                finalVal = baseGramos * ratio;
            }
            if (res.id === 'condimento') finalVal = params.personas * (params.sabor * 2);
        } else {
            // Lógica genérica proporcional si no es arroz
            const factor = params[Object.keys(params)[0]] || 1;
            finalVal = factor * 50; 
        }

        // Guardar en estado global para poder cambiar unidades después
        currentResults[res.id] = { 
            baseVal: finalVal, 
            units: res.unidades, 
            currentUnitIndex: 0 
        };
        
        renderResultItem(res);
    });

    document.getElementById('step-config').classList.add('hidden');
    document.getElementById('step-results').classList.remove('hidden');
}

// 5. Renderizado de cada resultado
function renderResultItem(res) {
    const resultsContainer = document.getElementById('results-list');
    const data = currentResults[res.id];
    const unitLabel = data.units[data.currentUnitIndex];
    
    // Crear el elemento si no existe o actualizarlo
    let div = document.getElementById(`res-item-${res.id}`);
    if (!div) {
        div = document.createElement('div');
        div.id = `res-item-${res.id}`;
        div.className = "flex justify-between items-center p-4 bg-gray-50 rounded-xl mb-4";
        resultsContainer.appendChild(div);
    }

    const displayVal = convertValue(data.baseVal, unitLabel);

    div.innerHTML = `
        <div>
            <p class="text-gray-500 text-xs uppercase font-bold">${res.label}</p>
            <p class="text-2xl font-mono">${displayVal}</p>
        </div>
        <button onclick="cycleUnit('${res.id}')" class="bg-white border px-3 py-1 rounded-lg text-sm shadow-sm hover:bg-gray-100 transition">
            ${unitLabel} 🔄
        </button>
    `;
}

// 6. Cambio de Unidades (Ciclo)
function cycleUnit(resId) {
    const data = currentResults[resId];
    data.currentUnitIndex = (data.currentUnitIndex + 1) % data.units.length;
    
    // Buscar la definición original para el label
    const resDef = currentItem.resultados.find(r => r.id === resId);
    renderResultItem(resDef);
}

// 7. Conversor de valores
function convertValue(val, unit) {
    switch (unit.toLowerCase()) {
        case 'kg': return (val / 1000).toFixed(2);
        case 'l': return (val / 1000).toFixed(2);
        case 'ml': return Math.round(val);
        case 'g': return Math.round(val);
        case 'tazas': return (val / 250).toFixed(1);
        case 'cda': return (val / 15).toFixed(1);
        default: return val.toFixed(1);
    }
}

// 8. Navegación (Botones Volver)
function goBack(toStep) {
    document.querySelectorAll('.step-page').forEach(page => page.classList.add('hidden'));
    document.getElementById(toStep).classList.remove('hidden');
}

// Inicializar
loadData();
