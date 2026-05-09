import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
    getProveedores, crearProveedor,
    actualizarProveedor, eliminarProveedor
} from '../api/proveedores';

const formInicial = {
    nombre_empresa: '',
    contacto: '',
    telefono: '',
    correo: '',
    direccion: '',
};

const Proveedores = () => {
    const [proveedores, setProveedores] = useState([]);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [proveedorEditando, setProveedorEditando] = useState(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState(formInicial);
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(false);

    useEffect(() => { cargarProveedores(); }, []);

    const cargarProveedores = async () => {
        setCargando(true);
        try {
            const data = await getProveedores();
            setProveedores(data);
        } catch {
            setError('No se pudieron cargar los proveedores');
        } finally {
            setCargando(false);
        }
    };

    const proveedoresFiltrados = proveedores.filter(p =>
        p.nombre_empresa?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.contacto?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.correo?.toLowerCase().includes(busqueda.toLowerCase())
    );

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleNuevo = () => {
        setProveedorEditando(null);
        setForm(formInicial);
        setMostrarForm(true);
        setError('');
    };

    const handleEditar = (proveedor) => {
        setProveedorEditando(proveedor);
        setForm({
            nombre_empresa: proveedor.nombre_empresa,
            contacto: proveedor.contacto || '',
            telefono: proveedor.telefono || '',
            correo: proveedor.correo || '',
            direccion: proveedor.direccion || '',
        });
        setMostrarForm(true);
        setError('');
    };

    const handleGuardar = async () => {
        if (!form.nombre_empresa.trim()) {
            setError('El nombre de la empresa es obligatorio');
            return;
        }
        try {
            if (proveedorEditando) {
                await actualizarProveedor(proveedorEditando.id_proveedor, form);
            } else {
                await crearProveedor({ ...form, activo: true });
            }
            setMostrarForm(false);
            cargarProveedores();
            setError('');
        } catch {
            setError('Error al guardar el proveedor');
        }
    };

    const handleEliminar = async (id, nombre) => {
        if (!confirm(`¿Seguro que quieres desactivar a ${nombre}?`)) return;
        try {
            await eliminarProveedor(id);
            cargarProveedores();
        } catch {
            setError('Error al eliminar el proveedor');
        }
    };

    // Iniciales para el avatar
    const getIniciales = (nombre) => {
        const palabras = nombre?.split(' ') || [];
        if (palabras.length >= 2) {
            return (palabras[0][0] + palabras[1][0]).toUpperCase();
        }
        return nombre?.charAt(0).toUpperCase() || '?';
    };

    return (
        <div style={styles.layout}>
            <Sidebar />
            <div style={styles.contenido}>

                {/* Encabezado */}
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.titulo}>🏭 Proveedores</h1>
                        <p style={styles.subtitulo}>
                            {proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''} registrado{proveedores.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button onClick={handleNuevo} style={styles.botonNuevo}>
                        + Nuevo Proveedor
                    </button>
                </div>

                {/* Buscador */}
                <div style={styles.buscadorContainer}>
                    <span style={styles.buscadorIcon}>🔍</span>
                    <input
                        placeholder="Buscar por empresa, contacto o correo..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        style={styles.buscador}
                    />
                </div>

                {error && <p style={styles.error}>{error}</p>}

                {/* Formulario */}
                {mostrarForm && (
                    <div style={styles.formulario}>
                        <h3 style={styles.formTitulo}>
                            {proveedorEditando ? '✏️ Editar Proveedor' : '➕ Nuevo Proveedor'}
                        </h3>
                        <div style={styles.formGrid}>
                            <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
                                <label style={styles.label}>Nombre de la Empresa *</label>
                                <input
                                    name="nombre_empresa"
                                    placeholder="Ej: Proveedor Tecnología SAS"
                                    value={form.nombre_empresa}
                                    onChange={handleChange}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Persona de Contacto</label>
                                <input
                                    name="contacto"
                                    placeholder="Ej: Juan García"
                                    value={form.contacto}
                                    onChange={handleChange}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Teléfono</label>
                                <input
                                    name="telefono"
                                    placeholder="Ej: 3001234567"
                                    value={form.telefono}
                                    onChange={handleChange}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Correo</label>
                                <input
                                    name="correo"
                                    placeholder="Ej: proveedor@mail.com"
                                    type="email"
                                    value={form.correo}
                                    onChange={handleChange}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Dirección</label>
                                <input
                                    name="direccion"
                                    placeholder="Ej: Calle 10 # 5-20"
                                    value={form.direccion}
                                    onChange={handleChange}
                                    style={styles.input}
                                />
                            </div>
                        </div>
                        <div style={styles.formBotones}>
                            <button onClick={handleGuardar} style={styles.botonGuardar}>
                                💾 Guardar Proveedor
                            </button>
                            <button onClick={() => setMostrarForm(false)} style={styles.botonCancelar}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Lista */}
                {cargando ? (
                    <div style={styles.sinDatos}>Cargando proveedores...</div>
                ) : proveedoresFiltrados.length === 0 ? (
                    <div style={styles.sinDatos}>
                        <p style={{ fontSize: '40px', margin: 0 }}>🏭</p>
                        <p>{busqueda ? 'No se encontraron resultados' : 'No hay proveedores registrados'}</p>
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {proveedoresFiltrados.map((p) => (
                            <div key={p.id_proveedor} style={styles.card}>

                                {/* Top de la card */}
                                <div style={styles.cardTop}>
                                    <div style={styles.avatar}>
                                        {getIniciales(p.nombre_empresa)}
                                    </div>
                                    <div style={styles.cardTitleBlock}>
                                        <p style={styles.empresa}>{p.nombre_empresa}</p>
                                        {p.contacto && (
                                            <p style={styles.contacto}>👤 {p.contacto}</p>
                                        )}
                                    </div>
                                    <span style={{
                                        ...styles.badge,
                                        backgroundColor: p.activo ? '#e8f5ee' : '#fdecea',
                                        color: p.activo ? '#2e7d52' : '#e53935',
                                    }}>
                                        {p.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>

                                {/* Info de contacto */}
                                <div style={styles.cardInfo}>
                                    {p.telefono && (
                                        <p style={styles.infoItem}>📞 {p.telefono}</p>
                                    )}
                                    {p.correo && (
                                        <p style={styles.infoItem}>✉️ {p.correo}</p>
                                    )}
                                    {p.direccion && (
                                        <p style={styles.infoItem}>📍 {p.direccion}</p>
                                    )}
                                </div>

                                {/* Fecha registro */}
                                {p.fecha_registro && (
                                    <p style={styles.fechaRegistro}>
                                        Desde: {new Date(p.fecha_registro).toLocaleDateString('es-CO')}
                                    </p>
                                )}

                                {/* Acciones */}
                                <div style={styles.cardAcciones}>
                                    <button
                                        onClick={() => handleEditar(p)}
                                        style={styles.botonEditar}
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button
                                        onClick={() => handleEliminar(p.id_proveedor, p.nombre_empresa)}
                                        style={styles.botonEliminar}
                                    >
                                        🗑️ Eliminar
                                    </button>
                                </div>

                            </div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
};

const styles = {
    layout: { display: 'flex', minHeight: '100vh', backgroundColor: '#f0f4f0' },
    contenido: { marginLeft: '250px', flex: 1, padding: '30px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e0ede6' },
    titulo: { fontSize: '26px', color: '#2e7d52', fontWeight: 'bold', margin: 0 },
    subtitulo: { color: '#666', marginTop: '4px', fontSize: '14px' },
    botonNuevo: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },

    buscadorContainer: { display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1.5px solid #e0ede6', borderRadius: '10px', padding: '0 15px', marginBottom: '20px' },
    buscadorIcon: { fontSize: '16px', marginRight: '10px' },
    buscador: { border: 'none', outline: 'none', padding: '12px 0', fontSize: '14px', width: '100%', backgroundColor: 'transparent' },

    error: { color: '#e53935', backgroundColor: '#fdecea', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' },

    formulario: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 2px 15px rgba(0,0,0,0.06)' },
    formTitulo: { color: '#2e7d52', marginBottom: '20px', marginTop: 0 },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', color: '#555', fontWeight: '600' },
    input: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none' },
    formBotones: { display: 'flex', gap: '10px' },
    botonGuardar: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    botonCancelar: { backgroundColor: 'white', color: '#666', border: '1px solid #ddd', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },

    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
    card: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' },

    cardTop: { display: 'flex', alignItems: 'center', gap: '12px' },
    avatar: { width: '46px', height: '46px', borderRadius: '10px', backgroundColor: '#1565c0', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', flexShrink: 0 },
    cardTitleBlock: { flex: 1 },
    empresa: { fontSize: '14px', fontWeight: 'bold', color: '#2d2d2d', margin: 0 },
    contacto: { fontSize: '12px', color: '#888', margin: '2px 0 0 0' },
    badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', flexShrink: 0 },

    cardInfo: { display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #f0f4f0', paddingTop: '12px' },
    infoItem: { fontSize: '13px', color: '#555', margin: 0 },
    fechaRegistro: { fontSize: '11px', color: '#aaa', margin: 0 },

    cardAcciones: { display: 'flex', gap: '8px', borderTop: '1px solid #f0f4f0', paddingTop: '12px' },
    botonEditar: { flex: 1, backgroundColor: '#e8f5ee', color: '#2e7d52', border: 'none', padding: '7px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    botonEliminar: { flex: 1, backgroundColor: '#fdecea', color: '#e53935', border: 'none', padding: '7px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },

    sinDatos: { backgroundColor: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', color: '#999' },
};

export default Proveedores;