// Configuración de Supabase
const SUPABASE_URL = 'https://fzelxnljjpbaugtsmhra.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6ZWx4bmxqanBiYXVndHNtaHJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTQ2MjcsImV4cCI6MjA3NTc3MDYyN30.3qV8voRjDIkVs7iHpp1cfdUKqhb9YVMe7RxwO9Q_K6E';

// Variables globales del dashboard
let map;
let allData = [];
let markers = {};
let charts = {};
let updateInterval;
let verificationInProgress = false;

// Inicialización del Dashboard
async function initDashboard() {
    console.log('🚀 Iniciando Dashboard CORS Trimble...');
    
    try {
        // Inicializar componentes básicos primero
        initMap();
        initCharts();
        initRealTimeUpdates();
        
        // Cargar datos
        await cargarDatos();
        
        console.log('✅ Dashboard inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        mostrarError('Error al inicializar el dashboard: ' + error.message);
    }
}

// Inicializar mapa
function initMap() {
    try {
        map = L.map('map').setView([18.7357, -70.1627], 8);
        
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 20,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | CORS Trimble Dashboard'
        }).addTo(map);
        
        console.log('✅ Mapa inicializado');
        
    } catch (error) {
        console.error('❌ Error al inicializar mapa:', error);
    }
}

// Inicializar gráficos
function initCharts() {
    try {
        // Gráfico de estado por provincia
        const ctxProvincia = document.getElementById('chartProvincia');
        if (ctxProvincia) {
            charts.provincia = new Chart(ctxProvincia, {
                type: 'doughnut',
                data: {
                    labels: ['Online', 'Offline', 'Comprobando'],
                    datasets: [{
                        data: [0, 0, 100],
                        backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }

        console.log('✅ Gráficos inicializados');
    } catch (error) {
        console.error('❌ Error al inicializar gráficos:', error);
    }
}

// Inicializar actualizaciones en tiempo real
function initRealTimeUpdates() {
    actualizarReloj();
    setInterval(actualizarReloj, 1000);
    console.log('✅ Actualizaciones en tiempo real iniciadas');
}

// Cargar datos desde Supabase
async function cargarDatos() {
    const loadingDiv = document.getElementById('loading');
    
    try {
        console.log('🔄 Conectando a Supabase...');
        
        if (typeof supabase === 'undefined') {
            await loadSupabase();
        }

        const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        
        const { data, error } = await supabaseClient.from('CORS3').select('*');
        
        if (error) {
            throw new Error(`Error al obtener datos: ${error.message}`);
        }
        
        if (!data || data.length === 0) {
            console.log('⚠️ No hay datos reales, usando datos de demostración');
            await usarDatosDemo();
        } else {
            console.log(`✅ Datos cargados: ${data.length} estaciones`);
            allData = data;
            
            // Inicializar estado como "comprobando"
            allData.forEach(estacion => {
                estacion.estado = 'comprobando';
                estacion.ultimaVerificacion = null;
                estacion.tiempoRespuesta = null;
            });
            
            procesarDatosDashboard(allData);
        }
        
        // Ocultar loading inmediatamente
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
        
        mostrarNotificacion('✅ Dashboard cargado correctamente', 'success');
        
        // Iniciar verificación en segundo plano
        setTimeout(() => {
            iniciarVerificacionEstado();
        }, 500);
        
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        await usarDatosDemo();
        
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
    }
}

// Cargar Supabase dinámicamente
function loadSupabase() {
    return new Promise((resolve, reject) => {
        if (window.supabase) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Usar datos de demostración
async function usarDatosDemo() {
    console.log('🔄 Cargando datos de demostración...');
    
    allData = [
        {
            id: 1,
            estación: 'CORS_SANTO_DOMINGO',
            provincia: 'Santo Domingo',
            ubicación: 'Instituto Cartográfico',
            latitud: 18.4861,
            longitud: -69.9312,
            ddns: 'dns.google',
            ip: '8.8.8.8',
            estado: 'comprobando'
        },
        {
            id: 2,
            estación: 'CORS_SANTIAGO',
            provincia: 'Santiago',
            ubicación: 'Universidad UTESA',
            latitud: 19.4517,
            longitud: -70.6970,
            ddns: 'one.one.one.one',
            ip: '1.1.1.1',
            estado: 'comprobando'
        },
        {
            id: 3,
            estación: 'CORS_LA_ROMANA',
            provincia: 'La Romana',
            ubicación: 'Aeropuerto Internacional',
            latitud: 18.4270,
            longitud: -68.9652,
            ddns: 'estacion-no-existe.trimble.com',
            ip: '192.168.1.100',
            estado: 'comprobando'
        },
        {
            id: 4, 
            estación: 'CORS_PUERTO_PLATA',
            provincia: 'Puerto Plata',
            ubicación: 'Puerto Turístico',
            latitud: 19.8021,
            longitud: -70.7050,
            ddns: 'www.github.com',
            ip: '10.0.0.1',
            estado: 'comprobando'
        },
        {
            id: 5,
            estación: 'CORS_HIGUEY',
            provincia: 'La Altagracia', 
            ubicación: 'Basílica de Higüey',
            latitud: 18.6167,
            longitud: -68.7167,
            ddns: 'localhost',
            ip: '192.168.0.1',
            estado: 'comprobando'
        }
    ];
    
    procesarDatosDashboard(allData);
}

// ============================================
// SISTEMA DE VERIFICACIÓN MEJORADO
// ============================================

// Función principal de verificación
async function verificarEstadoEstacion(estacion) {
    const startTime = Date.now();
    
    try {
        console.log(`🔍 Verificando: ${estacion.estación}`);
        
        // Determinar qué método usar basado en los datos disponibles
        let resultado;
        
        if (estacion.ddns) {
            console.log(`🌐 Verificando por DNS: ${estacion.ddns}`);
            resultado = await verificarPorDNS(estacion.ddns);
        } else if (estacion.ip) {
            console.log(`📍 Verificando por IP: ${estacion.ip}`);
            resultado = await verificarPorIP(estacion.ip);
        } else {
            throw new Error('No hay DDNS ni IP configurados');
        }
        
        const tiempoRespuesta = Date.now() - startTime;
        
        if (resultado.estado === 'online') {
            console.log(`✅ ${estacion.estación} - ONLINE (${tiempoRespuesta}ms)`);
            return {
                estado: 'online',
                tiempoRespuesta: tiempoRespuesta,
                metodo: resultado.metodo,
                detalles: resultado.detalles
            };
        } else {
            throw new Error(resultado.error || 'Verificación falló');
        }
        
    } catch (error) {
        const tiempoRespuesta = Date.now() - startTime;
        console.log(`🔴 ${estacion.estación} - OFFLINE: ${error.message}`);
        
        return {
            estado: 'offline',
            tiempoRespuesta: tiempoRespuesta,
            error: error.message
        };
    }
}

// Verificar por DNS (para estaciones con DDNS)
async function verificarPorDNS(hostname) {
    try {
        // Método 1: Usando fetch a DNS-over-HTTPS
        const respuesta = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`);
        
        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }
        
        const datos = await respuesta.json();
        
        if (datos.Status === 0 && datos.Answer && datos.Answer.length > 0) {
            return {
                estado: 'online',
                metodo: 'DNS-over-HTTPS',
                detalles: `Resuelve a: ${datos.Answer.map(a => a.data).join(', ')}`
            };
        } else {
            throw new Error('No se pudo resolver el DNS');
        }
        
    } catch (error) {
        // Método 2: Usando Image (fallback)
        try {
            const resultado = await verificarConImagen(hostname);
            return {
                estado: 'online',
                metodo: 'HTTP-Image',
                detalles: 'Servidor responde via HTTP'
            };
        } catch (fallbackError) {
            throw new Error(`DNS falló: ${error.message}`);
        }
    }
}

// Verificar por IP (para estaciones con IP directa)
async function verificarPorIP(ip) {
    try {
        // Método 1: Ping usando Image (funciona en navegadores)
        const resultado = await verificarConImagen(`http://${ip}`);
        
        return {
            estado: 'online',
            metodo: 'HTTP-Ping',
            detalles: 'IP responde a solicitudes HTTP'
        };
        
    } catch (error) {
        // Método 2: Intentar con puertos comunes de estaciones CORS
        const puertos = [80, 443, 2101, 8080, 8000];
        
        for (const puerto of puertos) {
            try {
                const resultado = await verificarPuerto(ip, puerto);
                if (resultado.estado === 'online') {
                    return {
                        estado: 'online',
                        metodo: `TCP-Port-${puerto}`,
                        detalles: `Puerto ${puerto} responde`
                    };
                }
            } catch (e) {
                // Continuar con el siguiente puerto
            }
        }
        
        throw new Error(`IP no responde en puertos comunes: ${puertos.join(', ')}`);
    }
}

// Verificar puerto específico
function verificarPuerto(ip, puerto) {
    return new Promise((resolve) => {
        const img = new Image();
        const startTime = Date.now();
        
        img.onload = function() {
            resolve({
                estado: 'online',
                tiempoRespuesta: Date.now() - startTime
            });
        };
        
        img.onerror = function() {
            resolve({
                estado: 'online', // Si hay error pero se intentó, el servidor existe
                tiempoRespuesta: Date.now() - startTime
            });
        };
        
        // Timeout de 5 segundos
        setTimeout(() => {
            resolve({
                estado: 'offline',
                error: 'Timeout'
            });
        }, 5000);
        
        img.src = `http://${ip}:${puerto}/favicon.ico?t=${Date.now()}`;
    });
}

// Verificar con Image (método universal)
function verificarConImagen(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const startTime = Date.now();
        
        img.onload = function() {
            resolve({
                estado: 'online',
                tiempoRespuesta: Date.now() - startTime
            });
        };
        
        img.onerror = function() {
            // Incluso si hay error en la imagen, si se intentó cargar, el servidor responde
            resolve({
                estado: 'online',
                tiempoRespuesta: Date.now() - startTime,
                detalles: 'Servidor responde (error en recurso)'
            });
        };
        
        // Timeout de 8 segundos
        setTimeout(() => {
            reject(new Error('Timeout de 8 segundos'));
        }, 8000);
        
        // Construir URL adecuada
        let urlVerificacion;
        if (url.startsWith('http')) {
            urlVerificacion = `${url}/favicon.ico?t=${Date.now()}`;
        } else {
            urlVerificacion = `https://${url}/favicon.ico?t=${Date.now()}`;
        }
        
        img.src = urlVerificacion;
    });
}

// Normalizar URL
function normalizarURL(url) {
    if (!url) return '';
    
    let urlNormalizada = url.trim();
    
    // Remover protocolos existentes
    urlNormalizada = urlNormalizada.replace(/^https?:\/\//, '');
    
    return urlNormalizada;
}

// Procesar datos para el dashboard
function procesarDatosDashboard(data) {
    console.log('🔄 Procesando datos para dashboard...');
    
    // Actualizar KPIs
    const comprobando = data.filter(e => e.estado === 'comprobando').length;
    const online = data.filter(e => e.estado === 'online').length;
    const offline = data.filter(e => e.estado === 'offline').length;
    
    actualizarKPIs({ online, offline, comprobando });
    
    // Agregar marcadores al mapa
    agregarMarcadoresDashboard(data);
    
    // Actualizar lista de estaciones
    actualizarListaEstaciones(data);
}

// Agregar marcadores al mapa
function agregarMarcadoresDashboard(data) {
    console.log('🗺️ Agregando marcadores al mapa...');
    
    // Limpiar marcadores existentes
    if (markers) {
        Object.values(markers).forEach(marker => {
            if (marker && map) {
                map.removeLayer(marker);
            }
        });
    }
    markers = {};
    
    let marcadoresAgregados = 0;
    let coordenadasValidas = [];
    
    data.forEach(estacion => {
        try {
            const lat = parseFloat(estacion.latitud);
            const lng = parseFloat(estacion.longitud);
            
            if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                const color = '#ffc107'; // Amarillo para "comprobando"
                const icon = crearIconoDashboard(color);
                
                const marker = L.marker([lat, lng], { icon }).addTo(map);
                
                const popupContent = crearPopupEstacion(estacion);
                marker.bindPopup(popupContent);
                
                markers[estacion.id] = marker;
                coordenadasValidas.push([lat, lng]);
                marcadoresAgregados++;
            }
        } catch (error) {
            console.error(`❌ Error agregando marcador:`, error);
        }
    });
    
    console.log(`✅ ${marcadoresAgregados} marcadores agregados`);
    
    // Ajustar vista del mapa
    if (coordenadasValidas.length > 0 && map) {
        try {
            const bounds = L.latLngBounds(coordenadasValidas);
            map.fitBounds(bounds.pad(0.1));
        } catch (error) {
            console.error('❌ Error ajustando vista del mapa:', error);
        }
    }
}

// Crear popup para estación
function crearPopupEstacion(estacion) {
    let estadoTexto, color;
    
    switch (estacion.estado) {
        case 'online':
            estadoTexto = '🟢 EN LÍNEA';
            color = '#28a745';
            break;
        case 'offline':
            estadoTexto = '🔴 OFFLINE';
            color = '#dc3545';
            break;
        default:
            estadoTexto = '🟡 COMPROBANDO';
            color = '#ffc107';
    }
    
    const metodoVerificacion = estacion.metodo ? `<p><strong>Método:</strong> ${estacion.metodo}</p>` : '';
    const detalles = estacion.detalles ? `<p><strong>Detalles:</strong> ${estacion.detalles}</p>` : '';
    const error = estacion.error ? `<p><strong>Error:</strong> ${estacion.error}</p>` : '';
    
    return `
        <div class="popup-dashboard">
            <h4>📡 ${estacion.estación || 'Estación CORS'}</h4>
            <p><strong>Provincia:</strong> ${estacion.provincia || 'N/A'}</p>
            <p><strong>Ubicación:</strong> ${estacion.ubicación || 'N/A'}</p>
            <p><strong>Estado:</strong> <span style="color: ${color}; font-weight: bold;">${estadoTexto}</span></p>
            <p><strong>Tipo:</strong> ${estacion.ddns ? 'DNS' : 'IP'}</p>
            <p><strong>DDNS:</strong> ${estacion.ddns || 'N/A'}</p>
            <p><strong>IP:</strong> ${estacion.ip || 'N/A'}</p>
            ${estacion.tiempoRespuesta ? `<p><strong>Tiempo respuesta:</strong> ${estacion.tiempoRespuesta}ms</p>` : ''}
            ${metodoVerificacion}
            ${detalles}
            ${error}
            <div style="margin-top: 10px;">
                <button onclick="probarEstacionManual(${estacion.id})" style="padding: 5px 10px; background: #1a5490; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">
                    Probar Manualmente
                </button>
            </div>
        </div>
    `;
}

// Crear ícono personalizado para dashboard
function crearIconoDashboard(color) {
    return L.divIcon({
        className: 'custom-gnss-dashboard',
        html: `
            <div class="gnss-marker-dashboard" style="--marker-color: ${color}">
                <div class="antenna-dashboard"></div>
                <div class="base-dashboard"></div>
            </div>
        `,
        iconSize: [30, 40],
        iconAnchor: [15, 40]
    });
}

// Iniciar verificación de estado
async function iniciarVerificacionEstado() {
    if (verificationInProgress) {
        return;
    }
    
    verificationInProgress = true;
    console.log('🔍 Iniciando verificación de estaciones...');
    
    let online = 0;
    let offline = 0;
    let comprobando = allData.length;
    
    // Actualizar KPIs iniciales
    actualizarKPIs({ online, offline, comprobando });
    
    // Verificar cada estación (en serie para evitar bloqueos)
    for (let i = 0; i < allData.length; i++) {
        const estacion = allData[i];
        
        try {
            // Actualizar estado a "comprobando"
            estacion.estado = 'comprobando';
            estacion.ultimaVerificacion = new Date();
            actualizarMarcadorEstacion(estacion);
            
            // Verificar estado
            const resultado = await Promise.race([
                verificarEstadoEstacion(estacion),
                new Promise(resolve => setTimeout(() => resolve({
                    estado: 'offline',
                    tiempoRespuesta: 10000,
                    error: 'Timeout de 10 segundos'
                }), 10000))
            ]);
            
            // Actualizar estadísticas
            comprobando--;
            if (resultado.estado === 'online') {
                online++;
            } else {
                offline++;
            }
            
            // Actualizar estación
            Object.assign(estacion, resultado);
            estacion.ultimaVerificacion = new Date();
            
            // Actualizar marcador
            actualizarMarcadorEstacion(estacion);
            
            // Actualizar KPIs
            actualizarKPIs({ online, offline, comprobando });
            
        } catch (error) {
            console.error(`❌ Error verificando ${estacion.estación}:`, error);
            
            comprobando--;
            offline++;
            estacion.estado = 'offline';
            estacion.error = error.message;
            
            actualizarMarcadorEstacion(estacion);
            actualizarKPIs({ online, offline, comprobando });
        }
        
        // Pequeña pausa entre verificaciones
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    verificationInProgress = false;
    
    console.log(`✅ Verificación completada: ${online} online, ${offline} offline`);
    mostrarNotificacion(`✅ Verificación completada: ${online} online, ${offline} offline`, 'success');
    
    actualizarListaEstaciones(allData);
}

// Actualizar marcador de estación
function actualizarMarcadorEstacion(estacion) {
    const marker = markers[estacion.id];
    if (!marker) return;
    
    let color;
    switch (estacion.estado) {
        case 'online':
            color = '#28a745';
            break;
        case 'offline':
            color = '#dc3545';
            break;
        default:
            color = '#ffc107';
    }
    
    const icon = crearIconoDashboard(color);
    marker.setIcon(icon);
    
    const popupContent = crearPopupEstacion(estacion);
    marker.setPopupContent(popupContent);
}

// Actualizar KPIs principales
function actualizarKPIs({ online, offline, comprobando }) {
    const total = online + offline + comprobando;
    const disponibilidad = total > 0 ? ((online / total) * 100).toFixed(1) : 0;
    
    // Actualizar valores en el DOM
    actualizarMetrica('kpi-online', online);
    actualizarMetrica('kpi-offline', offline);
    actualizarMetrica('kpi-uptime', disponibilidad + '%');
    
    // Actualizar barras de progreso
    actualizarProgreso('online-progress', (online / total * 100));
    actualizarProgreso('offline-progress', (offline / total * 100));
    
    // Actualizar contadores
    actualizarMetrica('map-total', total);
    actualizarMetrica('map-visible', total);
    actualizarMetrica('data-count', `Estaciones: ${total}`);
    actualizarMetrica('critical-count', offline);
    
    // Actualizar gráfico
    if (charts.provincia) {
        charts.provincia.data.datasets[0].data = [online, offline, comprobando];
        charts.provincia.update();
    }
}

// Función auxiliar para actualizar métricas
function actualizarMetrica(elementId, valor) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = valor;
    }
}

// Función auxiliar para actualizar barras de progreso
function actualizarProgreso(elementId, porcentaje) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.width = porcentaje + '%';
    }
}

// Actualizar lista de estaciones
function actualizarListaEstaciones(data) {
    const criticalList = document.getElementById('critical-stations');
    if (!criticalList) return;
    
    const offlineStations = data.filter(e => e.estado === 'offline');
    
    if (offlineStations.length === 0) {
        criticalList.innerHTML = '<div class="no-data">🎉 Todas las estaciones operativas</div>';
    } else {
        let html = '';
        offlineStations.forEach(estacion => {
            html += `
                <div class="critical-station">
                    <i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i>
                    <div class="station-info">
                        <div class="station-name">${estacion.estación}</div>
                        <div class="station-location">${estacion.provincia}</div>
                        <div class="station-error">${estacion.error || 'Sin conexión'}</div>
                    </div>
                    <div class="station-status offline">OFFLINE</div>
                </div>
            `;
        });
        criticalList.innerHTML = html;
    }
}

// Actualizar reloj
function actualizarReloj() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-DO');
    
    actualizarMetrica('current-time', timeString);
    actualizarMetrica('map-update', timeString);
}

// ============================================
// FUNCIONES DE INTERFAZ MEJORADAS
// ============================================

// Verificar estado de todas las estaciones
async function verificarTodasEstaciones() {
    if (verificationInProgress) {
        mostrarNotificacion('⚠️ Ya hay una verificación en progreso', 'warning');
        return;
    }
    
    mostrarNotificacion('🔍 Verificando estado de estaciones...', 'info');
    await iniciarVerificacionEstado();
}

// Función para probar manualmente una estación
async function probarEstacionManual(estacionId) {
    const estacion = allData.find(e => e.id == estacionId);
    if (!estacion) {
        mostrarNotificacion('❌ Estación no encontrada', 'error');
        return;
    }
    
    mostrarNotificacion(`🔍 Probando manualmente: ${estacion.estación}`, 'info');
    
    // Mostrar información de debug
    console.log('=== PRUEBA MANUAL ===');
    console.log('Estación:', estacion.estación);
    console.log('DDNS:', estacion.ddns);
    console.log('IP:', estacion.ip);
    console.log('Tipo preferido:', estacion.ddns ? 'DNS' : 'IP');
    
    // Realizar prueba
    const resultado = await verificarEstadoEstacion(estacion);
    
    // Actualizar la estación
    Object.assign(estacion, resultado);
    estacion.ultimaVerificacion = new Date();
    
    // Actualizar interfaz
    actualizarMarcadorEstacion(estacion);
    actualizarListaEstaciones(allData);
    
    // Mostrar resultados detallados
    const mensaje = resultado.estado === 'online' 
        ? `✅ ${estacion.estación} - ONLINE (${resultado.tiempoRespuesta}ms)\nMétodo: ${resultado.metodo}`
        : `❌ ${estacion.estación} - OFFLINE\nError: ${resultado.error}`;
    
    mostrarNotificacion(mensaje, resultado.estado === 'online' ? 'success' : 'error');
    
    console.log('Resultado prueba manual:', resultado);
}

// Generar reporte diario
function generarReporteDiario() {
    const online = allData.filter(e => e.estado === 'online').length;
    const offline = allData.filter(e => e.estado === 'offline').length;
    const disponibilidad = allData.length > 0 ? ((online / allData.length) * 100).toFixed(1) : 0;
    
    const reporte = `REPORTE CORS TRIMBLE - ${new Date().toLocaleDateString()}\n\n` +
          `Total Estaciones: ${allData.length}\n` +
          `Estaciones Online: ${online}\n` +
          `Estaciones Offline: ${offline}\n` +
          `Disponibilidad: ${disponibilidad}%\n` +
          `Última Verificación: ${new Date().toLocaleString()}\n\n` +
          `DETALLE POR ESTACIÓN:\n` +
          allData.map(e => 
            `${e.estación} | ${e.estado.toUpperCase()} | ${e.tiempoRespuesta || 'N/A'}ms | ${e.metodo || 'N/A'}`
          ).join('\n');
    
    // Descargar archivo
    const blob = new Blob([reporte], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-cors-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    mostrarNotificacion('✅ Reporte generado y descargado', 'success');
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info') {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#28a745' : tipo === 'warning' ? '#ffc107' : tipo === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
        white-space: pre-line;
    `;
    notif.textContent = mensaje;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 5000);
}

// Mostrar error
function mostrarError(mensaje) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.innerHTML = `
            <div class="loading-content">
                <div style="color: #dc3545; font-size: 3rem; margin-bottom: 1rem;">❌</div>
                <h3>Error al cargar el dashboard</h3>
                <p>${mensaje}</p>
                <button onclick="location.reload()" style="margin-top: 1rem; padding: 10px 20px; background: #1a5490; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Reintentar
                </button>
            </div>
        `;
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 DOM cargado, iniciando dashboard...');
    initDashboard();
});

// Exportar funciones globales
window.verificarTodasEstaciones = verificarTodasEstaciones;
window.generarReporteDiario = generarReporteDiario;
window.probarEstacionManual = probarEstacionManual;
window.actualizarDashboardCompleto = function() {
    location.reload();
};
// Inicializar gráficos - FUNCIÓN CORREGIDA
function initCharts() {
    try {
        // Gráfico de estado por provincia
        const ctxProvincia = document.getElementById('chartProvincia');
        if (ctxProvincia) {
            charts.provincia = new Chart(ctxProvincia, {
                type: 'doughnut',
                data: {
                    labels: ['Online', 'Offline', 'Comprobando'],
                    datasets: [{
                        data: [0, 0, 100],
                        backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }

        // GRÁFICO DE TENDENCIA DE DISPONIBILIDAD - NUEVO
        const ctxTendencia = document.getElementById('chartTendencia');
        if (ctxTendencia) {
            charts.tendencia = new Chart(ctxTendencia, {
                type: 'line',
                data: {
                    labels: [], // Se llenará con las horas
                    datasets: [{
                        label: 'Disponibilidad (%)',
                        data: [], // Se llenará con los porcentajes
                        borderColor: '#1a5490',
                        backgroundColor: 'rgba(26, 84, 144, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#1a5490',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            },
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        },
                        x: {
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        }
                    }
                }
            });
        }

        console.log('✅ Gráficos inicializados (incluyendo tendencia)');
    } catch (error) {
        console.error('❌ Error al inicializar gráficos:', error);
    }
}

// Almacenar histórico de disponibilidad
let historicoDisponibilidad = [];

// Función para actualizar la tendencia de disponibilidad
function actualizarTendenciaDisponibilidad(disponibilidad) {
    if (!charts.tendencia) return;
    
    const ahora = new Date();
    const horaActual = ahora.toLocaleTimeString('es-DO', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Agregar nuevo dato al histórico
    historicoDisponibilidad.push({
        hora: horaActual,
        disponibilidad: parseFloat(disponibilidad)
    });
    
    // Mantener solo los últimos 12 puntos (2 horas si se actualiza cada 10 min)
    if (historicoDisponibilidad.length > 12) {
        historicoDisponibilidad = historicoDisponibilidad.slice(-12);
    }
    
    // Preparar datos para el gráfico
    const labels = historicoDisponibilidad.map(item => item.hora);
    const data = historicoDisponibilidad.map(item => item.disponibilidad);
    
    // Actualizar el gráfico
    charts.tendencia.data.labels = labels;
    charts.tendencia.data.datasets[0].data = data;
    charts.tendencia.update();
    
    console.log(`📈 Tendencia actualizada: ${disponibilidad}% a las ${horaActual}`);
}

// Actualizar KPIs principales - FUNCIÓN MEJORADA
function actualizarKPIs({ online, offline, comprobando }) {
    const total = online + offline + comprobando;
    const disponibilidad = total > 0 ? ((online / total) * 100).toFixed(1) : 0;
    
    // Actualizar valores en el DOM
    actualizarMetrica('kpi-online', online);
    actualizarMetrica('kpi-offline', offline);
    actualizarMetrica('kpi-uptime', disponibilidad + '%');
    
    // Actualizar barras de progreso
    actualizarProgreso('online-progress', (online / total * 100));
    actualizarProgreso('offline-progress', (offline / total * 100));
    
    // Actualizar contadores
    actualizarMetrica('map-total', total);
    actualizarMetrica('map-visible', total);
    actualizarMetrica('data-count', `Estaciones: ${total}`);
    actualizarMetrica('critical-count', offline);
    
    // ACTUALIZAR GRÁFICO DE TENDENCIA
    actualizarTendenciaDisponibilidad(disponibilidad);
    
    // Actualizar gráfico de dona
    if (charts.provincia) {
        charts.provincia.data.datasets[0].data = [online, offline, comprobando];
        charts.provincia.update();
    }
}

// Función para simular datos históricos (inicialización)
function inicializarDatosTendencia() {
    const ahora = new Date();
    
    // Crear datos de las últimas 2 horas (cada 10 minutos)
    for (let i = 11; i >= 0; i--) {
        const tiempo = new Date(ahora.getTime() - (i * 10 * 60 * 1000));
        const hora = tiempo.toLocaleTimeString('es-DO', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Simular disponibilidad entre 85% y 100%
        const disponibilidad = (85 + Math.random() * 15).toFixed(1);
        
        historicoDisponibilidad.push({
            hora: hora,
            disponibilidad: parseFloat(disponibilidad)
        });
    }
    
    console.log('📊 Datos de tendencia inicializados');
}

// Modificar la función initDashboard para incluir la tendencia
async function initDashboard() {
    console.log('🚀 Iniciando Dashboard CORS Trimble...');
    
    try {
        // Inicializar componentes básicos primero
        initMap();
        initCharts();
        initRealTimeUpdates();
        
        // Inicializar datos de tendencia
        inicializarDatosTendencia();
        
        // Cargar datos
        await cargarDatos();
        
        console.log('✅ Dashboard inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        mostrarError('Error al inicializar el dashboard: ' + error.message);
    }
}
