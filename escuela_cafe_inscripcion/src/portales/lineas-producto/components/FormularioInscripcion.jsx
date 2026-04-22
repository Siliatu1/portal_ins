import React, { useState, useEffect } from "react";
import "./formulario_inscripcion.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { message } from "antd";


const empleadosCache = {};

const FormularioInscripcion = ({ onBack, onSubmit, coordinadoraData }) => {
  const [documento, setDocumento] = useState("");
  const [loading, setLoading] = useState(false);
  const [empleado, setEmpleado] = useState(null);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [fechasDisponibles, setFechasDisponibles] = useState([]);
  const [fechaInscripcion, setFechaInscripcion] = useState("");
  const [paginaActual, setPaginaActual] = useState(0);
  const fechasPorPagina = 3;
  const [festivosColombianos, setFestivosColombianos] = useState([]);
  const [inscripcionesPorFecha, setInscripcionesPorFecha] = useState({});
  const [mostrarInfoEmpleado, setMostrarInfoEmpleado] = useState(true);
  const [fechasBloqueadas, setFechasBloqueadas] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalPuntosVenta, setMostrarModalPuntosVenta] = useState(false);
  const [puntosVenta, setPuntosVenta] = useState([]);
  
  const cargoCoordinadora = coordinadoraData?.data?.cargo_general || coordinadoraData?.data?.position || "";
  const puntoVentaCoordinadora = coordinadoraData?.data?.area_nombre || "";
  
  // Roles que pueden bloquear fechas
  const rolesBloqueoFechas = [
    'ANALISTA EVENTOS Y HELADERIAS',
    'JEFE OPERATIVO DE MERCADEO',
    'JEFE DESARROLLO DE PRODUCTO',
    'DIRECTORA DE LINEAS DE PRODUCTO',
    'ANALISTA DE PRODUCTO'
  ];
  
  const puedeBloquearFechas = rolesBloqueoFechas.includes(cargoCoordinadora);
  
 
  const nombreLider = coordinadoraData?.data?.nombre || 
    coordinadoraData?.data?.name ||
    (coordinadoraData?.data?.first_name && coordinadoraData?.data?.last_name 
      ? `${coordinadoraData.data.first_name} ${coordinadoraData.data.last_name}`.trim()
      : coordinadoraData?.data?.full_name || '');

  
  const [formData, setFormData] = useState({
    fotoBuk: "",
    nombres: "",
    telefono: "",
    cargo: cargoCoordinadora,
    puntoVenta: puntoVentaCoordinadora,
    nombreLider: nombreLider
  });


  useEffect(() => {
    const cargarFestivos = async () => {
      try {
        const response = await fetch('https://date.nager.at/api/v3/PublicHolidays/2026/CO');
        if (response.ok) {
          const festivos = await response.json();

          const fechasFestivos = festivos.map(f => f.date);
          setFestivosColombianos(fechasFestivos);
        }
      } catch (error) {
      }
    };
    cargarFestivos();
  }, []);

  useEffect(() => {
    const cargarInscripciones = async () => {
      try {
        const response = await fetch('https://macfer.crepesywaffles.com/api/cap-cafes');
        if (response.ok) {
          const result = await response.json();

          const conteo = {};
          if (result.data && Array.isArray(result.data)) {
            result.data.forEach(inscripcion => {
              const fecha = inscripcion.attributes?.fecha;
              if (fecha) {
                conteo[fecha] = (conteo[fecha] || 0) + 1;
              }
            });
          }
          setInscripcionesPorFecha(conteo);
        }
      } catch (error) {
      }
    };
    cargarInscripciones();
  }, []);


  useEffect(() => {
    const cargarFechasBloqueadas = async () => {
      try {
        const response = await fetch('https://macfer.crepesywaffles.com/api/cap-cafe-fechas');
        if (response.ok) {
          const result = await response.json();
          if (result.data && Array.isArray(result.data)) {
            const fechas = result.data.map(item => item.attributes?.fecha).filter(Boolean);
            setFechasBloqueadas(fechas);
          }
        }
      } catch (error) {
      }
    };
    cargarFechasBloqueadas();
  }, []);

  /**
   * Carga los puntos de venta únicos desde la API
   * Útil para el modal de visualización de puntos de venta
   */
  useEffect(() => {
    const cargarPuntosVenta = async () => {
      try {
        const response = await fetch('https://macfer.crepesywaffles.com/api/cap-cafes');
        if (response.ok) {
          const result = await response.json();
          if (result.data && Array.isArray(result.data)) {
            const puntosUnicos = [...new Set(
              result.data
                .map(item => item.attributes?.pdv)
                .filter(Boolean)
            )].sort();
            setPuntosVenta(puntosUnicos);
          }
        }
      } catch (error) {

      }
    };
    cargarPuntosVenta();
  }, []);


  /**
   * Determina qué meses deben mostrarse para la inscripción
   * Lógica: Del 1-14 del mes se muestra solo el mes actual
   *         Del 15 en adelante se muestra el mes actual y el siguiente
   * @returns Array de objetos {year, month} con los meses a mostrar
   */
  const obtenerMesesAMostrar = () => {
    const hoy = new Date();
    const diaActual = hoy.getDate();
    const mesActual = hoy.getMonth();
    const yearActual = hoy.getFullYear();

    const meses = [];
    
    if (diaActual >= 15) {
      meses.push({ year: yearActual, month: mesActual });
      
      if (mesActual === 11) { 
        meses.push({ year: yearActual + 1, month: 0 });
      } else {
        meses.push({ year: yearActual, month: mesActual + 1 });
      }
    } else {
      meses.push({ year: yearActual, month: mesActual });
    }
    
    return meses;
  };

  /**
   * Obtiene todos los lunes y viernes de un mes específico
   * Verifica disponibilidad: máximo 3 inscripciones por fecha
   * Excluye: festivos colombianos y fechas bloqueadas manualmente
   * @param {number} year - Año
   * @param {number} month - Mes (0-11)
   * @returns Array de objetos con información de cada fecha disponible
   */
  const obtenerLunesYViernes = (year, month) => {
    const fechas = [];
    const ultimoDia = new Date(year, month + 1, 0).getDate();
    
    const meses = [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];
    
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const fecha = new Date(year, month, dia);
      const diaSemana = fecha.getDay();
      
      if (diaSemana === 1 || diaSemana === 5) {
        const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        
        const esFestivo = festivosColombianos.includes(fechaStr);
        const estaBloqueada = fechasBloqueadas.includes(fechaStr);
        const numInscripciones = inscripcionesPorFecha[fechaStr] || 0;
        const disponible = numInscripciones < 3 && !esFestivo && !estaBloqueada;
        
        fechas.push({
          fecha: fechaStr,
          texto: `${diasSemana[diaSemana]} ${dia} de ${meses[month]}`,
          disponible: disponible,
          inscripciones: numInscripciones,
          esFestivo: esFestivo,
          estaBloqueada: estaBloqueada
        });
      }
    }
    
    return fechas;
  };


  useEffect(() => {
    if (festivosColombianos.length > 0) {
      const periodosAMostrar = obtenerMesesAMostrar();
      const todasLasFechas = [];
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      const meses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      
      periodosAMostrar.forEach(({ year, month }) => {
        const fechasMes = obtenerLunesYViernes(year, month);
        // Filtrar fechas pasadas
        const fechasFuturas = fechasMes.filter(f => {
          const fechaObj = new Date(f.fecha + 'T00:00:00');
          return fechaObj >= hoy;
        });
        todasLasFechas.push(...fechasFuturas);
      });
      
      setFechasDisponibles(todasLasFechas);
      setFechaInscripcion(""); 
      setPaginaActual(0);
    }
  }, [festivosColombianos, inscripcionesPorFecha, fechasBloqueadas]);


  const buscarEmpleado = async (docBusqueda = documento) => {
    const docTrim = String(docBusqueda).trim();
    
    if (!docTrim) {
      setMensaje({ texto: "Por favor ingrese un documento", tipo: "error" });
      return;
    }

    // Verificar caché primero
    if (empleadosCache[docTrim]) {
      const empleadoData = empleadosCache[docTrim];
      setEmpleado(empleadoData);
      setFormData({
        fotoBuk: empleadoData.foto || "",
        nombres: empleadoData.nombre || "",
        telefono: empleadoData.Celular || "",
        cargo: empleadoData.cargo || "",
        puntoVenta: empleadoData.area_nombre || puntoVentaCoordinadora,
        nombreLider: nombreLider
      });
      setMensaje({ texto: "✓ Empleado encontrado", tipo: "success" });
      return;
    }

    setLoading(true);
    setMensaje({ texto: "", tipo: "" });
    
    try {
      const response = await fetch(
        `https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${docTrim}`
      );

      if (!response.ok) throw new Error('Error');

      const data = await response.json();
      const empleados = data?.data || data;
      const empleadoData = Array.isArray(empleados) 
        ? empleados.find(emp => String(emp.document_number) === docTrim)
        : null;
      
      if (empleadoData) {
        // Guardar en caché
        empleadosCache[docTrim] = empleadoData;
        
        setEmpleado(empleadoData);
        setFormData({
          fotoBuk: empleadoData.foto || "",
          nombres: empleadoData.nombre || "",
          telefono: empleadoData.Celular || "",
          cargo: empleadoData.cargo || "",
          puntoVenta: empleadoData.area_nombre || puntoVentaCoordinadora,
          nombreLider: nombreLider
        });
        setMensaje({ texto: "✓ Empleado encontrado", tipo: "success" });
      } else {
        setEmpleado(null);
        setMensaje({ texto: "No se encontró empleado con ese documento", tipo: "error" });
      }
    } catch (error) {
      setEmpleado(null);
      setMensaje({ texto: "Error de conexión con la API", tipo: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Auto-búsqueda con debounce
  useEffect(() => {
    if (documento.trim().length >= 6 && !empleado) {
      const timer = setTimeout(() => {
        buscarEmpleado(documento);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [documento]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDocumentoChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Solo números
    setDocumento(value);
    
    if (value.trim().length < 6) {
      setEmpleado(null);
      setFormData({
        fotoBuk: "",
        nombres: "",
        telefono: "",
        cargo: cargoCoordinadora,
        puntoVenta: puntoVentaCoordinadora,
        nombreLider: nombreLider
      });
      setMensaje({ texto: "", tipo: "" });
    }
  };

  const handleBuscarClick = () => {
    buscarEmpleado();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarEmpleado();
    }
  };

  const handleBloquearFecha = async (fecha, estaBloqueada) => {
    const confirmar = window.confirm(
      estaBloqueada 
        ? `¿Está seguro de desbloquear la fecha ${fecha}?`
        : `¿Está seguro de bloquear la fecha ${fecha}?`
    );
    
    if (!confirmar) return;

    try {
      if (estaBloqueada) {

        const response = await fetch('https://macfer.crepesywaffles.com/api/cap-cafe-fechas');
        if (response.ok) {
          const result = await response.json();
          const registro = result.data?.find(item => item.attributes?.fecha === fecha);
          
          if (registro) {
            const deleteResponse = await fetch(`https://macfer.crepesywaffles.com/api/cap-cafe-fechas/${registro.id}`, {
              method: 'DELETE'
            });
            
            if (deleteResponse.ok) {
              message.success('Fecha desbloqueada exitosamente');
              setFechasBloqueadas(prev => prev.filter(f => f !== fecha));
            } else {
              message.error('Error al desbloquear la fecha');
            }
          }
        }
      } else {

        const response = await fetch('https://macfer.crepesywaffles.com/api/cap-cafe-fechas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: {
              fecha: fecha,
              bloqueadoPor: nombreLider
            }
          })
        });

        if (response.ok) {
          message.success('Fecha bloqueada exitosamente');
          setFechasBloqueadas(prev => [...prev, fecha]);
        } else {
          message.error('Error al bloquear la fecha');
        }
      }
    } catch (error) {
      message.error('Error de conexión');
    }
  };

  const limpiarFormulario = () => {
    setDocumento("");
    setEmpleado(null);
    setFechaInscripcion("");
    setFormData({
      fotoBuk: "",
      nombres: "",
      telefono: "",
      cargo: cargoCoordinadora,
      puntoVenta: puntoVentaCoordinadora,
      nombreLider: nombreLider
    });
    setMensaje({ texto: "", tipo: "" });
    setMostrarModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    

    if (!formData.nombres || !formData.telefono || !formData.cargo) {
      setMensaje({ texto: "Por favor complete todos los campos requeridos", tipo: "error" });
      return;
    }

    if (!fechaInscripcion) {
      setMensaje({ texto: "Por favor seleccione una fecha de inscripción", tipo: "error" });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('https://macfer.crepesywaffles.com/api/cap-cafes');
      if (response.ok) {
        const result = await response.json();
        
        const yaInscrito = result.data?.some(inscripcion => {
          const docInscrito = inscripcion.attributes?.documento;
          const fechaInscrita = inscripcion.attributes?.fecha;
          return docInscrito === documento && fechaInscrita === fechaInscripcion;
        });

        if (yaInscrito) {
          message.warning('⚠️ Este documento ya está inscrito para la fecha seleccionada. Por favor elija otra fecha.', 5);
          
          limpiarFormulario();
          
          setLoading(false);
          return;
        }
      }
    } catch (error) {
    }
    
    setLoading(false);

    setMostrarModal(true);
  };

  const confirmarGuardado = async () => {
    setMostrarModal(false);
    setLoading(true);
    
    try {
      
      const dataToSend = {
        data: {
          documento: documento,
          nombre: formData.nombres,
          telefono: formData.telefono,
          cargo: formData.cargo,
          pdv: formData.puntoVenta,
          fecha: fechaInscripcion,
          lider: formData.nombreLider,
          tipo_formulario: 'heladeria',
          foto: formData.fotoBuk || ''
        }
      };


      const response = await fetch('https://macfer.crepesywaffles.com/api/cap-cafes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        const result = await response.json();
        message.success("✓ Inscripción guardada con éxito");
        

        setTimeout(() => {
          if (onSubmit) {
            onSubmit({ documento, ...formData, fechaInscripcion, empleadoCompleto: empleado, success: true });
          }
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));

        setMensaje({ texto: `Error al guardar la inscripción: ${errorData.message || 'Error desconocido'}`, tipo: "error" });
      }
    } catch (error) {
      setMensaje({ texto: "Error de conexión con el servidor", tipo: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inscripcion-container">
      <div className="decoration-circle circle-1"></div>
      <div className="decoration-circle circle-2"></div>
      <div className="decoration-circle circle-3"></div>

      <button className="back-button-outside" onClick={onBack}>
        <i className="bi bi-arrow-left-circle-fill"></i>
        <span>Volver</span>
      </button>

      <div className="inscripcion-card">

        <h1 className="inscripcion-subtitle">ESCUELA DEL CAFÉ HELADERIA </h1>

        <form className="inscripcion-form" onSubmit={handleSubmit}>
          {/* Búsqueda por documento */}
          <div className="form-section">
            <label className="form-label">NÚMERO DE DOCUMENTO *</label>
            <div className="search-input-container">
              <input
                type="text"
                placeholder="Ingresa el número de documento"
                value={documento}
                onChange={handleDocumentoChange}
                onKeyPress={handleKeyPress}
                className="form-input"
                readOnly={empleado !== null}
                disabled={empleado !== null}
              />
              <button
                type="button"
                onClick={handleBuscarClick}
                className="search-button"
                disabled={loading || empleado !== null || documento.trim().length < 6}
                title="Buscar empleado"
              >
                <i className="bi bi-search"></i>
              </button>
            </div>
            {loading && <span className="loading-indicator">Buscando empleado...</span>}
          </div>

          {/* Nombre del Líder (quien hizo login) */}
          <div className="form-section">
            <label className="form-label">NOMBRE DEL LÍDER</label>
            <input
              type="text"
              name="nombreLider"
              value={formData.nombreLider}
              className="form-input"
              readOnly
              disabled
              style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
            />
          </div>

          {mensaje.texto && (
            <div className={`mensaje ${mensaje.tipo}`}>
              {mensaje.texto}
            </div>
          )}

          {/* Información del Empleado - Colapsable */}
          {empleado && (
            <div className={`employee-info-container ${mostrarInfoEmpleado ? 'expanded' : ''}`}>
              <button
                type="button"
                className="toggle-info-button"
                onClick={() => setMostrarInfoEmpleado(!mostrarInfoEmpleado)}
              >
                <span>{mostrarInfoEmpleado ? 'Ocultar información' : 'Mostrar información'}</span>
                <i className={`bi ${mostrarInfoEmpleado ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>

              {mostrarInfoEmpleado && (
                <div className="employee-details">
                  {/* Foto */}
                  {formData.fotoBuk && (
                    <div className="form-section photo-section">
                      <label className="form-label">FOTO</label>
                      <div className="photo-preview">
                        <img src={formData.fotoBuk} alt="Foto empleado" className="employee-photo" />
                      </div>
                    </div>
                  )}

                  {/* Nombres */}
                  <div className="form-section">
                    <label className="form-label">NOMBRES COMPLETOS *</label>
                    <input
                      type="text"
                      name="nombres"
                      placeholder="Busque por documento para ver los datos"
                      value={formData.nombres}
                      onChange={handleInputChange}
                      className="form-input"
                      readOnly
                      disabled
                      required
                    />
                  </div>

                  {/* Teléfono */}
                  <div className="form-section">
                    <label className="form-label">TELÉFONO *</label>
                    <input
                      type="tel"
                      name="telefono"
                      placeholder="Ingrese el número de teléfono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      className="form-input"
                      required
                    />
                  </div>

                  {/* Cargo */}
                  <div className="form-section">
                    <label className="form-label">CARGO *</label>
                    <input
                      type="text"
                      name="cargo"
                      placeholder="Cargo actual"
                      value={empleado?.custom_attributes?.['Cargo General'] || formData.cargo}
                      className="form-input"
                      readOnly
                      disabled
                      required
                    />
                  </div>

                  {/* Punto de venta */}
                  <div className="form-section">
                    <label className="form-label">PUNTO DE VENTA</label>
                    <div className="punto-venta-container" style={{ position: 'relative' }}>
                      <input
                        type="text"
                        name="puntoVenta"
                        placeholder="Ubicación o punto de venta"
                        value={formData.puntoVenta}
                        className="form-input"
                        readOnly
                        disabled
                      />
                      <button
                        type="button"
                        className="ver-puntos-venta-btn"
                        onClick={() => setMostrarModalPuntosVenta(true)}
                        title="Ver todos los puntos de venta"
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '30px',
                          height: '30px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          transition: 'background 0.3s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#0056b3'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#007bff'}
                      >
                        <i className="bi bi-geo-alt-fill"></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selección de fecha (lunes o viernes) en tarjetas */}
          {fechasDisponibles.length > 0 && (
            <div className="form-section">
              <label className="form-label">FECHA DE INSCRIPCIÓN *</label>
              <div className="mes-info">
                Fechas disponibles de {(() => {
                  const periodosAMostrar = obtenerMesesAMostrar();
                  const meses = [
                    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                  ];
                  if (periodosAMostrar.length === 1) {
                    return `${meses[periodosAMostrar[0].month]} ${periodosAMostrar[0].year}`;
                  } else {
                    return `${meses[periodosAMostrar[0].month]} y ${meses[periodosAMostrar[1].month]}`;
                  }
                })()}
              </div>
              
              <div className="fechas-pagination-container">
                <button
                  type="button"
                  className="pagination-button prev"
                  onClick={() => setPaginaActual(prev => Math.max(0, prev - 1))}
                  disabled={paginaActual === 0}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>

                <div className="fechas-grid">
                  {fechasDisponibles
                    .slice(paginaActual * fechasPorPagina, (paginaActual + 1) * fechasPorPagina)
                    .map((fecha) => (
                      <div
                        key={fecha.fecha}
                        className={`fecha-card ${fechaInscripcion === fecha.fecha ? 'selected' : ''} ${!fecha.disponible ? 'no-disponible' : ''}`}
                        onClick={() => {
                          if (fecha.disponible) {
                            setFechaInscripcion(fecha.fecha);
                          } else if (fecha.esFestivo) {
                            setMensaje({ texto: "Esta fecha es un día festivo y no está disponible", tipo: "error" });
                            setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000);
                          } else if (fecha.estaBloqueada) {
                            setMensaje({ texto: "Esta fecha está bloqueada por el administrador", tipo: "error" });
                            setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000);
                          } else {
                            setMensaje({ texto: "Esta fecha ya tiene el máximo de inscripciones (3)", tipo: "error" });
                            setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000);
                          }
                        }}
                        title={!fecha.disponible ? (fecha.esFestivo ? 'Día festivo' : fecha.estaBloqueada ? 'Fecha bloqueada' : `Inscripciones: ${fecha.inscripciones}/3`) : `Inscripciones: ${fecha.inscripciones}/3`}
                      >
                        <div className="fecha-dia">
                          {parseInt(fecha.fecha.split('-')[2])}
                        </div>
                        <div className="fecha-mes">
                          {fecha.texto.split(' ')[0]}
                        </div>
                        <div className="fecha-texto">
                          {fecha.texto}
                        </div>
                        {!fecha.disponible && (
                          <div className="fecha-no-disponible-label">
                            {fecha.esFestivo ? 'FESTIVO' : fecha.estaBloqueada ? 'BLOQUEADA' : 'COMPLETO'}
                          </div>
                        )}
                        {fecha.disponible && fecha.inscripciones > 0 && (
                          <div className="fecha-contador">
                            {fecha.inscripciones}/3
                          </div>
                        )}
                        {puedeBloquearFechas && (
                          <button
                            type="button"
                            className={`fecha-bloqueo-btn ${fecha.estaBloqueada ? 'bloqueada' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBloquearFecha(fecha.fecha, fecha.estaBloqueada);
                            }}
                            title={fecha.estaBloqueada ? 'Desbloquear fecha' : 'Bloquear fecha'}
                          >
                            <i className={`bi ${fecha.estaBloqueada ? 'bi-unlock-fill' : 'bi-lock-fill'}`}></i>
                          </button>
                        )}
                      </div>
                    ))}
                </div>

                <button
                  type="button"
                  className="pagination-button next"
                  onClick={() => setPaginaActual(prev => Math.min(Math.floor(fechasDisponibles.length / fechasPorPagina), prev + 1))}
                  disabled={paginaActual >= Math.floor(fechasDisponibles.length / fechasPorPagina)}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>

              <div className="pagination-info">
                Página {paginaActual + 1} de {Math.ceil(fechasDisponibles.length / fechasPorPagina)}
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={limpiarFormulario}
            >
              Limpiar
            </button>
            <button type="submit" className="submit-button">
              Inscribir 
            </button>
          </div>
        </form>
      </div>

      {/* Modal de confirmación */}
      {mostrarModal && (
        <div className="modal-overlay-confirmacion">
          <div className="modal-confirmacion">
            <div className="modal-confirmacion-header">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <h2>ADVERTENCIA</h2>
            </div>
            <div className="modal-confirmacion-body">
              <p>LA PERSONA INSCRITA DEBE ASISTIR OBLIGATORIAMENTE</p>
            </div>
            <div className="modal-confirmacion-footer">
              <button 
                className="btn-modal-cancelar"
                onClick={limpiarFormulario}
              >
                Cancelar
              </button>
              <button 
                className="btn-modal-guardar"
                onClick={confirmarGuardado}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Puntos de Venta */}
      {mostrarModalPuntosVenta && (
        <div className="modal-overlay-confirmacion" onClick={() => setMostrarModalPuntosVenta(false)}>
          <div className="modal-confirmacion" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '70vh' }}>
            <div className="modal-confirmacion-header" style={{ background: '#007bff' }}>
              <i className="bi bi-geo-alt-fill"></i>
              <h2>PUNTOS DE VENTA</h2>
              <button
                onClick={() => setMostrarModalPuntosVenta(false)}
                style={{
                  position: 'absolute',
                  right: '15px',
                  top: '15px',
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  lineHeight: '1'
                }}
              >
                <i className="bi bi-x-circle-fill"></i>
              </button>
            </div>
            <div className="modal-confirmacion-body" style={{ maxHeight: '50vh', overflowY: 'auto', padding: '20px' }}>
              <div style={{ marginBottom: '15px', fontWeight: 'bold', fontSize: '18px', color: '#333' }}>
                Total de sedes vinculadas: {puntosVenta.length}
              </div>
              {puntosVenta.length > 0 ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {puntosVenta.map((punto, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px 15px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.3s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#e9ecef';
                        e.currentTarget.style.transform = 'translateX(5px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#f8f9fa';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <i className="bi bi-pin-map-fill" style={{ color: '#007bff', fontSize: '20px' }}></i>
                      <span style={{ fontSize: '15px', color: '#495057' }}>{punto}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <i className="bi bi-inbox" style={{ fontSize: '48px', marginBottom: '15px', display: 'block' }}></i>
                  <p>No hay puntos de venta registrados</p>
                </div>
              )}
            </div>
            <div className="modal-confirmacion-footer">
              <button 
                className="btn-modal-guardar"
                onClick={() => setMostrarModalPuntosVenta(false)}
                style={{ width: '100%' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormularioInscripcion;
