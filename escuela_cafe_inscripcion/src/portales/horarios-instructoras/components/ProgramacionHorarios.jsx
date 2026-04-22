import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal, Button } from 'antd';
import 'antd/dist/reset.css';
import '../styles/ProgramacionHorarios.css';

function ProgramacionHorarios({ userData, onLogout }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [puntosVenta, setPuntosVenta] = useState([]);
  const [loadingPuntos, setLoadingPuntos] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Estado para el modal de edición/creación
  const [modalEditar, setModalEditar] = useState(false);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null); // { dia: 'lunes', index: 0 }
  const [eventoEditarModal, setEventoEditarModal] = useState(null);
  const [formDataModal, setFormDataModal] = useState({
    puntoVenta: '',
    horaInicio: '',
    horaFin: '',
    motivo: '',
    detalleCubrir: '',
    detalleOtro: ''
  });
  const [showMoreMotivosModal, setShowMoreMotivosModal] = useState(false);
  const [guardandoDia, setGuardandoDia] = useState(false);
  
  // Estados para programación semanal
  const [diaActual, setDiaActual] = useState(0); // 0=Lunes, 6=Domingo
  const [semanaOffset, setSemanaOffset] = useState(0); // Offset de semanas para navegar
  const [programacionSemanal, setProgramacionSemanal] = useState({
    lunes: [],
    martes: [],
    miercoles: [],
    jueves: [],
    viernes: [],
    sabado: [],
    domingo: []
  });
  
  // Estado para festivos colombianos
  const [festivos, setFestivos] = useState([]);
  const [loadingFestivos, setLoadingFestivos] = useState(true);
  
  const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const diasSemanaLabel = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  
  // Función para obtener las fechas de la próxima semana (desde el próximo lunes)
  const getFechasSemana = () => {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); // 0=Domingo, 1=Lunes, etc.
    const proximoLunes = new Date(hoy);
    
    // Calcular cuántos días faltan para el próximo lunes
    let diasHastaProximoLunes;
    if (diaSemana === 0) { // Domingo
      diasHastaProximoLunes = 1;
    } else if (diaSemana === 1) { // Lunes
      diasHastaProximoLunes = 7; // Siguiente lunes
    } else { // Martes a Sábado
      diasHastaProximoLunes = 8 - diaSemana;
    }
    
    proximoLunes.setDate(hoy.getDate() + diasHastaProximoLunes + (semanaOffset * 7));
    
    const fechas = [];
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(proximoLunes);
      fecha.setDate(proximoLunes.getDate() + i);
      fechas.push(fecha);
    }
    return fechas;
  };
  
  const fechasSemana = useMemo(() => getFechasSemana(), [semanaOffset]);
  
  // Función para formatear fecha
  const formatearFecha = (fecha) => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${fecha.getDate()} ${meses[fecha.getMonth()]}`;
  };
  
  const motivosLabels = {
    'retroalimentacion': 'Retroalimentación',
    'acompañamiento': 'Acompañamiento',
    'capacitacion': 'Capacitación',
    'visita': 'Visita',
    'induccion': 'Inducción',
    'cubrir_puesto': 'Cubrir Puesto',
    'disponible': 'Disponible',
    'fotos': 'Fotos',
    'escuela_cafe': 'Escuela del Café',
    'sintonizarte': 'Sintonizarte',
    'viaje': 'Viaje',
    'pg': 'P&G',
    'apoyo': 'Apoyo',
    'reunion': 'Reunión',
    'cambio_turno': 'Cambio de Turno',
    'apertura': 'Apertura',
    'lanzamiento': 'Lanzamiento',
    'vacaciones': 'Vacaciones',
    'incapacidad': 'Incapacidad',
    'dia_familia': 'Día de la Familia',
    'permiso_no_remunerado': 'Permiso No Remunerado',
    'licencia_no_remunerada': 'Licencia No Remunerada',
    'licencia_remunerada': 'Licencia Remunerada',
    'licencia_luto': 'Licencia por Luto',
    'otro': 'Otro'
  };
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    puntoVenta: '',
    horaInicio: '',
    horaFin: '',
    motivo: '',
    detalleCubrir: '',
    detalleOtro: ''
  });

  // Función para calcular horas entre dos tiempos
  const calcularHoras = (horaInicio, horaFin) => {
    const [horaIni, minIni] = horaInicio.split(':').map(Number);
    const [horaFi, minFi] = horaFin.split(':').map(Number);
    const totalHoras = (horaFi * 60 + minFi - (horaIni * 60 + minIni)) / 60;
    return totalHoras;
  };

  // Función para calcular total de horas de un día
  const calcularHorasDia = (dia) => {
    const eventos = programacionSemanal[dia];
    return eventos.reduce((total, evento) => {
      // Si no tiene horas (día de descanso), retornar 0
      if (!evento.horaInicio || !evento.horaFin || evento.motivo === 'dia_descanso') {
        return total;
      }
      return total + calcularHoras(evento.horaInicio, evento.horaFin);
    }, 0);
  };

  // Función para calcular total de horas de la semana
  const calcularTotalHorasSemana = () => {
    return diasSemana.reduce((total, dia) => {
      return total + calcularHorasDia(dia);
    }, 0);
  };

  // Función para abrir modal para agregar evento en un día específico
  const handleAgregarEventoDia = (diaKey, diaIndex) => {
    // Verificar si es festivo
    const fechaDia = fechasSemana[diaIndex];
    const festivoInfo = esFestivo(fechaDia);
    
    if (festivoInfo) {
      alert(`No se puede programar actividades en ${festivoInfo.nombre}`);
      return;
    }
    
    setDiaSeleccionado({ dia: diaKey, index: diaIndex });
    setEventoEditarModal(null);
    setFormDataModal({
      puntoVenta: '',
      horaInicio: '',
      horaFin: '',
      motivo: '',
      detalleCubrir: '',
      detalleOtro: ''
    });
    setShowMoreMotivosModal(false);
    setModalEditar(true);
  };

  // Función para obtener información de la semana
  const getInfoSemana = () => {
    const primerDia = fechasSemana[0];
    const ultimoDia = fechasSemana[6];
    const mes = primerDia.getMonth();
    const año = primerDia.getFullYear();
    
    // Obtener número de semana del mes
    const primerDiaMes = new Date(año, mes, 1);
    const diasHastaPrimerLunes = (8 - primerDiaMes.getDay()) % 7;
    const numeroSemana = Math.ceil((primerDia.getDate() - diasHastaPrimerLunes) / 7) + 1;
    
    return {
      numeroSemana,
      fechaInicio: primerDia,
      fechaFin: ultimoDia
    };
  };

  // Cargar festivos colombianos
  useEffect(() => {
    const cargarFestivos = async () => {
      try {
        setLoadingFestivos(true);
        const response = await axios.get('https://date.nager.at/api/v3/PublicHolidays/2026/CO');
        setFestivos(response.data);
      } catch (error) {
        console.error('Error al cargar festivos:', error);
        setFestivos([]);
      } finally {
        setLoadingFestivos(false);
      }
    };
    
    cargarFestivos();
  }, []);

  // Función para verificar si una fecha es festivo
  const esFestivo = (fecha) => {
    if (!fecha || festivos.length === 0) return null;
    
    const fechaStr = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    
    const festivo = festivos.find(f => f.date === fechaStr);
    return festivo ? { nombre: festivo.localName, tipo: festivo.types?.[0] || 'Public' } : null;
  };

  // Verificar autenticación y cargar datos
  useEffect(() => {
    if (!userData) {
      navigate('/auth/login', { replace: true });
      return;
    }

    const instructoraData = {
      documento: userData?.data?.documento || userData?.data?.document_number || userData?.documento || '',
      nombre: userData?.data?.nombre || 
        userData?.data?.name ||
        (userData?.data?.first_name && userData?.data?.last_name 
          ? `${userData.data.first_name} ${userData.data.last_name}`.trim()
          : userData?.data?.full_name || ''),
      correo: userData?.data?.correo || userData?.data?.email || userData?.correo || '',
      telefono: userData?.data?.telefono || userData?.data?.phone || userData?.telefono || '',
      foto: ''
    };

    setUser(instructoraData);

    // Cargar foto desde API de BUK
    const doc = instructoraData.documento;
    if (doc) {
      fetch(`https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${doc}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          const empleados = data?.data || data;
          const emp = Array.isArray(empleados) ? empleados.find(e => String(e.document_number) === String(doc)) : null;
          if (emp?.foto) setUser(prev => prev ? { ...prev, foto: emp.foto } : prev);
        })
        .catch(() => {});
    }

    // Limpiar puntos de venta anteriores antes de cargar nuevos
    setPuntosVenta([]);
    cargarPuntosVenta(instructoraData);
  }, [navigate, userData]);

  // Guardar programación en localStorage cuando cambie
  useEffect(() => {
    const infoSemana = getInfoSemana();
    const dataParaGuardar = {
      programacion: programacionSemanal,
      semana: {
        numero: infoSemana.numeroSemana,
        fechaInicio: infoSemana.fechaInicio.toISOString(),
        fechaFin: infoSemana.fechaFin.toISOString()
      }
    };
    localStorage.setItem('programacionSemanal', JSON.stringify(dataParaGuardar));
  }, [programacionSemanal]);

  // Cargar horarios desde el API cuando el usuario esté disponible
  useEffect(() => {
    if (!user || fechasSemana.length === 0) return;

    const cargarHorariosAPI = async () => {
      try {
        const documento = user.document_number || user.documento || user.cedula;
        if (!documento) return;

        // Usar las fechas de la semana calculadas
        const fechaInicio = fechasSemana[0];
        const fechaFin = fechasSemana[6];

        const fechaInicioStr = `${fechaInicio.getFullYear()}-${String(fechaInicio.getMonth() + 1).padStart(2, '0')}-${String(fechaInicio.getDate()).padStart(2, '0')}`;
        const fechaFinStr = `${fechaFin.getFullYear()}-${String(fechaFin.getMonth() + 1).padStart(2, '0')}-${String(fechaFin.getDate()).padStart(2, '0')}`;

        const url = `https://macfer.crepesywaffles.com/api/horarios-instructoras?filters[documento][$eq]=${documento}&filters[fecha][$gte]=${fechaInicioStr}&filters[fecha][$lte]=${fechaFinStr}&pagination[pageSize]=40000`;
        
        const response = await axios.get(url);
        
        if (response.data?.data && response.data.data.length > 0) {
          // Convertir los datos del API al formato interno
          const nuevaProgramacion = {
            lunes: [],
            martes: [],
            miercoles: [],
            jueves: [],
            viernes: [],
            sabado: [],
            domingo: []
          };

          response.data.data.forEach(item => {
            // Parsear la fecha del API (formato: YYYY-MM-DD)
            const fechaStr = item.attributes.fecha;
            const [year, month, day] = fechaStr.split('-').map(Number);
            const fechaItem = new Date(year, month - 1, day);
            
            // Buscar el día de la semana comparando con fechasSemana
            let diaIndex = -1;
            for (let i = 0; i < fechasSemana.length; i++) {
              const fechaSemana = fechasSemana[i];
              if (
                fechaSemana.getFullYear() === fechaItem.getFullYear() &&
                fechaSemana.getMonth() === fechaItem.getMonth() &&
                fechaSemana.getDate() === fechaItem.getDate()
              ) {
                diaIndex = i;
                break;
              }
            }
            
            // Si no se encuentra el día, saltar este ítem
            if (diaIndex === -1) return;
            
            const diaKey = diasSemana[diaIndex];
            
            // Determinar el motivo basado en la actividad
            const actividad = item.attributes.actividad;
            let motivo = 'otro';
            let detalleOtro = actividad;
            let detalleCubrir = '';
            
            // Mapear actividades a motivos
            const actividadAMotivo = {
              'Retroalimentación': 'retroalimentacion',
              'Acompañamiento': 'acompañamiento',
              'Capacitación': 'capacitacion',
              'Día de Descanso': 'dia_descanso',
              'Visita': 'visita',
              'Inducción': 'induccion',
              'Cubrir Puesto': 'cubrir_puesto',
              'Disponible': 'disponible',
              'Fotos': 'fotos',
              'Escuela del Café': 'escuela_cafe',
              'Sintonizarte': 'sintonizarte',
              'Viaje': 'viaje',
              'P&G': 'pg',
              'Apoyo': 'apoyo',
              'Reunión': 'reunion',
              'Cambio de Turno': 'cambio_turno',
              'Apertura': 'apertura',
              'Lanzamiento': 'lanzamiento',
              'Vacaciones': 'vacaciones',
              'Incapacidad': 'incapacidad',
              'Día de la Familia': 'dia_familia',
              'Permiso No Remunerado': 'permiso_no_remunerado',
              'Licencia No Remunerada': 'licencia_no_remunerada',
              'Licencia Remunerada': 'licencia_remunerada',
              'Licencia por Luto': 'licencia_luto'
            };
            
            if (actividadAMotivo[actividad]) {
              motivo = actividadAMotivo[actividad];
              detalleOtro = '';
            }

            nuevaProgramacion[diaKey].push({
              puntoVenta: item.attributes.pdv_nombre,
              puntoVentaId: '', // Se completará después cuando los puntos de venta estén cargados
              horaInicio: item.attributes.hora_inicio ? item.attributes.hora_inicio.substring(0, 5) : '',
              horaFin: item.attributes.hora_fin ? item.attributes.hora_fin.substring(0, 5) : '',
              motivo: motivo,
              detalleCubrir: detalleCubrir,
              detalleOtro: detalleOtro,
              fechaModificacion: item.attributes.updatedAt || item.attributes.createdAt,
              horaModificacion: new Date(item.attributes.updatedAt || item.attributes.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
              idAPI: item.id // Guardar el ID del API para futuras ediciones
            });
          });

          setProgramacionSemanal(nuevaProgramacion);
        }
      } catch (error) {
        console.error('Error al cargar horarios desde API:', error);
      }
    };

    cargarHorariosAPI();
  }, [user, semanaOffset]);

  // Relacionar puntos de venta cargados con la programación del API
  useEffect(() => {
    if (puntosVenta.length === 0) return;

    // Actualizar los puntoVentaId en la programación
    setProgramacionSemanal(prev => {
      const nuevaProg = { ...prev };
      
      diasSemana.forEach(dia => {
        nuevaProg[dia] = prev[dia].map(evento => {
          // Buscar el punto de venta que coincida con el nombre
          const pdv = puntosVenta.find(p => p.nombre === evento.puntoVenta);
          return {
            ...evento,
            puntoVentaId: pdv ? String(pdv.id) : ''
          };
        });
      });
      
      return nuevaProg;
    });
  }, [puntosVenta]);

  // Cargar puntos de venta de la instructora
  const cargarPuntosVenta = async (userData) => {
    try {
      setLoadingPuntos(true);
      
      // Obtener el documento de la instructora logueada
      const documento = userData.document_number || userData.documento || userData.cedula;
      
      if (!documento) {
        alert('Error: No se encontró el documento de la instructora');
        setPuntosVenta([]);
        return;
      }

      // Limpiar el documento de espacios o caracteres extraños
      const documentoLimpio = String(documento).trim();
      
      // Filtrar directamente por el documento de la instructora en el API
      const url = `https://macfer.crepesywaffles.com/api/cap-instructoras?filter[documento][$eq]=${documentoLimpio}&populate[cap_pdvs]=*`;
      
      const response = await axios.get(url);

      // Verificar si se encontró la instructora y tiene puntos de venta
      if (response.data?.data && response.data.data.length > 0) {
        
        // VALIDACIÓN ESTRICTA: buscar la instructora que coincida EXACTAMENTE con el documento
        const instructoraActual = response.data.data.find(inst => 
          String(inst.attributes.documento).trim() === documentoLimpio
        );
        
        if (!instructoraActual) {
          alert(`No se encontró la instructora con documento ${documentoLimpio} en el sistema de capacitación`);
          setPuntosVenta([]);
          return;
        }
        
        if (instructoraActual.attributes.cap_pdvs?.data && instructoraActual.attributes.cap_pdvs.data.length > 0) {
          
          // Filtrar solo los puntos de venta activos
          const puntosActivos = instructoraActual.attributes.cap_pdvs.data
            .filter(pdv => pdv.attributes?.activo === true)
            .map(pdv => ({
              id: pdv.id,
              nombre: pdv.attributes.nombre
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
          
          if (puntosActivos.length > 0) {
            setPuntosVenta(puntosActivos);
          } else {
            alert('Esta instructora no tiene puntos de venta activos asignados');
            setPuntosVenta([]);
          }
        } else {
          alert('Esta instructora no tiene puntos de venta asignados');
          setPuntosVenta([]);
        }
      } else {
        alert(`No se encontró la instructora con el documento ${documentoLimpio}`);
        setPuntosVenta([]);
      }
    } catch (error) {
      alert('Error al cargar los puntos de venta. Por favor intenta nuevamente.');
      setPuntosVenta([]);
    } finally {
      setLoadingPuntos(false);
    }
  };

  const handleCerrarProgramacion = () => {
    if (window.confirm('¿Estás segura de que deseas cerrar la programación de esta semana y pasar a la siguiente?')) {
      // Limpiar la programación actual
      setProgramacionSemanal({
        lunes: [],
        martes: [],
        miercoles: [],
        jueves: [],
        viernes: [],
        sabado: [],
        domingo: []
      });
      
      // Avanzar a la siguiente semana
      setSemanaOffset(prev => prev + 1);
      
      alert('✅ Programación cerrada. Ahora puedes programar la siguiente semana.');
    }
  };

  const handleEditarEvento = (dia, index, evento, diaIndex) => {
    console.log('🔥 Editando evento:', { dia, index, evento });
    
    // Verificar si es festivo
    const fechaDia = fechasSemana[diaIndex];
    const festivoInfo = esFestivo(fechaDia);
    
    if (festivoInfo) {
      alert(`No se puede editar actividades en ${festivoInfo.nombre}`);
      return;
    }
    
    // Buscar el ID del punto de venta
    let puntoVentaId = evento.puntoVentaId || '';
    
    if (!puntoVentaId && evento.puntoVenta) {
      const pdvEncontrado = puntosVenta.find(p => p.nombre === evento.puntoVenta);
      if (pdvEncontrado) {
        puntoVentaId = String(pdvEncontrado.id);
      }
    }
    
    // Cargar datos en el formulario del modal
    setFormDataModal({
      puntoVenta: puntoVentaId,
      horaInicio: evento.horaInicio || '',
      horaFin: evento.horaFin || '',
      motivo: evento.motivo || '',
      detalleCubrir: evento.detalleCubrir || '',
      detalleOtro: evento.detalleOtro || ''
    });
    
    // Verificar si necesita expandir motivos
    const motivosExpandibles = [
      'dia_descanso', 'visita', 'induccion', 'cubrir_puesto', 'disponible',
      'fotos', 'escuela_cafe', 'sintonizarte', 'viaje', 'pg', 'apoyo', 'reunion',
      'cambio_turno', 'apertura', 'lanzamiento', 'vacaciones', 'incapacidad',
      'dia_familia', 'permiso_no_remunerado', 'licencia_no_remunerada',
      'licencia_remunerada', 'licencia_luto', 'otro'
    ];
    
    if (motivosExpandibles.includes(evento.motivo)) {
      setShowMoreMotivosModal(true);
    } else {
      setShowMoreMotivosModal(false);
    }
    
    // Guardar referencia del día y evento que se está editando
    setDiaSeleccionado({ dia, index: diaIndex });
    setEventoEditarModal({ dia, index });
    
    // Abrir modal
    setModalEditar(true);
  };

  const handleInputChangeModal = (e) => {
    const { name, value } = e.target;
    setFormDataModal(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGuardarEdicionModal = async () => {
    if (!diaSeleccionado) return;

    const { dia, index: diaIndex } = diaSeleccionado;

    // Validaciones
    if (!formDataModal.motivo) {
      alert('Por favor selecciona un motivo');
      return;
    }

    // Validar punto de venta solo si no es día de descanso o vacaciones
    if (formDataModal.motivo !== 'dia_descanso' && formDataModal.motivo !== 'vacaciones' && !formDataModal.puntoVenta) {
      alert('Por favor selecciona un punto de venta');
      return;
    }
    if (formDataModal.motivo === 'cubrir_puesto' && !formDataModal.detalleCubrir) {
      alert('Por favor especifica a quién vas a cubrir');
      return;
    }

    if (formDataModal.motivo === 'otro' && !formDataModal.detalleOtro) {
      alert('Por favor especifica el detalle de la actividad');
      return;
    }

    // Validar horas solo si no es día de descanso o vacaciones
    if (formDataModal.motivo !== 'dia_descanso' && formDataModal.motivo !== 'vacaciones') {
      if (!formDataModal.horaInicio || !formDataModal.horaFin) {
        alert('Por favor ingresa hora de inicio y fin');
        return;
      }

      const inicio = new Date(`2000-01-01T${formDataModal.horaInicio}`);
      const fin = new Date(`2000-01-01T${formDataModal.horaFin}`);

      if (fin <= inicio) {
        alert('La hora de fin debe ser mayor a la hora de inicio');
        return;
      }

      // Calcular horas del día excluyendo el evento que se está editando
      const horasTotales = programacionSemanal[dia].reduce((total, evento, idx) => {
        if (eventoEditarModal && idx === eventoEditarModal.index) return total; // Excluir el evento que se está editando
        if (evento.motivo === 'dia_descanso' || evento.motivo === 'vacaciones') return total;
        
        const eventoInicio = new Date(`2000-01-01T${evento.horaInicio}`);
        const eventoFin = new Date(`2000-01-01T${evento.horaFin}`);
        const horas = (eventoFin - eventoInicio) / (1000 * 60 * 60);
        return total + horas;
      }, 0);

      const horasNuevas = (fin - inicio) / (1000 * 60 * 60);
      const totalConEdicion = horasTotales + horasNuevas;

      if (totalConEdicion > 7) {
        alert(`No puedes programar más de 7 horas por día. Ya tienes ${horasTotales.toFixed(1)} horas. Solo puedes agregar ${(7 - horasTotales).toFixed(1)} horas más.`);
        return;
      }

      // Validar que no se excedan las 42 horas semanales
      let horasSemanales = 0;
      diasSemana.forEach(diaKey => {
        programacionSemanal[diaKey].forEach((evento, idx) => {
          // Excluir el evento que se está editando
          if (diaKey === dia && eventoEditarModal && idx === eventoEditarModal.index) return;
          
          if (evento.motivo === 'dia_descanso' || evento.motivo === 'vacaciones') return;
          
          if (evento.horaInicio && evento.horaFin) {
            const eventoInicio = new Date(`2000-01-01T${evento.horaInicio}`);
            const eventoFin = new Date(`2000-01-01T${evento.horaFin}`);
            const horas = (eventoFin - eventoInicio) / (1000 * 60 * 60);
            horasSemanales += horas;
          }
        });
      });

      const totalSemanalConNuevo = horasSemanales + horasNuevas;

      if (totalSemanalConNuevo > 42) {
        alert(`No puedes programar más de 42 horas por semana. Ya tienes ${horasSemanales.toFixed(1)} horas programadas. Solo puedes agregar ${(42 - horasSemanales).toFixed(1)} horas más.`);
        return;
      }
    }

    setGuardandoDia(true);

    try {
      // Obtener nombre del punto de venta
      const puntoVentaObj = puntosVenta.find(p => String(p.id) === formDataModal.puntoVenta);
      const puntoVentaNombre = puntoVentaObj ? puntoVentaObj.nombre : (formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones' ? 'N/A' : '');

      // Determinar la actividad según el motivo
      let actividad = motivosLabels[formDataModal.motivo] || formDataModal.motivo;
      if (formDataModal.motivo === 'cubrir_puesto') {
        actividad = `Cubrir Puesto - ${formDataModal.detalleCubrir}`;
      } else if (formDataModal.motivo === 'otro') {
        actividad = formDataModal.detalleOtro;
      }

      // Calcular la fecha del día
      const fecha = fechasSemana[diaIndex];
      const fechaFormateada = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

      // Preparar datos para el API
      const horaInicio = (formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones') ? '00:00:00' : `${formDataModal.horaInicio}:00`;
      const horaFin = (formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones') ? '00:00:00' : `${formDataModal.horaFin}:00`;
      
      const documento = user.document_number || user.documento || user.cedula;

      const datosAPI = {
        data: {
          pdv_nombre: puntoVentaNombre,
          fecha: fechaFormateada,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          actividad: actividad,
          documento: String(documento)
        }
      };

      let idAPI = null;

      // Si estamos editando, obtener el ID del API
      if (eventoEditarModal) {
        const eventoActual = programacionSemanal[dia][eventoEditarModal.index];
        idAPI = eventoActual?.idAPI;
      }

      // Actualizar en el API si tiene ID, sino crear nuevo
      if (idAPI) {
        await axios.put(`https://macfer.crepesywaffles.com/api/horarios-instructoras/${idAPI}`, datosAPI);
      } else {
        const response = await axios.post('https://macfer.crepesywaffles.com/api/horarios-instructoras', datosAPI);
        idAPI = response.data.data.id;
      }

      // Crear evento actualizado para el estado local
      const eventoActualizado = {
        puntoVenta: puntoVentaNombre || 'N/A',
        puntoVentaId: formDataModal.puntoVenta || '',
        horaInicio: (formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones') ? '' : formDataModal.horaInicio,
        horaFin: (formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones') ? '' : formDataModal.horaFin,
        motivo: formDataModal.motivo,
        detalleCubrir: formDataModal.detalleCubrir,
        detalleOtro: formDataModal.detalleOtro,
        fechaModificacion: new Date().toISOString(),
        horaModificacion: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        idAPI: idAPI
      };

      // Actualizar o agregar el evento en la programación local
      if (eventoEditarModal) {
        // Actualizar evento existente
        setProgramacionSemanal(prev => ({
          ...prev,
          [dia]: prev[dia].map((evt, i) => i === eventoEditarModal.index ? eventoActualizado : evt)
        }));
      } else {
        // Agregar nuevo evento
        setProgramacionSemanal(prev => ({
          ...prev,
          [dia]: [...prev[dia], eventoActualizado]
        }));
      }

      // Cerrar modal
      setModalEditar(false);
      setEventoEditarModal(null);
      setDiaSeleccionado(null);
      setGuardandoDia(false);
      
      alert(`✅ Día ${diasSemanaLabel[diaIndex]} guardado exitosamente`);
    } catch (error) {
      console.error('Error al guardar en el API:', error);
      setGuardandoDia(false);
      alert('❌ Error al guardar. Por favor intenta nuevamente.');
    }
  };

  const handleCerrarModal = () => {
    if (guardandoDia) return; // No cerrar si se está guardando
    setModalEditar(false);
    setEventoEditarModal(null);
    setDiaSeleccionado(null);
    setFormDataModal({
      puntoVenta: '',
      horaInicio: '',
      horaFin: '',
      motivo: '',
      detalleCubrir: '',
      detalleOtro: ''
    });
    setShowMoreMotivosModal(false);
  };

  const handleDescargarPDF = () => {
    const infoSemana = getInfoSemana();
    const totalHoras = calcularTotalHorasSemana();
    
    // Crear array de todas las actividades de la semana
    const todasActividades = [];
    diasSemana.forEach((dia, index) => {
      const eventos = programacionSemanal[dia];
      eventos.forEach(evento => {
        todasActividades.push({
          dia: diasSemanaLabel[index],
          fecha: formatearFechaCompleta(fechasSemana[index]),
          actividad: evento.motivo === 'otro' ? evento.detalleOtro : (motivosLabels[evento.motivo] || evento.motivo),
          hora: (evento.motivo === 'dia_descanso' || evento.motivo === 'vacaciones') ? 'Todo el día' : `${evento.horaInicio} - ${evento.horaFin}`,
          puntoVenta: evento.puntoVenta,
          detalleCubrir: evento.detalleCubrir,
          fechaMod: evento.fechaModificacion
        });
      });
    });
    
    // Crear ventana de impresión
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Agenda Semanal - ${user?.nombre}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #AECE82;
            }
            .header h1 {
              color: #6B4E3D;
              margin: 10px 0;
            }
            .info-semana {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .info-semana h3 {
              margin: 0 0 10px 0;
              color: #AECE82;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: linear-gradient(135deg, #AECE82 0%, #9bb86e 100%);
              color: white;
              font-weight: 600;
            }
            td {
              background: white;
            }
            tr:nth-child(even) td {
              background: #f9f9f9;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 0.9em;
              color: #888;
            }
            .punto-venta {
              font-weight: 600;
              color: #6B4E3D;
              margin-bottom: 2px;
            }
            .detalle {
              font-size: 0.85em;
              color: #666;
            }
            @media print {
              body { margin: 0; }
              .header { page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Agenda Semanal de Capacitaciones</h1>
            <p><strong>Instructora:</strong> ${user?.nombre}</p>
            <p><strong>Documento:</strong> ${user?.document_number || user?.documento || 'N/A'}</p>
          </div>
          
          <div class="info-semana">
            <h3>Programación - Próxima Semana #${infoSemana.numeroSemana}</h3>
            <p><strong>Período:</strong> ${formatearFechaCompleta(infoSemana.fechaInicio)} - ${formatearFechaCompleta(infoSemana.fechaFin)}</p>
            <p><strong>Total de horas programadas:</strong> ${totalHoras.toFixed(1)} horas</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 12%">Día</th>
                <th style="width: 18%">Fecha</th>
                <th style="width: 25%">Actividad</th>
                <th style="width: 15%">Hora</th>
                <th style="width: 30%">Punto de Venta</th>
              </tr>
            </thead>
            <tbody>
              ${todasActividades.length > 0 ? todasActividades.map(act => `
                <tr>
                  <td><strong>${act.dia}</strong></td>
                  <td>${act.fecha}</td>
                  <td>${act.actividad}</td>
                  <td>${act.hora}</td>
                  <td>
                    <div class="punto-venta">${act.puntoVenta}</div>
                    ${act.detalleCubrir ? `<div class="detalle">Cubrir en: ${act.detalleCubrir}</div>` : ''}
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="5" style="text-align: center; color: #999;"><em>No hay programación registrada</em></td></tr>'}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generado el ${new Date().toLocaleDateString('es-CO', { 
              day: '2-digit', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Función helper para formatear fecha completa
  const formatearFechaCompleta = (fecha) => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
  };

  const toggleProfileModal = () => {
    setShowProfileModal(!showProfileModal);
  };

  const handleLogoutClick = () => {
    if (window.confirm('¿Estás segura de que deseas cerrar sesión?')) {
      onLogout();
      navigate('/auth/login', { replace: true });
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <div className="programacion-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-left">
            <button 
              className="profile-button-avatar"
              onClick={toggleProfileModal}
              title="Ver perfil"
            >
              {user?.foto ? (
                <img src={user.foto} alt="Perfil" className="profile-avatar" />
              ) : (
                <div className="profile-avatar-initials">
                  {getInitials(user?.nombre)}
                </div>
              )}
            </button>
            <div className="navbar-titles">
              <h1 className="navbar-title">Programación de Horarios</h1>
              <span className="navbar-subtitle">Gestión Semanal</span>
            </div>
          </div>
          
          <button 
            className="btn-back"
            onClick={() => navigate('/dashboard')}
            title="Volver al inicio"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Volver</span>
          </button>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="programacion-main">
        {/* Contador de horas y controles */}
        <div className="semana-info-section">
          <div className="semana-info-card">
            <div className="semana-detalle-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span><strong>Total programado:</strong> {calcularTotalHorasSemana().toFixed(1)} horas de la semana</span>
            </div>
          </div>
        </div>

        {/* Agenda Semanal Simplificada */}
        <div className="agenda-section-simplified">
          <div className="agenda-header-section">
            <h2 className="section-title">Programación de la Próxima Semana</h2>
            <button 
              className="btn-cerrar-programacion"
              onClick={handleCerrarProgramacion}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              Cerrar programación
            </button>
          </div>
          
          <div className="agenda-grid-simplified">
            {diasSemana.map((dia, diaIndex) => {
              const eventos = programacionSemanal[dia];
              const horasDia = calcularHorasDia(dia);
              const fechaDia = fechasSemana[diaIndex];
              const festivoInfo = esFestivo(fechaDia);
              const esDiaFestivo = festivoInfo !== null;
              
              return (
                <div key={dia} className={`dia-card ${esDiaFestivo ? 'dia-festivo' : ''}`}>
                  <div className="dia-card-header">
                    <div className="dia-info">
                      <div className="dia-nombre">{diasSemanaLabel[diaIndex]}</div>
                      <div className="dia-fecha">{formatearFecha(fechasSemana[diaIndex])}</div>
                    </div>
                    <div className="dia-horas">{horasDia.toFixed(1)}h</div>
                  </div>
                  
                  {esDiaFestivo && (
                    <div className="festivo-banner">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <span>{festivoInfo.nombre}</span>
                    </div>
                  )}
                  
                  <div className="dia-card-body">
                    {eventos.length === 0 ? (
                      <div className="sin-eventos">
                        {esDiaFestivo ? (
                          <div className="mensaje-festivo">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                              <line x1="8" y1="14" x2="16" y2="14"></line>
                              <line x1="8" y1="18" x2="16" y2="18"></line>
                            </svg>
                            <p>Día festivo</p>
                            <span className="submensaje">No se puede programar</span>
                          </div>
                        ) : (
                          <button 
                            className="btn-agregar-evento"
                            onClick={() => handleAgregarEventoDia(dia, diaIndex)}
                            disabled={loadingPuntos || puntosVenta.length === 0}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Agregar actividad
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="eventos-lista">
                        {eventos.map((evento, eventoIndex) => (
                          <div 
                            key={eventoIndex} 
                            className={`evento-item ${esDiaFestivo ? 'evento-deshabilitado' : ''}`}
                            onClick={!esDiaFestivo ? () => handleEditarEvento(dia, eventoIndex, evento, diaIndex) : undefined}
                            style={{ cursor: esDiaFestivo ? 'not-allowed' : 'pointer' }}
                          >
                            <div className="evento-hora">
                              {(evento.motivo === 'dia_descanso' || evento.motivo === 'vacaciones') ? 
                                'Todo el día' : 
                                `${evento.horaInicio} - ${evento.horaFin}`
                              }
                            </div>
                            <div className="evento-info">
                              <div className="evento-pdv">{evento.puntoVenta}</div>
                              <div className="evento-motivo">
                                {evento.motivo === 'otro' ? evento.detalleOtro : 
                                 evento.motivo === 'cubrir_puesto' ? `Cubrir - ${evento.detalleCubrir}` :
                                 (motivosLabels[evento.motivo] || evento.motivo)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modal de Perfil */}
      <Modal
        title="Perfil"
        open={showProfileModal}
        onCancel={toggleProfileModal}
        footer={[
          <Button
            key="logout"
            danger
            onClick={() => {
              if (window.confirm('¿Estás segura de que deseas cerrar sesión?')) {
                localStorage.removeItem('user');
                navigate('/', { replace: true });
              }
            }}
          >
            Cerrar Sesión
          </Button>,
        ]}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div className="profile-avatar-modal" style={{ margin: '0 auto 20px' }}>
            {getInitials(user?.nombre)}
          </div>
          <h3 style={{ margin: '0 0 10px 0', color: '#6B4E3D', fontSize: 24 }}>{user?.nombre}</h3>
          <p style={{ margin: '5px 0', color: '#666' }}><strong>Cargo:</strong> {user?.cargo}</p>
          <p style={{ margin: '5px 0', color: '#666' }}><strong>Documento:</strong> {user?.document_number || user?.documento}</p>
        </div>
      </Modal>

      {/* Modal de Edición */}
      {modalEditar && (
        <div className="modal-overlay" onClick={handleCerrarModal}>
          <div className="modal-edicion" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{eventoEditarModal ? 'Editar Actividad' : 'Agregar Actividad'}</h3>
              <button className="btn-cerrar-modal" onClick={handleCerrarModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group-modal">
                <label htmlFor="puntoVenta-modal">
                  Punto de Venta {(formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones') ? '(opcional)' : '*'}
                </label>
                <select
                  id="puntoVenta-modal"
                  name="puntoVenta"
                  value={formDataModal.puntoVenta}
                  onChange={handleInputChangeModal}
                  disabled={formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones'}
                  className="form-select-modal"
                >
                  <option value="">Selecciona un punto de venta</option>
                  {puntosVenta.map(pdv => (
                    <option key={pdv.id} value={String(pdv.id)}>{pdv.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-row-modal">
                <div className="form-group-modal">
                  <label htmlFor="horaInicio-modal">Hora Inicio</label>
                  <input
                    type="time"
                    id="horaInicio-modal"
                    name="horaInicio"
                    value={formDataModal.horaInicio}
                    onChange={handleInputChangeModal}
                    disabled={formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones'}
                    className="form-input-modal"
                  />
                </div>

                <div className="form-group-modal">
                  <label htmlFor="horaFin-modal">Hora Fin</label>
                  <input
                    type="time"
                    id="horaFin-modal"
                    name="horaFin"
                    value={formDataModal.horaFin}
                    onChange={handleInputChangeModal}
                    disabled={formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones'}
                    className="form-input-modal"
                  />
                </div>
              </div>

              <div className="form-group-modal">
                <label>Motivo / Actividad *</label>
                <div className="motivos-grid-modal">
                  <button
                    type="button"
                    className={`motivo-btn-modal ${formDataModal.motivo === 'retroalimentacion' ? 'active' : ''}`}
                    onClick={() => setFormDataModal({ ...formDataModal, motivo: 'retroalimentacion' })}
                  >
                    Retroalimentación
                  </button>
                  <button
                    type="button"
                    className={`motivo-btn-modal ${formDataModal.motivo === 'acompañamiento' ? 'active' : ''}`}
                    onClick={() => setFormDataModal({ ...formDataModal, motivo: 'acompañamiento' })}
                  >
                    Acompañamiento
                  </button>
                  <button
                    type="button"
                    className={`motivo-btn-modal ${formDataModal.motivo === 'capacitacion' ? 'active' : ''}`}
                    onClick={() => setFormDataModal({ ...formDataModal, motivo: 'capacitacion' })}
                  >
                    Capacitación
                  </button>
                  
                  {showMoreMotivosModal && (
                    <>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'dia_descanso' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'dia_descanso' })}
                      >
                        Día de Descanso
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'visita' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'visita' })}
                      >
                        Visita
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'induccion' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'induccion' })}
                      >
                        Inducción
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'cubrir_puesto' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'cubrir_puesto' })}
                      >
                        Cubrir Puesto
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'disponible' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'disponible' })}
                      >
                        Disponible
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'fotos' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'fotos' })}
                      >
                        Fotos
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'escuela_cafe' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'escuela_cafe' })}
                      >
                        Escuela del Café
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'sintonizarte' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'sintonizarte' })}
                      >
                        Sintonizarte
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'viaje' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'viaje' })}
                      >
                        Viaje
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'pg' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'pg' })}
                      >
                        P&G
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'apoyo' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'apoyo' })}
                      >
                        Apoyo
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'reunion' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'reunion' })}
                      >
                        Reunión
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'cambio_turno' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'cambio_turno' })}
                      >
                        Cambio de Turno
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'apertura' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'apertura' })}
                      >
                        Apertura
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'lanzamiento' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'lanzamiento' })}
                      >
                        Lanzamiento
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'vacaciones' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'vacaciones' })}
                      >
                        Vacaciones
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'incapacidad' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'incapacidad' })}
                      >
                        Incapacidad
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'dia_familia' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'dia_familia' })}
                      >
                        Día de la Familia
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'permiso_no_remunerado' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'permiso_no_remunerado' })}
                      >
                        Permiso No Remunerado
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'licencia_no_remunerada' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'licencia_no_remunerada' })}
                      >
                        Licencia No Remunerada
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'licencia_remunerada' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'licencia_remunerada' })}
                      >
                        Licencia Remunerada
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'licencia_luto' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'licencia_luto' })}
                      >
                        Licencia por Luto
                      </button>
                      <button
                        type="button"
                        className={`motivo-btn-modal ${formDataModal.motivo === 'otro' ? 'active' : ''}`}
                        onClick={() => setFormDataModal({ ...formDataModal, motivo: 'otro' })}
                      >
                        Otro
                      </button>
                    </>
                  )}
                </div>
                
                {!showMoreMotivosModal && (
                  <button
                    type="button"
                    className="btn-ver-mas-modal"
                    onClick={() => setShowMoreMotivosModal(true)}
                  >
                    Ver más opciones
                  </button>
                )}
              </div>

              {formDataModal.motivo === 'cubrir_puesto' && (
                <div className="form-group-modal">
                  <label htmlFor="detalleCubrir-modal">¿A quién vas a cubrir? *</label>
                  <input
                    type="text"
                    id="detalleCubrir-modal"
                    name="detalleCubrir"
                    value={formDataModal.detalleCubrir}
                    onChange={handleInputChangeModal}
                    placeholder="Nombre de la persona"
                    className="form-input-modal"
                  />
                </div>
              )}

              {formDataModal.motivo === 'otro' && (
                <div className="form-group-modal">
                  <label htmlFor="detalleOtro-modal">Especifica la actividad *</label>
                  <input
                    type="text"
                    id="detalleOtro-modal"
                    name="detalleOtro"
                    value={formDataModal.detalleOtro}
                    onChange={handleInputChangeModal}
                    placeholder="Describe la actividad"
                    className="form-input-modal"
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn-cancelar-modal" 
                onClick={handleCerrarModal}
                disabled={guardandoDia}
              >
                Cancelar
              </button>
              <button 
                className="btn-guardar-modal" 
                onClick={handleGuardarEdicionModal}
                disabled={guardandoDia}
              >
                {guardandoDia ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgramacionHorarios;

