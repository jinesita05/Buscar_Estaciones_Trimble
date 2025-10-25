// Configuración de Supabase
const SUPABASE_URL = 'https://fzelxnljjpbaugtsmhra.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6ZWx4bmxqanBiYXVndHNtaHJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTQ2MjcsImV4cCI6MjA3NTc3MDYyN30.3qV8voRjDIkVs7iHpp1cfdUKqhb9YVMe7RxwO9Q_K6E';

let map;
let allData = [];
let markers = {};
let measurementMode = false;
let measurementPoints = [];
let measurementLine = null;
let measurementMarkers = [];

// Inicializar mapa
function initMap() {
    map = L.map('map', {
        attributionControl: true,
        zoomControl: true
    }).setView([18.7357, -70.1627], 8);
    
    // Definir múltiples mapas base
    var osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    
    var satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });
    
    var terrain = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
        maxZoom: 17,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    });
    
    // Agregar mapa base por defecto (OpenStreetMap)
    osm.addTo(map);
    
    // Crear control de capas
    var baseMaps = {
        "🗺️ OpenStreetMap": osm,
        "🛰️ Satélite": satellite,
        "🏔️ Terreno": terrain
    };
    
    L.control.layers(baseMaps, null, {
        position: 'topright',
        collapsed: true
    }).addTo(map);
    
    // Personalizar el recuadro de atribución para hacerlo MÁS VISIBLE
    setTimeout(() => {
        const attribution = document.querySelector('.leaflet-control-attribution');
        if (attribution) {
            attribution.style.cssText = `
                background: rgba(255, 255, 255, 0.98) !important;
                padding: 15px 25px !important;
                border-radius: 10px !important;
                box-shadow: 0 5px 20px rgba(0,0,0,0.4) !important;
                font-size: 16px !important;
                font-weight: 700 !important;
                border: 4px solid #1a5490 !important;
                margin: 0 20px 20px 0 !important;
                min-height: 50px !important;
                display: flex !important;
                align-items: center !important;
                z-index: 1000 !important;
            `;
            
            // Estilizar los enlaces dentro de la atribución
            const links = attribution.querySelectorAll('a');
            links.forEach(link => {
                link.style.color = '#1a5490';
                link.style.fontWeight = '800';
                link.style.textDecoration = 'underline';
                link.style.fontSize = '16px';
            });
        }
    }, 200);
    
    // Evento de click en el mapa para medición
    map.on('click', function(e) {
        if (measurementMode) {
            agregarPuntoMedicion(e.latlng);
        }
    });
}

// Cargar datos desde Supabase
async function cargarDatos() {
    const loadingDiv = document.getElementById('loading');
    
    try {
        // Verificar que Supabase esté disponible
        if (!window.supabase) {
            throw new Error('La librería de Supabase no está cargada');
        }

        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        
        console.log('Conectando a Supabase...');
        const { data, error } = await supabase.from('CORS3').select('*');
        
        if (error) {
            console.error('Error Supabase:', error);
            throw new Error(`Error Supabase: ${error.message}`);
        }
        
        if (!data || data.length === 0) {
            throw new Error('No se encontraron datos en la tabla CORS3');
        }

        console.log(`✓ Datos cargados: ${data.length} estaciones`);
        console.log('Columnas disponibles:', Object.keys(data[0]));
        console.log('Primera estación (ejemplo):', data[0]);
        
        allData = data;
        
        // Ocultar completamente el loading
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
        
        mostrarEstadisticas(data);
        cargarProvincias(data);
        agregarMarcadores(data);
        
    } catch (e) {
        console.error('Error completo:', e);
        if (loadingDiv) {
            loadingDiv.style.display = 'block';
            loadingDiv.innerHTML = `
                <h2 style="color: #dc3545;">❌ Error al cargar datos</h2>
                <p style="color: #666;">${e.message}</p>
                <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🔄 Reintentar
                </button>`;
        }
    }
}

