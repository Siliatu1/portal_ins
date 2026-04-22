import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Auth
import Login from './auth/Login';

// Shared Components
import MainMenu from './shared/components/MainMenu';
import ProtectedRoute from './shared/components/ProtectedRoute';
import RoleGuard from './shared/guards/RoleGuard';

// Portal Líneas de Producto
import AdminPanel from './portales/lineas-producto/components/AdminPanel';
import AsistenciaPanel from './portales/lineas-producto/components/AsistenciaPanel';
import PanelToderas from './portales/lineas-producto/components/PanelToderas';

// Portal Horarios Instructoras
import Dashboard from './portales/horarios-instructoras/components/Dashboard';
import ProgramacionHorarios from './portales/horarios-instructoras/components/ProgramacionHorarios';
import VistaAdministrativa from './portales/horarios-instructoras/components/VistaAdministrativa';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);

  // Verificar sesión al cargar
  useEffect(() => {
    const savedUserData = localStorage.getItem('userData');
    if (savedUserData) {
      try {
        const parsedData = JSON.parse(savedUserData);
        setUserData(parsedData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error al cargar datos de sesión:', error);
        localStorage.removeItem('userData');
      }
    }
  }, []);

  const handleLogin = (data) => {
    setUserData(data);
    setIsAuthenticated(true);
    localStorage.setItem('userData', JSON.stringify(data));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserData(null);
    localStorage.removeItem('userData');
  };

  // Roles permitidos para acceso a horarios
  const rolesHorariosAdmin = [
    'JEFE DESARROLLO DE PRODUCTO',
    'DIRECTORA DE LINEAS DE PRODUCTO',
    'ANALISTA DE PRODUCTO'
  ];

  const rolesHorariosInstructor = ['INSTRUCTOR'];

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Ruta de Login */}
          <Route 
            path="/auth/login" 
            element={
              isAuthenticated ? <Navigate to="/menu" replace /> : <Login onLogin={handleLogin} />
            } 
          />

          {/* Menú Principal */}
          <Route 
            path="/menu" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MainMenu userData={userData} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />

          {/* Portal Líneas de Producto */}
          <Route 
            path="/portal/lineas-producto" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AdminPanel userData={userData} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/portal/lineas-producto/asistencia" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AsistenciaPanel userData={userData} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/portal/lineas-producto/panel-toderas" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <PanelToderas userData={userData} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />

          {/* Portal Horarios Instructoras - Vista Administrativa */}
          <Route 
            path="/portal/horarios-instructoras/admin" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <RoleGuard 
                  userData={userData} 
                  allowedRoles={rolesHorariosAdmin}
                  redirectTo="/menu"
                >
                  <VistaAdministrativa userData={userData} onLogout={handleLogout} />
                </RoleGuard>
              </ProtectedRoute>
            } 
          />

          {/* Portal Horarios Instructoras - Vista Instructor */}
          <Route 
            path="/portal/horarios-instructoras/instructor" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <RoleGuard 
                  userData={userData} 
                  allowedRoles={rolesHorariosInstructor}
                  redirectTo="/menu"
                >
                  <Dashboard userData={userData} onLogout={handleLogout} />
                </RoleGuard>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/portal/horarios-instructoras/instructor/programacion" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <RoleGuard 
                  userData={userData} 
                  allowedRoles={rolesHorariosInstructor}
                  redirectTo="/menu"
                >
                  <ProgramacionHorarios userData={userData} onLogout={handleLogout} />
                </RoleGuard>
              </ProtectedRoute>
            } 
          />

          {/* Ruta por defecto */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? <Navigate to="/menu" replace /> : <Navigate to="/auth/login" replace />
            } 
          />

          {/* Ruta 404 */}
          <Route 
            path="*" 
            element={
              isAuthenticated ? <Navigate to="/menu" replace /> : <Navigate to="/auth/login" replace />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App
