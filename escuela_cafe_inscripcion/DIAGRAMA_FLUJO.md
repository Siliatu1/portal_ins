# Diagrama de Flujo del Portal

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PORTAL CREPES & WAFFLES                          │
│                     Portal Multi-Módulo Unificado                       │
└─────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼
                    ╔═══════════════════════════════╗
                    ║     /auth/login (LOGIN)       ║
                    ║  Validación por Documento     ║
                    ╚═══════════════════════════════╝
                                    │
                    ┌───────────────┴───────────────┐
                    │    Login Exitoso              │
                    │    Guardar userData           │
                    └───────────────┬───────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        │ Documento Especial        │ Usuario General          │
        │ (Toderas/Asistencia)      │                          │
        │                           │                          │
        ▼                           ▼                          │
   Panel Específico       ╔═══════════════════╗               │
   (Sin pasar por menú)   ║   /menu (MENÚ)    ║◄──────────────┘
                          ║  Menú Principal    ║
                          ╚═══════════════════╝
                                    │
                ┌───────────────────┴───────────────────┐
                │                                       │
                ▼                                       ▼
    ╔═══════════════════════════╗        ╔═══════════════════════════╗
    ║ Portal Líneas de Producto ║        ║ Portal Horarios          ║
    ║                           ║        ║ Instructoras              ║
    ║ Acceso: TODOS             ║        ║ Acceso: Por ROL          ║
    ╚═══════════════════════════╝        ╚═══════════════════════════╝
                │                                       │
                │                        ┌──────────────┴──────────────┐
                │                        │                             │
                ▼                        ▼                             ▼
    ┌───────────────────────┐  ┌───────────────────┐    ┌──────────────────────┐
    │ /portal/lineas-       │  │ Vista Instructor  │    │ Vista Administrativa │
    │ producto              │  │ /instructor       │    │ /admin               │
    │                       │  │                   │    │                      │
    │ • Panel Admin         │  │ Rol: INSTRUCTOR   │    │ Roles:               │
    │ • Panel Asistencia    │  │                   │    │ • JEFE DESARROLLO    │
    │ • Panel Toderas       │  │ • Dashboard       │    │ • DIRECTORA LINEAS   │
    │ • Formularios         │  │ • Programación    │    │ • ANALISTA PRODUCTO  │
    │ • Evaluaciones        │  │ • Historial       │    │                      │
    └───────────────────────┘  └───────────────────┘    │ • Vista Consolidada  │
                │                        │                │ • Filtros Avanzados  │
                │                        │                │ • Reportes Excel/PDF │
                │                        │                └──────────────────────┘
                │                        │                             │
                └────────────────────────┴─────────────────────────────┘
                                         │
                                         ▼
                                  ┌─────────────┐
                                  │   LOGOUT    │
                                  │ Limpiar     │
                                  │ Sesión      │
                                  └──────┬──────┘
                                         │
                                         ▼
                                  Volver a Login
```

## Protección de Rutas

```
┌────────────────────────────────────────────────────────────┐
│ RUTA                                   │ PROTECCIÓN         │
├────────────────────────────────────────┼────────────────────┤
│ /auth/login                            │ Pública            │
│ /menu                                  │ ProtectedRoute     │
│ /portal/lineas-producto                │ ProtectedRoute     │
│ /portal/horarios-instructoras/...      │ ProtectedRoute +   │
│                                        │ RoleGuard          │
└────────────────────────────────────────────────────────────┘
```

## Matriz de Accesos por Rol

```
╔══════════════════════════════════════════════════════════════════════════╗
║ ROL                          │ Líneas Producto │ Horarios Vista │ Admin   ║
║                              │                 │ Instructor     │ Vista   ║
╠══════════════════════════════╪═════════════════╪════════════════╪═════════╣
║ INSTRUCTOR                   │       ✓         │       ✓        │    ✗    ║
║ JEFE DESARROLLO PRODUCTO     │       ✓         │       ✗        │    ✓    ║
║ DIRECTORA LINEAS PRODUCTO    │       ✓         │       ✗        │    ✓    ║
║ ANALISTA DE PRODUCTO         │       ✓         │       ✗        │    ✓    ║
║ COORDINADOR PUNTO VENTA      │       ✓         │       ✗        │    ✗    ║
║ OTROS ROLES                  │       ✓         │       ✗        │    ✗    ║
╚══════════════════════════════════════════════════════════════════════════╝
```

## Arquitectura de Componentes

```
                         App.jsx (Router Principal)
                                │
                                │ BrowserRouter
                                │
                ┌───────────────┴────────────────┐
                │                                │
          React Router                     Estado Global
          (Routes)                         (userData, isAuthenticated)
                │                                │
    ┌───────────┴──────────┐                   │
    │                      │                   │
    │  ProtectedRoute      │                   │
    │  (Auth Check)        │                   │
    │        │             │                   │
    │        ▼             │                   │
    │   RoleGuard          │                   │
    │   (Role Check)       │◄──────────────────┘
    │        │             │   Recibe userData
    │        ▼             │
    │   Components         │
    │   (Portales)         │
    └──────────────────────┘
```

## Flujo de Datos

```
    Usuario Ingresa Documento
            │
            ▼
    API Validación (BUK)
            │
            ├─► userData → localStorage
            │                  │
            └─► userData → React State (App.jsx)
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
              MainMenu            Portal Components
              (Muestra            (Reciben userData
              según rol)          como prop)
```

## Sistema de Navegación

```
useNavigate (React Router)
        │
        ├─► navigate('/menu')              → Menú Principal
        ├─► navigate('/auth/login')        → Login
        ├─► navigate('/portal/...')        → Portales
        └─► navigate(-1)                   → Volver Atrás
```

## Estados de Autenticación

```
┌─────────────────────────────────────────────────────┐
│ Estado          │ localStorage │ React State │ Ruta │
├─────────────────┼──────────────┼─────────────┼──────┤
│ No Autenticado  │ null         │ false       │/login│
│ Autenticado     │ userData     │ true        │/menu │
│ Logout          │ null         │ false       │/login│
│ Reload Página   │ userData     │ ✓Restaura   │Mismo │
└─────────────────────────────────────────────────────┘
```

## Ventajas de la Nueva Arquitectura

1. **Escalabilidad** ✓
   - Agregar nuevos portales sin modificar existentes
   - Cada portal es independiente

2. **Seguridad** ✓
   - Control de acceso centralizado
   - Validación por roles en cada ruta

3. **Mantenibilidad** ✓
   - Código organizado por módulos
   - Separación de responsabilidades

4. **Experiencia de Usuario** ✓
   - Navegación intuitiva
   - Persistencia de sesión
   - Menú centralizado

5. **Reutilización** ✓
   - Componentes compartidos (Guards, Menu)
   - Lógica de autenticación única