// Actualizar estadísticas de estado en el header
function actualizarEstadisticasEstado(online, offline) {
    const statsOnline = document.getElementById('stats-online');
    const statsOffline = document.getElementById('stats-offline');
    
    if (statsOnline) {
        statsOnline.textContent = online;
        // Animación de actualización
        statsOnline.style.transform = 'scale(1.2)';
        setTimeout(() => {
            statsOnline.style.transform = 'scale(1)';
        }, 200);
    }
    
    if (statsOffline) {
        statsOffline.textContent = offline;
        // Animación de actualización
        statsOffline.style.transform = 'scale(1.2)';
        setTimeout(() => {
            statsOffline.style.transform = 'scale(1)';
        }, 200);
    }
}

// Mostrar estadísticas
function mostrarEstadisticas(data) {
    const stats = document.getElementById('stats');
    const total = data.length;
    const provincias = [...new Set(data.map(d => d.provincia).filter(Boolean))].length;
    const redes = [...new Set(data.map(d => d.red).filter(Boolean))].length;

    stats.innerHTML = `
        <div class="stat-card-small">
            <h3>${total}</h3>
            <p>Total</p>
        </div>
        <div class="stat-card-small">
            <h3>${provincias}</h3>
            <p>Provincias</p>
        </div>
        <div class="stat-card-small">
            <h3>${redes}</h3>
            <p>Redes</p>
        </div>
        <div class="stat-card-small">
            <h3 id="stats-online" style="color: #28a745;">0</h3>
            <p>En Línea</p>
        </div>
        <div class="stat-card-small">
            <h3 id="stats-offline" style="color: #dc3545;">0</h3>
            <p>Fuera de Línea</p>
        </div>`;
}

// Cargar provincias
function cargarProvincias(data) {
    const select = document.getElementById('provinciaSelect');
    select.innerHTML = '<option value="">-- Seleccionar provincia --</option>';
    const provincias = [...new Set(data.map(i => i.provincia).filter(Boolean))].sort();
    provincias.forEach(p => {
        const o = document.createElement('option');
        o.value = p;
        o.textContent = p;
        select.appendChild(o);
    });
}

// Crear ícono con color según estado (tamaño duplicado)
function crearIcono(color = '#cccc00') {
    return L.divIcon({
        className: 'custom-gnss-icon',
        html: `
            <div class="gnss-station" style="--icon-color:${color}; transform: scale(2);">
                <div class="antenna" style="background:${color}"></div>
                <div class="base" style="background:${color}"></div>
            </div>`,
        iconSize: [60, 80],
        iconAnchor: [30, 70]
    });
}

