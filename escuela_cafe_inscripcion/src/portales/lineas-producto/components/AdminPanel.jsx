import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./admin_panel.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import FormularioInscripcion from "./FormularioInscripcion";
import FormularioPuntoVenta from "./FormularioPuntoVenta";
import SeleccionMenu from "./SeleccionMenu";
import EvaluacionTodera from "./EvaluacionTodera";
import ProfileCard from "./ProfileCard";
import { Table, Input, Button, Space, message, Popconfirm, Select, Modal, Switch, Tag, Tooltip } from "antd";
import { SearchOutlined, DownloadOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const AdminPanel = ({ userData, onLogout }) => {
  const navigate = useNavigate();
  const strapiToken = import.meta.env.VITE_STRAPI_TOKEN;
  const cargoUsuarioInicial = userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '';
  const rolesPuntoVentaCheck = [
    'ADMINISTRADORA PUNTO DE VENTA',
    'COORDINADOR PUNTO DE VENTA',
    'COORDINADOR PUNTO DE VENTA (FDS)',
    'GERENTE PUNTO DE VENTA'
  ];
  const vistaInicial = rolesPuntoVentaCheck.includes(cargoUsuarioInicial) ? "seleccion_menu" : "panel";
  
  const [showFormulario, setShowFormulario] = useState(false);
  const [tipoFormulario, setTipoFormulario] = useState(""); 
  const [vistaActual, setVistaActual] = useState(vistaInicial); 
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    cedula: '',
    puntoVenta: '',
    fecha: ''
  });
  const [dataFiltrada, setDataFiltrada] = useState([]);
  const [inscripcionesTodera, setInscripcionesTodera] = useState([]);
  const [loadingTodera, setLoadingTodera] = useState(false);
  const [filtrosTodera, setFiltrosTodera] = useState({
    cedula: '',
    puntoVenta: '',
    fecha: '',
    instructora: ''
  });
  const [dataFiltradaTodera, setDataFiltradaTodera] = useState([]);
  const [tabActivo, setTabActivo] = useState('todos');
  const [seccionActiva, setSeccionActiva] = useState('escuela_cafe'); // 'escuela_cafe' o 'evaluacion_todera'
  const [modalPuntosVentaVisible, setModalPuntosVentaVisible] = useState(false);
  const [gestionInstructoras, setGestionInstructoras] = useState([]);
  const [dataFiltradaGestionInstructoras, setDataFiltradaGestionInstructoras] = useState([]);
  const [loadingGestionInstructoras, setLoadingGestionInstructoras] = useState(false);
  const [instructorasDisponibles, setInstructorasDisponibles] = useState([]);
  const [loadingInstructorasDisponibles, setLoadingInstructorasDisponibles] = useState(false);
  const [instructorasFiltradas, setInstructorasFiltradas] = useState([]);
  const [loadingInstructorasFiltradas, setLoadingInstructorasFiltradas] = useState(false);
  const [modalGestionVisible, setModalGestionVisible] = useState(false);
  const [modalNuevaInstructoraVisible, setModalNuevaInstructoraVisible] = useState(false);
  const [loadingNuevaInstructora, setLoadingNuevaInstructora] = useState(false);
  const [formGestion, setFormGestion] = useState({
    pdvId: '',
    categoria: '',
    instructoraId: ''
  });
  const [formNuevaInstructora, setFormNuevaInstructora] = useState({
    documento: '',
    nombre: '',
    telefono: '',
    correo: '',
    sal: false,
    dulce: false,
    bebidas: false,
    brunch: false,
    habilitado: true
  });
  const [filtrosGestionInstructoras, setFiltrosGestionInstructoras] = useState({
    puntoVenta: '',
    categoria: ''
  });
  const [fotosCache, setFotosCache] = useState({});


  const nombreUsuario = userData?.data?.nombre || 
    userData?.data?.name ||
    (userData?.data?.first_name && userData?.data?.last_name 
      ? `${userData.data.first_name} ${userData.data.last_name}`.trim()
      : userData?.data?.full_name || '');

  const rolesHeladeria = [
    'COORDINADORA HELADERIA',
    'COORDINADOR DE ZONA',
    'COORDINADOR (A) HELADERIA PRINCIPAL'
  ];

  const rolesPuntoVenta = [
    'ADMINISTRADORA PUNTO DE VENTA',
    'COORDINADOR PUNTO DE VENTA',
    'COORDINADOR PUNTO DE VENTA (FDS)',
    'GERENTE PUNTO DE VENTA'
  ];

  
  const rolesVerTodo = [
    'ANALISTA EVENTOS Y HELADERIAS',
    'JEFE OPERATIVO DE MERCADEO',
    'JEFE DESARROLLO DE PRODUCTO',
    'DIRECTORA DE LINEAS DE PRODUCTO',
    'ANALISTA DE PRODUCTO',
  ];


  const rolesVerAmbasTablas = [
    'ADMINISTRADORA PUNTO DE VENTA',
    'COORDINADOR PUNTO DE VENTA',
    'COORDINADOR PUNTO DE VENTA (FDS)',
    'GERENTE PUNTO DE VENTA',
    'JEFE OPERATIVO DE MERCADEO',
    'JEFE DESARROLLO DE PRODUCTO',
    'DIRECTORA DE LINEAS DE PRODUCTO',
    'ANALISTA DE PRODUCTO',
    'INSTRUCTOR'
  ];

  
  const rolesAccesoDual = [
    'JEFE DESARROLLO DE PRODUCTO',
    'DIRECTORA DE LINEAS DE PRODUCTO',
    'ANALISTA DE PRODUCTO',
  ];


  const cargosRestringidos = [
    'ADMINISTRADORA PUNTO DE VENTA',
    'COORDINADOR (A) HELADERIA PRINCIPAL',
    'COORDINADOR PUNTO DE VENTA',
    'COORDINADOR PUNTO DE VENTA (FDS)',
    'GERENTE PUNTO DE VENTA',
    'COORDINADORA HELADERIA',
    'COORDINADOR DE ZONA'
  ];

 
  const puedeEliminar = () => {
    if (!userData) return false;
    const cargoUsuario = userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '';
    return !cargosRestringidos.includes(cargoUsuario);
  };

  const getStrapiJsonHeaders = () => {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (strapiToken) {
      headers.Authorization = `Bearer ${strapiToken}`;
    }

    return headers;
  };


  /**
   * Carga las inscripciones de Escuela del Café desde la API
   * Filtra los datos según el rol del usuario:
   * - Roles administrativos ven todas las inscripciones
   * - Roles de heladería/punto de venta ven solo su PDV
   */
  const cargarInscripciones = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://macfer.crepesywaffles.com/api/cap-cafes');
      if (response.ok) {
        const result = await response.json();


        let dataArray = [];
        if (result && Array.isArray(result.data)) {

          dataArray = result.data.map(item => {
            const mapped = {
              id: item.id,
              cedula: item.attributes?.documento || '',
              nombres: item.attributes?.nombre || '',
              telefono: item.attributes?.telefono || '',
              cargo: item.attributes?.cargo || '',
              puntoVenta: item.attributes?.pdv || '',
              dia: item.attributes?.fecha || '',
              coordinadora: item.attributes?.coordinadora || '',
              nombreLider: item.attributes?.lider || '',
              tipoFormulario: item.attributes?.tipo_formulario || '',
              asistencia: item.attributes?.confirmado ?? null
            };
            return mapped;
          });
        }
        
        const cargoUsuario = userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '';
        const puntoVentaUsuario = userData?.data?.area_nombre || userData?.area_nombre || '';
        let dataFiltradaPorRol = dataArray;
        

        if (rolesVerTodo.includes(cargoUsuario)) {
          dataFiltradaPorRol = dataArray;
        } 

        else if (rolesHeladeria.includes(cargoUsuario) || rolesPuntoVenta.includes(cargoUsuario)) {
          dataFiltradaPorRol = dataArray.filter(item => {
            const pdvItem = item.puntoVenta || '';
            const coincide = pdvItem === puntoVentaUsuario;
            return coincide;
          });
        }

        else {
          dataFiltradaPorRol = dataArray;
        }
        

        setInscripciones(dataFiltradaPorRol);
        setDataFiltrada(dataFiltradaPorRol);
      } else {

        setInscripciones([]);
        setDataFiltrada([]);
      }
    } catch (error) {

      setInscripciones([]);
      setDataFiltrada([]);
    } finally {
      setLoading(false);
    }
  };


  /**
   * Carga las evaluaciones de toderas desde la API
   * Aplica los mismos filtros de permisos que cargarInscripciones
   */
  const cargarInscripcionesTodera = async () => {
    setLoadingTodera(true);
    try {
      const response = await fetch('https://macfer.crepesywaffles.com/api/cap-toderas');
      if (response.ok) {
        const result = await response.json();
        let dataArray = [];
        if (result && Array.isArray(result.data)) {
          dataArray = result.data.map(item => ({
            id: item.id,
            cedula: item.attributes?.documento || '',
            nombres: item.attributes?.nombre || item.attributes?.Nombre || '',
            telefono: item.attributes?.telefono || '',
            cargo: item.attributes?.cargo || '',
            cargoEvaluar: item.attributes?.cargo_evaluar || item.attributes?.cargoEvaluar || '',
            puntoVenta: item.attributes?.pdv || '',
            dia: item.attributes?.fecha || '',
            nombreLider: item.attributes?.lider || '',
            categoria: item.attributes?.categoria || '',
            evaluado: item.attributes?.estado ?? null,
            observacion: item.attributes?.observacion || '',
          }));
        }

        const cargoUsuario = userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '';
        const puntoVentaUsuario = userData?.data?.area_nombre || userData?.area_nombre || '';
        let dataFiltradaPorRol = dataArray;

        if (rolesVerTodo.includes(cargoUsuario)) {
          dataFiltradaPorRol = dataArray;
        } else if (rolesHeladeria.includes(cargoUsuario) || rolesPuntoVenta.includes(cargoUsuario)) {
          dataFiltradaPorRol = dataArray.filter(item => {
            const pdvItem = item.puntoVenta || '';
            return pdvItem === puntoVentaUsuario;
          });
        } else {
          dataFiltradaPorRol = dataArray;
        }

        setInscripcionesTodera(dataFiltradaPorRol);
        setDataFiltradaTodera(dataFiltradaPorRol);
      } else {
        setInscripcionesTodera([]);
        setDataFiltradaTodera([]);
      }
    } catch (error) {
      setInscripcionesTodera([]);
      setDataFiltradaTodera([]);
    } finally {
      setLoadingTodera(false);
    }
  };

  useEffect(() => {
    if (vistaActual === "panel") {
      cargarInscripciones();
      const cargoUsuario = userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '';
      if (rolesVerAmbasTablas.includes(cargoUsuario)) {
        cargarInscripcionesTodera();
      }
      if (rolesAccesoDual.includes(cargoUsuario)) {
        cargarGestionInstructoras();
        cargarInstructorasDisponibles();
      }
    }
  }, [vistaActual]);

  // Función para cargar foto de empleado desde API de BUK
  const cargarFotoEmpleado = async (cedula) => {
    if (!cedula || fotosCache[cedula]) return fotosCache[cedula];
    
    try {
      const response = await fetch(`https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${cedula}`);
      if (response.ok) {
        const data = await response.json();
        const empleados = data?.data || data;
        const empleado = Array.isArray(empleados) 
          ? empleados.find(emp => String(emp.document_number) === String(cedula))
          : null;
        
        const foto = empleado?.foto || '';
        setFotosCache(prev => ({ ...prev, [cedula]: foto }));
        return foto;
      }
    } catch (error) {
      console.error('Error al cargar foto:', error);
    }
    return '';
  };

  // Cargar fotos cuando cambien los datos
  useEffect(() => {
    dataFiltrada.forEach(item => {
      if (item.cedula && !fotosCache[item.cedula]) {
        cargarFotoEmpleado(item.cedula);
      }
    });
  }, [dataFiltrada]);

  useEffect(() => {
    dataFiltradaTodera.forEach(item => {
      if (item.cedula && !fotosCache[item.cedula]) {
        cargarFotoEmpleado(item.cedula);
      }
    });
  }, [dataFiltradaTodera]);

  const handleRegistrarPersona = () => {
   
    const cargoUsuario = userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '';
    

    
    if (rolesHeladeria.includes(cargoUsuario)) {

      setTipoFormulario("heladeria");
      setVistaActual("formulario");
      setShowFormulario(true);
    } else if (rolesPuntoVenta.includes(cargoUsuario)) {

      setVistaActual("seleccion_menu");
    } else {


      setTipoFormulario("heladeria");
      setVistaActual("formulario");
      setShowFormulario(true);
    }
  };

  const handleAbrirFormularioPuntoVenta = () => {
    setTipoFormulario("punto_venta");
    setVistaActual("formulario");
    setShowFormulario(true);
  };


  const handleAbrirFormularioEscuelaCafe = () => {
    setTipoFormulario("heladeria");
    setVistaActual("formulario");
    setShowFormulario(true);
  };

  const handleAbrirFormularioEvaluacionTodera = () => {
    setTipoFormulario("evaluacion_todera");
    setVistaActual("formulario");
    setShowFormulario(true);
  };

  const handleVolverDesdeSeleccion = () => {
    const cargoUsuario = userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '';
    if (rolesPuntoVenta.includes(cargoUsuario)) {
      // Para roles de punto de venta, volver al menú de selección es cerrar sesión
      onLogout();
    } else {
      setVistaActual("panel");
    }
  };

  const handleVerMiPanel = () => {
    setVistaActual("panel");
  };


  const tieneAccesoDual = () => {
    const cargoUsuario = userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '';
    return rolesAccesoDual.includes(cargoUsuario);
  };

  const handleVolverPanel = () => {
    setShowFormulario(false);
    setTipoFormulario("");
    const cargoUsuario = userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '';
    // Si es un rol de punto de venta, volver al menú de selección
    if (rolesPuntoVenta.includes(cargoUsuario)) {
      setVistaActual("seleccion_menu");
    } else {
      setVistaActual("panel");
    }
  };

  const handleSubmitInscripcion = (data) => {

    
   
    if (data && data.success) {
      setShowFormulario(false);
      // Después de inscribir, mostrar el panel para todos
      setVistaActual("panel");

      setTimeout(() => {
        cargarInscripciones();
      }, 500);
    }
  };


  const aplicarFiltros = () => {
    let dataTemp = [...inscripciones];

    // Filtrar por tab activo
    if (tabActivo === 'hel') {
      dataTemp = dataTemp.filter(item => item.tipoFormulario === 'heladeria');
    } else if (tabActivo === 'pdv') {
      dataTemp = dataTemp.filter(item => item.tipoFormulario === 'punto_venta');
    }

    if (filtros.cedula) {
      dataTemp = dataTemp.filter(item => 
        item.cedula && item.cedula.toString().includes(filtros.cedula)
      );
    }

    if (filtros.puntoVenta) {
      dataTemp = dataTemp.filter(item => 
        item.puntoVenta && item.puntoVenta.toLowerCase().includes(filtros.puntoVenta.toLowerCase())
      );
    }

    if (filtros.fecha) {
      dataTemp = dataTemp.filter(item => 
        item.dia && item.dia === filtros.fecha
      );
    }

    setDataFiltrada(dataTemp);
  };


  useEffect(() => {
    aplicarFiltros();
  }, [filtros, inscripciones, tabActivo]);


  const limpiarFiltros = () => {
    setFiltros({ cedula: '', puntoVenta: '', fecha: '' });
  };

  // Aplicar filtros todera
  const aplicarFiltrosTodera = () => {
    let dataTemp = [...inscripcionesTodera];

    if (filtrosTodera.cedula) {
      dataTemp = dataTemp.filter(item => 
        item.cedula && item.cedula.toString().includes(filtrosTodera.cedula)
      );
    }

    if (filtrosTodera.puntoVenta) {
      dataTemp = dataTemp.filter(item => 
        item.puntoVenta && item.puntoVenta.toLowerCase().includes(filtrosTodera.puntoVenta.toLowerCase())
      );
    }

    if (filtrosTodera.fecha) {
      dataTemp = dataTemp.filter(item => 
        item.dia && item.dia === filtrosTodera.fecha
      );
    }

    if (filtrosTodera.instructora) {
      dataTemp = dataTemp.filter(item => 
        item.nombreLider && item.nombreLider.toLowerCase().includes(filtrosTodera.instructora.toLowerCase())
      );
    }

    setDataFiltradaTodera(dataTemp);
  };

  useEffect(() => {
    aplicarFiltrosTodera();
  }, [filtrosTodera, inscripcionesTodera]);

  const limpiarFiltrosTodera = () => {
    setFiltrosTodera({ cedula: '', puntoVenta: '', fecha: '', instructora: '' });
  };

  const obtenerCategoriasInstructora = (atributos = {}) => {
    const categorias = [];
    if (atributos.sal === true) categorias.push('SAL');
    if (atributos.dulce === true) categorias.push('DULCE');
    if (atributos.bebidas === true) categorias.push('BEBIDAS');
    return categorias;
  };

  const cargarGestionInstructoras = async () => {
    setLoadingGestionInstructoras(true);
    try {
      let response = await fetch('https://macfer.crepesywaffles.com/api/cap-pdvs?populate=cap_instructoras');
      if (!response.ok) {
        response = await fetch('https://macfer.crepesywaffles.com/api/cap-pdvs?populate=*');
      }

      if (!response.ok) {
        throw new Error('No fue posible cargar puntos de venta');
      }

      const result = await response.json();
      const data = Array.isArray(result?.data) ? result.data : [];
      const filas = [];

      data.forEach((pdvItem) => {
        const pdvId = pdvItem?.id;
        const pdvNombre = pdvItem?.attributes?.nombre || '';
        const instructoras = pdvItem?.attributes?.cap_instructoras?.data || [];

        const categoriaMap = {
          sal: null,
          dulce: null,
          bebidas: null,
          brunch: null
        };

        instructoras.forEach((insItem) => {
          const attrs = insItem?.attributes || {};
          const nombreInstructora = attrs?.Nombre || attrs?.nombre || 'Sin nombre';
          const instructoraId = insItem.id;

          if (attrs.sal === true) {
            categoriaMap.sal = { instructoraId, instructoraNombre: nombreInstructora };
          }
          if (attrs.dulce === true) {
            categoriaMap.dulce = { instructoraId, instructoraNombre: nombreInstructora };
          }
          if (attrs.bebidas === true) {
            categoriaMap.bebidas = { instructoraId, instructoraNombre: nombreInstructora };
          }
          if (attrs.brunch === true || attrs.Brunch === true) {
            categoriaMap.brunch = { instructoraId, instructoraNombre: nombreInstructora };
          }
        });

        filas.push({
          key: `${pdvId}`,
          pdvId,
          puntoVenta: pdvNombre,
          sal: categoriaMap.sal,
          dulce: categoriaMap.dulce,
          bebidas: categoriaMap.bebidas,
          brunch: categoriaMap.brunch,
          instructorasIds: instructoras.map(i => i.id)
        });
      });

      setGestionInstructoras(filas);
      setDataFiltradaGestionInstructoras(filas);
    } catch (error) {
      message.error('Error al cargar gestión de instructoras');
      setGestionInstructoras([]);
      setDataFiltradaGestionInstructoras([]);
    } finally {
      setLoadingGestionInstructoras(false);
    }
  };

  const cargarInstructorasDisponibles = async () => {
    setLoadingInstructorasDisponibles(true);
    try {
      const response = await fetch('https://macfer.crepesywaffles.com/api/cap-instructoras');
      if (!response.ok) {
        throw new Error('No fue posible cargar instructoras');
      }

      const result = await response.json();
      const data = Array.isArray(result?.data) ? result.data : [];
      const instructoras = data.map((item) => ({
        id: item.id,
        nombre: item?.attributes?.Nombre || item?.attributes?.nombre || `Instructora ${item.id}`,
        habilitado: item?.attributes?.habilitado !== false
      }));
      setInstructorasDisponibles(instructoras);
    } catch (error) {
      message.error('Error al cargar la lista de instructoras');
      setInstructorasDisponibles([]);
    } finally {
      setLoadingInstructorasDisponibles(false);
    }
  };

  const aplicarFiltrosGestionInstructoras = () => {
    let dataTemp = [...gestionInstructoras];

    if (filtrosGestionInstructoras.puntoVenta) {
      dataTemp = dataTemp.filter((item) => item.puntoVenta.toLowerCase().includes(filtrosGestionInstructoras.puntoVenta.toLowerCase()));
    }

    setDataFiltradaGestionInstructoras(dataTemp);
  };

  useEffect(() => {
    aplicarFiltrosGestionInstructoras();
  }, [filtrosGestionInstructoras, gestionInstructoras]);

  const limpiarFiltrosGestionInstructoras = () => {
    setFiltrosGestionInstructoras({ puntoVenta: '', categoria: '' });
  };

  const cargarInstructorasPorCategoria = async (categoria) => {
    if (!categoria) {
      setInstructorasFiltradas([]);
      return;
    }
    setLoadingInstructorasFiltradas(true);
    try {
      const campo = categoria.toLowerCase();
      const response = await fetch(
        `https://macfer.crepesywaffles.com/api/cap-instructoras?filters[${campo}][$eq]=true`
      );
      if (!response.ok) throw new Error('Error');
      const result = await response.json();
      const data = Array.isArray(result?.data) ? result.data : [];
      const instructoras = data.map((item) => ({
        id: item.id,
        nombre: item?.attributes?.Nombre || item?.attributes?.nombre || `Instructora ${item.id}`,
        habilitado: item?.attributes?.habilitado !== false
      }));
      setInstructorasFiltradas(instructoras);
    } catch (error) {
      setInstructorasFiltradas([]);
      message.error('Error al cargar instructoras por categoría');
    } finally {
      setLoadingInstructorasFiltradas(false);
    }
  };

  const abrirModalGestionInstructoras = (pdvId = '', categoria = '') => {
    setFormGestion({ pdvId: String(pdvId), categoria, instructoraId: '' });
    setInstructorasFiltradas([]);
    setModalGestionVisible(true);
    if (categoria) {
      cargarInstructorasPorCategoria(categoria);
    }
  };

  const resetFormNuevaInstructora = () => {
    setFormNuevaInstructora({
      documento: '',
      nombre: '',
      telefono: '',
      correo: '',
      sal: false,
      dulce: false,
      bebidas: false,
      brunch: false,
      habilitado: true
    });
  };

  const crearInstructora = async () => {
    const documento = formNuevaInstructora.documento.trim();
    const nombre = formNuevaInstructora.nombre.trim();
    const telefono = formNuevaInstructora.telefono.trim();
    const correo = formNuevaInstructora.correo.trim();
    const tieneCategoria = formNuevaInstructora.sal || formNuevaInstructora.dulce || formNuevaInstructora.bebidas || formNuevaInstructora.brunch;

    if (!documento) {
      message.warning('Ingresa el documento de la instructora');
      return;
    }

    if (!nombre) {
      message.warning('Ingresa el nombre de la instructora');
      return;
    }

    if (!telefono) {
      message.warning('Ingresa el telefono de la instructora');
      return;
    }

    if (!correo) {
      message.warning('Ingresa el correo de la instructora');
      return;
    }

    if (!tieneCategoria) {
      message.warning('Selecciona al menos una categoría');
      return;
    }

    setLoadingNuevaInstructora(true);
    try {
      const payload = {
        data: {
          documento,
          Nombre: nombre,
          telefono,
          correo,
          sal: formNuevaInstructora.sal,
          dulce: formNuevaInstructora.dulce,
          bebidas: formNuevaInstructora.bebidas,
          brunch: formNuevaInstructora.brunch,
          habilitado: formNuevaInstructora.habilitado
        }
      };

      const response = await fetch('https://macfer.crepesywaffles.com/api/cap-instructoras', {
        method: 'POST',
        headers: getStrapiJsonHeaders(),
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('La API no permite crear instructoras con este cliente. Debes habilitar el permiso Create en Strapi o configurar VITE_STRAPI_TOKEN.');
        }
        throw new Error(responseText || 'No fue posible crear la instructora');
      }

      message.success('Instructora creada exitosamente');
      setModalNuevaInstructoraVisible(false);
      resetFormNuevaInstructora();
      cargarInstructorasDisponibles();

      if (formGestion.categoria) {
        cargarInstructorasPorCategoria(formGestion.categoria);
      }
    } catch (error) {
      message.error(error?.message || 'Error al crear instructora');
    } finally {
      setLoadingNuevaInstructora(false);
    }
  };

  const agregarInstructoraAPuntoVenta = async () => {
    if (!formGestion.pdvId || !formGestion.instructoraId || !formGestion.categoria) {
      message.warning('Completa punto de venta, categoría e instructora');
      return;
    }

    try {
      const responsePdv = await fetch(`https://macfer.crepesywaffles.com/api/cap-pdvs/${formGestion.pdvId}?populate=cap_instructoras`);
      if (!responsePdv.ok) {
        throw new Error('No se pudo obtener el punto de venta seleccionado');
      }

      const pdvResult = await responsePdv.json();
      const instructorasActuales = pdvResult?.data?.attributes?.cap_instructoras?.data || [];
      const idsActuales = instructorasActuales.map((item) => item.id);
      const instructoraIdNumber = Number(formGestion.instructoraId);
      const idsActualizados = idsActuales.includes(instructoraIdNumber)
        ? idsActuales
        : [...idsActuales, instructoraIdNumber];

      const responseUpdatePdv = await fetch(`https://macfer.crepesywaffles.com/api/cap-pdvs/${formGestion.pdvId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            cap_instructoras: idsActualizados
          }
        })
      });

      if (!responseUpdatePdv.ok) {
        throw new Error('No fue posible asignar la instructora al punto de venta');
      }

      const responseUpdateInstructora = await fetch(`https://macfer.crepesywaffles.com/api/cap-instructoras/${instructoraIdNumber}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            [formGestion.categoria.toLowerCase()]: true
          }
        })
      });

      if (!responseUpdateInstructora.ok) {
        throw new Error('La instructora se asignó al PDV, pero no se pudo actualizar la categoría');
      }

      message.success('Instructora agregada exitosamente');
      setModalGestionVisible(false);
      cargarGestionInstructoras();
      cargarInstructorasDisponibles();
    } catch (error) {
      message.error(error?.message || 'Error al agregar instructora');
    }
  };

  const toggleInstructoraHabilitada = async (instructoraId, habilitado) => {
    if (!instructoraId) {
      message.warning('No hay instructora para actualizar en esta fila');
      return;
    }

    try {
      const response = await fetch(`https://macfer.crepesywaffles.com/api/cap-instructoras/${instructoraId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: { habilitado }
        })
      });

      if (!response.ok) {
        throw new Error('No fue posible actualizar el estado de la instructora');
      }

      message.success(`Instructora ${habilitado ? 'habilitada' : 'deshabilitada'} correctamente`);
      cargarGestionInstructoras();
      cargarInstructorasDisponibles();
    } catch (error) {
      message.error('Error al actualizar el estado');
    }
  };

  const eliminarInstructoraDePuntoVenta = async (pdvId, instructoraId) => {
    if (!pdvId || !instructoraId) {
      message.warning('No hay una instructora válida para eliminar');
      return;
    }

    try {
      const responsePdv = await fetch(`https://macfer.crepesywaffles.com/api/cap-pdvs/${pdvId}?populate=cap_instructoras`);
      if (!responsePdv.ok) {
        throw new Error('No se pudo obtener el punto de venta');
      }

      const pdvData = await responsePdv.json();
      const instructorasActuales = pdvData?.data?.attributes?.cap_instructoras?.data || [];
      const instructorasRestantes = instructorasActuales
        .filter((item) => item.id !== instructoraId)
        .map((item) => item.id);

      const response = await fetch(`https://macfer.crepesywaffles.com/api/cap-pdvs/${pdvId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            cap_instructoras: instructorasRestantes
          }
        })
      });

      if (!response.ok) {
        throw new Error('No se pudo eliminar la instructora de este punto de venta');
      }

      message.success('Instructora eliminada del punto de venta');
      cargarGestionInstructoras();
    } catch (error) {
      message.error(error?.message || 'Error al eliminar instructora');
    }
  };


  const exportarExcel = () => {
    if (dataFiltrada.length === 0) {
      message.warning('No hay datos para exportar');
      return;
    }

    const datosExportar = dataFiltrada.map((item, index) => ({
      'No.': index + 1,
      'Cédula': item.cedula || '',
      'Nombres': item.nombres || '',
      'Teléfono': item.telefono || '',
      'Cargo': item.cargo || '',
      'Punto de Venta': item.puntoVenta || '',
      'Nombre Líder': item.nombreLider || '',
      'Asistencia': item.asistencia === null ? 'Pendiente' : (item.asistencia ? 'Asistió' : 'No asistió'),
      'Día': item.dia || '',
      
    }));

    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscripciones');
    XLSX.writeFile(wb, `Inscripciones${new Date().toISOString().split('T')[0]}.xlsx`);
    message.success('Archivo Excel exportado exitosamente');
  };

  const exportarExcelTodera = () => {
    if (dataFiltradaTodera.length === 0) {
      message.warning('No hay datos para exportar');
      return;
    }

    const datosExportar = dataFiltradaTodera.map((item, index) => ({
      'No.': index + 1,
      'Cédula': item.cedula || '',
      'Nombres': item.nombres || '',
      'Teléfono': item.telefono || '',
      'Cargo a Evaluar': item.cargoEvaluar || item.cargo || '',
      'Punto de Venta': item.puntoVenta || '',
      'Nombre Líder': item.nombreLider || '',
      'Categoría': item.categoria || '',
      'Día Inscripción': item.dia || '',
    }));

    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Evaluaciones Todera');
    XLSX.writeFile(wb, `EvaluacionesTodera_${new Date().toISOString().split('T')[0]}.xlsx`);
    message.success('Archivo Excel exportado exitosamente');
  };


  const handleEliminar = async (id) => {
    try {
      const response = await fetch(`https://macfer.crepesywaffles.com/api/cap-cafes/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('Inscripción eliminada exitosamente');
        cargarInscripciones();
      } else {
        message.error('Error al eliminar la inscripción');
      }
    } catch (error) {
      message.error('Error de conexión al eliminar');
    }
  };

  const handleEliminarTodera = async (id) => {
    try {
      const response = await fetch(`https://macfer.crepesywaffles.com/api/cap-toderas/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('Evaluación eliminada exitosamente');
        cargarInscripcionesTodera();
      } else {
        message.error('Error al eliminar la evaluación');
      }
    } catch (error) {
      message.error('Error de conexión al eliminar');
    }
  };


  const columns = [
    {
      title: 'Foto',
      dataIndex: 'cedula',
      key: 'foto',
      width: 80,
      fixed: 'left',
      render: (cedula) => {
        const foto = fotosCache[cedula];
        return foto ? (
          <img 
            src={foto} 
            alt="Foto" 
            style={{ 
              width: '50px', 
              height: '50px', 
              borderRadius: '50%', 
              objectFit: 'cover',
              border: '2px solid #3d2817'
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZTBlMGUwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPj88L3RleHQ+PC9zdmc+';
            }}
          />
        ) : (
          <div style={{ 
            width: '50px', 
            height: '50px', 
            borderRadius: '50%', 
            backgroundColor: '#e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: '#999'
          }}>
            <i className="bi bi-person-circle"></i>
          </div>
        );
      }
    },
    {
      title: 'Cédula',
      dataIndex: 'cedula',
      key: 'cedula',
      width: 120,
    },
    {
      title: 'Nombres',
      dataIndex: 'nombres',
      key: 'nombres',
      width: 200,
    },
    {
      title: 'Teléfono',
      dataIndex: 'telefono',
      key: 'telefono',
      width: 120,
    },
    {
      title: 'Cargo a Evaluar',
      dataIndex: 'cargoEvaluar',
      key: 'cargoEvaluar',
      width: 200,
      render: (_, record) => record.cargoEvaluar || record.cargo || 'Sin definir'
    },
    {
      title: 'Punto de Venta',
      dataIndex: 'puntoVenta',
      key: 'puntoVenta',
      width: 150,
    },
    {
      title: 'Nombre Líder',
      dataIndex: 'nombreLider',
      key: 'nombreLider',
      width: 180,
    },
    {
      title: 'Día',
      dataIndex: 'dia',
      key: 'dia',
      width: 120,
      sorter: (a, b) => {
        if (!a.dia) return 1;
        if (!b.dia) return -1;
        return a.dia.localeCompare(b.dia);
      },
      defaultSortOrder: 'descend',
      render: (text) => {
        if (!text) return '';

        const [year, month, day] = text.split('-');
        return `${day}/${month}/${year}`;
      }
    },
    {
      title: 'Asistencia',
      dataIndex: 'asistencia',
      key: 'asistencia',
      width: 120,
      render: (asistencia) => {
        if (asistencia === null) {
          return <span style={{ color: '#a8a26a' }}>Pendiente</span>;
        } else if (asistencia === true) {
          return <span style={{ color: '#52c41a', fontWeight: 'bold' }}>✓ Asistió</span>;
        } else {
          return <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>✗ No asistió</span>;
        }
      }
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {puedeEliminar() && (
            <Popconfirm
              title="¿Está seguro de eliminar esta inscripción?"
              description="Esta acción no se puede deshacer."
              onConfirm={() => handleEliminar(record.id)}
              okText="Sí, eliminar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
                title="Eliminar"
              />
            </Popconfirm>
          )}
        </Space>
      ),
    }
  ];

  // Columnas para tabla todera
  // Roles que pueden ver estado y observación
  const rolesVerEstadoObs = [
    'ADMINISTRADORA PUNTO DE VENTA',
    'COORDINADOR PUNTO DE VENTA',
    'COORDINADOR PUNTO DE VENTA (FDS)',
    'GERENTE PUNTO DE VENTA',
    'JEFE DESARROLLO DE PRODUCTO',
    'DIRECTORA DE LINEAS DE PRODUCTO',
    'ANALISTA DE PRODUCTO',
  ];

  const cargoUsuarioActual = userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '';

  const columnsToderaBase = [
    {
      title: 'Foto',
      dataIndex: 'cedula',
      key: 'foto',
      width: 80,
      fixed: 'left',
      render: (cedula) => {
        const foto = fotosCache[cedula];
        return foto ? (
          <img 
            src={foto} 
            alt="Foto" 
            style={{ 
              width: '50px', 
              height: '50px', 
              borderRadius: '50%', 
              objectFit: 'cover',
              border: '2px solid #3d2817'
            }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZTBlMGUwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPj88L3RleHQ+PC9zdmc+';
            }}
          />
        ) : (
          <div style={{ 
            width: '50px', 
            height: '50px', 
            borderRadius: '50%', 
            backgroundColor: '#e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: '#999'
          }}>
            <i className="bi bi-person-circle"></i>
          </div>
        );
      }
    },
    {
      title: 'Cédula',
      dataIndex: 'cedula',
      key: 'cedula',
      width: 120,
    },
    {
      title: 'Nombres',
      dataIndex: 'nombres',
      key: 'nombres',
      width: 200,
    },
    {
      title: 'Teléfono',
      dataIndex: 'telefono',
      key: 'telefono',
      width: 120,
    },
    {
      title: 'Cargo a Evaluar',
      dataIndex: 'cargoEvaluar',
      key: 'cargoEvaluar',
      width: 180,
      render: (_, record) => record.cargoEvaluar || record.cargo || 'Sin definir'
    },
    {
      title: 'Punto de Venta',
      dataIndex: 'puntoVenta',
      key: 'puntoVenta',
      width: 150,
    },
    {
      title: 'Instructora',
      dataIndex: 'nombreLider',
      key: 'nombreLider',
      width: 180,
      render: (text) => (
        <span style={{
          backgroundColor: '#fff7e6',
          color: '#d46b08',
          padding: '4px 12px',
          borderRadius: '12px',
          fontWeight: '500',
          fontSize: '12px',
          display: 'inline-block'
        }}>
          {text || 'Sin asignar'}
        </span>
      )
    },
    {
      title: 'Categoría',
      dataIndex: 'categoria',
      key: 'categoria',
      width: 120,
      render: (text) => {
        const categorias = {
          'sal': { text: 'SAL', color: '#8B4513' },
          'dulce': { text: 'DULCE', color: '#FF69B4' },
          'bebidas': { text: 'BEBIDAS', color: '#4169E1' }
        };
        const cat = categorias[text?.toLowerCase()] || { text: text, color: '#666' };
        return <span style={{ color: cat.color, fontWeight: 'bold' }}>{cat.text}</span>;
      }
    },
    {
      title: 'Día Inscripción',
      dataIndex: 'dia',
      key: 'dia',
      width: 140,
      sorter: (a, b) => {
        if (!a.dia) return 1;
        if (!b.dia) return -1;
        return a.dia.localeCompare(b.dia);
      },
      defaultSortOrder: 'descend',
      render: (text, record) => {
        if (!text) return '';
        // Calcular si han pasado 15 días o más y no está evaluado
        const fechaInscripcion = new Date(text);
        const hoy = new Date();
        let diasTranscurridos = 0;
        let esAlerta = false;
        
        if (!isNaN(fechaInscripcion.getTime())) {
          diasTranscurridos = Math.floor((hoy - fechaInscripcion) / (1000 * 60 * 60 * 24));
          esAlerta = diasTranscurridos >= 15 && record.evaluado !== true;
        }
        
        const [year, month, day] = text.split('-');
        const fechaFormateada = `${day}/${month}/${year}`;
        return (
          <span 
            className={esAlerta ? 'fecha-alerta-admin' : ''}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              display: 'inline-block',
              fontWeight: esAlerta ? '600' : '400',
              backgroundColor: esAlerta ? '#ff4d4f' : 'transparent',
              color: esAlerta ? '#ffffff' : '#333',
              border: esAlerta ? '2px solid #ff1f1f' : 'none',
              animation: esAlerta ? 'pulso-alerta-admin 1.5s infinite' : 'none'
            }}
            title={esAlerta ? `Han pasado ${diasTranscurridos} días sin evaluar` : ''}
          >
            {fechaFormateada}
            {esAlerta && (
              <i className="bi bi-exclamation-triangle-fill" style={{ marginLeft: '6px', fontSize: '12px' }}></i>
            )}
          </span>
        );
      }
    },
  ];

  // Agregar columnas de Estado y Observación solo para los roles permitidos
  const columnsTodera = [
    ...columnsToderaBase,
    ...(rolesVerEstadoObs.includes(cargoUsuarioActual)
      ? [
          {
            title: 'Estado',
            dataIndex: 'evaluado',
            key: 'estado',
            width: 120,
            render: (evaluado) => {
              if (evaluado === null) return <span style={{ color: '#a8a26a' }}>Pendiente</span>;
              if (evaluado === true) return <span style={{ color: '#52c41a', fontWeight: 'bold' }}>Evaluado</span>;
              return <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>No evaluado</span>;
            }
          },
          {
            title: 'Observación',
            dataIndex: 'observacion',
            key: 'observacion',
            width: 180,
            render: (obs) => obs ? <span style={{ color: '#3d2817' }}>{obs}</span> : <span style={{ color: '#bbb' }}>Sin observación</span>
          }
        ]
      : []),
    {
      title: 'Acciones',
      key: 'acciones',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {puedeEliminar() && (
            <Popconfirm
              title="¿Está seguro de eliminar esta evaluación?"
              description="Esta acción no se puede deshacer."
              onConfirm={() => handleEliminarTodera(record.id)}
              okText="Sí, eliminar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                size="small"
                title="Eliminar"
              />
            </Popconfirm>
          )}
        </Space>
      ),
    }
  ];

  const renderCeldaCategoria = (asignacion, pdvId, categoria) => {
    if (!asignacion) {
      return (
        <div style={{ textAlign: 'center' }}>
          <Tooltip title={`Agregar instructora para ${categoria}`}>
            <Button
              type="primary"
              shape="circle"
              icon={<PlusOutlined />}
              size="small"
              onClick={() => abrirModalGestionInstructoras(pdvId, categoria)}
            />
          </Tooltip>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 500, color: '#2c3e50', fontSize: '13px' }}>{asignacion.instructoraNombre}</span>
        <Popconfirm
          title="¿Eliminar?"
          description="Se quitará de este PDV."
          onConfirm={() => eliminarInstructoraDePuntoVenta(pdvId, asignacion.instructoraId)}
          okText="Eliminar"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
        >
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            style={{ padding: '4px 8px', minWidth: 'auto' }}
          />
        </Popconfirm>
      </div>
    );
  };

  const columnsGestionInstructoras = [
    {
      title: 'Punto de Venta',
      dataIndex: 'puntoVenta',
      key: 'puntoVenta',
      width: 200,
      sorter: (a, b) => (a.puntoVenta || '').localeCompare(b.puntoVenta || '')
    },
    {
      title: <span style={{ color: '#2f6b17', fontWeight: 'bold' }}>SAL</span>,
      dataIndex: 'sal',
      key: 'sal',
      width: 200,
      render: (sal, record) => renderCeldaCategoria(sal, record.pdvId, 'SAL')
    },
    {
      title: <span style={{ color: '#2b627a', fontWeight: 'bold' }}>DULCE</span>,
      dataIndex: 'dulce',
      key: 'dulce',
      width: 200,
      render: (dulce, record) => renderCeldaCategoria(dulce, record.pdvId, 'DULCE')
    },
    {
      title: <span style={{ color: '#6b5600', fontWeight: 'bold' }}>BEBIDAS</span>,
      dataIndex: 'bebidas',
      key: 'bebidas',
      width: 200,
      render: (bebidas, record) => renderCeldaCategoria(bebidas, record.pdvId, 'BEBIDAS')
    },
    {
      title: <span style={{ color: '#6b4d3a', fontWeight: 'bold' }}>BRUNCH</span>,
      dataIndex: 'brunch',
      key: 'brunch',
      width: 200,
      render: (brunch, record) => renderCeldaCategoria(brunch, record.pdvId, 'BRUNCH')
    }
  ];


  const puedeVerTodera = () => {
    const cargoUsuario = userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '';
    return rolesVerAmbasTablas.includes(cargoUsuario);
  };

  const puedeGestionarInstructoras = () => {
    const cargoUsuario = userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '';
    return rolesAccesoDual.includes(cargoUsuario);
  };

  // Verificar si el usuario puede ver el filtro de instructora
  const puedeVerFiltroInstructora = () => {
    const cargoUsuario = userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '';
    return rolesVerTodo.includes(cargoUsuario);
  };

  // Obtener lista de instructoras únicas
  const obtenerInstructoras = () => {
    return [...new Set(inscripciones.map(item => item.nombreLider).filter(Boolean))].sort();
  };

  const obtenerInstructorasTodera = () => {
    return [...new Set(inscripcionesTodera.map(item => item.nombreLider).filter(Boolean))].sort();
  };


  const calcularEstadisticas = () => {
    const totalInscritos = inscripciones.length;

    const puntosVenta = [...new Set(inscripciones.map(item => item.puntoVenta).filter(Boolean))].length;

    return { totalInscritos, puntosVenta };
  };

  const obtenerPuntosVentaVinculados = () => {
    return [...new Set(inscripciones.map(item => item.puntoVenta).filter(Boolean))].sort();
  };


  if (vistaActual === "seleccion_menu") {
    return (
      <SeleccionMenu
        onSelectEscuelaCafe={handleAbrirFormularioPuntoVenta}
        onSelectEvaluacionToderas={handleAbrirFormularioEvaluacionTodera}
        onViewPanel={handleVerMiPanel}
        onBack={handleVolverDesdeSeleccion}
        nombreUsuario={nombreUsuario}
      />
    );
  }

  if (vistaActual === "formulario" && showFormulario) {
    if (tipoFormulario === "punto_venta") {
      return (
        <FormularioPuntoVenta 
          onBack={handleVolverPanel}
          onSubmit={handleSubmitInscripcion}
          coordinadoraData={userData}
        />
      );
    } else if (tipoFormulario === "evaluacion_todera") {
      return (
        <EvaluacionTodera 
          onBack={handleVolverPanel}
          onSubmit={handleSubmitInscripcion}
          coordinadoraData={userData}
        />
      );
    } else {
      return (
        <FormularioInscripcion 
          onBack={handleVolverPanel}
          onSubmit={handleSubmitInscripcion}
          coordinadoraData={userData}
        />
      );
    }
  }

  return (
    <div className="admin-container">
      {/* Header Superior */}
      <header className="admin-header">
        <div className="header-left">
          <ProfileCard userData={userData} onLogout={onLogout} />
          <div className="header-titles">
            <span className="header-logo-text">PANEL DE LÍNEAS Y PRODUCTO C&W</span>
            <span className="header-subtitle">Gestión Administrativa</span>
          </div>
        </div>
        
        <div className="header-right">
          {tieneAccesoDual() ? (
            <>
              <button className="header-nav-btn" onClick={handleAbrirFormularioEscuelaCafe}>
                <i className="bi bi-cup-hot"></i>
                <span>Escuela Café HEL</span>
              </button>
              <button className="header-nav-btn" onClick={handleAbrirFormularioPuntoVenta}>
                <i className="bi bi-shop-window"></i>
                <span>Escuela Café PDV</span>
              </button>
            </>
          ) : rolesPuntoVenta.includes(userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '') ? (
            <>
              <button className="header-nav-btn" onClick={handleAbrirFormularioPuntoVenta}>
                <i className="bi bi-cup-hot"></i>
                <span>Escuela del Café</span>
              </button>
              <button className="header-nav-btn" onClick={handleAbrirFormularioEvaluacionTodera}>
                <i className="bi bi-clipboard-check"></i>
                <span>Evaluación Toderas</span>
              </button>
            </>
          ) : rolesHeladeria.includes(userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '') ? (
            <button className="header-nav-btn" onClick={handleAbrirFormularioEscuelaCafe}>
              <i className="bi bi-pencil-square"></i>
              <span>Inscripción Aquí</span>
            </button>
          ) : (
            <button className="header-nav-btn" onClick={handleRegistrarPersona}>
              <i className="bi bi-book"></i>
              <span>Registrar Estudiante</span>
            </button>
          )}
          
          {puedeVerTodera() && !rolesPuntoVenta.includes(userData?.data?.cargo_general || userData?.cargo_general || userData?.cargo || '') && (
            <button className="header-nav-btn" onClick={handleAbrirFormularioEvaluacionTodera}>
              <i className="bi bi-clipboard-check"></i>
              <span>Evaluación Todera</span>
            </button>
          )}
          
          <button className="btn-nav-header" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left"></i>
            <span>Volver</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="admin-main">
        <div className="admin-content">

          <h1 className="admin-title">Hola, {nombreUsuario}</h1>
          <h2 className="admin-subtitle">Líneas y Producto C&W</h2>

          {/* Botón de Sección Grande */}
          <div className="main-section-button-container">
            <button 
              className={`main-section-button ${seccionActiva === 'escuela_cafe' ? 'active' : ''}`}
              onClick={() => {
                setSeccionActiva('escuela_cafe');
              }}
            >
              
              <span>Escuela del Café</span>
            </button>
            
            {puedeVerTodera() && (
              <button 
                className={`main-section-button ${seccionActiva === 'evaluacion_todera' ? 'active' : ''}`}
                onClick={() => setSeccionActiva('evaluacion_todera')}
              >
                
                <span>Evaluación Todera</span>
              </button>
            )}

            {puedeGestionarInstructoras() && (
              <button
                className={`main-section-button ${seccionActiva === 'gestion_instructoras' ? 'active' : ''}`}
                onClick={() => {
                  setSeccionActiva('gestion_instructoras');
                  if (!gestionInstructoras.length) {
                    cargarGestionInstructoras();
                  }
                  if (!instructorasDisponibles.length) {
                    cargarInstructorasDisponibles();
                  }
                }}
              >
                <span>Gestión Instructoras</span>
              </button>
            )}
          </div>

          {/* Mostrar contenido según sección activa */}
          {seccionActiva === 'escuela_cafe' ? (
            <>
              {/* Filtros */}
              <div className="filters-container">
                <h3 className="filters-title"> FILTROS DE BÚSQUEDA</h3>
                <Space wrap size="middle" style={{ width: '100%' }}>
                  <Input
                    placeholder="Buscar por cédula..."
                    prefix={<SearchOutlined />}
                    value={filtros.cedula}
                    onChange={(e) => setFiltros({ ...filtros, cedula: e.target.value })}
                    style={{ width: 200 }}
                  />
                  <Select
                    placeholder="Punto de venta"
                    allowClear
                    showSearch
                    value={filtros.puntoVenta || undefined}
                    onChange={(value) => setFiltros({ ...filtros, puntoVenta: value || '' })}
                    style={{ width: 220 }}
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {[...new Set(inscripciones.map(item => item.puntoVenta).filter(Boolean))]
                      .sort()
                      .map(pdv => (
                        <Select.Option key={pdv} value={pdv}>{pdv}</Select.Option>
                      ))}
                  </Select>
                  <Select
                    placeholder="Filtrar por fecha"
                    allowClear
                    showSearch
                    value={filtros.fecha || undefined}
                    onChange={(value) => setFiltros({ ...filtros, fecha: value || '' })}
                    style={{ width: 180 }}
                  >
                    {[...new Set(inscripciones.map(item => item.dia).filter(Boolean))]
                      .sort((a, b) => b.localeCompare(a))
                      .map(fecha => {
                        const [year, month, day] = fecha.split('-');
                        const fechaFormateada = `${day}/${month}/${year}`;
                        return (
                          <Select.Option key={fecha} value={fecha}>{fechaFormateada}</Select.Option>
                        );
                      })}
                  </Select>
                  <Button onClick={limpiarFiltros}>
                    Limpiar
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />} 
                    onClick={exportarExcel}
                    style={{ background: '#52B788', borderColor: '#52B788' }}
                  >
                    Exportar a Excel
                  </Button>
                </Space>
              </div>

              {/* Tabla de inscripciones */}
              <div className="table-card">
                <div className="table-header">
                  <div className="table-title">
                    

                    <strong>Inscripciones Escuela del Café </strong>
                    <button
                      onClick={cargarInscripciones}
                      style={{
                        marginLeft: 12,
                        background: '#6f4e3700',
                        border: 'none',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 1px 4px #0001',
                        transition: 'background 0.2s',
                      }}
                      title="Refrescar"
                    >
                      <i className="bi bi-arrow-clockwise" style={{ color: '#563C28', fontSize: 18 }}></i>
                    </button>
                  </div>
                  <span className="table-count">
                    Registros {inscripciones.length} | Filtrados {dataFiltrada.length}
                  </span>
                </div>
                <Table
                  columns={columns}
                  dataSource={dataFiltrada || []}
                  loading={loading}
                  rowKey={(record) => record.id || `${record.cedula}-${record.dia}` || Math.random().toString(36)}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} inscripciones`
                  }}
                  scroll={{ x: 1500 }}
                  locale={{
                    emptyText: 'No hay inscripciones registradas'
                  }}
                />
              </div>
            </>
          ) : null}
          
          {seccionActiva === 'evaluacion_todera' && puedeVerTodera() && (
            <>
              <div className="filters-container">
                <h3 className="filters-title"><i className="bi bi-funnel-fill"></i> FILTROS EVALUACIONES TODERA</h3>
                <Space wrap size="middle" style={{ width: '100%' }}>
                  <Input
                    placeholder="Buscar por cédula..."
                    prefix={<SearchOutlined />}
                    value={filtrosTodera.cedula}
                    onChange={(e) => setFiltrosTodera({ ...filtrosTodera, cedula: e.target.value })}
                    style={{ width: 200 }}
                  />
                  <Select
                    placeholder="Punto de venta"
                    allowClear
                    showSearch
                    value={filtrosTodera.puntoVenta || undefined}
                    onChange={(value) => setFiltrosTodera({ ...filtrosTodera, puntoVenta: value || '' })}
                    style={{ width: 220 }}
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {[...new Set(inscripcionesTodera.map(item => item.puntoVenta).filter(Boolean))]
                      .sort()
                      .map(pdv => (
                        <Select.Option key={pdv} value={pdv}>{pdv}</Select.Option>
                      ))}
                  </Select>
                  <Select
                    placeholder="Filtrar por fecha"
                    allowClear
                    showSearch
                    value={filtrosTodera.fecha || undefined}
                    onChange={(value) => setFiltrosTodera({ ...filtrosTodera, fecha: value || '' })}
                    style={{ width: 180 }}
                  >
                    {[...new Set(inscripcionesTodera.map(item => item.dia).filter(Boolean))]
                      .sort((a, b) => b.localeCompare(a))
                      .map(fecha => {
                        const [year, month, day] = fecha.split('-');
                        const fechaFormateada = `${day}/${month}/${year}`;
                        return (
                          <Select.Option key={fecha} value={fecha}>{fechaFormateada}</Select.Option>
                        );
                      })}
                  </Select>
                  {puedeVerFiltroInstructora() && (
                    <Select
                      placeholder="Seleccionar instructora"
                      allowClear
                      showSearch
                      value={filtrosTodera.instructora || undefined}
                      onChange={(value) => setFiltrosTodera({ ...filtrosTodera, instructora: value || '' })}
                      style={{ width: 220 }}
                      filterOption={(input, option) =>
                        (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {obtenerInstructorasTodera().map(instructora => (
                        <Select.Option key={instructora} value={instructora}>{instructora}</Select.Option>
                      ))}
                    </Select>
                  )}
                  <Button onClick={limpiarFiltrosTodera}>
                    Limpiar
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />} 
                    onClick={exportarExcelTodera}
                    style={{ background: '#52B788', borderColor: '#52B788' }}
                  >
                    Exportar a Excel
                  </Button>
                </Space>
              </div>

              <div className="table-card">
                <div className="table-header">
                  <div className="table-title">
                    <div className="table-icon">
                      <i className="bi bi-clipboard-check"></i>
                    </div>
                    <strong>Evaluaciones Todera</strong>
                    <button
                      onClick={cargarInscripcionesTodera}
                      style={{
                        marginLeft: 12,
                        background: '#6f4e3700',
                        border: 'none',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 1px 4px #0001',
                        transition: 'background 0.2s',
                      }}
                      title="Refrescar"
                    >
                      <i className="bi bi-arrow-clockwise" style={{ color: '#6F4E37', fontSize: 18 }}></i>
                    </button>
                  </div>
                  <span className="table-count">
                    Registros {inscripcionesTodera.length} | Filtrados {dataFiltradaTodera.length}
                  </span>
                </div>
                <Table
                  columns={columnsTodera}
                  dataSource={dataFiltradaTodera || []}
                  loading={loadingTodera}
                  rowKey={(record) => record.id || `${record.cedula}-${record.dia}` || Math.random().toString(36)}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} evaluaciones`
                  }}
                  scroll={{ x: 1500 }}
                  locale={{
                    emptyText: 'No hay evaluaciones registradas'
                  }}
                />
              </div>
            </>
          )}

          {seccionActiva === 'gestion_instructoras' && puedeGestionarInstructoras() && (
            <>
              <div className="filters-container">
                <h3 className="filters-title">GESTIÓN DE INSTRUCTORAS</h3>
                <Space wrap size="middle" style={{ width: '100%' }}>
                  <Input
                    placeholder="Buscar punto de venta..."
                    prefix={<SearchOutlined />}
                    value={filtrosGestionInstructoras.puntoVenta}
                    onChange={(e) => setFiltrosGestionInstructoras({ ...filtrosGestionInstructoras, puntoVenta: e.target.value })}
                    style={{ width: 280 }}
                  />

                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setModalNuevaInstructoraVisible(true)}
                    style={{ background: '#52B788', borderColor: '#52B788' }}
                  >
                    Agregar instructora
                  </Button>

                  <Button onClick={limpiarFiltrosGestionInstructoras}>
                    Limpiar
                  </Button>
                </Space>
              </div>

              <div className="table-card">
                <div className="table-header">
                  <div className="table-title">
                    <strong>Gestión Instructoras</strong>
                    <button
                      onClick={cargarGestionInstructoras}
                      style={{
                        marginLeft: 12,
                        background: '#6f4e3700',
                        border: 'none',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 1px 4px #0001',
                        transition: 'background 0.2s',
                      }}
                      title="Refrescar"
                    >
                      <i className="bi bi-arrow-clockwise" style={{ color: '#6F4E37', fontSize: 18 }}></i>
                    </button>
                  </div>
                  <span className="table-count">
                    Registros {gestionInstructoras.length} | Filtrados {dataFiltradaGestionInstructoras.length}
                  </span>
                </div>
                <Table
                  columns={columnsGestionInstructoras}
                  dataSource={dataFiltradaGestionInstructoras || []}
                  loading={loadingGestionInstructoras}
                  rowKey={(record) => record.key}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} registros`
                  }}
                  scroll={{ x: 1200 }}
                  locale={{
                    emptyText: 'No hay asignaciones de instructoras registradas'
                  }}
                />
              </div>
            </>
          )}

        </div>
      </main>

      <Modal
        title="Agregar instructora"
        open={modalNuevaInstructoraVisible}
        onCancel={() => {
          setModalNuevaInstructoraVisible(false);
          resetFormNuevaInstructora();
        }}
        onOk={crearInstructora}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={loadingNuevaInstructora}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
          <Input
            placeholder="Documento de la instructora"
            value={formNuevaInstructora.documento}
            onChange={(e) => setFormNuevaInstructora({ ...formNuevaInstructora, documento: e.target.value })}
          />

          <Input
            placeholder="Nombre de la instructora"
            value={formNuevaInstructora.nombre}
            onChange={(e) => setFormNuevaInstructora({ ...formNuevaInstructora, nombre: e.target.value })}
          />

          <Input
            placeholder="Telefono de la instructora"
            value={formNuevaInstructora.telefono}
            onChange={(e) => setFormNuevaInstructora({ ...formNuevaInstructora, telefono: e.target.value })}
          />

          <Input
            placeholder="Correo de la instructora"
            value={formNuevaInstructora.correo}
            onChange={(e) => setFormNuevaInstructora({ ...formNuevaInstructora, correo: e.target.value })}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            {[
              { key: 'sal', label: 'SAL' },
              { key: 'dulce', label: 'DULCE' },
              { key: 'bebidas', label: 'BEBIDAS' },
              { key: 'brunch', label: 'BRUNCH' }
            ].map((item) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '8px'
                }}
              >
                <span style={{ fontWeight: 500 }}>{item.label}</span>
                <Switch
                  checked={formNuevaInstructora[item.key]}
                  onChange={(checked) => setFormNuevaInstructora({ ...formNuevaInstructora, [item.key]: checked })}
                />
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              border: '1px solid #f0f0f0',
              borderRadius: '8px'
            }}
          >
            <span style={{ fontWeight: 500 }}>Habilitada</span>
            <Switch
              checked={formNuevaInstructora.habilitado}
              onChange={(checked) => setFormNuevaInstructora({ ...formNuevaInstructora, habilitado: checked })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        title="Gestión Instructoras"
        open={modalGestionVisible}
        onCancel={() => setModalGestionVisible(false)}
        onOk={agregarInstructoraAPuntoVenta}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={loadingInstructorasDisponibles || loadingGestionInstructoras}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
          <Select
            placeholder="Selecciona punto de venta"
            showSearch
            value={formGestion.pdvId || undefined}
            onChange={(value) => {
              const nuevoPdv = value || '';
              setFormGestion({ ...formGestion, pdvId: nuevoPdv, instructoraId: '' });
            }}
            filterOption={(input, option) =>
              (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {[...new Map(gestionInstructoras.filter((item) => item.pdvId && item.puntoVenta).map((item) => [item.pdvId, item])).values()]
              .sort((a, b) => (a.puntoVenta || '').localeCompare(b.puntoVenta || ''))
              .map((item) => (
                <Select.Option key={item.pdvId} value={String(item.pdvId)}>{item.puntoVenta}</Select.Option>
              ))}
          </Select>

          <Select
            placeholder="Selecciona categoría"
            value={formGestion.categoria || undefined}
            onChange={(value) => {
              const nuevaCategoria = value || '';
              setFormGestion({ ...formGestion, categoria: nuevaCategoria, instructoraId: '' });
              cargarInstructorasPorCategoria(nuevaCategoria);
            }}
          >
            {['SAL', 'DULCE', 'BEBIDAS', 'BRUNCH'].map((cat) => (
              <Select.Option key={cat} value={cat}>{cat}</Select.Option>
            ))}
          </Select>

          <Select
            placeholder={formGestion.categoria ? (loadingInstructorasFiltradas ? 'Cargando...' : (instructorasFiltradas.length === 0 ? 'Sin instructoras para esta categoría' : 'Selecciona instructora')) : 'Primero selecciona una categoría'}
            showSearch
            value={formGestion.instructoraId || undefined}
            onChange={(value) => setFormGestion({ ...formGestion, instructoraId: value || '' })}
            loading={loadingInstructorasFiltradas}
            disabled={!formGestion.categoria || loadingInstructorasFiltradas}
            filterOption={(input, option) =>
              (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {instructorasFiltradas
              .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
              .map((item) => (
                <Select.Option key={item.id} value={String(item.id)}>
                  {item.nombre} {item.habilitado ? '' : '(Inactiva)'}
                </Select.Option>
              ))}
          </Select>
          {formGestion.categoria && !loadingInstructorasFiltradas && instructorasFiltradas.length === 0 && (
            <div style={{ color: '#faad14', fontSize: '12px', marginTop: '-8px' }}>
              No hay instructoras con categoría {formGestion.categoria} asignadas a este punto de venta.
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Puntos de Venta */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="bi bi-shop-window" style={{ fontSize: '24px', color: '#E63946' }}></i>
            <span>Puntos de Venta Vinculados</span>
          </div>
        }
        open={modalPuntosVentaVisible}
        onCancel={() => setModalPuntosVentaVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setModalPuntosVentaVisible(false)}>
            Cerrar
          </Button>
        ]}
        width={600}
      >
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {obtenerPuntosVentaVinculados().length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {obtenerPuntosVentaVinculados().map((pdv, index) => (
                <div 
                  key={index}
                  style={{
                    padding: '12px 16px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e9ecef';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <i className="bi bi-geo-alt-fill" style={{ fontSize: '18px', color: '#E63946' }}></i>
                  <span style={{ fontWeight: '500', color: '#2c3e50', flex: 1 }}>{pdv}</span>
                  <span style={{
                    background: '#E63946',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {inscripciones.filter(i => i.puntoVenta === pdv).length} inscritos
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6c757d' }}>
              <i className="bi bi-inbox" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}></i>
              <p>No hay puntos de venta vinculados</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AdminPanel;
