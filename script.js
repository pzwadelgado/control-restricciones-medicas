document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // MÓDULO JS: CONFIGURACIÓN DE CONEXIÓN (ZERO-SECRETS PARA GITHUB)
    // =========================================================================
    const CONFIG_API = {
        MODO_CONEXION: 'POWER_AUTOMATE',
        URL_FLUJO_BUSQUEDA: 'https://07ab455229acef3aa55c6fad98a14b.e7.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/21/workflows/a9c60961499e4f929156015f62cb2590/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=cmn1FnucWoaDMG_FQKEXI-R3ycq9WsNlcw8hdcmceS8',
        URL_FLUJO_GUARDAR: 'https://default820fb4b74c9942348e775038c7b081.60.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/14/workflows/f46d153666ac4bf48850abefd4e436ff/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=N4mrydWECDEbbCbsLKpipmaK4GwVa3ks_Hif7ZA3gNg'
    };

    // =========================================================================
    // MÓDULO JS: BASE DE DATOS DE RESPALDO LOCAL (DATOS FICTICIOS)
    // =========================================================================
    const baseDatosRespaldo = [
        {
            EMP_CODIGO: "0000",
            EMPLEADO: "COLABORADOR DEMOSTRACIÓN",
            DEPARTAMENTO: "Línea de Prueba",
            JEFE_ENCARGADO: "COORDINADOR ASIGNADO",
            CORREO_JEFE: "demo@ejemplo.com"
        }
    ];

    // =========================================================================
    // MÓDULO JS: REFERENCIAS DEL DOM
    // =========================================================================
    const form = document.getElementById('formRestricciones');
    const selectMedico = document.getElementById('medico');
    const contenedorMedicoOtro = document.getElementById('contenedorMedicoOtro');
    const inputMedicoOtro = document.getElementById('medicoOtro');

    const inputCodigo = document.getElementById('codigoColaborador');
    const btnBuscar = document.getElementById('btnBuscar');
    const mensajeBusqueda = document.getElementById('mensajeBusqueda');
    const inputNombre = document.getElementById('nombreColaborador');
    const inputDepartamento = document.getElementById('departamentoColaborador');
    const selectTurno = document.getElementById('turnoLabora');
    const inputJefe = document.getElementById('jefeInmediato');
    const inputCorreoJefe = document.getElementById('correoJefe');

    const selectTipoRestriccion = document.getElementById('tipoRestriccion');
    const todosSubformularios = document.querySelectorAll('.sub-formulario');
    const selectoresPlazo = document.querySelectorAll('.selector-plazo');

    // Mapa de campos obligatorios por cada uno de los 7 sub-formularios
    const camposRequeridosPorTipo = {
        calzado: ['motivoCalzado', 'plazoCalzado'],
        guantes: ['motivoGuantes', 'plazoGuantes'],
        orejeras: ['tipoEppAuditivo', 'plazoOrejeras', 'motivoOrejeras'],
        fisica: ['recomendacionMedica', 'motivoFisica', 'plazoFisica'],
        lactancia: ['edadLactante', 'diasLactancia', 'fechaFinLactancia', 'motivoLactancia'],
        gabacha: ['motivoGabacha', 'plazoGabacha'],
        munequera: ['lateralidadMunequera', 'plazoMunequera', 'motivoMunequera']
    };

    // =========================================================================
    // MÓDULO JS: CONTROL DE MÉDICO EXTERNO
    // =========================================================================
    selectMedico.addEventListener('change', (e) => {
        if (e.target.value === 'Otro') {
            contenedorMedicoOtro.classList.remove('oculto');
            inputMedicoOtro.required = true;
            inputMedicoOtro.focus();
        } else {
            contenedorMedicoOtro.classList.add('oculto');
            inputMedicoOtro.required = false;
            inputMedicoOtro.value = '';
        }
    });

    // =========================================================================
    // MÓDULO JS: MOTOR DE BÚSQUEDA Y NORMALIZACIÓN DE SHAREPOINT
    // =========================================================================
    function limpiarCodigo(valor) {
        if (valor === null || valor === undefined) return '';
        return String(valor).trim().replace(/^\/+/, '');
    }

    function normalizarRegistroSharePoint(raw) {
        const extraerTexto = (campo) => {
            if (!campo) return '';
            if (typeof campo === 'object') return campo.Value || campo.Title || campo.Email || '';
            return String(campo).trim();
        };

        return {
            EMP_CODIGO: limpiarCodigo(raw.Title || raw.EMP_CODIGO || raw.field_0),
            EMPLEADO: extraerTexto(raw.EMPLEADO || raw.field_1),
            DEPARTAMENTO: extraerTexto(raw.DEPARTAMENTO || raw.field_2),
            JEFE_ENCARGADO: extraerTexto(raw.JEFE_ENCARGADO || raw.field_3),
            CORREO_JEFE: extraerTexto(raw.CORREO_JEFE || raw.field_4)
        };
    }

    async function consultarColaboradorEnBD(codigoDigitado) {
        const codigoLimpio = limpiarCodigo(codigoDigitado);

        if (CONFIG_API.MODO_CONEXION === 'POWER_AUTOMATE') {
            const response = await fetch(CONFIG_API.URL_FLUJO_BUSQUEDA, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo: codigoLimpio })
            });

            const textoRespuesta = await response.text();

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} -> ${textoRespuesta}`);
            }

            const data = JSON.parse(textoRespuesta);
            const listaRegistros = Array.isArray(data.items)
                ? data.items
                : (data.colaborador ? [data.colaborador] : []);

            if (listaRegistros.length === 0) return null;

            const coincidenciaExacta = listaRegistros.find(
                item => limpiarCodigo(item.Title || item.EMP_CODIGO || item.field_0) === codigoLimpio
            ) || listaRegistros[0];

            return normalizarRegistroSharePoint(coincidenciaExacta);
        }

        return baseDatosRespaldo.find(emp => limpiarCodigo(emp.EMP_CODIGO) === codigoLimpio) || null;
    }

    async function ejecutarBusquedaColaborador() {
        const rawCodigo = inputCodigo.value.trim();

        if (!rawCodigo) {
            mensajeBusqueda.textContent = "⚠️ Digite un código de empleado.";
            mensajeBusqueda.style.color = "#BA0C2F";
            return;
        }

        btnBuscar.disabled = true;
        btnBuscar.textContent = "Buscando...";
        mensajeBusqueda.textContent = "⏳ Consultando planilla en SharePoint...";
        mensajeBusqueda.style.color = "#64748b";

        try {
            const colaborador = await consultarColaboradorEnBD(rawCodigo);

            if (colaborador && colaborador.EMPLEADO) {
                inputCodigo.value = String(colaborador.EMP_CODIGO).replace(/^\/+/, '');
                inputNombre.value = colaborador.EMPLEADO;
                inputDepartamento.value = colaborador.DEPARTAMENTO;
                inputJefe.value = colaborador.JEFE_ENCARGADO;
                inputCorreoJefe.value = colaborador.CORREO_JEFE;

                mensajeBusqueda.textContent = `✅ Colaborador validado (${colaborador.DEPARTAMENTO}).`;
                mensajeBusqueda.style.color = "#15803d";
            } else {
                inputNombre.value = "";
                inputDepartamento.value = "";
                inputJefe.value = "";
                inputCorreoJefe.value = "";
                mensajeBusqueda.textContent = `❌ Código "${rawCodigo}" no encontrado en SharePoint.`;
                mensajeBusqueda.style.color = "#BA0C2F";
            }
        } catch (error) {
            console.error("Fallo detallado de conexión:", error);
            mensajeBusqueda.textContent = `❌ ${error.message}`;
            mensajeBusqueda.style.color = "#BA0C2F";
        } finally {
            btnBuscar.disabled = false;
            btnBuscar.textContent = "Buscar";
        }
    }

    btnBuscar.addEventListener('click', ejecutarBusquedaColaborador);

    inputCodigo.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            ejecutarBusquedaColaborador();
        }
    });

    // =========================================================================
    // MÓDULO JS: GESTIÓN DINÁMICA DE LOS 7 SUB-FORMULARIOS
    // =========================================================================
    function ocultarYLimpiarSubformularios() {
        todosSubformularios.forEach(sub => {
            sub.classList.add('oculto');
            sub.querySelectorAll('input, select, textarea').forEach(campo => {
                campo.required = false;
            });
        });
    }

    function actualizarCampoFechaPlazo(selectElement) {
        const contenedor = document.getElementById(selectElement.dataset.target);
        const inputFecha = document.getElementById(selectElement.dataset.input);
        const subformActivo = !selectElement.closest('.sub-formulario').classList.contains('oculto');

        if (selectElement.value === 'Temporal') {
            contenedor.classList.remove('oculto');
            inputFecha.required = subformActivo;
        } else {
            contenedor.classList.add('oculto');
            inputFecha.required = false;
            inputFecha.value = '';
        }
    }

    selectoresPlazo.forEach(selector => {
        selector.addEventListener('change', () => actualizarCampoFechaPlazo(selector));
    });

    selectTipoRestriccion.addEventListener('change', (e) => {
        const tipo = e.target.value;
        ocultarYLimpiarSubformularios();

        if (!tipo) return;

        const subformDestino = document.getElementById(`subform-${tipo}`);
        if (subformDestino) {
            subformDestino.classList.remove('oculto');

            (camposRequeridosPorTipo[tipo] || []).forEach(idCampo => {
                const el = document.getElementById(idCampo);
                if (el) el.required = true;
            });

            const selectorPlazoInterno = subformDestino.querySelector('.selector-plazo');
            if (selectorPlazoInterno) {
                actualizarCampoFechaPlazo(selectorPlazoInterno);
            }
        }
    });

    // =========================================================================
    // MÓDULO JS: NORMALIZADOR DE DATOS POR TIPO DE RESTRICCIÓN
    // =========================================================================
    function construirDetalleNormalizado(tipo) {
        switch (tipo) {
            case 'calzado':
                return {
                    indicacionOperativa: "Autorización de uso de calzado especial en planta.",
                    motivoClinicoPrivado: document.getElementById('motivoCalzado').value.trim(),
                    plazo: document.getElementById('plazoCalzado').value,
                    fechaFin: document.getElementById('fechaFinCalzado').value || "Indefinida (Permanente)",
                    reubicacion: "No aplica",
                    datosEspecificos: "EPP: Calzado especial"
                };
            case 'guantes':
                return {
                    indicacionOperativa: "Autorización de uso de guantes desechables (látex o tela).",
                    motivoClinicoPrivado: document.getElementById('motivoGuantes').value.trim(),
                    plazo: document.getElementById('plazoGuantes').value,
                    fechaFin: document.getElementById('fechaFinGuantes').value || "Indefinida (Permanente)",
                    reubicacion: "No aplica",
                    datosEspecificos: "EPP: Guantes de látex o tela"
                };
            case 'orejeras': {
                const epp = document.getElementById('tipoEppAuditivo').value;
                return {
                    indicacionOperativa: `Uso obligatorio de EPP auditivo especial: ${epp}.`,
                    motivoClinicoPrivado: document.getElementById('motivoOrejeras').value.trim(),
                    plazo: document.getElementById('plazoOrejeras').value,
                    fechaFin: document.getElementById('fechaFinOrejeras').value || "Indefinida (Permanente)",
                    reubicacion: "No aplica",
                    datosEspecificos: `EPP Auditivo: ${epp}`
                };
            }
            case 'fisica':
                return {
                    indicacionOperativa: document.getElementById('recomendacionMedica').value.trim(),
                    motivoClinicoPrivado: document.getElementById('motivoFisica').value.trim(),
                    plazo: document.getElementById('plazoFisica').value,
                    fechaFin: document.getElementById('fechaFinFisica').value || "Indefinida (Permanente)",
                    reubicacion: document.getElementById('reubicacion').value.trim() || "Mismo puesto con ajustes",
                    datosEspecificos: "Restricción física operativa"
                };
            case 'lactancia': {
                const edad = document.getElementById('edadLactante').value.trim();
                const dias = document.getElementById('diasLactancia').value.trim();
                return {
                    indicacionOperativa: `Extensión autorizada del periodo de lactancia por ${dias} días.`,
                    motivoClinicoPrivado: document.getElementById('motivoLactancia').value.trim(),
                    plazo: "Temporal",
                    fechaFin: document.getElementById('fechaFinLactancia').value,
                    reubicacion: "No aplica",
                    datosEspecificos: `Edad lactante: ${edad} | Extensión: ${dias} días`
                };
            }
            case 'gabacha':
                return {
                    indicacionOperativa: "Autorización de uso de gabacha con zipper en planta.",
                    motivoClinicoPrivado: document.getElementById('motivoGabacha').value.trim(),
                    plazo: document.getElementById('plazoGabacha').value,
                    fechaFin: document.getElementById('fechaFinGabacha').value || "Indefinida (Permanente)",
                    reubicacion: "No aplica",
                    datosEspecificos: "Indumentaria: Gabacha con zipper"
                };
            case 'munequera': {
                const lado = document.getElementById('lateralidadMunequera').value;
                return {
                    indicacionOperativa: `Autorización de uso de muñequera en planta (Lateralidad: ${lado}).`,
                    motivoClinicoPrivado: document.getElementById('motivoMunequera').value.trim(),
                    plazo: document.getElementById('plazoMunequera').value,
                    fechaFin: document.getElementById('fechaFinMunequera').value || "Indefinida (Permanente)",
                    reubicacion: "No aplica",
                    datosEspecificos: `Lateralidad: ${lado}`
                };
            }
            default:
                return {};
        }
    }
// =========================================================================
    // MÓDULO 03 (JS): MOTOR DE CORRECCIONES SST (LECTURA Y MODO EDICIÓN)
    // Ubicación: Encima de form.addEventListener('submit', ...)
    // =========================================================================

    // SECCIÓN 3.1: ESTADO DE EDICIÓN Y REFERENCIAS DEL DOM
    let idRegistroEnEdicion = null;

    const btnRefrescarCorrecciones = document.getElementById('btnRefrescarCorrecciones');
    const listaCorreccionesContainer = document.getElementById('listaCorreccionesContainer');
    const bannerModoEdicion = document.getElementById('bannerModoEdicion');
    const tituloEdicionRegistro = document.getElementById('tituloEdicionRegistro');
    const textoComentarioSST = document.getElementById('textoComentarioSST');
    const resumenDatosPrevios = document.getElementById('resumenDatosPrevios');
    const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');

    // SECCIÓN 3.2: CONSULTA ASÍNCRONA DE DICTÁMENES OBSERVADOS EN SHAREPOINT
    async function cargarBandejaCorrecciones() {
        btnRefrescarCorrecciones.disabled = true;
        btnRefrescarCorrecciones.textContent = '⏳ Consultando...';

        try {
            const response = await fetch(CONFIG_API.URL_FLUJO_BUSQUEDA, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accion: 'listar_correcciones' })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const pendientes = Array.isArray(data.correcciones) ? data.correcciones : [];

            listaCorreccionesContainer.innerHTML = '';
            listaCorreccionesContainer.classList.remove('oculto');

            if (pendientes.length === 0) {
                listaCorreccionesContainer.innerHTML =
                    '<p style="margin:0; font-size:13px; color:#15803d;">✅ No hay dictámenes pendientes de corrección.</p>';
                return;
            }

            pendientes.forEach(item => {
                const card = document.createElement('div');
                card.className = 'item-correccion';
                card.innerHTML = `
                    <div class="item-correccion-datos">
                        <strong>#${item.ID} — ${item.EMPLEADO || ''} (${item.EMP_CODIGO || item.Title || ''})</strong>
                        <span>📝 Observación SST: ${item.COMENTARIO_SST || 'Revisar datos registrados.'}</span>
                    </div>
                    <button type="button" class="btn-cargar-correccion">Cargar para Corregir</button>
                `;

                card.querySelector('.btn-cargar-correccion').addEventListener('click', () => {
                    activarModoEdicionDictamen(item);
                });

                listaCorreccionesContainer.appendChild(card);
            });
        } catch (error) {
            console.error('Error al consultar correcciones SST:', error);
            alert('❌ No se pudo consultar la bandeja de correcciones en SharePoint.');
        } finally {
            btnRefrescarCorrecciones.disabled = false;
            btnRefrescarCorrecciones.textContent = '🔄 Buscar Pendientes';
        }
    }

   // =========================================================================
    // MÓDULO 03 (JS) — SECCIÓN 3.3: PRECARGA INTEGRAL DE DICTAMEN EN EDICIÓN
    // Instrucción: Sustituye únicamente la función activarModoEdicionDictamen()
    // =========================================================================
    function activarModoEdicionDictamen(item) {
        idRegistroEnEdicion = item.ID;

        // SUBSECCIÓN 3.3.1: UTILIDADES DE LECTURA Y EMPAREJAMIENTO DE LISTAS
        const obtenerCampo = (...claves) => {
            for (const clave of claves) {
                if (item[clave] !== undefined && item[clave] !== null && String(item[clave]).trim() !== '') {
                    return String(item[clave]).trim();
                }
            }
            return '';
        };

        const normalizarTexto = (txt) =>
            String(txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

        const seleccionarOpcion = (selectEl, valorBuscado) => {
            if (!selectEl || !valorBuscado) return false;
            const objetivo = normalizarTexto(valorBuscado);
            for (const opt of selectEl.options) {
                if (normalizarTexto(opt.value) === objetivo || normalizarTexto(opt.text) === objetivo) {
                    selectEl.value = opt.value;
                    return true;
                }
            }
            return false;
        };

        // Extracción normalizada desde columnas de SharePoint (MAYÚSCULAS)
        const codigo = obtenerCampo('EMP_CODIGO', 'Title').replace(/^\/+/, '');
        const empleado = obtenerCampo('EMPLEADO');
        const departamento = obtenerCampo('DEPARTAMENTO');
        const turno = obtenerCampo('TURNO', 'turno');
        const jefe = obtenerCampo('JEFE_ENCARGADO');
        const correoJefe = obtenerCampo('CORREO_JEFE');
        const motivoOrigen = obtenerCampo('MOTIVO_ORIGEN', 'motivoOrigen');
        const fechaDictamen = obtenerCampo('FECHA_DICTAMEN', 'fechaDictamen').substring(0, 10);
        const medico = obtenerCampo('MEDICO', 'medico');
        const tipoRestriccion = obtenerCampo('TIPO_RESTRICCION', 'tipoRestriccion');
        const plazo = obtenerCampo('PLAZO', 'plazo');
        const fechaFin = obtenerCampo('FECHA_FIN', 'fechaFin').substring(0, 10);
        const reubicacion = obtenerCampo('REUBICACION', 'reubicacion');
        const indicacionOperativa = obtenerCampo('INDICACION_OPERATIVA', 'indicacionOperativa');
        const motivoClinico = obtenerCampo('MOTIVO_CLINICO_PRIVADO', 'motivoClinicoPrivado');
        const datosEspecificos = obtenerCampo('DATOS_ESPECIFICOS', 'datosEspecificos');
        const comentariosFinales = obtenerCampo('COMENTARIOS_FINALES', 'comentariosFinales');
        const comentarioSST = obtenerCampo('COMENTARIO_SST');

        // SUBSECCIÓN 3.3.2: RELLENADO DE SECCIÓN 1 (DICTAMEN) Y SECCIÓN 2 (COLABORADOR)
        const selectMotivo = document.getElementById('motivoRestriccion');
        const inputFechaDictamen = document.getElementById('fechaDictamen');

        seleccionarOpcion(selectMotivo, motivoOrigen);
        if (inputFechaDictamen && fechaDictamen) inputFechaDictamen.value = fechaDictamen;

        if (typeof selectMedico !== 'undefined' && medico) {
            const encontrado = seleccionarOpcion(selectMedico, medico);
            if (!encontrado) {
                seleccionarOpcion(selectMedico, 'Otro');
                selectMedico.dispatchEvent(new Event('change'));
                if (typeof inputMedicoOtro !== 'undefined' && inputMedicoOtro) {
                    inputMedicoOtro.value = medico;
                }
            }
        }

        inputCodigo.value = codigo;
        inputNombre.value = empleado;
        inputDepartamento.value = departamento;
        seleccionarOpcion(selectTurno, turno);
        inputJefe.value = jefe;
        inputCorreoJefe.value = correoJefe;

        // SUBSECCIÓN 3.3.3: ACTIVACIÓN DE SECCIÓN 3 Y SUBFORMULARIO DINÁMICO
        if (typeof selectTipoRestriccion !== 'undefined' && tipoRestriccion) {
            const tipoSeleccionado = seleccionarOpcion(selectTipoRestriccion, tipoRestriccion);
            if (tipoSeleccionado) {
                // Dispara el evento change para desplegar los campos dinámicos de la restricción
                selectTipoRestriccion.dispatchEvent(new Event('change'));

                // Hidrata los campos dinámicos recién abiertos dentro del formulario
                const camposDinamicos = form.querySelectorAll('input, select, textarea');
                camposDinamicos.forEach(campo => {
                    const idName = normalizarTexto(`${campo.id} ${campo.name}`);
                    if (!idName || ['codigobuscar', 'motivorestriccion', 'fechadictamen', 'selectmedico', 'inputmedicootro', 'selectturno', 'selecttiporestriccion', 'comentariosfinales'].includes(idName.replace(/\s+/g, ''))) {
                        return;
                    }

                    if (idName.includes('plazo') && plazo) {
                        seleccionarOpcion(campo, plazo);
                        campo.dispatchEvent(new Event('change'));
                    } else if ((idName.includes('fechafin') || idName.includes('vigencia')) && /^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) {
                        campo.value = fechaFin;
                    } else if (idName.includes('reubicacion') && reubicacion) {
                        if (campo.tagName === 'SELECT') seleccionarOpcion(campo, reubicacion);
                        else campo.value = reubicacion;
                    } else if ((idName.includes('motivoclinico') || idName.includes('diagnostico') || idName.includes('padecimiento')) && motivoClinico) {
                        campo.value = motivoClinico;
                    } else if (idName.includes('indicacion') && indicacionOperativa) {
                        campo.value = indicacionOperativa;
                    } else if (datosEspecificos && datosEspecificos.includes(':')) {
                        // Extrae valores como "EPP: Calzado especial" o "Lateralidad: Izquierda"
                        const valorDetalle = datosEspecificos.split(':').slice(1).join(':').trim();
                        if (campo.tagName === 'SELECT') seleccionarOpcion(campo, valorDetalle);
                        else if (!campo.value) campo.value = valorDetalle;
                    }
                });
            }
        }

        // SUBSECCIÓN 3.3.4: SECCIÓN 4 (COMENTARIOS) Y BANNER DE REFERENCIA SST
        const inputComentarios = document.getElementById('comentariosFinales');
        if (inputComentarios) inputComentarios.value = comentariosFinales;

        tituloEdicionRegistro.textContent = `✏️ Corrigiendo Dictamen #${item.ID} — ${empleado}`;
        textoComentarioSST.textContent = `📝 Observación de SST: ${comentarioSST || 'Sin detalle adicional.'}`;
        resumenDatosPrevios.innerHTML = `
            <strong>Disposición anterior:</strong> ${tipoRestriccion || '--'} | 
            <strong>Indicación:</strong> ${indicacionOperativa || '--'}<br>
            <strong>Plazo:</strong> ${plazo || '--'} (${fechaFin || '--'}) | 
            <strong>Diagnóstico clínico:</strong> ${motivoClinico || '--'}
        `;

        bannerModoEdicion.classList.remove('oculto');
        listaCorreccionesContainer.classList.add('oculto');

        const btnSubmit = form.querySelector('button[type="submit"]');
        btnSubmit.textContent = `💾 Guardar Corrección (#${item.ID}) y Reenviar a SST`;
        form.scrollIntoView({ behavior: 'smooth' });
    }
    // ================== FIN SECCIÓN 3.3 — MÓDULO 03 (JS) =====================

    // SECCIÓN 3.4: SALIDA DE MODO EDICIÓN Y LIMPIEZA DEL FORMULARIO
    function salirModoEdicionDictamen() {
        idRegistroEnEdicion = null;
        bannerModoEdicion.classList.add('oculto');
        form.reset();
        if (typeof ocultarYLimpiarSubformularios === 'function') {
            ocultarYLimpiarSubformularios();
        }
        const btnSubmit = form.querySelector('button[type="submit"]');
        btnSubmit.textContent = 'Registrar y Enviar Restricción';
    }

    btnRefrescarCorrecciones.addEventListener('click', cargarBandejaCorrecciones);
    btnCancelarEdicion.addEventListener('click', salirModoEdicionDictamen);


    // ===================== FIN MÓDULO 03 (JS) ================================


    // =========================================================================
    // MÓDULO JS: ENVÍO Y CONSTRUCCIÓN DEL PAYLOAD UNIFICADO
    // =========================================================================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!inputNombre.value.trim()) {
            mensajeBusqueda.textContent = "⚠️ Debe buscar un código de empleado válido antes de enviar.";
            mensajeBusqueda.style.color = "#BA0C2F";
            inputCodigo.focus();
            return;
        }

        const btnSubmit = form.querySelector('button[type="submit"]');
        const textoOriginalBtn = btnSubmit.textContent;

        const medicoFinal = (selectMedico.value === 'Otro')
            ? inputMedicoOtro.value.trim()
            : selectMedico.value;

        const tipoClave = selectTipoRestriccion.value;
        const detalleRestriccion = construirDetalleNormalizado(tipoClave);