// MEJORADA: Verificación de estado con múltiples estrategias
async function verificarEstado(estacion) {
    const nombreEstacion = obtenerNombreEstacion(estacion);
    console.log(`🔍 Iniciando verificación para: ${nombreEstacion}`);
    
    const urls = [];
    
    // Agregar DDNS si está disponible
    if (estacion.ddns && estacion.ddns.trim() !== '') {
        let ddnsUrl = estacion.ddns.trim();
        // Asegurar que tenga protocolo http
        if (!ddnsUrl.startsWith('http://') && !ddnsUrl.startsWith('https://')) {
            ddnsUrl = 'http://' + ddnsUrl;
        }
        urls.push({ url: ddnsUrl, tipo: 'DDNS' });
    }
    
    // Agregar IP si está disponible (como fallback)
    if (estacion.ip && estacion.ip.trim() !== '') {
        let ipUrl = estacion.ip.trim();
        // Asegurar que tenga protocolo http
        if (!ipUrl.startsWith('http://') && !ipUrl.startsWith('https://')) {
            ipUrl = 'http://' + ipUrl;
        }
        urls.push({ url: ipUrl, tipo: 'IP' });
    }
    
    if (urls.length === 0) {
        console.log(`❌ No hay URLs para verificar: ${nombreEstacion}`);
        return 'offline';
    }
    
    console.log(`📡 URLs a verificar para ${nombreEstacion}:`, urls);

    // Estrategia 1: Intentar con fetch directo (para servidores con CORS habilitado)
    for (const {url, tipo} of urls) {
        try {
            console.log(`🔄 Intentando ${tipo}: ${url}`);
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            
            // Usar fetch con modo 'no-cors' para evitar problemas CORS
            const response = await fetch(url, { 
                method: 'GET',
                mode: 'no-cors',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; CORS-Checker/1.0)'
                }
            });
            
            clearTimeout(timeout);
            console.log(`✅ ${nombreEstacion} - EN LÍNEA via ${tipo}`);
            return 'online';
            
        } catch (error) {
            console.log(`❌ Falló ${tipo} (${url}):`, error.message);
            // Continuar con la siguiente URL
        }
    }
    
    // Estrategia 2: Intentar con Image() como fallback (evita CORS)
    for (const {url, tipo} of urls) {
        try {
            console.log(`🔄 Intentando fallback con Image para ${tipo}: ${url}`);
            
            const result = await new Promise((resolve) => {
                const img = new Image();
                let timeoutId = setTimeout(() => {
                    img.onload = img.onerror = null;
                    resolve('timeout');
                }, 3000);
                
                img.onload = function() {
                    clearTimeout(timeoutId);
                    resolve('online');
                };
                
                img.onerror = function() {
                    clearTimeout(timeoutId);
                    resolve('offline');
                };
                
                img.src = url + '?t=' + Date.now(); // Cache buster
            });
            
            if (result === 'online') {
                console.log(`✅ ${nombreEstacion} - EN LÍNEA via Image fallback (${tipo})`);
                return 'online';
            }
            
        } catch (error) {
            console.log(`❌ Falló Image fallback para ${tipo}:`, error.message);
        }
    }

    console.log(`❌ ${nombreEstacion} - FUERA DE LÍNEA (todas las estrategias fallaron)`);
    return 'offline';
}

// Función para obtener el nombre de la estación
function obtenerNombreEstacion(estacion) {
    // Usar el campo "estación" (minúscula con tilde)
    return estacion['estación'] || 'Sin nombre';
}

// Función para obtener coordenadas de forma flexible
function obtenerCoordenadas(estacion) {
    // Usar las columnas correctas de la base de datos
    const lat = parseFloat(
        estacion.latitud || 
        estacion['coord.2016'] ||
        estacion.lat
    );
    
    const lng = parseFloat(
        estacion.longitud || 
        estacion['coord.20_1'] ||
        estacion.lon
    );
    
    return { lat, lng };
}

