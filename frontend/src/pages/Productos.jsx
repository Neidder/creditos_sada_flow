import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import {
    getProductos, crearProducto,
    actualizarProducto, eliminarProducto
} from '../api/productos';

const TIPOS_TALLA = {
    ropa: {
        label: '👕 Ropa',
        descripcion: 'XS, S, M, L, XL, XXL',
        tallas: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    },
    numerico_adulto: {
        label: '👖 Pantalón adulto',
        descripcion: '28 al 40',
        tallas: ['28', '30', '32', '34', '36', '38', '40'],
    },
    jeans_dama: {
        label: '👗 Jeans dama / Mochos',
        descripcion: '1, 3, 5, 7, 9, 10, 12, 14',
        tallas: ['1', '3', '5', '7', '9', '10', '12', '14'],
    },
    unica: {
        label: '🏷️ Talla única',
        descripcion: 'Un solo tamaño',
        tallas: ['ÚNICA'],
    },
};

const formInicial = {
    nombre: '',
    descripcion: '',
    precio_venta: '',
    costo_promedio: '',
    stock: '0',
};

const tallasIniciales = (tipo = 'ropa') =>
    TIPOS_TALLA[tipo].tallas.map(t => ({ talla: t, cantidad: 0, activa: false }));

const detectarTipo = (tallasProducto) => {
    if (!tallasProducto || tallasProducto.length === 0) return 'ropa';
    const primera = tallasProducto[0].talla;
    if (primera === 'ÚNICA') return 'unica';
    if (['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(primera)) return 'ropa';
    if (['28', '30', '32', '34', '36', '38', '40'].includes(primera)) return 'numerico_adulto';
    if (['1', '3', '5', '7', '9', '10', '12', '14'].includes(primera)) return 'jeans_dama';
    return 'ropa';
};

// ── Modal reutilizable ──
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
        maxWidth: '640px',
        maxHeight: '90vh',
        overflowY: 'auto',
        animation: 'modalIn 0.2s ease',
    },
};

