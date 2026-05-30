import { useEffect, useState, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import {
    getUsuarios,
    crearUsuario,
    actualizarUsuario,
    desactivarUsuario,
    getRoles
} from '../api/usuarios';

const formInicial = {
    nombre: '',
    apellido: '',
    correo: '',
    contrasena: '',
    telefono: '',
    id_rol: '',
};

/* ─── Modal ─── */
const Modal = ({ isOpen, onClose, children }) => {
    const overlayRef = useRef(null);

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) {
            document.addEventListener('keydown', handleKey);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            ref={overlayRef}
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
            style={modalStyles.overlay}
        >
            <div style={modalStyles.container}>
                {children}
            </div>
        </div>
    );
};

const modalStyles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
    },
    container: {
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.18)',
        width: '100%',
        maxWidth: '660px',
        maxHeight: '90vh',
        overflowY: 'auto',
        animation: 'modalIn 0.2s ease',
    },
};

const Usuarios = () => {

    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);

    const [modalAbierto, setModalAbierto] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState(null);

    const [form, setForm] = useState(formInicial);

    const [error, setError] = useState('');
    const [errorModal, setErrorModal] = useState('');
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        cargarUsuarios();
        cargarRoles();
    }, []);

    const cargarUsuarios = async () => {
        setCargando(true);
        try {
            const data = await getUsuarios();
            setUsuarios(data);
        } catch {
            setError('No se pudieron cargar los usuarios');
        } finally {
            setCargando(false);
        }
    };

    const cargarRoles = async () => {
        try {
            const data = await getRoles();
            setRoles(data);
        } catch {
            console.log('Error cargando roles');
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleNuevo = () => {
        setUsuarioEditando(null);
        setForm(formInicial);
        setModalAbierto(true);
        setErrorModal('');
    };

    const handleEditar = (usuario) => {
        setUsuarioEditando(usuario);
        setForm({
            nombre: usuario.nombre || '',
            apellido: usuario.apellido || '',
            correo: usuario.correo || '',
            contrasena: '',
            telefono: usuario.telefono || '',
            id_rol: usuario.id_rol || '',
        });
        setModalAbierto(true);
        setErrorModal('');
    };

    const handleCerrarModal = () => {
        setModalAbierto(false);
        setForm(formInicial);
        setErrorModal('');
    };

    const handleGuardar = async () => {
        if (!form.nombre.trim()) {
            setErrorModal('El nombre es obligatorio');
            return;
        }
        if (!form.correo.trim()) {
            setErrorModal('El correo es obligatorio');
            return;
        }
        if (!usuarioEditando && !form.contrasena.trim()) {
            setErrorModal('La contraseña es obligatoria');
            return;
        }
        try {
            const dataEnviar = { ...form };
            if (usuarioEditando && !form.contrasena.trim()) {
                delete dataEnviar.contrasena;
            }
            if (usuarioEditando) {
                await actualizarUsuario(usuarioEditando.id_usuario, dataEnviar);
            } else {
                await crearUsuario(dataEnviar);
            }
            setModalAbierto(false);
            setForm(formInicial);
            cargarUsuarios();
        } catch (err) {
            console.log(err);
            setErrorModal(
                err.response?.data?.correo?.[0] ||
                err.response?.data?.detail ||
                'Error al guardar usuario'
            );
        }
    };

    const handleEliminar = async (id, nombre) => {
        const confirmar = window.confirm(`¿Deseas desactivar al usuario ${nombre}?`);
        if (!confirmar) return;
        try {
            await desactivarUsuario(id);
            cargarUsuarios();
        } catch {
            setError('Error al desactivar usuario');
        }
    };

    const getInicial = (nombre) => nombre?.charAt(0).toUpperCase() || '?';

    const obtenerNombreRol = (idRol) => {
        const rol = roles.find((r) => r.id_rol === idRol);
        return rol?.nombre_rol || 'Sin rol';
    };

    return (
        <div style={styles.layout}>
            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: translateY(-16px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>

            <Sidebar />

            <div style={styles.contenido}>

                {/* HEADER */}
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.titulo}>👨‍💼 Usuarios</h1>
                        <p style={styles.subtitulo}>
                            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}{' '}
                            registrado{usuarios.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button onClick={handleNuevo} style={styles.botonNuevo}>
                        + Nuevo Usuario
                    </button>
                </div>

                {/* ERROR general */}
                {error && <div style={styles.error}>{error}</div>}

                {/* ─── MODAL ─── */}
                <Modal isOpen={modalAbierto} onClose={handleCerrarModal}>
                    {/* Header */}
                    <div style={styles.modalHeader}>
                        <div>
                            <div style={styles.modalIconRow}>
                                <div style={styles.modalIconCircle}>
                                    <span style={{ fontSize: '20px' }}>👨‍💼</span>
                                </div>
                                <h2 style={styles.modalTitulo}>
                                    {usuarioEditando ? 'Editar Usuario' : 'Nuevo Usuario'}
                                </h2>
                            </div>
                            <p style={styles.modalSubtitulo}>
                                {usuarioEditando
                                    ? 'Modifica los datos del usuario'
                                    : 'Completa los datos del nuevo usuario'}
                            </p>
                        </div>
                        <button onClick={handleCerrarModal} style={styles.botonCerrar}>✕</button>
                    </div>

                    {/* Body */}
                    <div style={styles.modalBody}>
                        {errorModal && (
                            <div style={styles.errorModal}>
                                <span>⚠️</span> {errorModal}
                            </div>
                        )}

                        <div style={styles.formGrid}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Nombre <span style={styles.requerido}>*</span></label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={form.nombre}
                                    onChange={handleChange}
                                    style={styles.input}
                                    placeholder="Ej: Juan"
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Apellido</label>
                                <input
                                    type="text"
                                    name="apellido"
                                    value={form.apellido}
                                    onChange={handleChange}
                                    style={styles.input}
                                    placeholder="Ej: Pérez"
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Correo <span style={styles.requerido}>*</span></label>
                                <input
                                    type="email"
                                    name="correo"
                                    value={form.correo}
                                    onChange={handleChange}
                                    style={styles.input}
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>
                                    Contraseña {!usuarioEditando && <span style={styles.requerido}>*</span>}
                                </label>
                                <input
                                    type="password"
                                    name="contrasena"
                                    value={form.contrasena}
                                    onChange={handleChange}
                                    style={styles.input}
                                    placeholder={usuarioEditando ? 'Dejar vacío para no cambiar' : ''}
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Teléfono</label>
                                <input
                                    type="text"
                                    name="telefono"
                                    value={form.telefono}
                                    onChange={handleChange}
                                    style={styles.input}
                                    placeholder="Ej: 3001234567"
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Rol</label>
                                <select
                                    name="id_rol"
                                    value={form.id_rol}
                                    onChange={handleChange}
                                    style={styles.select}
                                >
                                    <option value="">Seleccione un rol</option>
                                    {roles.map((rol) => (
                                        <option key={rol.id_rol} value={rol.id_rol}>
                                            {rol.nombre_rol}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={styles.modalFooter}>
                        <button onClick={handleCerrarModal} style={styles.botonCancelar}>
                            Cancelar
                        </button>
                        <button onClick={handleGuardar} style={styles.botonGuardar}>
                            💾 {usuarioEditando ? 'Guardar Cambios' : 'Crear Usuario'}
                        </button>
                    </div>
                </Modal>

                {/* LISTA */}
                {cargando ? (
                    <div style={styles.cargando}>Cargando usuarios...</div>
                ) : usuarios.length === 0 ? (
                    <div style={styles.sinDatos}>
                        <p style={{ fontSize: '40px' }}>👨‍💼</p>
                        <p>No hay usuarios registrados</p>
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {usuarios.map((u) => (
                            <div key={u.id_usuario} style={styles.usuarioCard}>
                                <div style={styles.cardTop}>
                                    <div style={styles.avatar}>{getInicial(u.nombre)}</div>
                                    <div style={styles.usuarioInfo}>
                                        <p style={styles.usuarioNombre}>{u.nombre} {u.apellido}</p>
                                        <p style={styles.usuarioCorreo}>✉️ {u.correo}</p>
                                    </div>
                                    <span style={{
                                        ...styles.badge,
                                        backgroundColor: u.id_rol === 1 ? '#fff3e0' : '#e8f5ee',
                                        color: u.id_rol === 1 ? '#ef6c00' : '#2e7d52',
                                    }}>
                                        {obtenerNombreRol(u.id_rol)}
                                    </span>
                                </div>

                                <div style={styles.cardInfo}>
                                    {u.telefono && (
                                        <p style={styles.infoItem}>📞 {u.telefono}</p>
                                    )}
                                </div>

                                <div style={styles.cardAcciones}>
                                    <button onClick={() => handleEditar(u)} style={styles.botonEditar}>
                                        ✏️ Editar
                                    </button>
                                    <button
                                        onClick={() => handleEliminar(u.id_usuario, u.nombre)}
                                        style={styles.botonEliminar}
                                    >
                                        🗑️ Desactivar
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
    botonNuevo: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },

    error: { color: '#e53935', backgroundColor: '#fdecea', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' },

    // Modal
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 0 28px' },
    modalIconRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' },
    modalIconCircle: { width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    modalTitulo: { fontSize: '20px', fontWeight: 'bold', color: '#2d2d2d', margin: 0 },
    modalSubtitulo: { fontSize: '13px', color: '#888', margin: '2px 0 0 54px' },
    botonCerrar: { background: 'none', border: 'none', fontSize: '18px', color: '#aaa', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', lineHeight: 1, flexShrink: 0 },

    modalBody: { padding: '20px 28px' },
    errorModal: { display: 'flex', gap: '8px', alignItems: 'center', color: '#e53935', backgroundColor: '#fdecea', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' },

    modalFooter: { display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '16px 28px 24px 28px', borderTop: '1px solid #f0f0f0' },
    botonGuardar: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' },
    botonCancelar: { backgroundColor: 'white', color: '#666', border: '1.5px solid #ddd', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },

    // Form
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', color: '#555', fontWeight: '600' },
    requerido: { color: '#e53935' },
    input: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
    select: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', width: '100%' },

    // Grid de cards
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
    usuarioCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' },
    cardTop: { display: 'flex', alignItems: 'center', gap: '12px' },
    avatar: { width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#2e7d52', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', flexShrink: 0 },
    usuarioInfo: { flex: 1 },
    usuarioNombre: { margin: 0, fontWeight: 'bold', color: '#2d2d2d' },
    usuarioCorreo: { margin: '4px 0 0 0', fontSize: '12px', color: '#777' },
    badge: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' },
    cardInfo: { borderTop: '1px solid #f0f4f0', paddingTop: '10px' },
    infoItem: { margin: 0, fontSize: '13px', color: '#555' },
    cardAcciones: { display: 'flex', gap: '8px', borderTop: '1px solid #f0f4f0', paddingTop: '12px' },
    botonEditar: { flex: 1, backgroundColor: '#e8f5ee', color: '#2e7d52', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' },
    botonEliminar: { flex: 1, backgroundColor: '#fdecea', color: '#e53935', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' },

    cargando: { textAlign: 'center', padding: '40px', color: '#888' },
    sinDatos: { backgroundColor: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', color: '#999' },
};

export default Usuarios;