// MEJORADA: Agregar marcadores con mejor información y verificación
async function agregarMarcadores(data) {
    // Limpiar marcadores existentes
    Object.values(markers).forEach(m => map.removeLayer(m));
    markers = {};
    const nuevos = [];

    console.log(`Intentando agregar ${data.length} marcadores...`);

    // Mostrar mensaje de verificación
    const msg = document.createElement('div');
    msg.id = 'mensaje-verificacion';
    msg.style.cssText = `
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: #1a5490;
        color: white;
        padding: 12px 24px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 1000;
        font-weight: bold;
        border: 2px solid #ffd700;
        text-align: center;
        max-width: 90%;
    `;
    msg.innerHTML = '🔄 Verificando estado de las estaciones...<br><small>Esto puede tomar unos segundos</small>';
    document.body.appendChild(msg);

    let marcadoresValidos = 0;

    // Dibujar todas las estaciones
    for (const estacion of data) {
        const { lat, lng } = obtenerCoordenadas(estacion);
        
        if (isNaN(lat) || isNaN(lng)) {
            console.warn(`Coordenadas inválidas para estación:`, estacion);
            continue;
        }

        const nombreEstacion = obtenerNombreEstacion(estacion);
        const marker = L.marker([lat, lng], { icon: crearIcono('#cccc00') }).addTo(map);
        nuevos.push(marker);
        
        // Usar un ID único
        const estacionId = estacion.id || nombreEstacion.replace(/\s+/g, '_') || `estacion_${marcadoresValidos}`;
        markers[estacionId] = marker;
        marcadoresValidos++;

        // MEJORADA: Función para generar el contenido del popup con mejor formato
        const generarPopupContent = (estadoActual = 'comprobando') => {
            let estadoHTML = '🟡 Comprobando...';
            let estadoClase = 'checking';
            if (estadoActual === 'online') {
                estadoHTML = '🟢 En línea';
                estadoClase = 'online';
            } else if (estadoActual === 'offline') {
                estadoHTML = '🔴 Fuera de línea';
                estadoClase = 'offline';
            }
            
            // Formatear mejor la información
            return `
                <div class="popup-content" style="max-width: 320px; font-family: Arial, sans-serif;">
                    <h3 style="margin: 0 0 12px 0; color: #1a5490; border-bottom: 3px solid #ffd700; padding-bottom: 8px;">
                        📡 ${nombreEstacion}
                    </h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                        <div style="background: #f8f9fa; padding: 6px; border-radius: 4px;">
                            <strong>Provincia:</strong><br>${estacion.provincia || '-'}
                        </div>
                        <div style="background: #f8f9fa; padding: 6px; border-radius: 4px;">
                            <strong>Red:</strong><br>${estacion.red || '-'}
                        </div>
                    </div>
                    
                    <div style="background: #e3f2fd; padding: 8px; border-radius: 6px; margin-bottom: 10px;">
                        <strong>Ubicación:</strong><br>${estacion['ubicación'] || estacion.ubicacion || '-'}
                    </div>
                    
                    <div style="background: #f3e5f5; padding: 8px; border-radius: 6px; margin-bottom: 10px;">
                        <strong>Propiedad:</strong><br>${estacion.propiedad || '-'}
                    </div>
                    
                    <div style="margin-bottom: 10px;">
                        <strong style="color: #1a5490;">Conectividad:</strong>
                        <div style="background: #fff3cd; padding: 6px; border-radius: 4px; margin-top: 4px;">
                            <strong>DDNS:</strong> ${estacion.ddns || 'No disponible'}<br>
                            <strong>IP:</strong> ${estacion.ip || 'No disponible'}
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                        <div style="background: #e8f5e8; padding: 6px; border-radius: 4px;">
                            <strong>Usuario NTRIP:</strong><br>${estacion['uruario_nt'] || estacion.usuario_ntrip || '-'}
                        </div>
                        <div style="background: #e8f5e8; padding: 6px; border-radius: 4px;">
                            <strong>Altura Ref:</strong><br>${estacion.altura_ref || '-'}
                        </div>
                    </div>
                    
                    <div style="background: #fff3cd; padding: 8px; border-radius: 6px; margin-bottom: 10px;">
                        <strong>Coordenadas:</strong><br>
                        Lat: ${lat.toFixed(6)}<br>
                        Lon: ${lng.toFixed(6)}
                    </div>
                    
                    <div style="background: ${estadoActual === 'online' ? '#d4edda' : estadoActual === 'offline' ? '#f8d7da' : '#fff3cd'}; 
                                 padding: 8px; border-radius: 6px; text-align: center; font-weight: bold;">
                        <strong>Estado:</strong> ${estadoHTML}
                    </div>
                    
                    ${estadoActual === 'offline' ? `
                    <div style="margin-top: 8px; font-size: 0.8em; color: #666; text-align: center;">
                        <i>Nota: La verificación puede estar afectada por restricciones del navegador</i>
                    </div>
                    ` : ''}
                </div>`;
        };
        
        marker.bindPopup(generarPopupContent('comprobando'));
        
        // Actualizar popup cuando se abre, si ya se verificó el estado
        marker.on('popupopen', function() {
            if (this.estadoVerificado) {
                this.setPopupContent(generarPopupContent(this.estadoVerificado));
            }
        });
        
        // Guardar la función generadora para actualizaciones posteriores
        marker.generarPopupContent = generarPopupContent;
        
        // Guardar referencia a la estación en el marcador para verificación posterior
        marker.estacionData = estacion;
        marker.estacionId = estacionId;
    }

    console.log(`✓ ${marcadoresValidos} marcadores agregados al mapa`);

    // Ajustar vista del mapa
    if (nuevos.length === 1) {
        map.setView(nuevos[0].getLatLng(), 12);
    } else if (nuevos.length > 1) {
        map.fitBounds(L.featureGroup(nuevos).getBounds().pad(0.2));
    }

    // Verificación en segundo plano - CON MEJOR MANEJO DE ERRORES
    let verificacionesCompletadas = 0;
    let estacionesOnline = 0;
    let estacionesOffline = 0;
    const totalVerificaciones = Object.keys(markers).length;
    
    // Actualizar mensaje inicial
    msg.innerHTML = `🔄 Verificando estado (0/${totalVerificaciones})...<br><small>Por favor espere</small>`;
    
    // Verificar cada marcador con delays para no saturar
    Object.values(markers).forEach((marker, index) => {
        setTimeout(async () => {
            const estacion = marker.estacionData;
            const nombreEstacion = obtenerNombreEstacion(estacion);
            
            if (!estacion) return;
            
            try {
                const estado = await verificarEstado(estacion);
                verificacionesCompletadas++;
                
                const color = estado === 'online' ? '#28a745' : '#dc3545';
                marker.setIcon(crearIcono(color));
                
                // Contar estadísticas
                if (estado === 'online') {
                    estacionesOnline++;
                } else {
                    estacionesOffline++;
                }
                
                // Actualizar estadísticas en el header
                actualizarEstadisticasEstado(estacionesOnline, estacionesOffline);
                
                // Guardar el estado en el marcador
                marker.estadoVerificado = estado;
                
                // Actualizar mensaje de progreso
                msg.innerHTML = `🔄 Verificando estado (${verificacionesCompletadas}/${totalVerificaciones})...<br>
                                <small>✅ ${estacionesOnline} en línea | ❌ ${estacionesOffline} fuera de línea</small>`;
                
                // Si el popup está abierto, actualizarlo inmediatamente
                if (marker.isPopupOpen()) {
                    marker.setPopupContent(marker.generarPopupContent(estado));
                }
                
                console.log(`Verificado ${verificacionesCompletadas}/${totalVerificaciones}: ${nombreEstacion} - ${estado}`);
                
            } catch (error) {
                verificacionesCompletadas++;
                estacionesOffline++;
                
                console.error(`💥 Error verificando ${nombreEstacion}:`, error);
                
                // Actualizar estadísticas en el header
                actualizarEstadisticasEstado(estacionesOnline, estacionesOffline);
                
                // En caso de error, marcar como offline
                marker.setIcon(crearIcono('#dc3545'));
                marker.estadoVerificado = 'offline';
                
                // Actualizar mensaje de progreso
                msg.innerHTML = `🔄 Verificando estado (${verificacionesCompletadas}/${totalVerificaciones})...<br>
                                <small>✅ ${estacionesOnline} en línea | ❌ ${estacionesOffline} fuera de línea</small>`;
                
                // Si el popup está abierto, actualizarlo inmediatamente
                if (marker.isPopupOpen()) {
                    marker.setPopupContent(marker.generarPopupContent('offline'));
                }
            }
            
            // Cuando terminen todas las verificaciones
            if (verificacionesCompletadas === totalVerificaciones) {
                console.log(`📊 Verificación completada: ${estacionesOnline} online, ${estacionesOffline} offline`);
                msg.innerHTML = `✅ Verificación completada<br>
                                <small>${estacionesOnline} en línea | ${estacionesOffline} fuera de línea</small>`;
                
                // Remover mensaje después de 5 segundos
                setTimeout(() => {
                    const m = document.getElementById('mensaje-verificacion');
                    if (m) m.remove();
                }, 5000);
            }
        }, index * 800); // Delay de 800ms entre cada verificación para no saturar
    });
}

