import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Table, Tag, Button, Select, Card, Statistic, Row, Col, Modal, Form, Input, TimePicker, Space, Empty } from 'antd';
import { DownloadOutlined, ClockCircleOutlined, TeamOutlined, FileTextOutlined, EditOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import 'antd/dist/reset.css';
import '../styles/VistaAdministrativa.css';

function VistaAdministrativa({ userData, onLogout }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [instructoras, setInstructoras] = useState([]);
  const [instructoraSeleccionada, setInstructoraSeleccionada] = useState('todas');
  const [diaSeleccionado, setDiaSeleccionado] = useState('todos');
  const [lineaSeleccionada, setLineaSeleccionada] = useState('todas');
  const [horariosTodos, setHorariosTodos] = useState([]);
  const [horariosFiltered, setHorariosFiltered] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [puntosVenta, setPuntosVenta] = useState([]);
  
  // Estados para modal de edición
  const [modalEditar, setModalEditar] = useState(false);
  const [horarioEditar, setHorarioEditar] = useState(null);
  const [formDataModal, setFormDataModal] = useState({
    puntoVenta: '',
    horaInicio: '',
    horaFin: '',
    motivo: '',
    detalleCubrir: '',
    detalleOtro: ''
  });
  const [showMoreMotivosModal, setShowMoreMotivosModal] = useState(false);

  const motivosLabels = {
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

  const motivosLabelsReverse = {
    'retroalimentacion': 'Retroalimentación',
    'acompañamiento': 'Acompañamiento',
    'capacitacion': 'Capacitación',
    'dia_descanso': 'Día de Descanso',
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
    'licencia_luto': 'Licencia por Luto'
  };

  // Verificar autenticación y tipo de usuario
  useEffect(() => {
    if (!userData) {
      navigate('/auth/login', { replace: true });
      return;
    }

    const cargoUsuario = userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '';
    
    // Verificar que el usuario tenga un cargo permitido
    const cargosAdministrativos = [
      'JEFE DESARROLLO DE PRODUCTO',
      'DIRECTORA DE LINEAS DE PRODUCTO',
      'ANALISTA DE PRODUCTO'
    ];
    
    if (!cargosAdministrativos.includes(cargoUsuario)) {
      // Si no es un cargo administrativo, redirigir al menú
      navigate('/menu', { replace: true });
      return;
    }
    
    const adminUser = {
      documento: userData?.data?.documento || userData?.data?.document_number || userData?.documento || '',
      nombre: userData?.data?.nombre || 
        userData?.data?.name ||
        (userData?.data?.first_name && userData?.data?.last_name 
          ? `${userData.data.first_name} ${userData.data.last_name}`.trim()
          : userData?.data?.full_name || ''),
      correo: userData?.data?.correo || userData?.data?.email || userData?.correo || '',
      cargo: cargoUsuario,
      foto: ''
    };
    
    setUser(adminUser);

    // Cargar foto desde API de BUK
    const doc = adminUser.documento;
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
  }, [navigate, userData]);

  // Cargar puntos de venta
  useEffect(() => {
    const cargarPuntosVenta = async () => {
      try {
        const url = `https://macfer.crepesywaffles.com/api/cap-pdvs?pagination[pageSize]=1000&filters[activo][$eq]=true`;
        const response = await axios.get(url);
        
        if (response.data?.data) {
          const puntos = response.data.data.map(pdv => ({
            id: pdv.id,
            nombre: pdv.attributes.nombre
          })).sort((a, b) => a.nombre.localeCompare(b.nombre));
          
          setPuntosVenta(puntos);
        }
      } catch (error) {
        console.error('Error al cargar puntos de venta:', error);
      }
    };

    cargarPuntosVenta();
  }, []);

  // Cargar instructoras y sus horarios
  useEffect(() => {
    if (!user) return;

    const cargarDatos = async () => {
      try {
        // Calcular fechas de la próxima semana
        const hoy = new Date();
        const diaSemana = hoy.getDay();
        const proximoLunes = new Date(hoy);
        
        let diasHastaProximoLunes;
        if (diaSemana === 0) {
          diasHastaProximoLunes = 1;
        } else if (diaSemana === 1) {
          diasHastaProximoLunes = 7;
        } else {
          diasHastaProximoLunes = 8 - diaSemana;
        }
        
        proximoLunes.setDate(hoy.getDate() + diasHastaProximoLunes);
        const proximoDomingo = new Date(proximoLunes);
        proximoDomingo.setDate(proximoLunes.getDate() + 6);

        const fechaInicioStr = `${proximoLunes.getFullYear()}-${String(proximoLunes.getMonth() + 1).padStart(2, '0')}-${String(proximoLunes.getDate()).padStart(2, '0')}`;
        const fechaFinStr = `${proximoDomingo.getFullYear()}-${String(proximoDomingo.getMonth() + 1).padStart(2, '0')}-${String(proximoDomingo.getDate()).padStart(2, '0')}`;

        // Cargar instructoras filtradas por línea (si se seleccionó una)
        let documentosInstructoras = [];
        
        if (lineaSeleccionada !== 'todas') {
          // Filtrar instructoras por línea desde el API
          const urlInstructoras = `https://macfer.crepesywaffles.com/api/cap-instructoras?filters[${lineaSeleccionada}][$eq]=true&populate[cap_pdvs]=*&pagination[pageSize]=1000`;
          const responseInstructoras = await axios.get(urlInstructoras);
          
          if (responseInstructoras.data?.data) {
            documentosInstructoras = responseInstructoras.data.data.map(inst => inst.attributes.documento);
          }
        }

        // Cargar todos los horarios de todas las instructoras
        const urlHorarios = `https://macfer.crepesywaffles.com/api/horarios-instructoras?filters[fecha][$gte]=${fechaInicioStr}&filters[fecha][$lte]=${fechaFinStr}&pagination[pageSize]=40000`;
        const responseHorarios = await axios.get(urlHorarios);

        if (responseHorarios.data?.data) {
          // Procesar horarios y obtener lista única de instructoras
          let horariosConDatos = responseHorarios.data.data.map(item => {
            // Parsear fecha correctamente para evitar problemas de zona horaria
            const fechaStr = item.attributes.fecha;
            const [year, month, day] = fechaStr.split('-').map(Number);
            const fecha = new Date(year, month - 1, day);
            
            const horaInicio = item.attributes.hora_inicio ? item.attributes.hora_inicio.substring(0, 5) : '';
            const horaFin = item.attributes.hora_fin ? item.attributes.hora_fin.substring(0, 5) : '';
            
            // Calcular horas
            let horas = 0;
            if (horaInicio && horaFin && item.attributes.actividad !== 'Día de Descanso') {
              const [horaIni, minIni] = horaInicio.split(':').map(Number);
              const [horaFi, minFi] = horaFin.split(':').map(Number);
              horas = (horaFi * 60 + minFi - (horaIni * 60 + minIni)) / 60;
            }

            const diaSemana = fecha.toLocaleDateString('es-CO', { weekday: 'long' });
            return {
              id: item.id,
              documento: item.attributes.documento,
              fecha: fecha,
              fechaStr: fecha.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'short' }),
              diaSemana: diaSemana,
              pdv: item.attributes.pdv_nombre,
              actividad: item.attributes.actividad,
              horaInicio: horaInicio,
              horaFin: horaFin,
              horas: horas,
              updatedAt: item.attributes.updatedAt
            };
          });

          // Filtrar horarios por línea si se seleccionó una
          if (lineaSeleccionada !== 'todas' && documentosInstructoras.length > 0) {
            horariosConDatos = horariosConDatos.filter(h => documentosInstructoras.includes(h.documento));
          }

          // Ordenar por fecha y hora
          horariosConDatos.sort((a, b) => {
            if (a.fecha.getTime() !== b.fecha.getTime()) {
              return a.fecha - b.fecha;
            }
            return a.horaInicio.localeCompare(b.horaInicio);
          });

          setHorariosTodos(horariosConDatos);
          setHorariosFiltered(horariosConDatos);

          // Obtener lista única de documentos de instructoras
          const documentosUnicos = [...new Set(horariosConDatos.map(h => h.documento))];
          
          // Cargar información de las instructoras desde el API de BUK
          const instructorasConNombre = await Promise.all(
            documentosUnicos.map(async (doc) => {
              try {
                const response = await axios.get(
                  `https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${doc}`
                );
                
                if (response.data?.ok && response.data?.data && response.data.data.length > 0) {
                  const userData = response.data.data[0];
                  return {
                    documento: doc,
                    nombre: userData.nombre || `Instructora ${doc}`
                  };
                }
                return {
                  documento: doc,
                  nombre: `Instructora ${doc}`
                };
              } catch (error) {
                console.error(`Error al cargar datos de instructora ${doc}:`, error);
                return {
                  documento: doc,
                  nombre: `Instructora ${doc}`
                };
              }
            })
          );

          instructorasConNombre.sort((a, b) => a.nombre.localeCompare(b.nombre));
          setInstructoras(instructorasConNombre);
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
        alert('Error al cargar los datos. Por favor intenta nuevamente.');
      }
    };

    cargarDatos();
  }, [user, lineaSeleccionada]);

  // Filtrar horarios cuando cambia la selección
  useEffect(() => {
    let filtered = horariosTodos;
    
    // Filtrar por instructora
    if (instructoraSeleccionada !== 'todas') {
      filtered = filtered.filter(h => h.documento === instructoraSeleccionada);
    }
    
    // Filtrar por día de la semana
    if (diaSeleccionado !== 'todos') {
      filtered = filtered.filter(h => h.diaSemana === diaSeleccionado);
    }
    
    setHorariosFiltered(filtered);
  }, [instructoraSeleccionada, diaSeleccionado, horariosTodos]);

  // Resetear instructora seleccionada cuando cambia la línea
  useEffect(() => {
    setInstructoraSeleccionada('todas');
  }, [lineaSeleccionada]);

  const handleLogout = () => {
    onLogout();
    navigate('/auth/login', { replace: true });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const handleEditarHorario = (horario) => {
    // Buscar el motivo correspondiente
    let motivo = motivosLabels[horario.actividad] || 'otro';
    let detalleOtro = '';
    let detalleCubrir = '';

    if (!motivosLabels[horario.actividad]) {
      motivo = 'otro';
      detalleOtro = horario.actividad;
    }

    // Buscar el ID del punto de venta
    const pdvEncontrado = puntosVenta.find(p => p.nombre === horario.pdv);
    const puntoVentaId = pdvEncontrado ? String(pdvEncontrado.id) : '';

    setFormDataModal({
      puntoVenta: puntoVentaId,
      horaInicio: horario.horaInicio,
      horaFin: horario.horaFin,
      motivo: motivo,
      detalleCubrir: detalleCubrir,
      detalleOtro: detalleOtro
    });

    // Verificar si necesita expandir motivos
    const motivosExpandibles = [
      'dia_descanso', 'visita', 'induccion', 'cubrir_puesto', 'disponible',
      'fotos', 'escuela_cafe', 'sintonizarte', 'viaje', 'pg', 'apoyo', 'reunion',
      'cambio_turno', 'apertura', 'lanzamiento', 'vacaciones', 'incapacidad',
      'dia_familia', 'permiso_no_remunerado', 'licencia_no_remunerada',
      'licencia_remunerada', 'licencia_luto', 'otro'
    ];

    if (motivosExpandibles.includes(motivo)) {
      setShowMoreMotivosModal(true);
    } else {
      setShowMoreMotivosModal(false);
    }

    setHorarioEditar(horario);
    setModalEditar(true);
  };

  const handleGuardarEdicionModal = async () => {
    if (!horarioEditar) return;

    // Validaciones
    if (!formDataModal.puntoVenta) {
      Modal.error({
        title: 'Error de validación',
        content: 'Por favor selecciona un punto de venta',
      });
      return;
    }

    if (formDataModal.motivo === 'cubrir_puesto' && !formDataModal.detalleCubrir) {
      Modal.error({
        title: 'Error de validación',
        content: 'Por favor especifica a quién vas a cubrir',
      });
      return;
    }

    if (formDataModal.motivo === 'otro' && !formDataModal.detalleOtro) {
      Modal.error({
        title: 'Error de validación',
        content: 'Por favor especifica el detalle de la actividad',
      });
      return;
    }

    // Validar horas solo si no es día de descanso o vacaciones
    if (formDataModal.motivo !== 'dia_descanso' && formDataModal.motivo !== 'vacaciones') {
      if (!formDataModal.horaInicio || !formDataModal.horaFin) {
        Modal.error({
          title: 'Error de validación',
          content: 'Por favor ingresa hora de inicio y fin',
        });
        return;
      }

      const inicio = new Date(`2000-01-01T${formDataModal.horaInicio}`);
      const fin = new Date(`2000-01-01T${formDataModal.horaFin}`);

      if (fin <= inicio) {
        Modal.error({
          title: 'Error de validación',
          content: 'La hora de fin debe ser mayor a la hora de inicio',
        });
        return;
      }
    }

    // Obtener nombre del punto de venta
    const puntoVentaObj = puntosVenta.find(p => String(p.id) === formDataModal.puntoVenta);
    const puntoVentaNombre = puntoVentaObj ? puntoVentaObj.nombre : '';

    // Determinar la actividad según el motivo
    let actividad = motivosLabelsReverse[formDataModal.motivo] || formDataModal.motivo;
    if (formDataModal.motivo === 'otro') {
      actividad = formDataModal.detalleOtro;
    }

    // Preparar datos para el API
    const horaInicio = (formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones') ? '00:00:00' : `${formDataModal.horaInicio}:00`;
    const horaFin = (formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones') ? '00:00:00' : `${formDataModal.horaFin}:00`;

    const fechaFormateada = `${horarioEditar.fecha.getFullYear()}-${String(horarioEditar.fecha.getMonth() + 1).padStart(2, '0')}-${String(horarioEditar.fecha.getDate()).padStart(2, '0')}`;

    const datosAPI = {
      data: {
        pdv_nombre: puntoVentaNombre,
        fecha: fechaFormateada,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        actividad: actividad,
        documento: String(horarioEditar.documento)
      }
    };

    try {
      await axios.put(`https://macfer.crepesywaffles.com/api/horarios-instructoras/${horarioEditar.id}`, datosAPI);

      // Actualizar en el estado local
      const horariosActualizados = horariosTodos.map(h => {
        if (h.id === horarioEditar.id) {
          // Calcular nuevas horas
          let horas = 0;
          if (formDataModal.motivo !== 'dia_descanso' && formDataModal.motivo !== 'vacaciones' && formDataModal.horaInicio && formDataModal.horaFin) {
            const [horaIni, minIni] = formDataModal.horaInicio.split(':').map(Number);
            const [horaFi, minFi] = formDataModal.horaFin.split(':').map(Number);
            horas = (horaFi * 60 + minFi - (horaIni * 60 + minIni)) / 60;
          }

          return {
            ...h,
            pdv: puntoVentaNombre,
            actividad: actividad,
            horaInicio: (formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones') ? '' : formDataModal.horaInicio,
            horaFin: (formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones') ? '' : formDataModal.horaFin,
            horas: horas,
            updatedAt: new Date().toISOString()
          };
        }
        return h;
      });

      setHorariosTodos(horariosActualizados);
      setModalEditar(false);
      setHorarioEditar(null);

      Modal.success({
        title: 'Éxito',
        content: 'Horario actualizado exitosamente',
      });
    } catch (error) {
      console.error('Error al actualizar horario:', error);
      Modal.error({
        title: 'Error',
        content: 'Error al guardar los cambios. Por favor intenta nuevamente.',
      });
    }
  };

  const handleCerrarModal = () => {
    setModalEditar(false);
    setHorarioEditar(null);
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

  const handleDescargarExcel = () => {
    if (horariosFiltered.length === 0) {
      Modal.warning({
        title: 'Sin datos',
        content: 'No hay horarios para descargar',
      });
      return;
    }

    // Obtener el nombre de la instructora si está filtrado
    let nombreInstructora = 'Todas las Instructoras';
    if (instructoraSeleccionada !== 'todas') {
      const instructora = instructoras.find(i => i.documento === instructoraSeleccionada);
      nombreInstructora = instructora ? instructora.nombre : `Instructora ${instructoraSeleccionada}`;
    }

    // Preparar datos para Excel
    const datosExcel = horariosFiltered.map(h => {
      const instructora = instructoras.find(i => i.documento === h.documento);
      return {
        'Instructora': instructora ? instructora.nombre : h.documento,
        'Fecha': h.fecha.toLocaleDateString('es-CO'),
        'Día': h.fechaStr.split(',')[0],
        'Punto de Venta': h.pdv,
        'Actividad': h.actividad,
        'Hora Inicio': h.horaInicio || '-',
        'Hora Fin': h.horaFin || '-',
        'Horas': h.horas.toFixed(1)
      };
    });

    // Calcular totales
    const totalHoras = horariosFiltered.reduce((sum, h) => sum + h.horas, 0);

    // Agregar fila de totales
    datosExcel.push({
      'Instructora': '',
      'Fecha': '',
      'Día': '',
      'Punto de Venta': '',
      'Actividad': '',
      'Hora Inicio': '',
      'Hora Fin': 'TOTAL:',
      'Horas': totalHoras.toFixed(1)
    });

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosExcel);

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 30 }, // Instructora
      { wch: 12 }, // Fecha
      { wch: 12 }, // Día
      { wch: 35 }, // Punto de Venta
      { wch: 25 }, // Actividad
      { wch: 12 }, // Hora Inicio
      { wch: 12 }, // Hora Fin
      { wch: 10 }  // Horas
    ];
    ws['!cols'] = colWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, 'Horarios');

    // Nombre del archivo
    const fecha = new Date().toLocaleDateString('es-CO').replace(/\//g, '-');
    const nombreArchivo = `Horarios_${nombreInstructora.replace(/ /g, '_')}_${fecha}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);

    Modal.success({
      title: 'Éxito',
      content: 'Archivo Excel descargado exitosamente',
    });
  };

  const handleDescargarPDF = () => {
    if (horariosFiltered.length === 0) {
      Modal.warning({
        title: 'Sin datos',
        content: 'No hay horarios para descargar',
      });
      return;
    }

    // Obtener el nombre de la instructora si está filtrado
    let nombreInstructora = 'Todas las Instructoras';
    if (instructoraSeleccionada !== 'todas') {
      const instructora = instructoras.find(i => i.documento === instructoraSeleccionada);
      nombreInstructora = instructora ? instructora.nombre : `Instructora ${instructoraSeleccionada}`;
    }

    // Calcular total de horas
    const totalHoras = horariosFiltered.reduce((sum, h) => sum + h.horas, 0);

    // Agrupar por instructora si se muestran todas
    const horariosPorInstructora = {};
    horariosFiltered.forEach(h => {
      if (!horariosPorInstructora[h.documento]) {
        const instructora = instructoras.find(i => i.documento === h.documento);
        horariosPorInstructora[h.documento] = {
          nombre: instructora ? instructora.nombre : `Instructora ${h.documento}`,
          horarios: [],
          totalHoras: 0
        };
      }
      horariosPorInstructora[h.documento].horarios.push(h);
      horariosPorInstructora[h.documento].totalHoras += h.horas;
    });

    // Crear ventana de impresión
    const printWindow = window.open('', '_blank');
    
    let tablaHTML = '';
    
    if (instructoraSeleccionada === 'todas') {
      // Mostrar agrupado por instructora
      Object.values(horariosPorInstructora).forEach(grupo => {
        tablaHTML += `
          <div class="instructora-grupo">
            <h3>${grupo.nombre} - Total: ${grupo.totalHoras.toFixed(1)} horas</h3>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Día</th>
                  <th>Punto de Venta</th>
                  <th>Actividad</th>
                  <th>Hora Inicio</th>
                  <th>Hora Fin</th>
                  <th>Horas</th>
                </tr>
              </thead>
              <tbody>
                ${grupo.horarios.map(h => `
                  <tr>
                    <td>${h.fecha.toLocaleDateString('es-CO')}</td>
                    <td>${h.fechaStr.split(',')[0]}</td>
                    <td>${h.pdv}</td>
                    <td>${h.actividad}</td>
                    <td>${h.horaInicio || '-'}</td>
                    <td>${h.horaFin || '-'}</td>
                    <td>${h.horas.toFixed(1)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      });
    } else {
      // Mostrar solo una instructora
      tablaHTML = `
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Día</th>
              <th>Punto de Venta</th>
              <th>Actividad</th>
              <th>Hora Inicio</th>
              <th>Hora Fin</th>
              <th>Horas</th>
            </tr>
          </thead>
          <tbody>
            ${horariosFiltered.map(h => `
              <tr>
                <td>${h.fecha.toLocaleDateString('es-CO')}</td>
                <td>${h.fechaStr.split(',')[0]}</td>
                <td>${h.pdv}</td>
                <td>${h.actividad}</td>
                <td>${h.horaInicio || '-'}</td>
                <td>${h.horaFin || '-'}</td>
                <td>${h.horas.toFixed(1)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Horarios Instructoras - ${nombreInstructora}</title>
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
            .info {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .instructora-grupo {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .instructora-grupo h3 {
              color: #6B4E3D;
              margin-bottom: 10px;
              padding: 10px;
              background: #AECE82;
              border-radius: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              padding: 10px;
              text-align: left;
              border: 1px solid #ddd;
            }
            th {
              background-color: #6B4E3D;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .total {
              font-weight: bold;
              text-align: right;
              margin-top: 10px;
              font-size: 18px;
              color: #6B4E3D;
            }
            @media print {
              .instructora-grupo {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Horarios Instructoras</h1>
            <p>${nombreInstructora}</p>
          </div>
          
          <div class="info">
            <p><strong>Total de horarios:</strong> ${horariosFiltered.length}</p>
            <p><strong>Total de horas:</strong> ${totalHoras.toFixed(1)} horas</p>
            <p><strong>Fecha de generación:</strong> ${new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          ${tablaHTML}
          
          <div class="total">
            Total General: ${totalHoras.toFixed(1)} horas
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="vista-admin-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-left">
            <button 
              className="profile-button-avatar"
              onClick={() => setShowProfileModal(true)}
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
              <h1 className="navbar-title">Vista Administrativa</h1>
              <span className="navbar-subtitle">Gestión de Horarios de Instructoras</span>
            </div>
          </div>
          <div className="navbar-actions">
          <button 
            className="btn-back"
            onClick={() => navigate('/menu')}
            title="Volver al inicio"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Volver</span>
          </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="welcome-section">
          <h2 className="welcome-greeting">Hola, {user?.nombre || 'Administrador'}</h2>
          <p className="welcome-description">Gestión de Horarios de Instructoras</p>
        </div>

      {/* Filtros y Acciones */}
      <Card className="filters-card" style={{ marginBottom: 20 }}>
        <Space size="large" wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Space>
              <label style={{ fontWeight: 600, color: '#6B4E3D' }}>Filtrar por Línea:</label>
              <Select
                style={{ minWidth: 180 }}
                value={lineaSeleccionada}
                onChange={(value) => setLineaSeleccionada(value)}
                placeholder="Selecciona una línea"
              >
                <Select.Option value="todas">Todas las Líneas</Select.Option>
                <Select.Option value="sal">Sal</Select.Option>
                <Select.Option value="dulce">Dulce</Select.Option>
                <Select.Option value="bebidas">Bebidas</Select.Option>
                <Select.Option value="Brunch">Brunch</Select.Option>
              </Select>
            </Space>
            <Space>
              <label style={{ fontWeight: 600, color: '#6B4E3D' }}>Filtrar por Instructora:</label>
              <Select
                style={{ minWidth: 250 }}
                value={instructoraSeleccionada}
                onChange={(value) => setInstructoraSeleccionada(value)}
                placeholder="Selecciona una instructora"
              >
                <Select.Option value="todas">Todas las Instructoras</Select.Option>
                {instructoras.map(inst => (
                  <Select.Option key={inst.documento} value={inst.documento}>
                    {inst.nombre}
                  </Select.Option>
                ))}
              </Select>
            </Space>
            <Space>
              <label style={{ fontWeight: 600, color: '#6B4E3D' }}>Filtrar por Día:</label>
              <Select
                style={{ minWidth: 180 }}
                value={diaSeleccionado}
                onChange={(value) => setDiaSeleccionado(value)}
                placeholder="Selecciona un día"
              >
                <Select.Option value="todos">Todos los Días</Select.Option>
                <Select.Option value="lunes">Lunes</Select.Option>
                <Select.Option value="martes">Martes</Select.Option>
                <Select.Option value="miércoles">Miércoles</Select.Option>
                <Select.Option value="jueves">Jueves</Select.Option>
                <Select.Option value="viernes">Viernes</Select.Option>
                <Select.Option value="sábado">Sábado</Select.Option>
                <Select.Option value="domingo">Domingo</Select.Option>
              </Select>
            </Space>
          </Space>
          <Space>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={handleDescargarExcel}
              style={{ background: '#28a745', borderColor: '#28a745' }}
            >
              Exportar Excel
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDescargarPDF}
              style={{ background: '#AECE82', borderColor: '#AECE82' }}
            >
              Descargar PDF
            </Button>
          </Space>
        </Space>
      </Card>

      {/* Tabla de Horarios con Ant Design */}
      <Card>
        <Table
          dataSource={horariosFiltered.map(h => ({ ...h, key: h.id }))}
          columns={[
            {
              title: 'Instructora',
              dataIndex: 'documento',
              key: 'instructora',
              render: (documento) => {
                const instructora = instructoras.find(i => i.documento === documento);
                return instructora ? instructora.nombre : documento;
              },
              sorter: (a, b) => {
                const nombreA = instructoras.find(i => i.documento === a.documento)?.nombre || '';
                const nombreB = instructoras.find(i => i.documento === b.documento)?.nombre || '';
                return nombreA.localeCompare(nombreB);
              },
            },
            {
              title: 'Fecha',
              dataIndex: 'fecha',
              key: 'fecha',
              render: (fecha) => fecha.toLocaleDateString('es-CO'),
              sorter: (a, b) => a.fecha - b.fecha,
              defaultSortOrder: 'ascend',
            },
            {
              title: 'Día',
              dataIndex: 'fechaStr',
              key: 'dia',
              render: (fechaStr) => {
                const dia = fechaStr.split(',')[0];
                return <Tag color="blue">{dia}</Tag>;
              },
            },
            {
              title: 'Punto de Venta',
              dataIndex: 'pdv',
              key: 'pdv',
              ellipsis: true,
            },
            {
              title: 'Actividad',
              dataIndex: 'actividad',
              key: 'actividad',
              render: (actividad) => {
                let color = 'green';
                if (actividad === 'Día de Descanso') color = 'volcano';
                else if (actividad.includes('Retroalimentación')) color = 'geekblue';
                else if (actividad.includes('Capacitación')) color = 'purple';
                return <Tag color={color}>{actividad}</Tag>;
              },
            },
            {
              title: 'Hora Inicio',
              dataIndex: 'horaInicio',
              key: 'horaInicio',
              render: (horaInicio) => horaInicio || '-',
            },
            {
              title: 'Hora Fin',
              dataIndex: 'horaFin',
              key: 'horaFin',
              render: (horaFin) => horaFin || '-',
            },
            {
              title: 'Horas',
              dataIndex: 'horas',
              key: 'horas',
              render: (horas) => <Tag color="cyan">{horas.toFixed(1)}h</Tag>,
              sorter: (a, b) => a.horas - b.horas,
            },
            {
              title: 'Acciones',
              key: 'acciones',
              render: (_, record) => (
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => handleEditarHorario(record)}
                  style={{ color: '#AECE82' }}
                >
                  Editar
                </Button>
              ),
            },
          ]}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} horarios`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          locale={{
            emptyText: <Empty description="No hay horarios programados para mostrar" />,
          }}
          scroll={{ x: 1200 }}
          bordered
        />
      </Card>

      {/* Modal de Perfil con Ant Design */}
      <Modal
        title="Perfil"
        open={showProfileModal}
        onCancel={() => setShowProfileModal(false)}
        footer={[
          <Button
            key="logout"
            danger
            onClick={handleLogout}
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

      {/* Modal de Edición con Ant Design */}
      <Modal
        title="Editar Horario"
        open={modalEditar}
        onCancel={handleCerrarModal}
        width={700}
        footer={[
          <Button key="cancel" onClick={handleCerrarModal}>
            Cancelar
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={handleGuardarEdicionModal}
            style={{ background: '#AECE82', borderColor: '#AECE82' }}
          >
            Guardar Cambios
          </Button>,
        ]}
      >
        <Form layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item label="Punto de Venta" required>
            <Select
              value={formDataModal.puntoVenta}
              onChange={(value) => setFormDataModal(prev => ({ ...prev, puntoVenta: value }))}
              placeholder="Selecciona un punto de venta"
            >
              {puntosVenta.map(pdv => (
                <Select.Option key={pdv.id} value={String(pdv.id)}>
                  {pdv.nombre}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {formDataModal.motivo !== 'dia_descanso' && formDataModal.motivo !== 'vacaciones' && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Hora Inicio" required>
                  <Input
                    type="time"
                    value={formDataModal.horaInicio}
                    onChange={(e) => setFormDataModal(prev => ({ ...prev, horaInicio: e.target.value }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Hora Fin" required>
                  <Input
                    type="time"
                    value={formDataModal.horaFin}
                    onChange={(e) => setFormDataModal(prev => ({ ...prev, horaFin: e.target.value }))}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item label="Motivo/Actividad" required>
            <Select
              value={formDataModal.motivo}
              onChange={(value) => setFormDataModal(prev => ({ ...prev, motivo: value }))}
              placeholder="Selecciona un motivo"
            >
              <Select.Option value="">Selecciona un motivo</Select.Option>
              <Select.Option value="retroalimentacion">Retroalimentación</Select.Option>
              <Select.Option value="acompañamiento">Acompañamiento</Select.Option>
              <Select.Option value="capacitacion">Capacitación</Select.Option>
              <Select.Option value="dia_descanso">Día de Descanso</Select.Option>
              {showMoreMotivosModal && (
                <>
                  <Select.Option value="visita">Visita</Select.Option>
                  <Select.Option value="induccion">Inducción</Select.Option>
                  <Select.Option value="cubrir_puesto">Cubrir Puesto</Select.Option>
                  <Select.Option value="disponible">Disponible</Select.Option>
                  <Select.Option value="fotos">Fotos</Select.Option>
                  <Select.Option value="escuela_cafe">Escuela del Café</Select.Option>
                  <Select.Option value="sintonizarte">Sintonizarte</Select.Option>
                  <Select.Option value="viaje">Viaje</Select.Option>
                  <Select.Option value="pg">P&G</Select.Option>
                  <Select.Option value="apoyo">Apoyo</Select.Option>
                  <Select.Option value="reunion">Reunión</Select.Option>
                  <Select.Option value="cambio_turno">Cambio de Turno</Select.Option>
                  <Select.Option value="apertura">Apertura</Select.Option>
                  <Select.Option value="lanzamiento">Lanzamiento</Select.Option>
                  <Select.Option value="vacaciones">Vacaciones</Select.Option>
                  <Select.Option value="incapacidad">Incapacidad</Select.Option>
                  <Select.Option value="dia_familia">Día de la Familia</Select.Option>
                  <Select.Option value="permiso_no_remunerado">Permiso No Remunerado</Select.Option>
                  <Select.Option value="licencia_no_remunerada">Licencia No Remunerada</Select.Option>
                  <Select.Option value="licencia_remunerada">Licencia Remunerada</Select.Option>
                  <Select.Option value="licencia_luto">Licencia por Luto</Select.Option>
                  <Select.Option value="otro">Otro</Select.Option>
                </>
              )}
            </Select>
            {!showMoreMotivosModal && (
              <Button
                type="link"
                onClick={() => setShowMoreMotivosModal(true)}
                style={{ padding: 0, marginTop: 8 }}
              >
                Ver más motivos
              </Button>
            )}
          </Form.Item>

          {formDataModal.motivo === 'cubrir_puesto' && (
            <Form.Item label="¿A quién vas a cubrir?" required>
              <Input
                value={formDataModal.detalleCubrir}
                onChange={(e) => setFormDataModal(prev => ({ ...prev, detalleCubrir: e.target.value }))}
                placeholder="Nombre de la persona a cubrir"
              />
            </Form.Item>
          )}

          {formDataModal.motivo === 'otro' && (
            <Form.Item label="Especifica cuál" required>
              <Input
                value={formDataModal.detalleOtro}
                onChange={(e) => setFormDataModal(prev => ({ ...prev, detalleOtro: e.target.value }))}
                placeholder="Describe la actividad"
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
      </main>
    </div>
  );
}

export default VistaAdministrativa;