const Productos = () => {
    const [productos, setProductos] = useState([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [productoEditando, setProductoEditando] = useState(null);
    const [error, setError] = useState('');
    const [errorModal, setErrorModal] = useState('');
    const [form, setForm] = useState(formInicial);
    const [tallas, setTallas] = useState(tallasIniciales('ropa'));
    const [tipoTalla, setTipoTalla] = useState('ropa');
    const [expandido, setExpandido] = useState(null);

    useEffect(() => { cargarProductos(); }, []);

    const cargarProductos = async () => {
        try {
            const data = await getProductos();
            setProductos(data);
        } catch {
            setError('No se pudieron cargar los productos');
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleTipoTallaChange = (tipo) => {
        setTipoTalla(tipo);
        setTallas(tallasIniciales(tipo));
        setForm(prev => ({ ...prev, stock: '0' }));
    };

    const handleTallaToggle = (index) => {
        const nuevas = [...tallas];
        nuevas[index].activa = !nuevas[index].activa;
        if (!nuevas[index].activa) nuevas[index].cantidad = 0;
        setTallas(nuevas);
        recalcularStock(nuevas);
    };

    const handleTallaCantidad = (index, valor) => {
        const nuevas = [...tallas];
        nuevas[index].cantidad = parseInt(valor) || 0;
        setTallas(nuevas);
        recalcularStock(nuevas);
    };

    const recalcularStock = (tallasActuales) => {
        const total = tallasActuales
            .filter(t => t.activa)
            .reduce((sum, t) => sum + t.cantidad, 0);
        setForm(prev => ({ ...prev, stock: total.toString() }));
    };

    const handleNuevo = () => {
        setProductoEditando(null);
        setForm(formInicial);
        setTipoTalla('ropa');
        setTallas(tallasIniciales('ropa'));
        setErrorModal('');
        setModalAbierto(true);
    };

    const handleEditar = (producto) => {
        setProductoEditando(producto);
        setForm({
            nombre: producto.nombre,
            descripcion: producto.descripcion || '',
            precio_venta: producto.precio_venta,
            costo_promedio: producto.costo_promedio || '',
            stock: producto.stock.toString(),
        });
        const tipo = detectarTipo(producto.tallas);
        setTipoTalla(tipo);
        const tallasEdit = TIPOS_TALLA[tipo].tallas.map(t => {
            const encontrada = producto.tallas?.find(pt => pt.talla === t);
            return { talla: t, cantidad: encontrada ? encontrada.cantidad : 0, activa: !!encontrada };
        });
        setTallas(tallasEdit);
        setErrorModal('');
        setModalAbierto(true);
    };

    const handleCerrarModal = () => {
        setModalAbierto(false);
        setErrorModal('');
    };

    const handleGuardar = async () => {
        if (!form.nombre || !form.precio_venta) {
            setErrorModal('Nombre y precio de venta son obligatorios');
            return;
        }
        const precioVenta = parseFloat(form.precio_venta);
        const costoPromedio = parseFloat(form.costo_promedio);
        if (form.costo_promedio && !isNaN(costoPromedio) && precioVenta < costoPromedio) {
            setErrorModal(
                `⚠️ El precio de venta ($${precioVenta.toLocaleString()}) no puede ser inferior al costo promedio ($${costoPromedio.toLocaleString()}). Estarías vendiendo a pérdida.`
            );
            return;
        }
        const tallasActivas = tallas.filter(t => t.activa).map(t => ({ talla: t.talla, cantidad: t.cantidad }));
        if (tallasActivas.length === 0) {
            setErrorModal('Debes seleccionar al menos una talla');
            return;
        }
        const payload = { ...form, tallas: tallasActivas };
        try {
            if (productoEditando) {
                await actualizarProducto(productoEditando.id_producto, payload);
            } else {
                await crearProducto(payload);
            }
            setModalAbierto(false);
            cargarProductos();
            setError('');
        } catch (err) {
            const msg = err.response?.data?.error
                || err.response?.data?.precio_venta?.[0]
                || 'Error al guardar el producto';
            setErrorModal(msg);
        }
    };

    const handleEliminar = async (id) => {
        if (!confirm('¿Seguro que quieres desactivar este producto?')) return;
        try {
            await eliminarProducto(id);
            cargarProductos();
        } catch {
            setError('Error al eliminar el producto');
        }
    };

    // Alertas en tiempo real dentro del modal
    const precioVentaNum = parseFloat(form.precio_venta);
    const costoPromedioNum = parseFloat(form.costo_promedio);
    const hayAlertaPrecio =
        form.precio_venta && form.costo_promedio &&
        !isNaN(precioVentaNum) && !isNaN(costoPromedioNum) &&
        precioVentaNum < costoPromedioNum;

    const margenGanancia =
        form.precio_venta && form.costo_promedio &&
        !isNaN(precioVentaNum) && !isNaN(costoPromedioNum) && costoPromedioNum > 0
            ? (((precioVentaNum - costoPromedioNum) / costoPromedioNum) * 100).toFixed(1)
            : null;

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

                {/* Encabezado */}
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.titulo}>👕 Productos</h1>
                        <p style={styles.subtitulo}>Gestiona tu inventario de ropa</p>
                    </div>
                    <button onClick={handleNuevo} style={styles.botonNuevo}>
                        + Nuevo Producto
                    </button>
                </div>

                {error && <p style={styles.error}>{error}</p>}

                {/* ── Modal crear / editar ── */}
                <Modal isOpen={modalAbierto} onClose={handleCerrarModal}>
                    <div style={styles.modalHeader}>
                        <div>
                            <div style={styles.modalIconRow}>
                                <div style={styles.modalIconCircle}>
                                    <span style={{ fontSize: '20px' }}>
                                        {productoEditando ? '✏️' : '👕'}
                                    </span>
                                </div>
                                <h2 style={styles.modalTitulo}>
                                    {productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
                                </h2>
                            </div>
                            <p style={styles.modalSubtitulo}>
                                {productoEditando
                                    ? `Modificando "${productoEditando.nombre}"`
                                    : 'Completa los datos del nuevo producto'}
                            </p>
                        </div>
                        <button onClick={handleCerrarModal} style={styles.botonCerrar}>✕</button>
                    </div>

                    <div style={styles.modalBody}>
                        {errorModal && (
                            <div style={styles.errorModal}>
                                <span>⚠️</span> {errorModal}
                            </div>
                        )}

                        {/* Nota para productos nuevos */}
                        {!productoEditando && (
                            <div style={styles.notaInfo}>
                                ℹ️ La <strong>cantidad</strong> y el <strong>costo promedio</strong> se establecen al registrar la primera <strong>Compra</strong>.
                            </div>
                        )}

                        {/* Datos básicos */}
                        <div style={styles.formGrid}>
                            <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
                                <label style={styles.label}>Nombre <span style={styles.requerido}>*</span></label>
                                <input
                                    name="nombre"
                                    placeholder="Ej: Pantalón Levis"
                                    value={form.nombre}
                                    onChange={handleChange}
                                    style={styles.input}
                                    autoFocus
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>
                                    Precio de Venta <span style={styles.requerido}>*</span>
                                    {margenGanancia !== null && !hayAlertaPrecio && (
                                        <span style={{ color: parseFloat(margenGanancia) >= 0 ? '#2e7d52' : '#e53935', fontSize: '12px', fontWeight: '600', marginLeft: '6px' }}>
                                            ({margenGanancia >= 0 ? '+' : ''}{margenGanancia}% margen)
                                        </span>
                                    )}
                                </label>
                                <input
                                    name="precio_venta"
                                    placeholder="Ej: 50000"
                                    type="number"
                                    min="0"
                                    value={form.precio_venta}
                                    onChange={handleChange}
                                    style={{
                                        ...styles.input,
                                        borderColor: hayAlertaPrecio ? '#e53935' : '#e0ede6',
                                        backgroundColor: hayAlertaPrecio ? '#fff5f5' : '#fafffe',
                                    }}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Costo Promedio</label>
                                <input
                                    name="costo_promedio"
                                    placeholder={productoEditando ? 'Ej: 30000' : 'Se actualiza con compras'}
                                    type="number"
                                    min="0"
                                    value={form.costo_promedio}
                                    onChange={handleChange}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Stock Total (calculado)</label>
                                <input
                                    value={productoEditando ? form.stock : '0 — se llena con compras'}
                                    readOnly
                                    style={{ ...styles.input, backgroundColor: '#f0f4f0', color: '#2e7d52', fontWeight: 'bold' }}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Descripción</label>
                                <input
                                    name="descripcion"
                                    placeholder="Ej: Tipo polo, algodón 100%"
                                    value={form.descripcion}
                                    onChange={handleChange}
                                    style={styles.input}
                                />
                            </div>
                        </div>

                        {/* Alerta precio < costo */}
                        {hayAlertaPrecio && (
                            <div style={styles.alertaPrecio}>
                                ⚠️ <strong>Atención:</strong> El precio de venta (${precioVentaNum.toLocaleString()}) es menor al costo promedio (${costoPromedioNum.toLocaleString()}). Pérdida de ${(costoPromedioNum - precioVentaNum).toLocaleString()} por unidad.
                            </div>
                        )}

                        {/* Tipo de talla */}
                        <div style={styles.tipoTallaSeccion}>
                            <p style={styles.seccionTitulo}>📐 Tipo de talla</p>
                            <div style={styles.tipoTallaGrid}>
                                {Object.entries(TIPOS_TALLA).map(([key, cfg]) => (
                                    <div
                                        key={key}
                                        onClick={() => handleTipoTallaChange(key)}
                                        style={{
                                            ...styles.tipoTallaCard,
                                            borderColor: tipoTalla === key ? '#2e7d52' : '#e0ede6',
                                            backgroundColor: tipoTalla === key ? '#e8f5ee' : 'white',
                                        }}
                                    >
                                        <span style={styles.tipoTallaLabel}>{cfg.label}</span>
                                        <span style={styles.tipoTallaDesc}>{cfg.descripcion}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tallas */}
                        <div style={styles.tallasSeccion}>
                            <p style={styles.seccionTitulo}>
                                👗 Tallas disponibles
                                <span style={styles.tallasHint}>
                                    {productoEditando
                                        ? ' — Marca las tallas activas'
                                        : ' — Las cantidades se llenarán con compras'}
                                </span>
                            </p>
                            <div style={styles.tallasGrid}>
                                {tallas.map((t, i) => (
                                    <div
                                        key={t.talla}
                                        style={{
                                            ...styles.tallaCard,
                                            ...(t.activa ? styles.tallaCardActiva : {})
                                        }}
                                    >
                                        <div style={styles.tallaHeader} onClick={() => handleTallaToggle(i)}>
                                            <span style={styles.tallaCheck}>{t.activa ? '✅' : '⬜'}</span>
                                            <span style={styles.tallaNombre}>{t.talla}</span>
                                        </div>
                                        {t.activa && productoEditando && (
                                            <input
                                                type="number"
                                                min="0"
                                                value={t.cantidad}
                                                onChange={(e) => handleTallaCantidad(i, e.target.value)}
                                                style={styles.tallaCantidad}
                                                placeholder="Cant."
                                            />
                                        )}
                                        {t.activa && !productoEditando && (
                                            <span style={styles.tallaNotaCompra}>Vía compras</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={styles.modalFooter}>
                        <button onClick={handleCerrarModal} style={styles.botonCancelar}>
                            Cancelar
                        </button>
                        <button
                            onClick={handleGuardar}
                            style={{ ...styles.botonGuardar, opacity: hayAlertaPrecio ? 0.7 : 1 }}
                        >
                            {productoEditando ? '💾 Guardar cambios' : '✅ Crear Producto'}
                        </button>
                    </div>
                </Modal>

                {/* Lista de productos */}
                <div style={styles.listaContainer}>
                    {productos.length === 0 ? (
                        <div style={styles.sinDatos}>
                            <p style={{ fontSize: '40px', margin: 0 }}>👕</p>
                            <p>No hay productos registrados</p>
                        </div>
                    ) : (
                        productos.map((p) => {
                            const pv = parseFloat(p.precio_venta || 0);
                            const cp = parseFloat(p.costo_promedio || 0);
                            const margen = cp > 0 ? (((pv - cp) / cp) * 100).toFixed(1) : null;
                            const enPerdida = cp > 0 && pv < cp;

                            return (
                                <div key={p.id_producto} style={styles.productoCard}>
                                    <div style={styles.productoFila}>
                                        <div style={styles.productoInfo}>
                                            <div style={styles.productoNombreRow}>
                                                <span style={styles.productoNombre}>{p.nombre}</span>
                                                <span style={{
                                                    ...styles.badge,
                                                    backgroundColor: p.activo ? '#e8f5ee' : '#fdecea',
                                                    color: p.activo ? '#2e7d52' : '#e53935',
                                                }}>
                                                    {p.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                                {enPerdida && (
                                                    <span style={styles.badgePerdida}>⚠️ Venta a pérdida</span>
                                                )}
                                            </div>
                                            {p.descripcion && <p style={styles.productoDesc}>{p.descripcion}</p>}
                                            <div style={styles.productoPrecios}>
                                                <span style={{ ...styles.precioVenta, color: enPerdida ? '#e53935' : '#2e7d52' }}>
                                                    💰 Venta: ${Number(p.precio_venta).toLocaleString()}
                                                </span>
                                                <span style={styles.precioCosto}>
                                                    📦 Costo: ${Number(p.costo_promedio || 0).toLocaleString()}
                                                </span>
                                                {margen !== null && (
                                                    <span style={{
                                                        ...styles.margenBadge,
                                                        backgroundColor: parseFloat(margen) >= 0 ? '#e8f5ee' : '#fdecea',
                                                        color: parseFloat(margen) >= 0 ? '#2e7d52' : '#e53935',
                                                    }}>
                                                        {parseFloat(margen) >= 0 ? '📈' : '📉'} {margen >= 0 ? '+' : ''}{margen}% margen
                                                    </span>
                                                )}
                                                <span style={styles.stockTotal}>
                                                    🏷️ Stock total: {p.stock} uds
                                                </span>
                                            </div>
                                        </div>

                                        <div style={styles.productoAcciones}>
                                            <button
                                                onClick={() => setExpandido(expandido === p.id_producto ? null : p.id_producto)}
                                                style={styles.botonVerTallas}
                                            >
                                                {expandido === p.id_producto ? '▲ Ocultar tallas' : '▼ Ver tallas'}
                                            </button>
                                            <button onClick={() => handleEditar(p)} style={styles.botonEditar}>
                                                ✏️ Editar
                                            </button>
                                            <button onClick={() => handleEliminar(p.id_producto)} style={styles.botonEliminar}>
                                                🗑️
                                            </button>
                                        </div>
                                    </div>

                                    {expandido === p.id_producto && (
                                        <div style={styles.tallasExpandidas}>
                                            {p.tallas && p.tallas.length > 0 ? (
                                                <div style={styles.tallasRow}>
                                                    {p.tallas.map((t) => (
                                                        <div key={t.id_talla} style={{
                                                            ...styles.tallaPill,
                                                            backgroundColor: t.cantidad === 0 ? '#fdecea' : t.cantidad < 3 ? '#fff3e0' : '#e8f5ee',
                                                        }}>
                                                            <span style={{
                                                                ...styles.tallaPillNombre,
                                                                color: t.cantidad === 0 ? '#e53935' : t.cantidad < 3 ? '#e65100' : '#2e7d52',
                                                            }}>
                                                                {t.talla}
                                                            </span>
                                                            <span style={styles.tallaPillCantidad}>
                                                                {t.cantidad === 0 ? 'Sin stock' : `${t.cantidad} uds`}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p style={{ color: '#999', fontSize: '13px' }}>Sin tallas registradas</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

const styles = {
    layout: { display: 'flex', minHeight: '100vh', backgroundColor: '#f0f4f0' },
    contenido: { marginLeft: '250px', flex: 1, padding: '30px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #e0ede6' },
    titulo: { fontSize: '26px', color: '#2e7d52', fontWeight: 'bold', margin: 0 },
    subtitulo: { color: '#666', marginTop: '4px', fontSize: '14px' },
    botonNuevo: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
    error: { color: '#e53935', backgroundColor: '#fdecea', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' },

    // Modal interior
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 0 28px' },
    modalIconRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' },
    modalIconCircle: { width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    modalTitulo: { fontSize: '20px', fontWeight: 'bold', color: '#2d2d2d', margin: 0 },
    modalSubtitulo: { fontSize: '13px', color: '#888', margin: '2px 0 0 54px' },
    botonCerrar: { background: 'none', border: 'none', fontSize: '18px', color: '#aaa', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', lineHeight: 1, flexShrink: 0 },

    modalBody: { padding: '20px 28px' },
    errorModal: { display: 'flex', gap: '8px', alignItems: 'center', color: '#e53935', backgroundColor: '#fdecea', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' },
    notaInfo: { backgroundColor: '#e3f2fd', border: '1px solid #90caf9', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#1565c0', marginBottom: '16px' },
    alertaPrecio: { backgroundColor: '#fff3e0', border: '1.5px solid #ff9800', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#e65100', marginBottom: '16px' },

    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
    label: { fontSize: '13px', color: '#555', fontWeight: '600' },
    requerido: { color: '#e53935' },
    input: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: '#fafffe' },

    seccionTitulo: { fontSize: '13px', fontWeight: '700', color: '#2e7d52', margin: '0 0 12px 0' },

    tipoTallaSeccion: { backgroundColor: '#f8fffe', border: '1.5px solid #e0ede6', borderRadius: '10px', padding: '14px', marginBottom: '14px' },
    tipoTallaGrid: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    tipoTallaCard: { flex: 1, minWidth: '120px', border: '2px solid #e0ede6', borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '3px', transition: 'all 0.15s' },
    tipoTallaLabel: { fontSize: '12px', fontWeight: '700', color: '#2d2d2d' },
    tipoTallaDesc: { fontSize: '10px', color: '#888' },

    tallasSeccion: { backgroundColor: '#f8fffe', border: '1.5px solid #e0ede6', borderRadius: '10px', padding: '14px' },
    tallasHint: { fontSize: '11px', color: '#999', fontWeight: '400' },
    tallasGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    tallaCard: { border: '2px solid #e0ede6', borderRadius: '10px', padding: '10px', minWidth: '72px', cursor: 'pointer', backgroundColor: 'white', transition: 'all 0.15s' },
    tallaCardActiva: { border: '2px solid #2e7d52', backgroundColor: '#f0faf4' },
    tallaHeader: { display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' },
    tallaCheck: { fontSize: '13px' },
    tallaNombre: { fontWeight: 'bold', fontSize: '14px', color: '#333' },
    tallaCantidad: { width: '100%', padding: '5px 6px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px', textAlign: 'center', outline: 'none' },
    tallaNotaCompra: { fontSize: '10px', color: '#1565c0', fontStyle: 'italic', display: 'block', textAlign: 'center' },

    modalFooter: { display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '16px 28px 24px 28px', borderTop: '1px solid #f0f0f0' },
    botonGuardar: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' },
    botonCancelar: { backgroundColor: 'white', color: '#666', border: '1.5px solid #ddd', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },

    // Lista
    listaContainer: { display: 'flex', flexDirection: 'column', gap: '12px' },
    productoCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' },
    productoFila: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px' },
    productoInfo: { flex: 1 },
    productoNombreRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' },
    productoNombre: { fontSize: '16px', fontWeight: 'bold', color: '#2d2d2d' },
    productoDesc: { fontSize: '13px', color: '#888', margin: '4px 0 8px 0' },
    productoPrecios: { display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' },
    precioVenta: { fontSize: '13px', fontWeight: '600' },
    precioCosto: { fontSize: '13px', color: '#666' },
    stockTotal: { fontSize: '13px', color: '#1565c0', fontWeight: '600' },
    margenBadge: { fontSize: '12px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px' },
    badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
    badgePerdida: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', backgroundColor: '#fff3e0', color: '#e65100' },
    productoAcciones: { display: 'flex', gap: '8px', alignItems: 'center' },
    botonVerTallas: { backgroundColor: '#f0f4f0', color: '#555', border: 'none', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    botonEditar: { backgroundColor: '#e8f5ee', color: '#2e7d52', border: 'none', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    botonEliminar: { backgroundColor: '#fdecea', color: '#e53935', border: 'none', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    tallasExpandidas: { borderTop: '1px solid #f0f4f0', padding: '15px 20px', backgroundColor: '#fafffe' },
    tallasRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    tallaPill: { display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: '8px', padding: '8px 16px', minWidth: '60px' },
    tallaPillNombre: { fontWeight: 'bold', fontSize: '15px' },
    tallaPillCantidad: { fontSize: '12px', color: '#555', marginTop: '2px' },
    sinDatos: { backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#999' },
};

export default Productos;
