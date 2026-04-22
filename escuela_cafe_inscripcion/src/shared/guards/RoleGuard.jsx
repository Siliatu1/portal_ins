import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * RoleGuard - Componente para proteger rutas basadas en roles
 * @param {Object} props
 * @param {Object} props.userData - Datos del usuario autenticado
 * @param {Array<string>} props.allowedRoles - Lista de roles permitidos
 * @param {React.Component} props.children - Componente hijo a renderizar si tiene permiso
 * @param {string} props.redirectTo - Ruta a la que redirigir si no tiene permiso (default: /menu)
 */
const RoleGuard = ({ userData, allowedRoles, children, redirectTo = '/menu' }) => {
  const cargoUsuario = userData?.data?.cargo_general || 
    userData?.cargo_general || 
    userData?.cargo || '';

  const tieneAcceso = allowedRoles.includes(cargoUsuario);

  if (!tieneAcceso) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default RoleGuard;
