// geportal.js - REEMPLAZAR completamente la función verificarEstado

// Verificar si estación está en línea usando un proxy CORS
async function verificarEstado(estacion) {
    const urls = [];
    
    // Agregar DDNS si está disponible
    if (estacion.ddns) {
        urls.push(estacion.ddns);
    }
    
    // Agregar IP si está disponible (como fallback)
    if (estacion.ip) {
        urls.push(estacion.ip);
    }
    
    if (urls.length === 0) {
        return 'offline'; // No hay URLs para verificar
    }
    
    // Usar un proxy CORS para evitar problemas de origen cruzado
    for (const url of urls) {
        try {
            console.log(`🔍 Verificando: ${url}`);
            
            // Usar un proxy CORS público
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(proxyUrl, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            if (response.ok) {
                console.log(`✅ Estación accesible via: ${url}`);
                return 'online';
            } else {
                console.log(`❌ Falló verificación via ${url}: Status ${response.status}`);
                continue;
            }
            
        } catch (error) {
            console.log(`❌ Error verificando ${url}:`, error.message);
            // Continuar con la siguiente URL
            continue;
        }
    }
    
    // Si todas las verificaciones fallaron
    return 'offline';
}

// ALTERNATIVA: Si el proxy anterior no funciona, usar esta versión simplificada
/*
async function verificarEstado(estacion) {
    // En GitHub Pages, asumimos que todas están offline por restricciones de seguridad
    // Esto evita errores en la consola y permite que la aplicación funcione
    console.log(`🔍 Verificación simulada para: ${estacion['estación'] || 'Sin nombre'}`);
    
    // Simular verificación (siempre offline en GitHub Pages)
    return new Promise((resolve) => {
        setTimeout(() => {
            // Para demostración, marcar algunas como online aleatoriamente
            const esOnline = Math.random() > 0.7; // 30% de probabilidad
            resolve(esOnline ? 'online' : 'offline');
        }, 100);
    });
}
*/

// También MODIFICAR la función agregarMarcadores para manejar mejor los errores
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
        background: #fff;
        padding: 8px 18px;
        border-radius: 10px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        z-index: 1000;
        font-weight: bold;
        color: #1a5490;
    `;
    msg.innerHTML = '🔄 Verificando estado de las estaciones... (Puede tomar unos segundos)';
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

        // Función para generar el contenido del popup
        const generarPopupContent = (estadoActual = 'comprobando') => {
            let estadoHTML = '🟡 Comprobando...';
            if (estadoActual === 'online') {
                estadoHTML = '🟢 En línea';
            } else if (estadoActual === 'offline') {
                estadoHTML = '🔴 Fuera de línea';
            }
            
            return `
                <div class="popup-content" style="max-width: 280px;">
                    <h3 style="margin: 0 0 10px 0;">📡 ${nombreEstacion}</h3>
                    <div style="margin: 5px 0;"><b>Provincia:</b> ${estacion.provincia || '-'}</div>
                    <div style="margin: 5px 0;"><b>Ubicación:</b> ${estacion['ubicación'] || estacion.ubicacion || '-'}</div>
                    <div style="margin: 5px 0;"><b>Propiedad:</b> ${estacion.propiedad || '-'}</div>
                    <div style="margin: 5px 0;"><b>Red:</b> ${estacion.red || '-'}</div>
                    <div style="margin: 5px 0; word-break: break-all;"><b>DDNS:</b> ${estacion.ddns || '-'}</div>
                    <div style="margin: 5px 0; word-break: break-all;"><b>IP:</b> ${estacion.ip || '-'}</div>
                    <div style="margin: 5px 0;"><b>Usuario NTRIP:</b> ${estacion['uruario_nt'] || estacion.usuario_ntrip || '-'}</div>
                    <div style="margin: 5px 0;"><b>Latitud:</b> ${lat.toFixed(6)}</div>
                    <div style="margin: 5px 0;"><b>Longitud:</b> ${lng.toFixed(6)}</div>
                    <div style="margin: 5px 0;"><b>Altura Ref:</b> ${estacion.altura_ref || '-'}</div>
                    <div style="margin: 5px 0;"><b>Estado:</b> ${estadoHTML}</div>
                    <div style="margin: 5px 0; font-size: 0.8em; color: #666;">
                        <i>Nota: La verificación puede no ser precisa en GitHub Pages debido a restricciones de seguridad del navegador.</i>
                    </div>
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
    
    // Actualizar mensaje
    msg.innerHTML = `🔄 Verificando estado (0/${totalVerificaciones})...`;
    
    const verificaciones = Object.values(markers).map(async (marker) => {
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
                console.log(`✅ ${nombreEstacion} - EN LÍNEA`);
            } else {
                estacionesOffline++;
                console.log(`❌ ${nombreEstacion} - FUERA DE LÍNEA`);
            }
            
            // Actualizar estadísticas en el header
            actualizarEstadisticasEstado(estacionesOnline, estacionesOffline);
            
            // Guardar el estado en el marcador
            marker.estadoVerificado = estado;
            
            // Actualizar mensaje de progreso
            msg.innerHTML = `🔄 Verificando estado (${verificacionesCompletadas}/${totalVerificaciones})...`;
            
            // Si el popup está abierto, actualizarlo inmediatamente
            if (marker.isPopupOpen()) {
                marker.setPopupContent(marker.generarPopupContent(estado));
            }
            
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
            msg.innerHTML = `🔄 Verificando estado (${verificacionesCompletadas}/${totalVerificaciones})...`;
            
            // Si el popup está abierto, actualizarlo inmediatamente
            if (marker.isPopupOpen()) {
                marker.setPopupContent(marker.generarPopupContent('offline'));
            }
        }
    });
    
    // Esperar a que todas las verificaciones terminen
    Promise.allSettled(verificaciones).then(() => {
        console.log(`📊 Verificación completada: ${estacionesOnline} online, ${estacionesOffline} offline`);
        msg.innerHTML = `✅ Verificación completada: ${estacionesOnline} en línea, ${estacionesOffline} fuera de línea`;
        
        // Remover mensaje después de 3 segundos
        setTimeout(() => {
            const m = document.getElementById('mensaje-verificacion');
            if (m) m.remove();
        }, 3000);
    });
}