// SECCIÓN 4.1: CONSTRUCCIÓN DEL PAYLOAD (ALTA NUEVA O CORRECCIÓN)
        const payload = {
            idRegistro: idRegistroEnEdicion ? String(idRegistroEnEdicion) : '',
            motivoOrigen: document.getElementById('motivoRestriccion').value,
            fechaDictamen: document.getElementById('fechaDictamen').value,
            medico: medicoFinal,
            EMP_CODIGO: inputCodigo.value.trim().replace(/^\/+/, ''),
            EMPLEADO: inputNombre.value.trim(),
            DEPARTAMENTO: inputDepartamento.value.trim(),
            turno: selectTurno.value,
            JEFE_ENCARGADO: inputJefe.value.trim(),
            CORREO_JEFE: inputCorreoJefe.value.trim(),
            tipoRestriccion: selectTipoRestriccion.options[selectTipoRestriccion.selectedIndex].text,
            ...detalleRestriccion,
            comentariosFinales: document.getElementById('comentariosFinales').value.trim(),
            estadoAprobacion: "Pendiente Aprobación SST"
        };

        try {
            btnSubmit.disabled = true;
            btnSubmit.textContent = "⏳ Registrando dictamen y notificando a SST...";

            const response = await fetch(CONFIG_API.URL_FLUJO_GUARDAR, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const textoRespuesta = await response.text();

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} -> ${textoRespuesta}`);
            }

            let resultado = {};
            try {
                resultado = textoRespuesta ? JSON.parse(textoRespuesta) : {};
            } catch (_) {
                resultado = { idRegistro: 'OK' };
            }

            alert(
                `✅ ¡Dictamen Registrado Correctamente! (ID #${resultado.idRegistro || 'OK'})\n\n` +
                `• Colaborador: ${payload.EMPLEADO} (${payload.EMP_CODIGO})\n` +
                `• Solicitud: ${payload.tipoRestriccion}\n` +
                `• Ficha enviada a SST para validación y notificación a ${payload.JEFE_ENCARGADO}.`
            );

            // Reinicio limpio de formulario y sub-vistas dinámicas
           // SECCIÓN 4.2: REINICIO DE INTERFAZ TRAS RESPUESTA EXITOSA
            salirModoEdicionDictamen();
            mensajeBusqueda.textContent = "";
            contenedorMedicoOtro.classList.add('oculto');
            inputMedicoOtro.required = false;
            ocultarYLimpiarSubformularios();

        } catch (error) {
            console.error("Error al registrar restricción en SharePoint:", error);
            alert(`❌ No se pudo completar el registro en SharePoint.\nDetalle técnico: ${error.message}`);
       } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = textoOriginalBtn;
        }
    }); // <-- CIERRE OBLIGATORIO DE form.addEventListener('submit', ...)

    // =========================================================================
    // MÓDULO 07 (JS): MOTOR DE HISTORIAL, FILTROS Y GENERADOR PDF SST
    // Ubicación: Después del cierre de submit y antes del cierre de DOMContentLoaded
    // =========================================================================
    console.log('🚀 MÓDULO 07 (Historial y PDF SST) iniciado correctamente.');

    let registrosHistorialCache = [];

    // SECCIÓN 7.1: CONTROL DE NAVEGACIÓN ENTRE PESTAÑAS
    function cambiarVistaModulo(vista) {
        const tabBtnRegistro = document.getElementById('tabBtnRegistro');
        const tabBtnHistorial = document.getElementById('tabBtnHistorial');
        const panelCorrecciones = document.getElementById('panelCorreccionesSST');
        const formularioCaptura = document.getElementById('formRestricciones');
        const vistaHistorial = document.getElementById('vistaHistorialSST');

        if (!vistaHistorial) {
            alert('⚠️ No se encontró el contenedor vistaHistorialSST en index.html.');
            return;
        }

        if (vista === 'historial') {
            if (tabBtnRegistro) tabBtnRegistro.classList.remove('activo');
            if (tabBtnHistorial) tabBtnHistorial.classList.add('activo');

            if (panelCorrecciones) {
                panelCorrecciones.classList.add('oculto');
                panelCorrecciones.style.display = 'none';
            }
            if (formularioCaptura) {
                formularioCaptura.classList.add('oculto');
                formularioCaptura.style.display = 'none';
            }

            vistaHistorial.classList.remove('oculto');
            vistaHistorial.style.display = 'block';

            if (registrosHistorialCache.length === 0) {
                cargarDatosHistorialSST();
            }
        } else {
            if (tabBtnHistorial) tabBtnHistorial.classList.remove('activo');
            if (tabBtnRegistro) tabBtnRegistro.classList.add('activo');

            if (panelCorrecciones) {
                panelCorrecciones.classList.remove('oculto');
                panelCorrecciones.style.display = '';
            }
            if (formularioCaptura) {
                formularioCaptura.classList.remove('oculto');
                formularioCaptura.style.display = '';
            }

            vistaHistorial.classList.add('oculto');
            vistaHistorial.style.display = 'none';
        }
    }

    // SECCIÓN 7.2: CONSULTA ASÍNCRONA DE HISTORIAL EN SHAREPOINT
    async function cargarDatosHistorialSST() {
        const btnActualizarHistorial = document.getElementById('btnActualizarHistorial');
        const tbodyHistorial = document.getElementById('tbodyHistorialSST');

        if (btnActualizarHistorial) {
            btnActualizarHistorial.disabled = true;
            btnActualizarHistorial.textContent = '⏳ Sincronizando...';
        }

        try {
            const response = await fetch(CONFIG_API.URL_FLUJO_BUSQUEDA, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accion: 'listar_historial' })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log('📊 Historial recibido de SharePoint:', data);

            registrosHistorialCache = Array.isArray(data.historial) ? data.historial : [];

            poblarSelectDepartamentos(registrosHistorialCache);
            actualizarIndicadoresKPI(registrosHistorialCache);
            renderizarTablaHistorial(registrosHistorialCache);
        } catch (error) {
            console.error('❌ Error al cargar historial SST:', error);
            if (tbodyHistorial) {
                tbodyHistorial.innerHTML =
                    '<tr><td colspan="7" class="tabla-vacia-msg">❌ Error al sincronizar con SharePoint. Revise la consola (F12).</td></tr>';
            }
        } finally {
            if (btnActualizarHistorial) {
                btnActualizarHistorial.disabled = false;
                btnActualizarHistorial.textContent = '🔄 Sincronizar SharePoint';
            }
        }
    }

    // SECCIÓN 7.3: ACTUALIZACIÓN DE INDICADORES KPI Y DEPARTAMENTOS
    function poblarSelectDepartamentos(lista) {
        const filtroDepartamento = document.getElementById('filtroDepartamento');
        if (!filtroDepartamento) return;

        const deptos = [...new Set(lista.map(r => (r.DEPARTAMENTO || '').trim()).filter(Boolean))].sort();
        const valorActual = filtroDepartamento.value;
        filtroDepartamento.innerHTML = '<option value="">Todos los departamentos</option>';
        deptos.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            filtroDepartamento.appendChild(opt);
        });
        filtroDepartamento.value = valorActual;
    }

    function actualizarIndicadoresKPI(lista) {
        const total = lista.length;
        const aprobados = lista.filter(r => (r.ESTADO_APROBACION || '').toLowerCase().includes('aprobado')).length;
        const pendientes = total - aprobados;

        const elTotal = document.getElementById('kpiTotalRegistros');
        const elAprob = document.getElementById('kpiTotalAprobados');
        const elPend = document.getElementById('kpiTotalPendientes');

        if (elTotal) elTotal.textContent = total;
        if (elAprob) elAprob.textContent = aprobados;
        if (elPend) elPend.textContent = pendientes;
    }

    // SECCIÓN 7.4: FILTRADO EN TIEMPO REAL Y RENDERIZADO DE TABLA
    function aplicarFiltrosHistorial() {
        const filtroBusquedaTexto = document.getElementById('filtroBusquedaTexto');
        const filtroDepartamento = document.getElementById('filtroDepartamento');
        const filtroEstado = document.getElementById('filtroEstado');

        const texto = filtroBusquedaTexto ? filtroBusquedaTexto.value.toLowerCase().trim() : '';
        const depto = filtroDepartamento ? filtroDepartamento.value : '';
        const estado = filtroEstado ? filtroEstado.value.toLowerCase() : '';

        const filtrados = registrosHistorialCache.filter(item => {
            const emp = `${item.EMPLEADO || ''} ${item.EMP_CODIGO || item.Title || ''}`.toLowerCase();
            const matchTexto = !texto || emp.includes(texto);
            const matchDepto = !depto || (item.DEPARTAMENTO || '').trim() === depto;
            const matchEstado = !estado || (item.ESTADO_APROBACION || '').toLowerCase().includes(estado);
            return matchTexto && matchDepto && matchEstado;
        });

        renderizarTablaHistorial(filtrados);
    }

    function renderizarTablaHistorial(lista) {
        const tbodyHistorial = document.getElementById('tbodyHistorialSST');
        if (!tbodyHistorial) return;

        tbodyHistorial.innerHTML = '';

        if (lista.length === 0) {
            tbodyHistorial.innerHTML =
                '<tr><td colspan="7" class="tabla-vacia-msg">No se encontraron dictámenes con los filtros seleccionados.</td></tr>';
            return;
        }

        lista.forEach(item => {
            const estadoTxt = item.ESTADO_APROBACION || 'Pendiente';
            let claseBadge = 'badge-pendiente';
            if (estadoTxt.toLowerCase().includes('aprobado')) claseBadge = 'badge-aprobado';
            if (estadoTxt.toLowerCase().includes('corrección')) claseBadge = 'badge-correccion';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${item.ID}</strong></td>
                <td>${String(item.FECHA_DICTAMEN || '').substring(0, 10)}</td>
                <td>
                    <strong>${item.EMPLEADO || '--'}</strong><br>
                    <small style="color:#64748b;">Cód: ${item.EMP_CODIGO || item.Title || '--'}</small>
                </td>
                <td>
                    ${item.DEPARTAMENTO || '--'}<br>
                    <small style="color:#64748b;">Turno: ${item.TURNO || '--'}</small>
                </td>
                <td>
                    <strong>${item.TIPO_RESTRICCION || '--'}</strong><br>
                    <small style="color:#64748b;">${item.PLAZO || '--'} (${item.FECHA_FIN || '--'})</small>
                </td>
                <td><span class="badge-estado-tabla ${claseBadge}">${estadoTxt}</span></td>
                <td>
                    <div class="acciones-pdf-grupo">
                        <button type="button" class="btn-pdf-operativo" title="Sin diagnóstico clínico">📄 PDF Jefatura</button>
                        <button type="button" class="btn-pdf-clinico" title="Incluye diagnóstico privado">🔒 PDF Clínico</button>
                    </div>
                </td>
            `;

            tr.querySelector('.btn-pdf-operativo').addEventListener('click', () => imprimirFichaPDF(item, false));
            tr.querySelector('.btn-pdf-clinico').addEventListener('click', () => imprimirFichaPDF(item, true));
            tbodyHistorial.appendChild(tr);
        });
    }

    // SECCIÓN 7.5: MOTOR DE GENERACIÓN DE FICHA PDF OFICIAL
    function imprimirFichaPDF(item, incluirClinico) {
        document.getElementById('pdfNumeroRegistro').textContent = `Dictamen #${item.ID}`;
        document.getElementById('pdfBadgeTipo').textContent = incluirClinico
            ? 'CONFIDENCIAL — USO EXCLUSIVO SST'
            : 'DISPOSICIÓN OPERATIVA — JEFATURA';

        document.getElementById('pdfEmpleado').textContent = item.EMPLEADO || '--';
        document.getElementById('pdfCodigo').textContent = item.EMP_CODIGO || item.Title || '--';
        document.getElementById('pdfDepartamento').textContent = item.DEPARTAMENTO || '--';
        document.getElementById('pdfTurno').textContent = item.TURNO || '--';
        document.getElementById('pdfJefe').textContent = item.JEFE_ENCARGADO || '--';
        document.getElementById('pdfFechaDictamen').textContent = String(item.FECHA_DICTAMEN || '').substring(0, 10);

        document.getElementById('pdfTipoRestriccion').textContent = item.TIPO_RESTRICCION || '--';
        document.getElementById('pdfIndicacion').textContent = item.INDICACION_OPERATIVA || '--';
        document.getElementById('pdfDetalleEspecifico').textContent = item.DATOS_ESPECIFICOS || 'No aplica';
        document.getElementById('pdfPlazo').textContent = item.PLAZO || '--';
        document.getElementById('pdfFechaFin').textContent = item.FECHA_FIN || '--';
        document.getElementById('pdfReubicacion').textContent = item.REUBICACION || 'No aplica';

        const bloqueClinico = document.getElementById('pdfBloqueClinico');
        if (incluirClinico) {
            bloqueClinico.classList.remove('oculto');
            document.getElementById('pdfMotivoOrigen').textContent = item.MOTIVO_ORIGEN || '--';
            document.getElementById('pdfMotivoClinico').textContent = item.MOTIVO_CLINICO_PRIVADO || '--';
            document.getElementById('pdfComentariosMedicos').textContent = item.COMENTARIOS_FINALES || 'Sin comentarios adicionales';
        } else {
            bloqueClinico.classList.add('oculto');
        }

        document.getElementById('pdfMedicoFirma').textContent = item.MEDICO || 'Médico Dictaminador';
        document.getElementById('pdfEstadoFirma').textContent = `Estado: ${item.ESTADO_APROBACION || 'Validado'}`;

        window.print();
    }

    // SECCIÓN 7.6: ASIGNACIÓN DE EVENTOS DEL PANEL DE HISTORIAL
    const btnTabReg = document.getElementById('tabBtnRegistro');
    const btnTabHist = document.getElementById('tabBtnHistorial');
    const btnSyncHist = document.getElementById('btnActualizarHistorial');
    const inpFiltroTxt = document.getElementById('filtroBusquedaTexto');
    const selFiltroDep = document.getElementById('filtroDepartamento');
    const selFiltroEst = document.getElementById('filtroEstado');

    if (btnTabReg) btnTabReg.addEventListener('click', () => cambiarVistaModulo('registro'));
    if (btnTabHist) btnTabHist.addEventListener('click', () => cambiarVistaModulo('historial'));
    if (btnSyncHist) btnSyncHist.addEventListener('click', cargarDatosHistorialSST);
    if (inpFiltroTxt) inpFiltroTxt.addEventListener('input', aplicarFiltrosHistorial);
    if (selFiltroDep) selFiltroDep.addEventListener('change', aplicarFiltrosHistorial);
    if (selFiltroEst) selFiltroEst.addEventListener('change', aplicarFiltrosHistorial);
    // ===================== FIN MÓDULO 07 (JS) ================================

}); // <-- CIERRE FINAL DE document.addEventListener('DOMContentLoaded', ...)