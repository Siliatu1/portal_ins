import React, { useState, useEffect } from "react";
import "./formulario_inscripcion.css"; 
import "bootstrap-icons/font/bootstrap-icons.css";
import { message, Select } from "antd";
import axios from "axios";


const empleadosCache = {};

const opcionesCargoEvaluar = [
  {
    label: <span className="cargo-group-title cargo-group-sal">SAL</span>,
    options: [
      { value: "Plancha Sal", label: "Plancha Sal" },
      { value: "Cocina", label: "Cocina" },
      { value: "Pitas y Ensaladas", label: "Pitas y Ensaladas" }
    ]
  },
  {
    label: <span className="cargo-group-title cargo-group-dulce">DULCE</span>,
    options: [
      { value: "Postres y Helados", label: "Postres y Helados" }
    ]
  },
  {
    label: <span className="cargo-group-title cargo-group-bebidas">BEBIDAS</span>,
    options: [
      { value: "Bebidas Frias y Calientes", label: "Bebidas Frias y Calientes" }
    ]
  },
  {
    label: <span className="cargo-group-title cargo-group-brunch">BRUNCH (Solo 1 punto)</span>,
    options: [
      { value: "Plancha Sal Brunch", label: "Plancha Sal Brunch" },
      { value: "Cocina Brunch", label: "Cocina Brunch" },
      { value: "Postres y Helados Brunch", label: "Postres y Helados Brunch" },
      { value: "Bebidas Brunch", label: "Bebidas Brunch" }
    ]
  }
];

