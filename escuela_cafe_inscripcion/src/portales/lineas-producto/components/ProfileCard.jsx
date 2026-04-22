import React, { useState, useEffect } from "react";
import "./ProfileCard.css";
import "bootstrap-icons/font/bootstrap-icons.css";


const empleadosCache = {};

const ProfileCard = ({ userData, onLogout }) => {
  const [empleadoInfo, setEmpleadoInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);


  const documentoUsuario = userData?.data?.documento || 
    userData?.data?.document_number || 
    userData?.documento ||
    '';

  useEffect(() => {
    const cargarDatosEmpleado = async () => {
      if (!documentoUsuario) {
        setLoading(false);
        return;
      }

      const docTrim = String(documentoUsuario).trim();
    
      if (empleadosCache[docTrim]) {
        setEmpleadoInfo(empleadosCache[docTrim]);
        setLoading(false);
        return;
      }

      setLoading(true);
      
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
        
        const infoFinal = empleadoData || {
          foto: userData?.data?.foto || userData?.data?.picture || '',
          nombre: userData?.data?.nombre || userData?.data?.name || 
            (userData?.data?.first_name && userData?.data?.last_name 
              ? `${userData.data.first_name} ${userData.data.last_name}`.trim()
              : userData?.data?.full_name || ''),
          document_number: documentoUsuario,
          cargo: userData?.data?.cargo_general || userData?.data?.cargo || userData?.data?.position || '',
          area_nombre: userData?.data?.area_nombre || userData?.data?.department || ''
        };
        

        empleadosCache[docTrim] = infoFinal;
        setEmpleadoInfo(infoFinal);
      } catch (error) {
        const infoFallback = {
          foto: userData?.data?.foto || userData?.data?.picture || '',
          nombre: userData?.data?.nombre || userData?.data?.name || 
            (userData?.data?.first_name && userData?.data?.last_name 
              ? `${userData.data.first_name} ${userData.data.last_name}`.trim()
              : userData?.data?.full_name || ''),
          document_number: documentoUsuario,
          cargo: userData?.data?.cargo_general || userData?.data?.cargo || userData?.data?.position || '',
          area_nombre: userData?.data?.area_nombre || userData?.data?.department || ''
        };
        empleadosCache[docTrim] = infoFallback;
        setEmpleadoInfo(infoFallback);
      } finally {
        setLoading(false);
      }
    };

    cargarDatosEmpleado();
  }, [documentoUsuario, userData]);

  if (loading) {
    return (
      <div className="profile-card-compact">
        <div className="profile-loading-compact">
          <i className="bi bi-arrow-repeat"></i>
        </div>
      </div>
    );
  }

  if (!empleadoInfo) {
    return null;
  }

  return (
    <div className={`profile-card-compact ${isExpanded ? 'expanded' : ''}`}>
      <div 
        className="profile-photo-wrapper" 
        onClick={() => setIsExpanded(!isExpanded)}
        title={isExpanded ? "Ocultar información" : "Ver información del perfil"}
      >
        {empleadoInfo.foto ? (
          <img 
            src={empleadoInfo.foto} 
            alt={empleadoInfo.nombre} 
            className="profile-photo-compact"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2UwZTBlMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj4/PC90ZXh0Pjwvc3ZnPg==';
            }}
          />
        ) : (
          <div className="profile-photo-placeholder-compact">
            <i className="bi bi-person-circle"></i>
          </div>
        )}
        <div className="profile-expand-indicator">
          <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
        </div>
      </div>
      
      {isExpanded && (
        <div className="profile-info-dropdown">
          <h3 className="profile-name-compact">{empleadoInfo.nombre || 'Sin nombre'}</h3>
          
          <div className="profile-info-grid-compact">
            <div className="profile-info-item-compact">
              <i className="bi bi-card-text"></i>
              <div className="profile-info-content">
                <span className="profile-info-label">Cédula</span>
                <span className="profile-info-value">{empleadoInfo.document_number || 'N/A'}</span>
              </div>
            </div>

            <div className="profile-info-item-compact">
              <i className="bi bi-briefcase"></i>
              <div className="profile-info-content">
                <span className="profile-info-label">Cargo</span>
                <span className="profile-info-value">
                  {empleadoInfo.custom_attributes?.['Cargo General'] || empleadoInfo.cargo || 'N/A'}
                </span>
              </div>
            </div>

            <div className="profile-info-item-compact">
              <i className="bi bi-building"></i>
              <div className="profile-info-content">
                <span className="profile-info-label">Departamento</span>
                <span className="profile-info-value">{empleadoInfo.area_nombre || 'N/A'}</span>
              </div>
            </div>
          </div>

          {onLogout && (
            <button className="profile-logout-button" onClick={onLogout}>
              <i className="bi bi-box-arrow-right"></i>
              <span>Cerrar Sesión</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileCard;
