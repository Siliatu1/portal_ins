import React, { useState, useEffect } from "react";
import "./panel_toderas.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import ProfileCard from "./ProfileCard";
import { Table, Input, Button, message, Switch, Modal, Select } from "antd";
import { SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { TextArea } = Input;
const { Option } = Select;

const PanelToderas = ({ userData, onLogout }) => {
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    cedula: '',
    puntoVenta: '',
    categoria: '',
    fecha: ''
  });
  const [dataFiltrada, setDataFiltrada] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [observacionActual, setObservacionActual] = useState('');
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
  const [fotosCache, setFotosCache] = useState({});

  // Documentos autorizados para instructoras
  const documentosAutorizados = [
    '30386710', '52395525', '52422155', '52525496', '1020758053',
    '1077845053', '39276283', '35416150', '22797275', '49792488',
    '52701678', '28549413', '1019005012', '49606652', '53075347',
    '1079605138', '21032351', '52439552', '52962339', '1116547316',
    '23876197', '66681589', '52799048', '1075538331', '49776128',
    '37550615', '37339972', '1019073170'
  ];

  const nombreUsuario = userData?.data?.nombre || 
    userData?.data?.name ||
    (userData?.data?.first_name && userData?.data?.last_name 
      ? `${userData.data.first_name} ${userData.data.last_name}`.trim()
      : userData?.data?.full_name || '');

  const documentoUsuario = userData?.data?.documento || 
    userData?.data?.document_number || 
    userData?.documento || '';


  const tieneAcceso = documentosAutorizados.includes(String(documentoUsuario).trim());

  const cargarInscripciones = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://macfer.crepesywaffles.com/api/cap-toderas');
      if (response.ok) {
        const result = await response.json();

        let dataArray = [];
        if (result && Array.isArray(result.data)) {
          dataArray = result.data.map(item => {
            const mapped = {
              id: item.id,
              cedula: item.attributes?.documento || '',
              nombres: item.attributes?.Nombre || '',
              telefono: item.attributes?.telefono || '',
              cargo: item.attributes?.cargo || '',
              cargoEvaluar: item.attributes?.cargo_evaluar || item.attributes?.cargoEvaluar || item.attributes?.cargo || '',
              puntoVenta: item.attributes?.pdv || '',
              dia: item.attributes?.fecha || '',
              nombreLider: item.attributes?.lider || '',
              foto: item.attributes?.foto || '',
              categoria: item.attributes?.categoria || '',
              evaluado: item.attributes?.estado ?? null,
              observacion: item.attributes?.observacion || ''
            };
            return mapped;
          });
        }

        setInscripciones(dataArray);
        setDataFiltrada(dataArray);
      } else {
        setInscripciones([]);
        setDataFiltrada([]);
      }
    } catch (error) {
      message.error('Error al cargar las inscripciones');
      setInscripciones([]);
      setDataFiltrada([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tieneAcceso) {
      cargarInscripciones();
    }
  }, [tieneAcceso]);

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

  // Cargar fotos desde BUK cuando no haya foto guardada
  useEffect(() => {
    dataFiltrada.forEach(item => {
      if (item.cedula && !item.foto && !fotosCache[item.cedula]) {
        cargarFotoEmpleado(item.cedula);
      }
    });
  }, [dataFiltrada]);

  const handleCambiarEvaluacion = async (id, nuevoEstado) => {
    try {
      const response = await fetch(`https://macfer.crepesywaffles.com/api/cap-toderas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            estado: nuevoEstado
          }
        }),
      });

      if (response.ok) {
        message.success(`Estado actualizado: ${nuevoEstado ? 'Evaluado' : 'No evaluado'}`);
        cargarInscripciones();
      } else {
        message.error('Error al actualizar el estado');
      }
    } catch (error) {
      message.error('Error de conexión al actualizar el estado');
    }
  };

  const abrirModalObservacion = (registro) => {
    setRegistroSeleccionado(registro);
    setObservacionActual(registro.observacion || '');
    setModalVisible(true);
  };

  const guardarObservacion = async () => {
    if (!registroSeleccionado) return;

    try {
      const response = await fetch(`https://macfer.crepesywaffles.com/api/cap-toderas/${registroSeleccionado.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            observacion: observacionActual
          }
        }),
      });

      if (response.ok) {
        message.success('Observación guardada exitosamente');
        setModalVisible(false);
        setObservacionActual('');
        setRegistroSeleccionado(null);
        cargarInscripciones();
      } else {
        message.error('Error al guardar la observación');
      }
    } catch (error) {
      message.error('Error de conexión al guardar la observación');
    }
  };

  const aplicarFiltros = () => {
    let dataTemp = [...inscripciones];

    // FILTRO: Solo mostrar estudiantes del líder actual
    if (nombreUsuario) {
      dataTemp = dataTemp.filter(item => {
        const liderNormalizado = (item.nombreLider || '').toLowerCase().trim();
        const usuarioNormalizado = nombreUsuario.toLowerCase().trim();
        return liderNormalizado === usuarioNormalizado;
      });
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

    if (filtros.categoria) {
      dataTemp = dataTemp.filter(item => 
        item.categoria && item.categoria.toLowerCase() === filtros.categoria.toLowerCase()
      );
    }

    

    setDataFiltrada(dataTemp);
  };

  useEffect(() => {
    aplicarFiltros();
  }, [filtros, inscripciones, nombreUsuario]);

  const limpiarFiltros = () => {
    setFiltros({ cedula: '', puntoVenta: '', categoria: '' });
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
      'Cargo a Evaluar': item.cargoEvaluar || item.cargo || '',
      'Punto de Venta': item.puntoVenta || '',
      'Nombre Líder': item.nombreLider || '',
      'Categoría': item.categoria || '',
      'Día Inscripción': item.dia || '',
      'Estado': item.evaluado === null ? 'Pendiente' : (item.evaluado ? 'Evaluado' : 'No evaluado'),
      'Observación': item.observacion || ''
    }));

    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Evaluacion_Todera');
    XLSX.writeFile(wb, `Evaluacion_Todera_${new Date().toISOString().split('T')[0]}.xlsx`);
    message.success('Archivo Excel exportado exitosamente');
  };
  const columns = [
    {
      title: 'Foto',
      dataIndex: 'foto',
      key: 'foto',
      width: 80,
      fixed: 'left',
      render: (foto, record) => {
        // Usar foto guardada o la del cache de BUK
        const fotoMostrar = foto || fotosCache[record.cedula];
        return fotoMostrar ? (
          <img 
            src={fotoMostrar} 
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
      width: 170,
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
      title: 'Categoría',
      dataIndex: 'categoria',
      key: 'categoria',
      width: 130,
      render: (categoria) => (
        <span style={{ 
          padding: '4px 12px',
          borderRadius: '15px',
          backgroundColor: categoria === 'Novata' ? '#fff7e6' : '#e6f7ff',
          color: categoria === 'Novata' ? '#d46b08' : '#0958d9',
          fontWeight: '500',
          fontSize: '12px'
        }}>
          {categoria || 'N/A'}
        </span>
      )
    },
    {
      title: 'Fecha Inscripción',
      dataIndex: 'dia',
      key: 'fechaInscripcion',
      width: 140,
      render: (dia, record) => {
        // Calcular si han pasado 15 días o más y no está evaluado
        const fechaInscripcion = dia ? new Date(dia) : null;
        const hoy = new Date();
        let diasTranscurridos = 0;
        let esAlerta = false;
        
        if (fechaInscripcion && !isNaN(fechaInscripcion.getTime())) {
          diasTranscurridos = Math.floor((hoy - fechaInscripcion) / (1000 * 60 * 60 * 24));
          esAlerta = diasTranscurridos >= 15 && record.evaluado !== true;
        }
        
        return (
          <span 
            className={esAlerta ? 'fecha-alerta' : ''}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              display: 'inline-block',
              fontWeight: esAlerta ? '600' : '400',
              backgroundColor: esAlerta ? '#ff4d4f' : 'transparent',
              color: esAlerta ? '#ffffff' : '#333',
              border: esAlerta ? '2px solid #ff1f1f' : 'none',
              animation: esAlerta ? 'pulso-alerta 1.5s infinite' : 'none'
            }}
            title={esAlerta ? `Han pasado ${diasTranscurridos} días sin evaluar` : ''}
          >
            {dia || 'Sin fecha'}
            {esAlerta && (
              <i className="bi bi-exclamation-triangle-fill" style={{ marginLeft: '6px', fontSize: '12px' }}></i>
            )}
          </span>
        );
      }
    },
    {
      title: 'Estado',
      key: 'evaluado',
      width: 150,
      fixed: 'right',
      render: (_, record) => {
        const estadoEvaluacion = record.evaluado;
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Switch
              checked={estadoEvaluacion === true}
              onChange={(checked) => handleCambiarEvaluacion(record.id, checked)}
              checkedChildren="Evaluado"
              unCheckedChildren="No evaluado"
              style={{
                backgroundColor: estadoEvaluacion === null ? '#ebe18a' : (estadoEvaluacion ? '#52c41a' : '#ff4d4f')
              }}
            />
          </div>
        );
      },
    },
    {
      title: 'Observación',
      key: 'observacion',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type={record.observacion ? "primary" : "default"}
          icon={<i className={`bi ${record.observacion ? 'bi-chat-left-text-fill' : 'bi-chat-left-text'}`}></i>}
          onClick={() => abrirModalObservacion(record)}
          style={{
            backgroundColor: record.observacion ? '#3d2817' : undefined,
            borderColor: record.observacion ? '#3d2817' : undefined
          }}
        >
          {record.observacion ? 'Ver/Editar' : 'Agregar'}
        </Button>
      )
    }
  ];

  const calcularEstadisticas = () => {
    const totalInscritos = inscripciones.length;
    const evaluados = inscripciones.filter(item => item.evaluado === true).length;
    const pendientes = inscripciones.filter(item => item.evaluado === null).length;
    const noEvaluados = inscripciones.filter(item => item.evaluado === false).length;

    return { totalInscritos, evaluados, pendientes, noEvaluados };
  };

  if (!tieneAcceso) {
    return (
      <div className="acceso-denegado-container">
        <div className="acceso-denegado-card">
          <i className="bi bi-shield-x"></i>
          <h1>Acceso Denegado</h1>
          <p>No tienes permisos para acceder a este panel.</p>
          <p>Solo instructoras autorizadas pueden controlar la asistencia de la evaluación todera.</p>
          <button onClick={onLogout} className="btn-volver">
            <i className="bi bi-arrow-left-circle"></i> Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header Superior */}
      <header className="admin-header">
        <div className="header-left">
          <ProfileCard userData={userData} onLogout={onLogout} />
          <div className="header-titles">
            <span className="header-logo-text">PANEL LÍNEAS DE PRODUCTO C&W</span>
            <span className="header-subtitle">Control de Evaluaciones - Toderas</span>
          </div>
        </div>
        
        <div className="header-right">
           
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="admin-main">
        <div className="admin-content">
          <h1 className="admin-title">Hola, {nombreUsuario}</h1>
          <h2 className="admin-subtitle">Panel Líneas de Producto C&W</h2>
          <p className="admin-info" style={{ 
            backgroundColor: '#fff7e6', 
            padding: '12px 20px', 
            borderRadius: '8px',
            border: '1px solid #ffd591',
            marginBottom: '20px',
            color: '#d46b08'
          }}>
            <i className="bi bi-info-circle-fill" style={{ marginRight: '8px' }}></i>
            Mostrando solo tus estudiantes asignados
          </p>

          

          {/* Filtros */}
          <div className="filters-container">
            <h3 className="filters-title"> FILTROS DE BÚSQUEDA</h3>
            
            <div className="filters-grid">
              <div className="filter-item">
                <label className="filter-label">Cédula</label>
                <Input
                  placeholder="Buscar por cédula"
                  prefix={<SearchOutlined />}
                  value={filtros.cedula}
                  onChange={(e) => setFiltros({ ...filtros, cedula: e.target.value })}
                  allowClear
                />
              </div>

              <div className="filter-item">
                <label className="filter-label">Punto de Venta</label>
                <Input
                  placeholder="Buscar por punto de venta"
                  prefix={<SearchOutlined />}
                  value={filtros.puntoVenta}
                  onChange={(e) => setFiltros({ ...filtros, puntoVenta: e.target.value })}
                  allowClear
                />
              </div>

             
            </div>

            <div className="filters-actions">
              <Button 
                onClick={limpiarFiltros}
                icon={<i className="bi bi-x-circle"></i>}
              >
                Limpiar Filtros
              </Button>
              <Button 
                type="primary" 
                icon={<DownloadOutlined />}
                onClick={exportarExcel}
                style={{ backgroundColor: '#52B788', borderColor: '#52B788' }}
              >
                Exportar Excel
              </Button>
            </div>
          </div>

          {/* Tabla */}
          <div className="table-card">
            <div className="table-header">
              <div className="table-title">
                <div className="table-icon">
                  <i className="bi bi-clipboard-check"></i>
                </div>
                <strong>Evaluación Todera</strong>
              </div>
              <span className="table-count">
                Total General: {inscripciones.length} | Tus Estudiantes: {dataFiltrada.length}
              </span>
            </div>
            <Table
              columns={columns}
              dataSource={dataFiltrada}
              loading={loading}
              rowKey="id"
              pagination={{ 
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} registros`
              }}
              scroll={{ x: 1500, y: 500 }}
            />
          </div>
        </div>
      </main>

      {/* Modal de Observaciones */}
      <Modal
        title="Observaciones"
        open={modalVisible}
        onOk={guardarObservacion}
        onCancel={() => {
          setModalVisible(false);
          setObservacionActual('');
          setRegistroSeleccionado(null);
        }}
        okText="Guardar"
        cancelText="Cancelar"
        width={600}
      >
        {registroSeleccionado && (
          <div style={{ marginBottom: '15px' }}>
            <strong>Estudiante:</strong> {registroSeleccionado.nombres}<br />
            <strong>Cédula:</strong> {registroSeleccionado.cedula}
          </div>
        )}
        <TextArea
          rows={4}
          value={observacionActual}
          onChange={(e) => setObservacionActual(e.target.value)}
          placeholder="Escriba sus observaciones aquí..."
          maxLength={500}
          showCount
        />
      </Modal>
    </div>
  );
};

export default PanelToderas;
