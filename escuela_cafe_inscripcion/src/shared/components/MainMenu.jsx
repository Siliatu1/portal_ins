import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './MainMenu.css';

const MainMenu = ({ userData, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [fotoPerfil, setFotoPerfil] = useState('');

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const nombreUsuario = userData?.data?.nombre || 
    userData?.data?.name ||
    (userData?.data?.first_name && userData?.data?.last_name 
      ? `${userData.data.first_name} ${userData.data.last_name}`.trim()
      : userData?.data?.full_name || '');

  const cargoUsuario = userData?.data?.cargo_general || 
    userData?.cargo_general || 
    userData?.cargo || '';

  const documentoUsuario = userData?.data?.documento || 
    userData?.data?.document_number || 
    userData?.documento || '';

  // Cargar foto de perfil desde API de BUK
  useEffect(() => {
    const cargarFoto = async () => {
      if (!documentoUsuario) return;
      try {
        const response = await fetch(`https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${documentoUsuario}`);
        if (response.ok) {
          const data = await response.json();
          const empleados = data?.data || data;
          const empleado = Array.isArray(empleados)
            ? empleados.find(emp => String(emp.document_number) === String(documentoUsuario))
            : null;
          if (empleado?.foto) setFotoPerfil(empleado.foto);
        }
      } catch (e) {}
    };
    cargarFoto();
  }, [documentoUsuario]);

  // Roles con acceso al Portal de Horarios
  const rolesHorariosAdmin = [
    'JEFE DESARROLLO DE PRODUCTO',
    'DIRECTORA DE LINEAS DE PRODUCTO',
    'ANALISTA DE PRODUCTO'
  ];

  const rolesHorariosInstructor = ['INSTRUCTOR'];

  const tieneAccesoHorarios = 
    rolesHorariosAdmin.includes(cargoUsuario) || 
    rolesHorariosInstructor.includes(cargoUsuario);

  // Documentos autorizados para cada panel de instructoras
  const documentoAsistenciaCafe = '35512822';
  const documentosInstructorasToderas = [
    '30386710', '52395525', '52422155', '52525496', '1020758053',
    '1077845053', '39276283', '35416150', '22797275', '49792488',
    '52701678', '28549413', '1019005012', '49606652', '53075347',
    '1079605138', '21032351', '52439552', '52962339', '1116547316',
    '23876197', '66681589', '52799048', '1075538331', '49776128',
    '37550615', '37339972', '1019073170'
  ];

  const handleNavigateLineasProducto = () => {
    // Verificar si es la instructora de Asistencia Café
    if (String(documentoUsuario).trim() === documentoAsistenciaCafe) {
      navigate('/portal/lineas-producto/asistencia');
      return;
    }

    // Verificar si es instructora de Panel Toderas
    if (documentosInstructorasToderas.includes(String(documentoUsuario).trim())) {
      navigate('/portal/lineas-producto/panel-toderas');
      return;
    }

    // Para todos los demás (administradores, líderes, etc.)
    navigate('/portal/lineas-producto');
  };

  const handleNavigateHorarios = () => {
    if (rolesHorariosAdmin.includes(cargoUsuario)) {
      navigate('/portal/horarios-instructoras/admin');
    } else if (rolesHorariosInstructor.includes(cargoUsuario)) {
      navigate('/portal/horarios-instructoras/instructor');
    }
  };

  const handleLogoutClick = () => {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      onLogout();
      navigate('/auth/login');
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="main-menu-container">
      <div className="decoration-circle circle-1"></div>
      <div className="decoration-circle circle-2"></div>
      <div className="decoration-circle circle-3"></div>

      <div className="main-menu-header">
        <div className="header-content">
          <div className="header-left">
            <div className="profile-avatar-menu">
              {fotoPerfil
                ? <img src={fotoPerfil} alt="Perfil" className="profile-photo-menu" onError={(e) => { e.target.onerror = null; setFotoPerfil(''); }} />
                : getInitials(nombreUsuario)
              }
            </div>
            <div className="user-details">
              <p className="user-name">{nombreUsuario}</p>
              <p className="user-cargo">{cargoUsuario}</p>
            </div>
            <h1 className="main-menu-title">PORTAL CREPES & WAFFLES</h1>
          </div>
          <div className="user-info-header">
            <button className="btn-nav-menu" onClick={handleLogoutClick}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/>
                <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
              </svg>
              <span>Salir</span>
            </button>
          </div>
        </div>
      </div>

      <div className="main-menu-content">
        <h2 className="menu-subtitle">Selecciona un portal</h2>
        
        <div className="menu-cards">
          {/* Portal Líneas de Producto */}
          <div className="menu-card" onClick={handleNavigateLineasProducto}>
            <div className="card-icon-menu">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
              </svg>
            </div>
            <h3 className="card-title-menu">Portal Líneas de Producto</h3>
            <p className="card-description-menu">
              Gestión de inscripciones, evaluaciones y capacitaciones
            </p>
            <div className="card-arrow-menu">→</div>
          </div>

          {/* Portal Horarios Instructoras */}
          {tieneAccesoHorarios && (
            <div className="menu-card" onClick={handleNavigateHorarios}>
              <div className="card-icon-menu">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-5 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/>
                  <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                </svg>
              </div>
              <h3 className="card-title-menu">Portal Horarios Instructoras</h3>
              <p className="card-description-menu">
                {rolesHorariosAdmin.includes(cargoUsuario) 
                  ? 'Vista administrativa de horarios y programación'
                  : 'Gestión de horarios y disponibilidad'}
              </p>
              <div className="card-arrow-menu">→</div>
            </div>
          )}
        </div>

        {!tieneAccesoHorarios && (
          <div className="info-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
            </svg>
            <p>Tu rol actual solo tiene acceso al Portal de Líneas de Producto</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainMenu;