// Filtros independientes
function filtrarEstaciones() {
    const provincia = document.getElementById('provinciaSelect').value;
    const nombre = document.getElementById('nombreInput').value.trim().toLowerCase();
    let filtradas = [];

    if (nombre) {
        filtradas = allData.filter(e => {
            // Buscar específicamente en el campo "estación" (minúscula con tilde)
            const nombreEstacion = (e['estación'] || '').toLowerCase();
            return nombreEstacion.includes(nombre);
        });
        console.log(`🔍 Búsqueda "${nombre}": ${filtradas.length} resultados`);
    } else if (provincia) {
        filtradas = allData.filter(e => e.provincia === provincia);
        console.log(`🔍 Provincia "${provincia}": ${filtradas.length} resultados`);
    } else {
        filtradas = allData;
    }

    agregarMarcadores(filtradas);
}

function limpiarFiltros() {
    document.getElementById('provinciaSelect').value = '';
    document.getElementById('nombreInput').value = '';
    agregarMarcadores(allData);
}

// ============================================
// HERRAMIENTA DE MEDICIÓN DE DISTANCIAS
// ============================================

// Calcular distancia usando fórmula de Haversine
function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distancia = R * c;
    return distancia;
}

// Activar/desactivar modo de medición
function toggleMeasurementMode() {
    measurementMode = !measurementMode;
    const btn = document.getElementById('btnToggleMeasure');
    const mapContainer = document.getElementById('map');
    
    if (measurementMode) {
        btn.textContent = '⏸️ Desactivar Medición';
        btn.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
        mapContainer.style.cursor = 'crosshair';
        mostrarNotificacion('📏 Modo medición activado. Haz click en el mapa para agregar puntos.', 'info');
    } else {
        btn.textContent = '📏 Medir Distancia';
        btn.style.background = 'linear-gradient(135deg, #28a745 0%, #218838 100%)';
        mapContainer.style.cursor = '';
        mostrarNotificacion('Modo medición desactivado', 'success');
    }
}

