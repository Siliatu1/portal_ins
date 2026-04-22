import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute - Componente para proteger rutas que requieren autenticación
 * @param {Object} props
 * @param {boolean} props.isAuthenticated - Estado de autenticación
 * @param {React.Component} props.children - Componente hijo a renderizar si está autenticado
 */
const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
