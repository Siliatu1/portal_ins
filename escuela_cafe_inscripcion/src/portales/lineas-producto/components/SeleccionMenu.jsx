import React from "react";
import "./seleccion_menu.css";
import "bootstrap-icons/font/bootstrap-icons.css";

const SeleccionMenu = ({
  onSelectEscuelaCafe,
  onSelectEvaluacionToderas,
  onViewPanel,
  onBack,
  nombreUsuario,
}) => {
  return (
    <div className="seleccion-menu-container">
      <div className="seleccion-menu-header">
        <div className="header-actions-sm">
          {onViewPanel && (
            <button className="panel-button-sm" onClick={onViewPanel}>
              <i className="bi bi-person-circle"></i> VER MI PANEL
            </button>
          )}
          <button className="back-button-sm" onClick={onBack}>
            <i className="bi bi-box-arrow-left"></i> CERRAR SESIÓN
          </button>
        </div>
        <p className="welcome-text">BIENVENIDA DE VUELTA</p>
        <h1 className="user-name">¡Hola, {nombreUsuario}!</h1>
        <p className="subtitle-text">Selecciona qué deseas registrar hoy</p>
        <div className="divider-line"></div>
      </div>

      <div className="cards-container-sm">
        <div className="menu-card-sm escuela-cafe">
          <div className="card-icon-wrapper green-bg">
           <i className="bi bi-cup-hot"></i>
          </div>
          <h3 className="card-title-sm">Escuela Café</h3>
          <p className="card-description-sm">
            Registra y gestiona las formaciones.
          </p>
          <button className="btn-ingresar" onClick={onSelectEscuelaCafe}>
            REGISTRAR <i className="bi bi-arrow-right"></i>
          </button>
        </div>

        <div className="menu-card-sm evaluacion-toderas">
          <div className="card-icon-wrapper orange-bg">
            <i className="bi bi-book"></i>
          </div>
          <h3 className="card-title-sm">Evaluación Toderas</h3>

          <p className="card-description-sm">
            Registra evaluaciones y seguimiento del desempeño de las Toderas.
          </p>
          <button className="btn-ingresar" onClick={onSelectEvaluacionToderas}>
            REGISTRAR <i className="bi bi-arrow-right"></i>
          </button>
        </div> 
      </div>
    </div>
  );
};

export default SeleccionMenu;
