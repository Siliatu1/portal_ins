import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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

  // Cargar datos del API
  useEffect(() => {
    if (!user) return;

    const cargarHorarios = async () => {
      try {
        const response = await fetch(`https://macfer.crepesywaffles.com/api/horario-instructoras?filters[documento][$eq]=${user.documento}&populate=*`);
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.data && result.data.length > 0) {
            const horariosAgrupados = agruparHorariosPorSemana(result.data);
            setHorariosData(horariosAgrupados);
          } else {
            setHorariosData([]);
          }
        } else {
          setHorariosData([]);
        }
      } catch (error) {
        console.error('Error al cargar horarios:', error);
        setHorariosData([]);
      }
    };

    cargarHorarios();
  }, [user]);

  // Cargar puntos de venta
  useEffect(() => {
    if (!user) return;

    const cargarPuntosVenta = async () => {
      try {
        const response = await fetch('https://macfer.crepesywaffles.com/api/pdvs?pagination[limit]=1000');
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.data && result.data.length > 0) {
            const pdvsArray = result.data.map(item => ({
              id: item.id,
              codigo: item.codigo || '',
              nombre: item.nombre || '',
              ciudad: item.ciudad || '',
              linea: item.linea || ''
            }));
            
            setPuntosVenta(pdvsArray);
          }
        }
      } catch (error) {
        console.error('Error al cargar puntos de venta:', error);
      }
    };

    cargarPuntosVenta();
  }, [user]);

  const agruparHorariosPorSemana = (horarios) => {
    // Implementación de agrupación por semana
    const semanas = {};
    
    horarios.forEach(horario => {
      const semanaKey = `${horario.anio}-S${horario.numero_semana}`;
      
      if (!semanas[semanaKey]) {
        semanas[semanaKey] = {
          semana: horario.numero_semana,
          anio: horario.anio,
          fechaInicio: horario.fecha_inicio,
          fechaFin: horario.fecha_fin,
          totalHoras: 0,
          detalles: []
        };
      }
      
      const horas = calcularHoras(horario.hora_inicio, horario.hora_fin);
      semanas[semanaKey].totalHoras += horas;
      semanas[semanaKey].detalles.push(horario);
    });
    
    return Object.values(semanas).sort((a, b) => {
      if (a.anio !== b.anio) return b.anio - a.anio;
      return b.semana - a.semana;
    });
  };

  const calcularHoras = (horaInicio, horaFin) => {
    if (!horaInicio || !horaFin) return 0;
    const [hi, mi] = horaInicio.split(':').map(Number);
    const [hf, mf] = horaFin.split(':').map(Number);
    return ((hf * 60 + mf) - (hi * 60 + mi)) / 60;
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const totalHoras = horariosData.reduce((sum, item) => sum + item.totalHoras, 0);

  const formatearRangoFechas = (fechaInicio, fechaFin) => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    return `${inicio.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} - ${fin.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const handleVer = (semana) => {
    // Placeholder para vista previa
    console.log('Ver semana:', semana);
  };

  const handleEditar = (semana) => {
    navigate('/portal/horarios-instructoras/instructor/programacion');
  };

  const handleDescargarPDF = (semana) => {
    // Placeholder para descarga PDF
    console.log('Descargar PDF semana:', semana);
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

  const handleVolverMenu = () => {
    navigate('/menu');
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
            <button className="btn-volver" onClick={handleVolverMenu}>
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
        {/* Welcome Section */}
        <div className="welcome-section">
          <h2 className="welcome-greeting">¡Hola, {user?.nombre?.split(' ')[0]}!</h2>
        </div>

        {/* Dashboard Cards */}
        <div className="dashboard-cards">
          <div className="dashboard-card" onClick={handleEditar}>
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

        {/* Info Notice */}
        <div className="info-notice">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
          </svg>
          <p>Recuerda programar tus horarios con anticipación para una mejor organización.</p>
        </div>

        {/* Content Wrapper */}
        <div className="content-wrapper">
          {/* Tabla de Horarios */}
          <div className="horarios-table-section">
            <div className="table-header">
              <h3 className="table-title">Historial de Horarios</h3>
              <div className="table-stats">
                <span className="stat-badge total-hours">Total Horas: {totalHoras.toFixed(1)}</span>
                <span className="stat-badge">Semanas: {horariosData.length}</span>
              </div>
            </div>

            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Semana</th>
                    <th>Año</th>
                    <th>Rango de Fechas</th>
                    <th>Total Horas</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {horariosData.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                        No hay horarios registrados
                      </td>
                    </tr>
                  ) : (
                    horariosData.map((item, index) => (
                      <tr key={index}>
                        <td><strong>Semana {item.semana}</strong></td>
                        <td>{item.anio}</td>
                        <td>{formatearRangoFechas(item.fechaInicio, item.fechaFin)}</td>
                        <td>
                          <span className="tag-hours">{item.totalHoras.toFixed(1)} hrs</span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-action btn-view" onClick={() => handleVer(item)} title="Ver">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                              </svg>
                            </button>
                            <button className="btn-action btn-pdf" onClick={() => handleDescargarPDF(item)} title="PDF">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
    </div>
  );
}

export default Dashboard;
