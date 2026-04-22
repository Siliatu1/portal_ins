import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Table, Tag, Button, Select, Card, Statistic, Row, Col, Modal, Form, Input, TimePicker, Space, Empty, DatePicker } from 'antd';
import { DownloadOutlined, ClockCircleOutlined, TeamOutlined, FileTextOutlined, EditOutlined, FileExcelOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import 'antd/dist/reset.css';
import '../styles/VistaAdministrativa.css';

function VistaAdministrativa({ userData, onLogout }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [instructoras, setInstructoras] = useState([]);
  const [instructoraSeleccionada, setInstructoraSeleccionada] = useState('todas');
  const [lineaSeleccionada, setLineaSeleccionada] = useState('todas');
  const [horariosTodos, setHorariosTodos] = useState([]);
  const [horariosFiltered, setHorariosFiltered] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [puntosVenta, setPuntosVenta] = useState([]);

  const getDefaultLunes = () => {
    const hoy = new Date();
    const dow = hoy.getDay();
    let daysToMonday;
    if (dow === 0) daysToMonday = 1;
    else if (dow === 1) daysToMonday = 7;
    else daysToMonday = 8 - dow;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + daysToMonday);
    lunes.setHours(0, 0, 0, 0);
    return lunes;
  };

  const [semanaLunes, setSemanaLunes] = useState(getDefaultLunes);

  const irSemanaAnterior = () => setSemanaLunes(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
  const irSemanaSiguiente = () => setSemanaLunes(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
  const irProximaSemana = () => setSemanaLunes(getDefaultLunes());

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
        const fechaFin = new Date(semanaLunes);
        fechaFin.setDate(semanaLunes.getDate() + 6);
        const fechaInicioStr = `${semanaLunes.getFullYear()}-${String(semanaLunes.getMonth() + 1).padStart(2, '0')}-${String(semanaLunes.getDate()).padStart(2, '0')}`;
        const fechaFinStr = `${fechaFin.getFullYear()}-${String(fechaFin.getMonth() + 1).padStart(2, '0')}-${String(fechaFin.getDate()).padStart(2, '0')}`;

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
  }, [user, lineaSeleccionada, semanaLunes]);

  // Filtrar horarios cuando cambia la selección
  useEffect(() => {
    let filtered = horariosTodos;
    if (instructoraSeleccionada !== 'todas') {
      filtered = filtered.filter(h => h.documento === instructoraSeleccionada);
    }
    setHorariosFiltered(filtered);
  }, [instructoraSeleccionada, horariosTodos]);

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

  // Paleta de colores pastel para filas (como en Excel)
  const ROW_COLORS = [
    '#FFE4E4', '#FFF5CC', '#E4F5D4', '#D4EEF7', '#EDE4F5',
    '#FFE8D6', '#D4F0E8', '#F5D4E8', '#D4DEFF', '#FFF0D4',
    '#E8FFD4', '#D4FFE8', '#FFE0CC', '#CCE8FF', '#F0FFD4',
  ];

  const DIAS_NOMBRES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const getFechasSemana = () => {
    if (!semanaLunes) return [];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(semanaLunes);
      d.setDate(semanaLunes.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const buildColumnasSemanal = () => {
    const fechasSemana = getFechasSemana();
    const columns = [
      {
        title: 'No.',
        dataIndex: 'numero',
        key: 'numero',
        fixed: 'left',
        width: 55,
        align: 'center',
        onHeaderCell: () => ({ style: { background: '#6B4E3D', color: 'white', textAlign: 'center' } }),
      },
      {
        title: 'NOMBRE INSTRUCTORA',
        dataIndex: 'nombre',
        key: 'nombre',
        fixed: 'left',
        width: 230,
        onHeaderCell: () => ({ style: { background: '#6B4E3D', color: 'white' } }),
      },
    ];
    fechasSemana.forEach(fecha => {
      const ts = fecha.getTime();
      const dayKey = `day_${ts}`;
      const diaNombre = DIAS_NOMBRES[fecha.getDay()];
      const dd = String(fecha.getDate()).padStart(2, '0');
      const mm = String(fecha.getMonth() + 1).padStart(2, '0');
      const yyyy = fecha.getFullYear();
      columns.push({
        title: `${diaNombre} ${dd}/${mm}/${yyyy}`,
        key: dayKey,
        align: 'center',
        onHeaderCell: () => ({ style: { background: '#4A7C59', color: 'white', textAlign: 'center', fontWeight: 'bold' } }),
        children: [
          {
            title: 'PDV',
            dataIndex: `${dayKey}_pdv`,
            key: `${dayKey}_pdv`,
            width: 130,
            onHeaderCell: () => ({ style: { background: '#5A8C6A', color: 'white', fontWeight: 600 } }),
            render: (text) => <span style={{ fontSize: 12 }}>{text || ''}</span>,
          },
          {
            title: 'Motivo',
            dataIndex: `${dayKey}_motivo`,
            key: `${dayKey}_motivo`,
            width: 150,
            onHeaderCell: () => ({ style: { background: '#5A8C6A', color: 'white', fontWeight: 600 } }),
            render: (text, record) => {
              if (!text) return '';
              const horario = record[`${dayKey}_horario`];
              return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <span style={{ fontSize: 12, flex: 1 }}>{text}</span>
                  {horario && (
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEditarHorario(horario)}
                      style={{ color: '#6B4E3D', padding: 0, minWidth: 18, height: 18, fontSize: 11 }}
                    />
                  )}
                </div>
              );
            },
          },
        ],
      });
    });
    return columns;
  };

  const buildDatosSemanal = () => {
    const fechasSemana = getFechasSemana();
    const docsEnFiltrado = [...new Set(horariosFiltered.map(h => h.documento))];
    docsEnFiltrado.sort((a, b) => {
      const nA = instructoras.find(i => i.documento === a)?.nombre || a;
      const nB = instructoras.find(i => i.documento === b)?.nombre || b;
      return nA.localeCompare(nB);
    });
    return docsEnFiltrado.map((doc, idx) => {
      const instructora = instructoras.find(i => i.documento === doc);
      const row = {
        key: doc,
        numero: idx + 1,
        nombre: instructora ? instructora.nombre : doc,
        documento: doc,
        rowIndex: idx,
      };
      fechasSemana.forEach(fecha => {
        const ts = fecha.getTime();
        const dayKey = `day_${ts}`;
        const horario = horariosFiltered.find(h => h.documento === doc && h.fecha.getTime() === ts);
        row[`${dayKey}_pdv`] = horario ? horario.pdv : '';
        row[`${dayKey}_motivo`] = horario ? horario.actividad : '';
        row[`${dayKey}_horario`] = horario || null;
      });
      return row;
    });
  };

  const handleDescargarExcel = () => {
    if (horariosTodos.length === 0) {
      Modal.warning({ title: 'Sin datos', content: 'No hay horarios para descargar' });
      return;
    }

    const fechasSemana = getFechasSemana();
    const datosSemanal = buildDatosSemanal();
    const totalCols = 2 + fechasSemana.length * 2;

    const fila0 = Array(totalCols).fill('');
    fila0[0] = 'HORARIOS SEMANALES';

    const fila1 = ['No.', 'NOMBRE INSTRUCTORA'];
    fechasSemana.forEach(fecha => {
      const diaNombre = DIAS_NOMBRES[fecha.getDay()];
      const dd = String(fecha.getDate()).padStart(2, '0');
      const mm = String(fecha.getMonth() + 1).padStart(2, '0');
      const yyyy = fecha.getFullYear();
      fila1.push(`${diaNombre} ${dd}/${mm}/${yyyy}`, '');
    });

    const fila2 = ['', ''];
    fechasSemana.forEach(() => fila2.push('PDV', 'Motivo'));

    const filasData = datosSemanal.map(row => {
      const dataRow = [row.numero, row.nombre];
      fechasSemana.forEach(fecha => {
        const ts = fecha.getTime();
        const dayKey = `day_${ts}`;
        dataRow.push(row[`${dayKey}_pdv`] || '', row[`${dayKey}_motivo`] || '');
      });
      return dataRow;
    });

    const aoa = [fila0, fila1, fila2, ...filasData];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
      { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },
    ];
    fechasSemana.forEach((_, idx) => {
      merges.push({ s: { r: 1, c: 2 + idx * 2 }, e: { r: 1, c: 2 + idx * 2 + 1 } });
    });
    ws['!merges'] = merges;

    const colWidths = [{ wch: 5 }, { wch: 32 }];
    fechasSemana.forEach(() => colWidths.push({ wch: 20 }, { wch: 22 }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Horarios Semanales');
    const fecha = new Date().toLocaleDateString('es-CO').replace(/\//g, '-');
    XLSX.writeFile(wb, `Horarios_Semanales_${fecha}.xlsx`);

    Modal.success({ title: 'Éxito', content: 'Archivo Excel descargado exitosamente' });
  };

  const handleDescargarPDF = () => {
    if (horariosTodos.length === 0) {
      Modal.warning({ title: 'Sin datos', content: 'No hay horarios para descargar' });
      return;
    }

    const fechasSemana = getFechasSemana();
    const datosSemanal = buildDatosSemanal();

    let thDias = '';
    fechasSemana.forEach(fecha => {
      const diaNombre = DIAS_NOMBRES[fecha.getDay()];
      const dd = String(fecha.getDate()).padStart(2, '0');
      const mm = String(fecha.getMonth() + 1).padStart(2, '0');
      const yyyy = fecha.getFullYear();
      thDias += `<th colspan="2" style="background:#4A7C59;color:white;text-align:center;padding:6px;border:1px solid #ccc">${diaNombre} ${dd}/${mm}/${yyyy}</th>`;
    });

    let thSub = `<th style="background:#6B4E3D;color:white;padding:5px;border:1px solid #ccc">No.</th><th style="background:#6B4E3D;color:white;padding:5px;border:1px solid #ccc">NOMBRE INSTRUCTORA</th>`;
    fechasSemana.forEach(() => {
      thSub += `<th style="background:#5A8C6A;color:white;padding:5px;border:1px solid #ccc">PDV</th><th style="background:#5A8C6A;color:white;padding:5px;border:1px solid #ccc">Motivo</th>`;
    });

    let tbody = '';
    datosSemanal.forEach((row, idx) => {
      const bgColor = ROW_COLORS[idx % ROW_COLORS.length];
      let cells = `<td style="background:${bgColor};text-align:center;padding:5px;border:1px solid #ccc">${row.numero}</td><td style="background:${bgColor};padding:5px;font-weight:600;border:1px solid #ccc">${row.nombre}</td>`;
      fechasSemana.forEach(fecha => {
        const ts = fecha.getTime();
        const dayKey = `day_${ts}`;
        cells += `<td style="background:${bgColor};padding:5px;border:1px solid #ccc">${row[`${dayKey}_pdv`] || ''}</td><td style="background:${bgColor};padding:5px;border:1px solid #ccc">${row[`${dayKey}_motivo`] || ''}</td>`;
      });
      tbody += `<tr>${cells}</tr>`;
    });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html>
<head>
  <title>Horarios Semanales Instructoras</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 15px; color: #333; font-size: 10px; }
    h1 { color: #6B4E3D; text-align: center; margin-bottom: 8px; font-size: 16px; }
    .info { margin-bottom: 12px; color: #555; font-size: 11px; text-align: center; }
    table { width: 100%; border-collapse: collapse; }
    @media print { body { margin: 8px; } tr { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>HORARIOS SEMANALES</h1>
  <div class="info">
    <strong>Generado:</strong> ${new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    &nbsp;|&nbsp; <strong>Instructoras:</strong> ${datosSemanal.length}
  </div>
  <table>
    <thead>
      <tr>
        <th colspan="2" style="background:#6B4E3D;color:white;padding:6px;text-align:center;border:1px solid #ccc">INSTRUCTORA</th>
        ${thDias}
      </tr>
      <tr>${thSub}</tr>
    </thead>
    <tbody>${tbody}</tbody>
  </table>
</body>
</html>`);
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
        {/* Navegación de semana */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <Button icon={<LeftOutlined />} onClick={irSemanaAnterior}>Anterior</Button>
          <DatePicker
            value={dayjs(semanaLunes)}
            onChange={(date) => {
              if (date) {
                const d = date.toDate();
                const dow = d.getDay();
                const diff = dow === 0 ? -6 : 1 - dow;
                const monday = new Date(d);
                monday.setDate(d.getDate() + diff);
                monday.setHours(0, 0, 0, 0);
                setSemanaLunes(monday);
              }
            }}
            format="DD/MM/YYYY"
            placeholder="Ir a fecha..."
            style={{ width: 140 }}
            allowClear={false}
          />
          <span style={{ fontWeight: 700, color: '#6B4E3D', fontSize: 14, padding: '0 4px' }}>
            {semanaLunes.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
            {' – '}
            {new Date(semanaLunes.getTime() + 6 * 86400000).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <Button onClick={irSemanaSiguiente}>Siguiente <RightOutlined /></Button>
        </div>
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

      {/* Tabla Semanal de Horarios */}
      <Card>
        <Table
          dataSource={buildDatosSemanal()}
          columns={buildColumnasSemanal()}
          pagination={false}
          scroll={{ x: 'max-content', y: 580 }}
          bordered
          size="small"
          onRow={(record) => ({
            style: { background: ROW_COLORS[record.rowIndex % ROW_COLORS.length] }
          })}
          locale={{
            emptyText: <Empty description="No hay horarios programados para mostrar" />,
          }}
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

