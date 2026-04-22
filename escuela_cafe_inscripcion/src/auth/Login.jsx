import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [documento, setDocumento] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });

  const handleLogin = async () => {
    if (!documento.trim()) {
      setMensaje({ texto: "Por favor ingrese su número de documento", tipo: "error" });
      return;
    }

    setLoading(true);
    setMensaje({ texto: "", tipo: "" });
    
    try {
      const response = await fetch(
        `https://apialohav2.crepesywaffles.com/buk/empleados2/${documento}`
      );

      if (response.ok) {
        const data = await response.json();
        setMensaje({ texto: "Documento validado correctamente", tipo: "success" });

        setTimeout(() => {
          onLogin(data);
          
          // Determinar a dónde redirigir basado en el documento
          const documentoUsuario = data?.data?.documento || data?.data?.document_number || data?.documento || '';
          
          // Documentos autorizados para PanelToderas (instructoras de evaluación todera)
          const documentosToderas = [
            '30386710', '52395525', '52422155', '52525496', '1020758053',
            '1077845053', '39276283', '35416150', '22797275', '49792488',
            '52701678', '28549413', '1019005012', '49606652', '53075347',
            '1079605138', '21032351', '52439552', '52962339', '1116547316',
            '23876197', '66681589', '52799048', '1075538331', '49776128',
            '37550615', '37339972', '1019073170'
          ];
          
          // Documento autorizado para AsistenciaPanel (Escuela del Café)
          const documentoAsistencia = '35512822';
          
          // Si es una instructora de evaluación todera
          if (documentosToderas.includes(String(documentoUsuario).trim())) {
            navigate('/portal/lineas-producto/panel-toderas');
          }
          // Si es el encargado de asistencia Escuela del Café
          else if (String(documentoUsuario).trim() === documentoAsistencia) {
            navigate('/portal/lineas-producto/asistencia');
          }
          // Para todos los demás, ir al menú principal
          else {
            navigate('/menu');
          }
        }, 1500);
        
      } else {
        setMensaje({ 
          texto: `Documento no autorizado (Error ${response.status})`, 
          tipo: "error" 
        });
      }
    } catch (error) {
      setMensaje({ texto: "Error de conexión al validar el documento", tipo: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="login-container">
      <div className="decoration-circle circle-1"></div>
      <div className="decoration-circle circle-2"></div>
      <div className="decoration-circle circle-3"></div>
      
      <div className="login-card">
        <p className="login-subtitle">PORTAL CREPES & WAFFLES</p>
        
        <div className="login-form">
          <label className="login-label">NÚMERO DE DOCUMENTO</label>
          <div className="input-wrapper">
            <input
              type="text"
              placeholder="Ingresa tu documento"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              onKeyPress={handleKeyPress}
              className="login-input"
            />
            <span className="input-icon"> </span>
          </div>
          
          {mensaje.texto && (
            <div className={`mensaje ${mensaje.tipo}`}>
              {mensaje.texto}
            </div>
          )}
          
          <button
            className="login-button"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "VALIDANDO..." : "INGRESAR"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
