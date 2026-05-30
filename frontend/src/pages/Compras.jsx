import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { getCompras, crearCompra, getDetallesCompra } from '../api/compras';
import { getProductos } from '../api/productos';
import { getProveedores } from '../api/proveedores';

const STOCK_MINIMO = 3;

const GRUPOS_TALLA = [
    { label: '👕 Ropa', tallas: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { label: '👖 Pantalón adulto', tallas: ['28', '30', '32', '34', '36', '38', '40'] },
    { label: '👗 Jeans dama / Mochos', tallas: ['1', '3', '5', '7', '9', '10', '12', '14'] },
    { label: '🏷️ Talla única', tallas: ['ÚNICA'] },
];

/* ─── Modal (igual al de Proveedores) ─── */
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
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        animation: 'modalIn 0.2s ease',
    },
};

const itemInicial = { id_producto: '', precio_unitario: '', grupoTalla: '', tallas: {} };

const Compras = () => {
    const [compras, setCompras] = useState([]);
    const [productos, setProductos] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [expandido, setExpandido] = useState(null);
    const [detallesExpandido, setDetallesExpandido] = useState({});
    const [error, setError] = useState('');
    const [errorModal, setErrorModal] = useState('');
    const [cargando, setCargando] = useState(false);
    const [idProveedor, setIdProveedor] = useState('');
    const [items, setItems] = useState([{ ...itemInicial }]);

    const usuario = JSON.parse(localStorage.getItem('usuario'));

    useEffect(() => { cargarTodo(); }, []);

    const cargarTodo = async () => {
        setCargando(true);
        try {
            const [c, p, prov] = await Promise.all([
                getCompras(), getProductos(), getProveedores(),
            ]);
            setCompras(c);
            setProductos(p);
            setProveedores(prov);
        } catch {
            setError('Error al cargar los datos');
        } finally {
            setCargando(false);
        }
    };

    /* ─── helpers ─── */
    const getProductoSeleccionado = (idProducto) =>
        idProducto ? productos.find(p => p.id_producto === parseInt(idProducto)) : null;

    const detectarGrupoTalla = (producto) => {
        if (!producto?.tallas?.length) return '';
        const primera = producto.tallas[0].talla;
        for (const grupo of GRUPOS_TALLA) {
            if (grupo.tallas.includes(primera)) return grupo.label;
        }
        return '';
    };

    const getTallasDelGrupo = (item) => {
        const grupo = GRUPOS_TALLA.find(g => g.label === item.grupoTalla);
        if (!grupo) return [];
        const prod = getProductoSeleccionado(item.id_producto);
        return grupo.tallas.map(talla => {
            const tallaExistente = prod?.tallas?.find(t => t.talla === talla);
            return { talla, stockActual: tallaExistente ? tallaExistente.cantidad : 0, tieneStock: !!tallaExistente };
        });
    };

    const calcularTotalUnidades = (item) =>
        Object.values(item.tallas).reduce((s, c) => s + c, 0);

    const calcularSubtotalItem = (item) =>
        calcularTotalUnidades(item) * (parseFloat(item.precio_unitario) || 0);

    const calcularTotal = () =>
        items.reduce((s, item) => s + calcularSubtotalItem(item), 0);

    /* ─── handlers items ─── */
    const handleProductoChange = (index, idProducto) => {
        const nuevos = [...items];
        nuevos[index].id_producto = idProducto;
        nuevos[index].tallas = {};
        const prod = getProductoSeleccionado(idProducto);
        nuevos[index].precio_unitario = prod?.costo_promedio || '';
        nuevos[index].grupoTalla = prod ? detectarGrupoTalla(prod) : '';
        setItems(nuevos);
    };

    const handlePrecioChange = (index, valor) => {
        const nuevos = [...items];
        nuevos[index].precio_unitario = valor;
        setItems(nuevos);
    };

    const handleGrupoTallaChange = (index, labelGrupo) => {
        const nuevos = [...items];
        nuevos[index].grupoTalla = labelGrupo;
        nuevos[index].tallas = {};
        setItems(nuevos);
    };

    const handleTallaCantidad = (index, talla, valor) => {
        const nuevos = [...items];
        const cantidad = parseInt(valor) || 0;
        if (cantidad === 0) {
            const { [talla]: _, ...resto } = nuevos[index].tallas;
            nuevos[index].tallas = resto;
        } else {
            nuevos[index].tallas = { ...nuevos[index].tallas, [talla]: cantidad };
        }
        setItems(nuevos);
    };

    const agregarItem = () => setItems([...items, { ...itemInicial }]);

    const quitarItem = (index) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    /* ─── modal handlers ─── */
    const handleNueva = () => {
        setIdProveedor('');
        setItems([{ ...itemInicial }]);
        setErrorModal('');
        setModalAbierto(true);
    };

    const handleCerrarModal = () => {
        setModalAbierto(false);
        setErrorModal('');
    };

    const handleGuardar = async () => {
        if (!idProveedor) { setErrorModal('Selecciona un proveedor'); return; }

        const detalles = [];
        for (const item of items) {
            if (!item.id_producto || !item.precio_unitario) continue;
            for (const [talla, cantidad] of Object.entries(item.tallas)) {
                if (cantidad > 0) {
                    detalles.push({
                        id_producto: parseInt(item.id_producto),
                        talla,
                        cantidad,
                        precio_unitario: parseFloat(item.precio_unitario),
                    });
                }
            }
        }

        if (detalles.length === 0) {
            setErrorModal('Debes ingresar al menos una talla con cantidad mayor a 0');
            return;
        }

        const payload = {
            id_proveedor: parseInt(idProveedor),
            id_usuario: usuario?.id_usuario || usuario?.id,
            detalles,
        };

        try {
            await crearCompra(payload);
            setModalAbierto(false);
            setIdProveedor('');
            setItems([{ ...itemInicial }]);
            cargarTodo();
            setError('');
        } catch (err) {
            setErrorModal(err.response?.data?.error || 'Error al registrar la compra');
        }
    };

    /* ─── detalles expandibles ─── */
    const handleVerDetalles = async (id) => {
        if (expandido === id) { setExpandido(null); return; }
        setExpandido(id);
        if (!detallesExpandido[id]) {
            try {
                const data = await getDetallesCompra(id);
                setDetallesExpandido(prev => ({ ...prev, [id]: data }));
            } catch { setError('Error al cargar los detalles'); }
        }
    };

    const getNombreProducto = (id) => {
        const p = productos.find(p => p.id_producto === id);
        return p ? p.nombre : `Producto #${id}`;
    };

    const getNombreProveedor = (id) => {
        const p = proveedores.find(p => p.id_proveedor === id);
        return p ? p.nombre_empresa : `Proveedor #${id}`;
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

                {/* Encabezado */}
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.titulo}>🛒 Compras</h1>
                        <p style={styles.subtitulo}>
                            {compras.length} compra{compras.length !== 1 ? 's' : ''} registrada{compras.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button onClick={handleNueva} style={styles.botonNuevo}>
                        + Nueva Compra
                    </button>
                </div>

                {error && <p style={styles.error}>{error}</p>}

                {/* ─── MODAL ─── */}
                <Modal isOpen={modalAbierto} onClose={handleCerrarModal}>
                    {/* Header */}
                    <div style={styles.modalHeader}>
                        <div>
                            <div style={styles.modalIconRow}>
                                <div style={styles.modalIconCircle}>
                                    <span style={{ fontSize: '20px' }}>🛒</span>
                                </div>
                                <h2 style={styles.modalTitulo}>Nueva Compra</h2>
                            </div>
                            <p style={styles.modalSubtitulo}>Completa los datos de la compra</p>
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

                        {/* Proveedor */}
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>
                                Proveedor <span style={styles.requerido}>*</span>
                            </label>
                            <select value={idProveedor} onChange={e => setIdProveedor(e.target.value)} style={styles.select}>
                                <option value="">-- Selecciona un proveedor --</option>
                                {proveedores.map(p => (
                                    <option key={p.id_proveedor} value={p.id_proveedor}>
                                        {p.nombre_empresa}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Items */}
                        <div style={styles.itemsContainer}>
                            <p style={styles.seccionTitulo}>📦 Productos a comprar</p>

                            {items.map((item, i) => {
                                const totalUnidades = calcularTotalUnidades(item);
                                const subtotal = calcularSubtotalItem(item);
                                const tallasDelGrupo = getTallasDelGrupo(item);

                                return (
                                    <div key={i} style={styles.itemCard}>
                                        {/* Header del item */}
                                        <div style={styles.itemHeader}>
                                            <div style={{ flex: 2 }}>
                                                <label style={styles.labelSmall}>Producto *</label>
                                                <select
                                                    value={item.id_producto}
                                                    onChange={e => handleProductoChange(i, e.target.value)}
                                                    style={styles.select}
                                                >
                                                    <option value="">-- Selecciona un producto --</option>
                                                    {productos.map(p => (
                                                        <option key={p.id_producto} value={p.id_producto}>
                                                            {p.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={styles.labelSmall}>Precio de costo *</label>
                                                <input
                                                    type="number" min="0"
                                                    placeholder="$ precio de costo"
                                                    value={item.precio_unitario}
                                                    onChange={e => handlePrecioChange(i, e.target.value)}
                                                    style={styles.input}
                                                />
                                            </div>
                                            <button onClick={() => quitarItem(i)} style={styles.botonQuitar} title="Quitar producto">
                                                ✕
                                            </button>
                                        </div>

                                        {item.id_producto ? (
                                            <>
                                                {/* Selector grupo talla */}
                                                <div style={styles.grupoTallaSeccion}>
                                                    <p style={styles.grupoTallaTitulo}>📐 Tipo de talla</p>
                                                    <div style={styles.grupoTallaRow}>
                                                        {GRUPOS_TALLA.map(grupo => (
                                                            <button
                                                                key={grupo.label}
                                                                onClick={() => handleGrupoTallaChange(i, grupo.label)}
                                                                style={{
                                                                    ...styles.grupoTallaBtn,
                                                                    backgroundColor: item.grupoTalla === grupo.label ? '#2e7d52' : 'white',
                                                                    color: item.grupoTalla === grupo.label ? 'white' : '#555',
                                                                    border: `2px solid ${item.grupoTalla === grupo.label ? '#2e7d52' : '#e0ede6'}`,
                                                                }}
                                                            >
                                                                {grupo.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Grid de tallas */}
                                                {item.grupoTalla && (
                                                    <div style={styles.tallasSeccion}>
                                                        <p style={styles.tallasSubTitulo}>
                                                            👕 Tallas — ingresa la cantidad a comprar por talla
                                                        </p>
                                                        <div style={styles.tallasGrid}>
                                                            {tallasDelGrupo.map(({ talla, stockActual, tieneStock }) => {
                                                                const cantidadComprar = item.tallas[talla] || 0;
                                                                const stockNuevo = stockActual + cantidadComprar;
                                                                const stockBajo = tieneStock && stockActual < STOCK_MINIMO;
                                                                const seleccionada = cantidadComprar > 0;

                                                                return (
                                                                    <div key={talla} style={{
                                                                        ...styles.tallaCard,
                                                                        borderColor: seleccionada ? '#2e7d52' : stockBajo ? '#e65100' : '#e0ede6',
                                                                        backgroundColor: seleccionada ? '#f0faf4' : stockBajo ? '#fff8f0' : 'white',
                                                                    }}>
                                                                        <div style={styles.tallaNombre}>{talla}</div>
                                                                        <div style={styles.tallaStockActual}>
                                                                            <span style={styles.tallaStockLabel}>Stock actual</span>
                                                                            <span style={{
                                                                                ...styles.tallaStockValor,
                                                                                color: !tieneStock ? '#aaa' : stockBajo ? '#e65100' : '#2e7d52'
                                                                            }}>
                                                                                {tieneStock ? `${stockActual} uds` : 'Sin registro'}
                                                                                {stockBajo && <span style={styles.alertaIcon}> ⚠️</span>}
                                                                            </span>
                                                                        </div>
                                                                        <div style={styles.tallaInputContainer}>
                                                                            <label style={styles.tallaInputLabel}>A comprar</label>
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                value={cantidadComprar || ''}
                                                                                placeholder="0"
                                                                                onChange={e => handleTallaCantidad(i, talla, e.target.value)}
                                                                                style={{
                                                                                    ...styles.tallaInput,
                                                                                    borderColor: seleccionada ? '#2e7d52' : '#ccc',
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        {cantidadComprar > 0 && (
                                                                            <div style={styles.tallaStockNuevo}>
                                                                                {stockActual} → <strong>{stockNuevo}</strong>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {totalUnidades > 0 && (
                                                    <div style={styles.itemResumen}>
                                                        <span style={styles.itemResumenTexto}>
                                                            📦 {totalUnidades} unidad{totalUnidades !== 1 ? 'es' : ''} en {Object.keys(item.tallas).length} talla{Object.keys(item.tallas).length !== 1 ? 's' : ''}
                                                        </span>
                                                        <span style={styles.itemResumenSubtotal}>
                                                            Subtotal: <strong>${subtotal.toLocaleString()}</strong>
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div style={styles.seleccionaProducto}>
                                                👆 Selecciona un producto para ver las tallas disponibles
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            <button onClick={agregarItem} style={styles.botonAgregar}>
                                + Agregar otro producto
                            </button>
                        </div>

                        {/* Leyenda */}
                        <div style={styles.leyenda}>
                            <span style={styles.leyendaItem}>
                                <span style={{ ...styles.leyendaDot, backgroundColor: '#fff8f0', border: '2px solid #e65100' }} />
                                Stock bajo (menos de {STOCK_MINIMO} uds)
                            </span>
                            <span style={styles.leyendaItem}>
                                <span style={{ ...styles.leyendaDot, backgroundColor: '#f0faf4', border: '2px solid #2e7d52' }} />
                                Con cantidad a comprar
                            </span>
                        </div>

                        {/* Total */}
                        <div style={styles.totalBox}>
                            <div>
                                <p style={styles.totalLabel}>TOTAL DE LA COMPRA</p>
                                <p style={styles.totalDetalle}>
                                    {items.reduce((s, item) => s + calcularTotalUnidades(item), 0)} unidades en total
                                </p>
                            </div>
                            <span style={styles.totalValor}>${calcularTotal().toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={styles.modalFooter}>
                        <button onClick={handleCerrarModal} style={styles.botonCancelar}>
                            Cancelar
                        </button>
                        <button onClick={handleGuardar} style={styles.botonGuardar}>
                            💾 Registrar Compra
                        </button>
                    </div>
                </Modal>

                {/* ─── LISTA DE COMPRAS ─── */}
                {cargando ? (
                    <div style={styles.sinDatos}>Cargando compras...</div>
                ) : compras.length === 0 ? (
                    <div style={styles.sinDatos}>
                        <p style={{ fontSize: '40px', margin: 0 }}>🛒</p>
                        <p>No hay compras registradas</p>
                    </div>
                ) : (
                    <div style={styles.listaCompras}>
                        {compras.map((c) => {
                            const detalles = detallesExpandido[c.id_compra];
                            return (
                                <div key={c.id_compra} style={styles.compraCard}>
                                    <div style={styles.compraFila}>
                                        <div style={styles.compraIcono}>🛒</div>
                                        <div style={styles.compraInfo}>
                                            <p style={styles.compraId}>Compra #{c.id_compra}</p>
                                            <p style={styles.compraProveedor}>🏭 {getNombreProveedor(c.id_proveedor)}</p>
                                            <p style={styles.compraFecha}>
                                                📅 {c.fecha_compra
                                                    ? new Date(c.fecha_compra).toLocaleDateString('es-CO', {
                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    }) : '—'}
                                            </p>
                                        </div>
                                        <div style={styles.compraTotal}>
                                            <span style={styles.compraTotalLabel}>Total</span>
                                            <span style={styles.compraTotalValor}>
                                                ${Number(c.total).toLocaleString()}
                                            </span>
                                        </div>
                                        <button onClick={() => handleVerDetalles(c.id_compra)} style={styles.botonDetalles}>
                                            {expandido === c.id_compra ? '▲ Ocultar' : '▼ Ver detalle'}
                                        </button>
                                    </div>

                                    {expandido === c.id_compra && (
                                        <div style={styles.detallesContainer}>
                                            {!detalles ? (
                                                <p style={{ color: '#999', fontSize: '13px' }}>Cargando...</p>
                                            ) : (
                                                <table style={styles.tablaDetalles}>
                                                    <thead>
                                                        <tr style={styles.tablaHeader}>
                                                            <th style={styles.th}>Producto</th>
                            
                                                            <th style={styles.th}>Cantidad</th>
                                                            <th style={styles.th}>Precio Unit.</th>
                                                            <th style={styles.th}>Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {detalles.detalles?.map(d => (
                                                            <tr key={d.id_detalle} style={styles.tablaFila}>
                                                                <td style={styles.td}>{getNombreProducto(d.id_producto)}</td>
                                                                <td style={styles.td}>{d.cantidad} uds</td>
                                                                <td style={styles.td}>${Number(d.precio_unitario).toLocaleString()}</td>
                                                                <td style={styles.td}>${Number(d.subtotal).toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
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
    modalIconCircle: { width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    modalTitulo: { fontSize: '20px', fontWeight: 'bold', color: '#2d2d2d', margin: 0 },
    modalSubtitulo: { fontSize: '13px', color: '#888', margin: '2px 0 0 54px' },
    botonCerrar: { background: 'none', border: 'none', fontSize: '18px', color: '#aaa', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', lineHeight: 1, flexShrink: 0 },

    modalBody: { padding: '20px 28px' },
    errorModal: { display: 'flex', gap: '8px', alignItems: 'center', color: '#e53935', backgroundColor: '#fdecea', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' },

    modalFooter: { display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '16px 28px 24px 28px', borderTop: '1px solid #f0f0f0' },
    botonGuardar: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' },
    botonCancelar: { backgroundColor: 'white', color: '#666', border: '1.5px solid #ddd', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },

    // Form dentro del modal
    inputGroup: { marginBottom: '16px' },
    label: { fontSize: '13px', color: '#555', fontWeight: '600', display: 'block', marginBottom: '6px' },
    requerido: { color: '#e53935' },
    labelSmall: { fontSize: '12px', color: '#777', fontWeight: '600', display: 'block', marginBottom: '4px' },
    select: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', width: '100%' },
    input: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },

    itemsContainer: { marginBottom: '16px' },
    seccionTitulo: { fontSize: '14px', fontWeight: '700', color: '#2e7d52', marginBottom: '12px', marginTop: 0 },

    itemCard: { backgroundColor: '#f8fffe', border: '1.5px solid #e0ede6', borderRadius: '12px', padding: '16px', marginBottom: '12px' },
    itemHeader: { display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '14px' },
    botonQuitar: { backgroundColor: '#fdecea', color: '#e53935', border: 'none', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', flexShrink: 0 },

    grupoTallaSeccion: { marginBottom: '12px' },
    grupoTallaTitulo: { fontSize: '12px', fontWeight: '700', color: '#555', margin: '0 0 8px 0' },
    grupoTallaRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    grupoTallaBtn: { padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.15s' },

    tallasSeccion: { marginBottom: '10px' },
    tallasSubTitulo: { fontSize: '12px', fontWeight: '700', color: '#555', margin: '0 0 10px 0' },
    tallasGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    tallaCard: { border: '2px solid #e0ede6', borderRadius: '10px', padding: '10px 12px', minWidth: '90px', backgroundColor: 'white', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' },
    tallaNombre: { fontSize: '17px', fontWeight: 'bold', color: '#2d2d2d', textAlign: 'center' },
    tallaStockActual: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    tallaStockLabel: { fontSize: '10px', color: '#aaa' },
    tallaStockValor: { fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' },
    alertaIcon: { fontSize: '11px' },
    tallaInputContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' },
    tallaInputLabel: { fontSize: '10px', color: '#888' },
    tallaInput: { width: '68px', padding: '5px 8px', border: '1.5px solid #ccc', borderRadius: '6px', fontSize: '14px', textAlign: 'center', outline: 'none' },
    tallaStockNuevo: { fontSize: '11px', color: '#1565c0', textAlign: 'center', backgroundColor: '#e3f2fd', borderRadius: '4px', padding: '2px 6px' },

    seleccionaProducto: { color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '16px', fontStyle: 'italic' },
    itemResumen: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e8f5ee', borderRadius: '8px', padding: '10px 14px' },
    itemResumenTexto: { fontSize: '13px', color: '#555' },
    itemResumenSubtotal: { fontSize: '14px', color: '#2e7d52' },

    leyenda: { display: 'flex', gap: '20px', marginBottom: '14px', flexWrap: 'wrap' },
    leyendaItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#666' },
    leyendaDot: { width: '20px', height: '20px', borderRadius: '4px', display: 'inline-block', flexShrink: 0 },

    botonAgregar: { backgroundColor: 'transparent', color: '#2e7d52', border: '1.5px dashed #2e7d52', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', width: '100%' },

    totalBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e8f5ee', padding: '16px 20px', borderRadius: '10px', marginBottom: '4px' },
    totalLabel: { fontSize: '14px', fontWeight: '700', color: '#2e7d52', margin: 0 },
    totalDetalle: { fontSize: '12px', color: '#888', margin: '4px 0 0 0' },
    totalValor: { fontSize: '26px', fontWeight: 'bold', color: '#2e7d52' },

    // Lista compras
    listaCompras: { display: 'flex', flexDirection: 'column', gap: '12px' },
    compraCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' },
    compraFila: { display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px' },
    compraIcono: { fontSize: '28px' },
    compraInfo: { flex: 1 },
    compraId: { fontSize: '15px', fontWeight: 'bold', color: '#2d2d2d', margin: '0 0 3px 0' },
    compraProveedor: { fontSize: '13px', color: '#555', margin: '0 0 3px 0' },
    compraFecha: { fontSize: '12px', color: '#999', margin: 0 },
    compraTotal: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
    compraTotalLabel: { fontSize: '11px', color: '#999' },
    compraTotalValor: { fontSize: '18px', fontWeight: 'bold', color: '#2e7d52' },
    botonDetalles: { backgroundColor: '#f0f4f0', color: '#555', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    detallesContainer: { borderTop: '1px solid #f0f4f0', padding: '15px 20px', backgroundColor: '#fafffe' },
    tablaDetalles: { width: '100%', borderCollapse: 'collapse' },
    tablaHeader: { backgroundColor: '#f0f4f0' },
    th: { padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: '#555', fontWeight: '600' },
    tablaFila: { borderTop: '1px solid #f0f4f0' },
    td: { padding: '10px 14px', fontSize: '13px', color: '#333' },
    sinDatos: { backgroundColor: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', color: '#999' },
};

export default Compras;
