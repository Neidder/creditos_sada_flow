import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
    getClientes, crearCliente,
    actualizarCliente, eliminarCliente, buscarClientes
} from '../api/clientes';

const formInicial = {
    nombre: '',
    apellido: '',
    documento: '',
    telefono: '',
    correo: '',
    direccion: '',
};

const Clientes = () => {
    const [clientes, setClientes] = useState([]);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [clienteEditando, setClienteEditando] = useState(null);
    const [error, setError] = useState('');
    const [form, setForm] = useState(formInicial);
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(false);

    useEffect(() => { cargarClientes(); }, []);

    const cargarClientes = async () => {
        setCargando(true);
        try {
            const data = await getClientes();
            setClientes(data);
        } catch {
            setError('No se pudieron cargar los clientes');
        } finally {
            setCargando(false);
        }
    };

    const handleBuscar = async (e) => {
        const valor = e.target.value;
        setBusqueda(valor);
        if (valor.trim().length >= 2) {
            try {
                const data = await buscarClientes(valor);
                setClientes(data);
            } catch {
                setError('Error al buscar clientes');
            }
        } else if (valor.trim().length === 0) {
            cargarClientes();
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleNuevo = () => {
        setClienteEditando(null);
        setForm(formInicial);
        setMostrarForm(true);
        setError('');
    };

    const handleEditar = (cliente) => {
        setClienteEditando(cliente);
        setForm({
            nombre: cliente.nombre,
            apellido: cliente.apellido || '',
            documento: cliente.documento || '',
            telefono: cliente.telefono || '',
            correo: cliente.correo || '',
            direccion: cliente.direccion || '',
        });
        setMostrarForm(true);
        setError('');
    };

    const handleGuardar = async () => {
        if (!form.nombre.trim()) {
            setError('El nombre es obligatorio');
            return;
        }
        try {
            if (clienteEditando) {
                await actualizarCliente(clienteEditando.id_cliente, form);
            } else {
                await crearCliente(form);
            }
            setMostrarForm(false);
            cargarClientes();
            setError('');
        } catch (err) {
            const msg = err.response?.data?.documento?.[0]
                || err.response?.data?.telefono?.[0]
                || 'Error al guardar el cliente';
            setError(msg);
        }
    };

    const handleEliminar = async (id, nombre) => {
        if (!confirm(`¿Seguro que quieres desactivar a ${nombre}?`)) return;
        try {
            await eliminarCliente(id);
            cargarClientes();
        } catch {
            setError('Error al eliminar el cliente');
        }
    };

    // Inicial del nombre para el avatar
    const getInicial = (nombre) => nombre?.charAt(0).toUpperCase() || '?';

    return (
        <div style={styles.layout}>
            <Sidebar />
            <div style={styles.contenido}>

                {/* Encabezado */}
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.titulo}>👥 Clientes</h1>
                        <p style={styles.subtitulo}>
                            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button onClick={handleNuevo} style={styles.botonNuevo}>
                        + Nuevo Cliente
                    </button>
                </div>

                {/* Buscador */}
                <div style={styles.buscadorContainer}>
                    <span style={styles.buscadorIcon}>🔍</span>
                    <input
                        placeholder="Buscar por nombre, apellido o documento..."
                        value={busqueda}
                        onChange={handleBuscar}
                        style={styles.buscador}
                    />
                </div>

                {error && <p style={styles.error}>{error}</p>}

                {/* Formulario */}
                {mostrarForm && (
                    <div style={styles.formulario}>
                        <h3 style={styles.formTitulo}>
                            {clienteEditando ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}
                        </h3>
                        <div style={styles.formGrid}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Nombre *</label>
                                <input
                                    name="nombre"
                                    placeholder=""
                                    value={form.nombre}
                                    onChange={handleChange}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Apellido</label>
                                <input
                                    name="apellido"
                                    placeholder=" "
                                    value={form.apellido}
                                    onChange={handleChange}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Documento</label>
                                <input
                                    name="documento"
                                    placeholder=" "
                                    value={form.documento}
                                    onChange={handleChange}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Teléfono</label>
                                <input
                                    name="telefono"
                                    placeholder=""
                                    value={form.telefono}
                                    onChange={handleChange}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Correo</label>
                                <input
                                    name="correo"
                                    placeholder=""
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
                                    placeholder=""
                                    value={form.direccion}
                                    onChange={handleChange}
                                    style={styles.input}
                                />
                            </div>
                        </div>
                        <div style={styles.formBotones}>
                            <button onClick={handleGuardar} style={styles.botonGuardar}>
                                💾 Guardar Cliente
                            </button>
                            <button onClick={() => setMostrarForm(false)} style={styles.botonCancelar}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Lista de clientes */}
                {cargando ? (
                    <div style={styles.cargando}>Cargando clientes...</div>
                ) : clientes.length === 0 ? (
                    <div style={styles.sinDatos}>
                        <p style={{ fontSize: '40px', margin: 0 }}>👥</p>
                        <p>No hay clientes registrados</p>
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {clientes.map((c) => (
                            <div key={c.id_cliente} style={styles.clienteCard}>

                                {/* Avatar + nombre */}
                                <div style={styles.cardTop}>
                                    <div style={styles.avatar}>
                                        {getInicial(c.nombre)}
                                    </div>
                                    <div style={styles.clienteNombreBlock}>
                                        <p style={styles.clienteNombre}>
                                            {c.nombre} {c.apellido || ''}
                                        </p>
                                        {c.documento && (
                                            <p style={styles.clienteDoc}>
                                                🪪 {c.documento}
                                            </p>
                                        )}
                                    </div>
                                    <span style={{
                                        ...styles.badge,
                                        backgroundColor: c.activo ? '#e8f5ee' : '#fdecea',
                                        color: c.activo ? '#2e7d52' : '#e53935',
                                    }}>
                                        {c.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>

                                {/* Info de contacto */}
                                <div style={styles.cardInfo}>
                                    {c.telefono && (
                                        <p style={styles.infoItem}>📞 {c.telefono}</p>
                                    )}
                                    {c.correo && (
                                        <p style={styles.infoItem}>✉️ {c.correo}</p>
                                    )}
                                    {c.direccion && (
                                        <p style={styles.infoItem}>📍 {c.direccion}</p>
                                    )}
                                </div>

                                {/* Fecha de registro */}
                                {c.fecha_registro && (
                                    <p style={styles.fechaRegistro}>
                                        Cliente desde: {new Date(c.fecha_registro).toLocaleDateString('es-CO')}
                                    </p>
                                )}

                                {/* Acciones */}
                                <div style={styles.cardAcciones}>
                                    <button
                                        onClick={() => handleEditar(c)}
                                        style={styles.botonEditar}
                                    >
                                        ✏️ Editar
                                    </button>
                                    <button
                                        onClick={() => handleEliminar(c.id_cliente, c.nombre)}
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
    clienteCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' },

    cardTop: { display: 'flex', alignItems: 'center', gap: '12px' },
    avatar: { width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#2e7d52', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', flexShrink: 0 },
    clienteNombreBlock: { flex: 1 },
    clienteNombre: { fontSize: '15px', fontWeight: 'bold', color: '#2d2d2d', margin: 0 },
    clienteDoc: { fontSize: '12px', color: '#888', margin: '2px 0 0 0' },
    badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', flexShrink: 0 },

    cardInfo: { display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #f0f4f0', paddingTop: '12px' },
    infoItem: { fontSize: '13px', color: '#555', margin: 0 },
    fechaRegistro: { fontSize: '11px', color: '#aaa', margin: 0 },

    cardAcciones: { display: 'flex', gap: '8px', borderTop: '1px solid #f0f4f0', paddingTop: '12px' },
    botonEditar: { flex: 1, backgroundColor: '#e8f5ee', color: '#2e7d52', border: 'none', padding: '7px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    botonEliminar: { flex: 1, backgroundColor: '#fdecea', color: '#e53935', border: 'none', padding: '7px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },

    cargando: { textAlign: 'center', padding: '40px', color: '#888' },
    sinDatos: { backgroundColor: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', color: '#999' },
};

export default Clientes;