// Agregar punto de medición al mapa
function agregarPuntoMedicion(latlng) {
    measurementPoints.push(latlng);
    
    // Crear marcador
    const marker = L.circleMarker(latlng, {
        radius: 6,
        fillColor: '#ffd700',
        color: '#1a5490',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);
    
    marker.bindPopup(`<b>Punto ${measurementPoints.length}</b><br>
                      Lat: ${latlng.lat.toFixed(6)}<br>
                      Lon: ${latlng.lng.toFixed(6)}`);
    
    measurementMarkers.push(marker);
    
    // Si hay al menos 2 puntos, dibujar línea y calcular distancia
    if (measurementPoints.length >= 2) {
        dibujarLineaMedicion();
    }
    
    if (measurementPoints.length === 1) {
        mostrarNotificacion('Punto 1 agregado. Haz click en otro lugar para medir la distancia.', 'info');
    }
}

// Dibujar línea entre puntos y mostrar distancia
function dibujarLineaMedicion() {
    // Eliminar línea anterior si existe
    if (measurementLine) {
        map.removeLayer(measurementLine);
    }
    
    // Dibujar nueva línea
    measurementLine = L.polyline(measurementPoints, {
        color: '#1a5490',
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10'
    }).addTo(map);
    
    // Calcular distancia total
    let distanciaTotal = 0;
    for (let i = 0; i < measurementPoints.length - 1; i++) {
        const p1 = measurementPoints[i];
        const p2 = measurementPoints[i + 1];
        distanciaTotal += calcularDistancia(p1.lat, p1.lng, p2.lat, p2.lng);
    }
    
    // Mostrar resultado
    const ultimoPunto = measurementPoints[measurementPoints.length - 1];
    const distanciaMetros = (distanciaTotal * 1000).toFixed(2);
    const distanciaKm = distanciaTotal.toFixed(3);
    
    document.getElementById('resultadoDistancia').innerHTML = `
        <div style="background: linear-gradient(135deg, #1a5490 0%, #0d3a6b 100%); color: white; padding: 15px; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0 0 10px 0; color: #ffd700;">📏 Distancia Medida</h3>
            <div style="font-size: 1.8em; font-weight: bold; margin: 10px 0;">${distanciaKm} km</div>
            <div style="font-size: 1.2em; opacity: 0.9;">${distanciaMetros} metros</div>
            <div style="margin-top: 10px; font-size: 0.9em; opacity: 0.8;">
                ${measurementPoints.length} punto(s) marcado(s)
            </div>
        </div>`;
    
    // Popup en el último punto con la distancia
    L.popup()
        .setLatLng(ultimoPunto)
        .setContent(`<b>Distancia Total:</b><br>${distanciaKm} km<br>(${distanciaMetros} m)`)
        .openOn(map);
    
    mostrarNotificacion(`Distancia: ${distanciaKm} km (${distanciaMetros} m)`, 'success');
}

// Limpiar todas las mediciones
function limpiarMediciones() {
    // Limpiar marcadores
    measurementMarkers.forEach(marker => map.removeLayer(marker));
    measurementMarkers = [];
    
    // Limpiar línea
    if (measurementLine) {
        map.removeLayer(measurementLine);
        measurementLine = null;
    }
    
    // Limpiar puntos
    measurementPoints = [];
    
    // Limpiar resultado
    document.getElementById('resultadoDistancia').innerHTML = '';
    
    mostrarNotificacion('Mediciones limpiadas', 'success');
}

// Medir distancia por coordenadas ingresadas manualmente
function medirPorCoordenadas() {
    const lat1 = parseFloat(document.getElementById('lat1').value);
    const lon1 = parseFloat(document.getElementById('lon1').value);
    const lat2 = parseFloat(document.getElementById('lat2').value);
    const lon2 = parseFloat(document.getElementById('lon2').value);
    
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
        mostrarNotificacion('Por favor ingresa coordenadas válidas', 'error');
        return;
    }
    
    // Validar rangos
    if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
        mostrarNotificacion('Las latitudes deben estar entre -90 y 90', 'error');
        return;
    }
    
    if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
        mostrarNotificacion('Las longitudes deben estar entre -180 y 180', 'error');
        return;
    }
    
    // Limpiar mediciones anteriores
    limpiarMediciones();
    
    // Agregar puntos
    const punto1 = L.latLng(lat1, lon1);
    const punto2 = L.latLng(lat2, lon2);
    
    agregarPuntoMedicion(punto1);
    agregarPuntoMedicion(punto2);
    
    // Ajustar vista del mapa
    map.fitBounds([punto1, punto2], { padding: [50, 50] });
}

// Mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    const colores = {
        'info': '#17a2b8',
        'success': '#28a745',
        'error': '#dc3545',
        'warning': '#ffc107'
    };
    
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colores[tipo]};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
    `;
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando aplicación...');
    initMap();
    cargarDatos();
    document.getElementById('provinciaSelect').addEventListener('change', filtrarEstaciones);
    document.getElementById('nombreInput').addEventListener('input', filtrarEstaciones);
    
    // Event listeners para herramienta de medición
    document.getElementById('btnToggleMeasure').addEventListener('click', toggleMeasurementMode);
    document.getElementById('btnClearMeasure').addEventListener('click', limpiarMediciones);
    document.getElementById('btnMeasureCoords').addEventListener('click', medirPorCoordenadas);
});