const EvaluacionTodera = ({ onBack, onSubmit, coordinadoraData }) => {
  const [documento, setDocumento] = useState("");
  const [loading, setLoading] = useState(false);
  const [empleado, setEmpleado] = useState(null);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [categoria, setCategoria] = useState("");
  const [cargoEvaluar, setCargoEvaluar] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  
  const cargoCoordinadora = coordinadoraData?.data?.cargo_general || coordinadoraData?.data?.position || "";
  const puntoVentaCoordinadora = coordinadoraData?.data?.area_nombre || "";
  
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
  
  const [instructora, setInstructora] = useState(null);
  const [loadingInstructora, setLoadingInstructora] = useState(false);

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
        telefono: empleadoData.Celular.toString() || "",
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

  /**
   * Busca la instructora asignada según el punto de venta y la categoría seleccionada
   * Realiza una consulta a la API de Strapi con filtros específicos para obtener
   * la instructora correcta y actualiza el formulario automáticamente
   */
  const buscarInstructora = async (categoriaSeleccionada) => {
    if (!puntoVentaCoordinadora || !categoriaSeleccionada) {
      return;
    }

    setLoadingInstructora(true);
    
    try {
      // Construir URL con filtros de Strapi según la categoría
      const pdvEncoded = encodeURIComponent(puntoVentaCoordinadora);
      const url = `https://macfer.crepesywaffles.com/api/cap-pdvs?filters[cap_instructoras][${categoriaSeleccionada}][$eq]=true&filters[nombre][$eq]=${pdvEncoded}&populate[cap_instructoras][filters][${categoriaSeleccionada}][$eq]=true`;
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error al buscar instructora');
      }

      const data = await response.json();
      
      if (data?.data && data.data.length > 0) {
        const pdvData = data.data[0];
        const instructoras = pdvData.attributes?.cap_instructoras?.data;
        
        if (instructoras && instructoras.length > 0) {
          // Con los filtros aplicados en la API, debería venir solo la instructora correcta
          const instructoraEncontrada = instructoras[0];

          if (instructoraEncontrada) {
            const nombreInstructora = instructoraEncontrada.attributes?.Nombre || '';
            setInstructora(nombreInstructora);
            setFormData(prev => ({
              ...prev,
              nombreLider: nombreInstructora
            }));
            message.success(`Instructora asignada: ${nombreInstructora}`);
          } else {
            message.warning(`No se encontró instructora de ${categoriaSeleccionada} para este punto de venta`);
            setInstructora(null);
          }
        } else {
          message.warning('No hay instructoras registradas para este punto de venta');
          setInstructora(null);
        }
      } else {
        message.warning('No se encontró información del punto de venta');
        setInstructora(null);
      }
    } catch (error) {
      message.error('Error al buscar la instructora');
      setInstructora(null);
    } finally {
      setLoadingInstructora(false);
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

  // Buscar instructora cuando cambie la categoría
  useEffect(() => {
    if (categoria && empleado) {
      buscarInstructora(categoria);
    }
  }, [categoria]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const limpiarFormulario = () => {
    setDocumento("");
    setEmpleado(null);
    setCategoria("");
    setCargoEvaluar("");
    setInstructora(null);
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

    if (!empleado) {
      message.error("Por favor busque un empleado válido");
      return;
    }

    if (!categoria) {
      message.error("Por favor seleccione una categoría");
      return;
    }

    if (!cargoEvaluar) {
      message.error("Por favor seleccione el cargo a evaluar");
      return;
    }

    // Advertencia si no hay instructora, pero permitir continuar
    if (!instructora) {
      message.warning("No se encontró instructora asignada automáticamente");
    }

    setMostrarModal(true);
  };

  const confirmarGuardado = async () => {
    setMostrarModal(false);
    setLoading(true);  
    

    const categoriaEnMayusculas = categoria ? categoria.toUpperCase() : '';
    
    // Limpiar teléfono (como STRING, no número)
    let telefonoFinal = '';
    if (formData.telefono) {
      telefonoFinal = String(formData.telefono).replace(/\D/g, '');
    }
    
    // Construir objeto base con todos los datos necesarios para el envío
    const dataToSend = {
      data: {
        Nombre: formData.nombres,
        documento: documento.toString(),
        telefono: telefonoFinal,
        pdv: formData.puntoVenta,
        lider: instructora || formData.nombreLider || '',
        foto: formData.fotoBuk || '',
        cargo: cargoEvaluar,
        cargo_empleado: formData.cargo,
        cargo_evaluar: cargoEvaluar,
        cargoEvaluar: cargoEvaluar,
        fecha: new Date().toISOString().split('T')[0],
        categoria: categoriaEnMayusculas
      }
    };

    try {
      const response = await axios.post(
        'https://macfer.crepesywaffles.com/api/cap-toderas',
        dataToSend
      );

      message.success("✓ Evaluación registrada con éxito");
      limpiarFormulario();
      setLoading(false);

      if (onSubmit) {
        onSubmit({ success: true, data: response.data });
      }
    } catch (error) {
      setLoading(false);
      
      if (error.response) {
        const errorData = error.response.data;
        
        if (errorData?.error?.message) {
          message.error(`Error: ${errorData.error.message}`);
        } else if (errorData?.error?.details) {
          message.error(`Error en validación: ${JSON.stringify(errorData.error.details)}`);
        } else {
          message.error(`Error ${error.response.status}: ${JSON.stringify(errorData)}`);
        }
      } else if (error.request) {
        message.error('No se recibió respuesta del servidor');
      } else {
        message.error('Error al configurar la petición');
      }
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
        <h1 className="inscripcion-subtitle">EVALUACIÓN TODERAS</h1>

        {/* Alerta importante */}
        <div className="alerta-evaluacion-box">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span>SOLO SE PUEDE INSCRIBIR SI YA ESTÁ 100% LISTA PARA LA EVALUACIÓN</span>
        </div>

        <form onSubmit={handleSubmit} className="inscripcion-form">
          {/* Búsqueda de empleado */}
          <div className="form-section">
            <label className="form-label">NÚMERO DE DOCUMENTO *</label>
            <div className="search-input-container">
              <input
                type="text"
                className="form-input"
                placeholder="Ingrese número de documento"
                value={documento}
                onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ''))}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    buscarEmpleado();
                  }
                }}
              />
              <button
                type="button"
                className="search-button"
                onClick={buscarEmpleado}
                disabled={loading}
              >
                {loading ? (
                  <i className="bi bi-hourglass-split"></i>
                ) : (
                  <i className="bi bi-search"></i>
                )}
              </button>
            </div>
            {mensaje.texto && (
              <div className={`mensaje ${mensaje.tipo}`}>
                {mensaje.texto}
              </div>
            )}
          </div>

          {/* Información del empleado */}
          {empleado && (
            <>
              {/* Card de información del empleado */}
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
                  className="form-input"
                  value={formData.nombres}
                  readOnly
                  disabled
                  style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                />
              </div>

              {/* Teléfono */}
              <div className="form-section">
                <label className="form-label">TELÉFONO</label>
                <input
                  type="tel"
                  name="telefono"
                  className="form-input"
                  value={formData.telefono}
                  readOnly
                  disabled
                  style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                />
              </div>

              {/* Cargo */}
              <div className="form-section">
                <label className="form-label">CARGO</label>
                <input
                  type="text"
                  name="cargo"
                  className="form-input"
                  value={formData.cargo}
                  readOnly
                  disabled
                  style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                />
              </div>

              {/* Punto de venta */}
              <div className="form-section">
                <label className="form-label">PUNTO DE VENTA</label>
                <input
                  type="text"
                  name="puntoVenta"
                  className="form-input"
                  value={formData.puntoVenta}
                  readOnly
                  disabled
                  style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                />
              </div>

              {/* Categoría */}
              <div className="form-section">
                <label className="form-label">CATEGORÍA A EVALUAR *</label>
                <select
                  className="form-input"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  required
                >
                  <option value="">Seleccione la categoría</option>
                  <option value="sal">Sal</option>
                  <option value="dulce">Dulce</option>
                  <option value="bebidas">Bebidas</option>
                </select>
              </div>

              {/* Cargo a evaluar */}
              <div className="form-section">
                <label className="form-label">CARGO A EVALUAR *</label>
                <Select
                  className="cargo-evaluar-select"
                  popupClassName="cargo-evaluar-dropdown"
                  value={cargoEvaluar}
                  onChange={(value) => setCargoEvaluar(value)}
                  placeholder="Seleccione un cargo"
                  options={opcionesCargoEvaluar}
                  showSearch
                  optionFilterProp="label"
                >
                </Select>
              </div>

              {/* Nombre de la instructora - Se muestra después de seleccionar categoría */}
              {categoria && (
                <div className="form-section">
                  <label className="form-label">
                    NOMBRE DE LA INSTRUCTORA
                    {loadingInstructora && <i className="bi bi-hourglass-split" style={{ marginLeft: '8px' }}></i>}
                  </label>
                  <input
                    type="text"
                    name="nombreLider"
                    className="form-input"
                    value={loadingInstructora ? 'Buscando instructora...' : (instructora || 'Sin asignar')}
                    readOnly
                    disabled
                    style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                  />
                </div>
              )}

              {/* Botones de acción */}
              <div className="button-container">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={limpiarFormulario}
                  disabled={loading}
                >
                  <i className="bi bi-x-circle"></i> Limpiar
                </button>
                <button 
                  type="submit" 
                  className="button-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <i className="bi bi-hourglass-split"></i> Guardando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle"></i> Registrar Evaluación
                    </>
                  )}
                </button>
              </div>
            </>
          )}
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
    </div>
  );
};

export default EvaluacionTodera;
