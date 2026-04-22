import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Table, Tag, Button, Modal, Form, Input, Select, Space, Card, Tooltip } from 'antd';
import { EyeOutlined, DownloadOutlined, EditOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import 'antd/dist/reset.css';
import '../styles/Dashboard.css';

function Dashboard({ userData, onLogout }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [semanaPreview, setSemanaPreview] = useState(null);
  const [horariosData, setHorariosData] = useState([]);
  const [infoSemana, setInfoSemana] = useState(null);
  const [horariosDetalles, setHorariosDetalles] = useState([]);
  const [puntosVenta, setPuntosVenta] = useState([]);

  // Estados para modal de edición
  const [modalEditar, setModalEditar] = useState(false);
  const [eventoEditar, setEventoEditar] = useState(null);
  const [formDataModal, setFormDataModal] = useState({
    puntoVenta: '',
    horaInicio: '',
    horaFin: '',
    motivo: '',
    detalleCubrir: '',
    detalleOtro: ''
  });
  const [showMoreMotivosModal, setShowMoreMotivosModal] = useState(false);
  const [filaExpandida, setFilaExpandida] = useState(null);
  const [semanaOffset, setSemanaOffset] = useState(0); // 0 = próxima semana, -1 = semana anterior, etc.

  // Verificar autenticación
  useEffect(() => {
    if (!userData) {
      navigate('/auth/login');
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
  }, [navigate, userData]);

  // Cargar horarios de la próxima semana
  useEffect(() => {
    if (!user) return;

    const cargarHorarios = async () => {
      try {
        const documento = user.documento;
        if (!documento) return;

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

        proximoLunes.setDate(hoy.getDate() + diasHastaProximoLunes + (semanaOffset * 7));
        const proximoDomingo = new Date(proximoLunes);
        proximoDomingo.setDate(proximoLunes.getDate() + 6);

        const pad = (n) => String(n).padStart(2, '0');
        const fechaInicioStr = `${proximoLunes.getFullYear()}-${pad(proximoLunes.getMonth() + 1)}-${pad(proximoLunes.getDate())}`;
        const fechaFinStr = `${proximoDomingo.getFullYear()}-${pad(proximoDomingo.getMonth() + 1)}-${pad(proximoDomingo.getDate())}`;

        const url = `https://macfer.crepesywaffles.com/api/horarios-instructoras?filters[documento][$eq]=${documento}&filters[fecha][$gte]=${fechaInicioStr}&filters[fecha][$lte]=${fechaFinStr}&pagination[pageSize]=40000`;
        const response = await axios.get(url);

        const primerDiaMes = new Date(proximoLunes.getFullYear(), proximoLunes.getMonth(), 1);
        const diasHastaPrimerLunes = (8 - primerDiaMes.getDay()) % 7;
        const numeroSemana = Math.ceil((proximoLunes.getDate() - diasHastaPrimerLunes) / 7) + 1;

        if (response.data?.data && response.data.data.length > 0) {
          const detalles = response.data.data.map(item => {
            const fechaStr = item.attributes.fecha;
            const [year, month, day] = fechaStr.split('-').map(Number);
            return {
              fecha: new Date(year, month - 1, day),
              pdv: item.attributes.pdv_nombre,
              actividad: item.attributes.actividad,
              horaInicio: item.attributes.hora_inicio,
              horaFin: item.attributes.hora_fin
            };
          }).sort((a, b) => a.fecha - b.fecha);

          setHorariosDetalles(detalles);

          const totalHorasCalc = detalles.reduce((sum, d) => {
            if (d.horaInicio && d.horaFin) {
              const [hi, mi] = d.horaInicio.split(':').map(Number);
              const [hf, mf] = d.horaFin.split(':').map(Number);
              return sum + (hf * 60 + mf - (hi * 60 + mi)) / 60;
            }
            return sum;
          }, 0);

          setHorariosData([{
            key: 'semana-actual',
            numeroSemana,
            fechaInicio: proximoLunes,
            fechaFin: proximoDomingo,
            totalHoras: totalHorasCalc
          }]);
          setInfoSemana({ numero: numeroSemana, fechaInicio: proximoLunes, fechaFin: proximoDomingo });
        } else {
          setHorariosData([]);
          setHorariosDetalles([]);
          setInfoSemana({ numero: numeroSemana, fechaInicio: proximoLunes, fechaFin: proximoDomingo });
        }
      } catch (error) {
        console.error('Error al cargar horarios:', error);
        setHorariosData([]);
      }
    };

    cargarHorarios();
  }, [user, semanaOffset]);

  // Cargar puntos de venta de la instructora
  useEffect(() => {
    if (!user) return;

    const cargarPuntosVenta = async () => {
      try {
        const documentoLimpio = String(user.documento).trim();
        const url = `https://macfer.crepesywaffles.com/api/cap-instructoras?filter[documento][$eq]=${documentoLimpio}&populate[cap_pdvs]=*`;
        const response = await axios.get(url);

        if (response.data?.data?.length > 0) {
          const instructoraActual = response.data.data.find(inst =>
            String(inst.attributes.documento).trim() === documentoLimpio
          );
          if (instructoraActual?.attributes.cap_pdvs?.data) {
            const puntosActivos = instructoraActual.attributes.cap_pdvs.data
              .filter(pdv => pdv.attributes?.activo === true)
              .map(pdv => ({ id: pdv.id, nombre: pdv.attributes.nombre }))
              .sort((a, b) => a.nombre.localeCompare(b.nombre));
            setPuntosVenta(puntosActivos);
          }
        }
      } catch (error) {
        console.error('Error al cargar puntos de venta:', error);
      }
    };

    cargarPuntosVenta();
  }, [user]);

  const formatearFecha = (fecha) => {
    if (!fecha) return '';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${fecha.getDate()} ${meses[fecha.getMonth()]}`;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
    return name[0].toUpperCase();
  };

  const totalHoras = horariosData.reduce((sum, item) => sum + item.totalHoras, 0);

  const formatearRangoFechas = (fechaInicio, fechaFin) => {
    if (!fechaInicio || !fechaFin) return '';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${fechaInicio.getDate()} - ${fechaFin.getDate()} ${meses[fechaInicio.getMonth()]}`;
  };

  const getDiaSemana = (fecha) => {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[fecha.getDay()];
  };

  const formatearFechaCompleta = (fecha) => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
  };

  const handleVer = (semana) => {
    setSemanaPreview(semana);
    setShowPreviewModal(true);
  };

  const motivosLabels = {
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

  const handleEditarActividad = (detalle) => {
    const pdvEncontrado = puntosVenta.find(p => p.nombre === detalle.pdv);
    const puntoVentaId = pdvEncontrado ? String(pdvEncontrado.id) : '';
    const motivo = actividadAMotivo[detalle.actividad] || 'otro';
    const detalleOtro = !actividadAMotivo[detalle.actividad] ? detalle.actividad : '';

    setFormDataModal({
      puntoVenta: puntoVentaId,
      horaInicio: detalle.horaInicio ? detalle.horaInicio.substring(0, 5) : '',
      horaFin: detalle.horaFin ? detalle.horaFin.substring(0, 5) : '',
      motivo,
      detalleCubrir: '',
      detalleOtro
    });

    const motivosExpandibles = [
      'dia_descanso', 'visita', 'induccion', 'cubrir_puesto', 'disponible',
      'fotos', 'escuela_cafe', 'sintonizarte', 'viaje', 'pg', 'apoyo', 'reunion',
      'cambio_turno', 'apertura', 'lanzamiento', 'vacaciones', 'incapacidad',
      'dia_familia', 'permiso_no_remunerado', 'licencia_no_remunerada',
      'licencia_remunerada', 'licencia_luto', 'otro'
    ];
    setShowMoreMotivosModal(motivosExpandibles.includes(motivo));
    setEventoEditar(detalle);
    setModalEditar(true);
  };

  const handleInputChangeModal = (e) => {
    const { name, value } = e.target;
    setFormDataModal(prev => ({ ...prev, [name]: value }));
  };

  const handleGuardarEdicionModal = async () => {
    if (!eventoEditar) return;

    if (!formDataModal.puntoVenta) {
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
    }

    const puntoVentaObj = puntosVenta.find(p => String(p.id) === formDataModal.puntoVenta);
    const puntoVentaNombre = puntoVentaObj ? puntoVentaObj.nombre : '';
    let actividad = motivosLabels[formDataModal.motivo] || formDataModal.motivo;
    if (formDataModal.motivo === 'otro') actividad = formDataModal.detalleOtro;

    const horaInicio = (formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones') ? '00:00:00' : `${formDataModal.horaInicio}:00`;
    const horaFin = (formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones') ? '00:00:00' : `${formDataModal.horaFin}:00`;

    const documento = user.documento;
    const pad = (n) => String(n).padStart(2, '0');
    const fechaFormateada = `${eventoEditar.fecha.getFullYear()}-${pad(eventoEditar.fecha.getMonth() + 1)}-${pad(eventoEditar.fecha.getDate())}`;

    const datosAPI = {
      data: { pdv_nombre: puntoVentaNombre, fecha: fechaFormateada, hora_inicio: horaInicio, hora_fin: horaFin, actividad, documento: String(documento) }
    };

    try {
      const url = `https://macfer.crepesywaffles.com/api/horarios-instructoras?filters[documento][$eq]=${documento}&filters[fecha][$eq]=${fechaFormateada}&filters[pdv_nombre][$eq]=${eventoEditar.pdv}&filters[actividad][$eq]=${eventoEditar.actividad}`;
      const response = await axios.get(url);
      if (response.data?.data?.length > 0) {
        const idAPI = response.data.data[0].id;
        await axios.put(`https://macfer.crepesywaffles.com/api/horarios-instructoras/${idAPI}`, datosAPI);
      }

      setHorariosDetalles(prev => prev.map(d => d === eventoEditar ? { ...d, pdv: puntoVentaNombre, actividad, horaInicio, horaFin } : d));
      setModalEditar(false);
      setEventoEditar(null);
      alert('✅ Actividad actualizada exitosamente');
    } catch (error) {
      console.error('Error al actualizar:', error);
      alert('❌ Error al guardar los cambios. Por favor intenta nuevamente.');
    }
  };

  const handleCerrarModal = () => {
    setModalEditar(false);
    setEventoEditar(null);
    setFormDataModal({ puntoVenta: '', horaInicio: '', horaFin: '', motivo: '', detalleCubrir: '', detalleOtro: '' });
    setShowMoreMotivosModal(false);
  };

  const handleEliminarActividad = async (detalle) => {
    if (!confirm('¿Estás segura de que deseas eliminar esta actividad?')) return;

    try {
      const documento = user.documento;
      const pad = (n) => String(n).padStart(2, '0');
      const fechaFormateada = `${detalle.fecha.getFullYear()}-${pad(detalle.fecha.getMonth() + 1)}-${pad(detalle.fecha.getDate())}`;

      const url = `https://macfer.crepesywaffles.com/api/horarios-instructoras?filters[documento][$eq]=${documento}&filters[fecha][$eq]=${fechaFormateada}&filters[pdv_nombre][$eq]=${detalle.pdv}&filters[actividad][$eq]=${detalle.actividad}`;
      const response = await axios.get(url);
      if (response.data?.data?.length > 0) {
        const idAPI = response.data.data[0].id;
        await axios.delete(`https://macfer.crepesywaffles.com/api/horarios-instructoras/${idAPI}`);
      }

      setHorariosDetalles(prev => prev.filter(d => d !== detalle));
      alert('✅ Actividad eliminada exitosamente');
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('❌ Error al eliminar la actividad.');
    }
  };

  const handleDescargarPDF = (semana) => {
    const filasTabla = horariosDetalles.map(horario => `
      <tr>
        <td><strong>${getDiaSemana(horario.fecha)}</strong></td>
        <td>${formatearFechaCompleta(horario.fecha)}</td>
        <td>${horario.actividad}</td>
        <td>${horario.horaInicio === '00:00:00' ? 'Todo el día' : `${horario.horaInicio.substring(0, 5)} - ${horario.horaFin.substring(0, 5)}`}</td>
        <td>${horario.pdv}</td>
      </tr>
    `).join('');

    const contenidoPDF = `<!DOCTYPE html>
      <html>
        <head>
          <title>Programación Semanal</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #AECE82; }
            .header h1 { color: #6B4E3D; margin: 10px 0; }
            .info-semana { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .info-semana p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: linear-gradient(135deg, #AECE82 0%, #9bb86e 100%); color: white; font-weight: 600; }
            tr:nth-child(even) { background: #f9f9f9; }
            .footer { margin-top: 20px; text-align: center; font-size: 0.9em; color: #888; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Programación Semanal de Capacitaciones</h1>
            <p><strong>Instructora:</strong> ${user?.nombre || 'N/A'}</p>
          </div>
          <div class="info-semana">
            <p><strong>Período:</strong> ${formatearRangoFechas(semana.fechaInicio, semana.fechaFin)}</p>
            <p><strong>Total de horas programadas:</strong> ${semana.totalHoras.toFixed(1)} horas</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:12%">Día</th>
                <th style="width:18%">Fecha</th>
                <th style="width:25%">Actividad</th>
                <th style="width:15%">Hora</th>
                <th style="width:30%">Punto de Venta</th>
              </tr>
            </thead>
            <tbody>
              ${horariosDetalles.length > 0 ? filasTabla : '<tr><td colspan="5" style="text-align:center;color:#999;"><em>No hay programación registrada</em></td></tr>'}
            </tbody>
          </table>
          <div class="footer">
            <p>Generado el ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </body>
      </html>`;

    const ventanaImpresion = window.open('', '', 'width=900,height=700');
    ventanaImpresion.document.write(contenidoPDF);
    ventanaImpresion.document.close();
    setTimeout(() => ventanaImpresion.print(), 500);
  };

  return (
    <div className="dashboard-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-left">
            <button className="profile-button-avatar" onClick={() => setShowProfileModal(true)}>
              {user?.foto
                ? <img src={user.foto} alt="Perfil" className="profile-avatar" onError={(e) => { e.target.onerror = null; setUser(prev => ({ ...prev, foto: '' })); }} />
                : <div className="profile-avatar-initials">{getInitials(user?.nombre)}</div>
              }
            </button>
            <div className="navbar-titles">
              <h1 className="navbar-title">MIS HORARIOS</h1>
              <span className="navbar-subtitle">Gestión de Disponibilidad</span>
            </div>
          </div>
          <div className="navbar-actions">
            <button className="btn-volver" onClick={() => navigate('/menu')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
              </svg>
              Volver
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="welcome-section">
          <h2 className="welcome-greeting">¡Hola, {user?.nombre?.split(' ')[0]}!</h2>
        </div>

        <div className="dashboard-cards">
          <div className="dashboard-card" onClick={() => navigate('/portal/horarios-instructoras/instructor/programacion')}>
            <div className="card-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/>
                <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
              </svg>
            </div>
            <div className="card-content">
              <h3 className="card-title">Programar Horarios</h3>
              <p className="card-description">Programa tu disponibilidad semanal</p>
            </div>
            <div className="card-arrow">→</div>
          </div>
        </div>

        {/* Tabla de Horarios */}
        <div className="horarios-table-section">
          <div className="table-header">
            <div>
              <h3 className="table-title">Horarios Programados</h3>
              {infoSemana && (
                <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
                  {formatearFecha(infoSemana.fechaInicio)} - {formatearFecha(infoSemana.fechaFin)}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-semana-nav" onClick={() => { setSemanaOffset(prev => prev - 1); setFilaExpandida(null); }}>
                ← Anterior
              </button>
              <span className="semana-label-nav">
                {infoSemana
                  ? `${formatearFecha(infoSemana.fechaInicio)} – ${formatearFecha(infoSemana.fechaFin)}`
                  : 'Cargando...'}
              </span>
              <button className="btn-semana-nav" onClick={() => { setSemanaOffset(prev => prev + 1); setFilaExpandida(null); }}>
                Siguiente →
              </button>
            </div>
            <div className="table-stats">
              <Tag color="green" style={{ fontSize: '14px', padding: '6px 12px' }}>Total: {totalHoras.toFixed(1)}h</Tag>
            </div>
          </div>

          <Card style={{ margin: '20px 40px' }}>
            <Table
              dataSource={horariosData}
              columns={[
                {
                  title: 'Fechas',
                  key: 'fechas',
                  render: (_, record) => formatearRangoFechas(record.fechaInicio, record.fechaFin),
                },
                {
                  title: 'Total Horas',
                  dataIndex: 'totalHoras',
                  key: 'totalHoras',
                  render: (horas) => <Tag color="cyan" style={{ fontSize: '14px' }}>{horas.toFixed(1)}h</Tag>,
                },
                {
                  title: 'Acciones',
                  key: 'acciones',
                  render: (_, record) => (
                    <Space size="small">
                      <Tooltip title="Ver detalle">
                        <Button type="text" icon={<EyeOutlined />} onClick={() => handleVer(record)} style={{ color: '#52c41a' }} />
                      </Tooltip>
                      <Tooltip title="Descargar PDF">
                        <Button type="text" icon={<DownloadOutlined />} onClick={() => handleDescargarPDF(record)} style={{ color: '#1890ff' }} />
                      </Tooltip>
                    </Space>
                  ),
                },
              ]}
              expandable={{
                expandedRowRender: () => (
                  <div style={{ padding: '20px', background: '#fafafa' }}>
                    <h4 style={{ marginBottom: '15px', color: '#4e3416' }}>Actividades de la Semana</h4>
                    {horariosDetalles.length > 0 ? (
                      <Table
                        dataSource={horariosDetalles.map((detalle, index) => ({ ...detalle, key: index }))}
                        columns={[
                          { title: 'Día', dataIndex: 'fecha', key: 'dia', render: (fecha) => <strong>{getDiaSemana(fecha)}</strong> },
                          { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', render: (fecha) => formatearFechaCompleta(fecha) },
                          { title: 'PDV', dataIndex: 'pdv', key: 'pdv' },
                          {
                            title: 'Actividad', dataIndex: 'actividad', key: 'actividad',
                            render: (actividad) => {
                              let color = 'blue';
                              if (actividad.includes('Retroalimentación')) color = 'geekblue';
                              else if (actividad.includes('Capacitación')) color = 'purple';
                              else if (actividad.includes('Descanso')) color = 'volcano';
                              return <Tag color={color}>{actividad}</Tag>;
                            }
                          },
                          {
                            title: 'Horario', key: 'horario',
                            render: (_, d) => d.horaInicio === '00:00:00'
                              ? <Tag color="orange">Todo el día</Tag>
                              : `${d.horaInicio.substring(0, 5)} - ${d.horaFin.substring(0, 5)}`
                          },
                          {
                            title: 'Acciones', key: 'acciones',
                            render: (_, detalle) => (
                              <Space size="small">
                                <Tooltip title="Editar">
                                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditarActividad(detalle)} style={{ color: '#AECE82' }} />
                                </Tooltip>
                              </Space>
                            )
                          },
                        ]}
                        pagination={false}
                        size="small"
                      />
                    ) : (
                      <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No hay actividades programadas</p>
                    )}
                  </div>
                ),
                expandIcon: ({ expanded, onExpand, record }) =>
                  expanded
                    ? <UpOutlined onClick={e => onExpand(record, e)} style={{ color: '#AECE82' }} />
                    : <DownOutlined onClick={e => onExpand(record, e)} style={{ color: '#AECE82' }} />,
                onExpand: (expanded, record) => setFilaExpandida(expanded ? record.key : null),
                expandedRowKeys: filaExpandida ? [filaExpandida] : [],
              }}
              locale={{ emptyText: 'No hay horarios programados' }}
              pagination={false}
              bordered
            />
          </Card>
        </div>
      </main>

      {/* Modal de Perfil */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-avatar-modal">
              {user?.foto
                ? <img src={user.foto} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : getInitials(user?.nombre)
              }
            </div>
            <h2 className="profile-name-modal">{user?.nombre}</h2>
            <div className="profile-info">
              <div className="profile-item">
                <div className="profile-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
                  </svg>
                </div>
                <div className="profile-text">
                  <p className="profile-label-modal">Correo</p>
                  <p className="profile-value-modal">{user?.correo || 'No disponible'}</p>
                </div>
              </div>
              <div className="profile-item">
                <div className="profile-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/>
                  </svg>
                </div>
                <div className="profile-text">
                  <p className="profile-label-modal">Teléfono</p>
                  <p className="profile-value-modal">{user?.telefono || 'No disponible'}</p>
                </div>
              </div>
            </div>
            <button className="logout-button-modal" onClick={() => {
              setShowProfileModal(false);
              onLogout();
              navigate('/auth/login');
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}

      {/* Modal de Vista Previa */}
      <Modal
        title="Programación Semanal"
        open={showPreviewModal && !!semanaPreview}
        onCancel={() => setShowPreviewModal(false)}
        footer={null}
        centered
        width={900}
      >
        {semanaPreview && (
          <div style={{ padding: '10px 0' }}>
            <Card style={{ marginBottom: '20px', background: '#f5f5f5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#999', marginBottom: '5px' }}>Semana #</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4e3416' }}>{semanaPreview.numeroSemana}</div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#999', marginBottom: '5px' }}>Período</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', color: '#333' }}>{formatearRangoFechas(semanaPreview.fechaInicio, semanaPreview.fechaFin)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#999', marginBottom: '5px' }}>Total de Horas</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#AECE82' }}>{semanaPreview.totalHoras.toFixed(1)}h</div>
                </div>
              </div>
            </Card>
            {horariosDetalles.length > 0 && (
              <Table
                dataSource={horariosDetalles.map((h, i) => ({ ...h, key: i }))}
                columns={[
                  { title: 'Día', dataIndex: 'fecha', key: 'dia', render: (f) => <strong>{getDiaSemana(f)}</strong> },
                  { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', render: (f) => formatearFechaCompleta(f) },
                  { title: 'Actividad', dataIndex: 'actividad', key: 'actividad' },
                  { title: 'Hora', key: 'hora', render: (_, h) => h.horaInicio === '00:00:00' ? <Tag color="orange">Todo el día</Tag> : `${h.horaInicio.substring(0, 5)} - ${h.horaFin.substring(0, 5)}` },
                  { title: 'Punto de Venta', dataIndex: 'pdv', key: 'pdv' },
                ]}
                pagination={false}
                size="small"
                bordered
              />
            )}
            <div style={{ marginTop: '20px', textAlign: 'right', color: '#999', fontSize: '12px' }}>
              Generado el {new Date().toLocaleDateString('es-CO')}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Edición */}
      <Modal
        title="Editar Actividad"
        open={modalEditar}
        onCancel={handleCerrarModal}
        footer={[
          <Button key="cancel" onClick={handleCerrarModal}>Cancelar</Button>,
          <Button key="save" type="primary" onClick={handleGuardarEdicionModal} style={{ background: '#AECE82', borderColor: '#AECE82' }}>
            Guardar Cambios
          </Button>
        ]}
        centered
        width={700}
      >
        <Form layout="vertical" style={{ marginTop: '20px' }}>
          <Form.Item label="Punto de Venta">
            <Select
              value={formDataModal.puntoVenta || undefined}
              onChange={(value) => setFormDataModal(prev => ({ ...prev, puntoVenta: value }))}
              placeholder="Selecciona un punto de venta"
              size="large"
            >
              {puntosVenta.map(pdv => (
                <Select.Option key={pdv.id} value={String(pdv.id)}>{pdv.nombre}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Space style={{ display: 'flex', gap: '10px' }}>
            <Form.Item label="Hora Inicio" style={{ flex: 1 }}>
              <Input type="time" name="horaInicio" value={formDataModal.horaInicio} onChange={handleInputChangeModal}
                disabled={formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones'} size="large" />
            </Form.Item>
            <Form.Item label="Hora Fin" style={{ flex: 1 }}>
              <Input type="time" name="horaFin" value={formDataModal.horaFin} onChange={handleInputChangeModal}
                disabled={formDataModal.motivo === 'dia_descanso' || formDataModal.motivo === 'vacaciones'} size="large" />
            </Form.Item>
          </Space>

          <Form.Item label="Motivo">
            <Space wrap size="small" style={{ width: '100%' }}>
              {['retroalimentacion', 'acompañamiento', 'capacitacion'].map(m => (
                <Button key={m}
                  type={formDataModal.motivo === m ? 'primary' : 'default'}
                  onClick={() => { setFormDataModal(prev => ({ ...prev, motivo: m, detalleCubrir: '', detalleOtro: '' })); setShowMoreMotivosModal(false); }}
                  style={formDataModal.motivo === m ? { background: '#AECE82', borderColor: '#AECE82' } : {}}>
                  {motivosLabels[m]}
                </Button>
              ))}
              {showMoreMotivosModal && Object.entries(motivosLabels)
                .filter(([k]) => !['retroalimentacion', 'acompañamiento', 'capacitacion'].includes(k))
                .map(([k, label]) => (
                  <Button key={k}
                    type={formDataModal.motivo === k ? 'primary' : 'default'}
                    onClick={() => setFormDataModal(prev => ({
                      ...prev, motivo: k,
                      detalleCubrir: k !== 'cubrir_puesto' ? '' : prev.detalleCubrir,
                      detalleOtro: k !== 'otro' ? '' : prev.detalleOtro
                    }))}
                    style={formDataModal.motivo === k ? { background: '#AECE82', borderColor: '#AECE82' } : {}}>
                    {label}
                  </Button>
                ))
              }
              <Button type="link" onClick={() => setShowMoreMotivosModal(!showMoreMotivosModal)}
                icon={showMoreMotivosModal ? <UpOutlined /> : <DownOutlined />}>
                {showMoreMotivosModal ? 'Ver menos' : 'Ver más opciones'}
              </Button>
            </Space>
          </Form.Item>

          {formDataModal.motivo === 'cubrir_puesto' && (
            <Form.Item label="¿A quién vas a cubrir?">
              <Input name="detalleCubrir" value={formDataModal.detalleCubrir} onChange={handleInputChangeModal}
                placeholder="Nombre de la persona" size="large" />
            </Form.Item>
          )}
          {formDataModal.motivo === 'otro' && (
            <Form.Item label="Especifica el motivo">
              <Input name="detalleOtro" value={formDataModal.detalleOtro} onChange={handleInputChangeModal}
                placeholder="Describe la actividad" size="large" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}

export default Dashboard;
