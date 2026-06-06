import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { getCompras, crearCompra, getDetallesCompra, getReporteProveedores } from '../api/compras';
import { getProductos } from '../api/productos';
import { getProveedores } from '../api/proveedores';

// ── helpers de fecha ──
const hoy       = () => new Date().toISOString().split('T')[0];
const inicioMes = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
const hace30    = () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; };
const fmt       = (n) => `$${Number(n).toLocaleString('es-CO')}`;
const iniciales = (nombre) => nombre?.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
const COLORES   = ['#1565c0', '#6a1b9a', '#2e7d52', '#e65100', '#c62828', '#00695c'];

const STOCK_MINIMO = 3;
const GRUPOS_TALLA = [
    { label: '👕 Ropa',              tallas: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { label: '👖 Pantalón adulto',   tallas: ['28', '30', '32', '34', '36', '38', '40'] },
    { label: '👗 Jeans dama',        tallas: ['1', '3', '5', '7', '9', '10', '12', '14'] },
    { label: '🏷️ Talla única',       tallas: ['ÚNICA'] },
];

const Modal = ({ isOpen, onClose, children }) => {
    const ref = useRef(null);
    useEffect(() => {
        const fn = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) { document.addEventListener('keydown', fn); document.body.style.overflow = 'hidden'; }
        return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = ''; };
    }, [isOpen, onClose]);
    if (!isOpen) return null;
    return (
        <div ref={ref} onClick={e => { if (e.target === ref.current) onClose(); }} style={ms.overlay}>
            <div style={ms.container}>{children}</div>
        </div>
    );
};

const ms = {
    overlay:   { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
    container: { backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0,0,0,0.18)', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' },
};

const itemInicial = { id_producto: '', precio_unitario: '', grupoTalla: '', tallas: {} };

const Compras = () => {
    const [pestaña,            setPestaña]            = useState('historial');
    const [compras,            setCompras]            = useState([]);
    const [productos,          setProductos]          = useState([]);
    const [proveedores,        setProveedores]        = useState([]);
    const [modalAbierto,       setModalAbierto]       = useState(false);
    const [expandido,          setExpandido]          = useState(null);
    const [detallesExpandido,  setDetallesExpandido]  = useState({});
    const [error,              setError]              = useState('');
    const [errorModal,         setErrorModal]         = useState('');
    const [cargando,           setCargando]           = useState(false);
    const [idProveedor,        setIdProveedor]        = useState('');
    const [items,              setItems]              = useState([{ ...itemInicial }]);
    // Reporte
    const [desde,              setDesde]              = useState(inicioMes());
    const [hasta,              setHasta]              = useState(hoy());
    const [reporte,            setReporte]            = useState(null);
    const [cargandoReporte,    setCargandoReporte]    = useState(false);
    const [expandidoProv,      setExpandidoProv]      = useState(null);

    const usuario = JSON.parse(localStorage.getItem('usuario'));

    useEffect(() => { cargarTodo(); }, []);

    const cargarTodo = async () => {
        setCargando(true);
        try {
            const [c, p, prov] = await Promise.all([getCompras(), getProductos(), getProveedores()]);
            setCompras(c); setProductos(p); setProveedores(prov);
        } catch { setError('Error al cargar los datos'); }
        finally { setCargando(false); }
    };

    const generarReporte = async () => {
        setCargandoReporte(true);
        setReporte(null);
        try {
            const data = await getReporteProveedores(desde, hasta);
            setReporte(data);
            setExpandidoProv(data.proveedores[0]?.id_proveedor || null);
        } catch { setError('Error al generar el reporte'); }
        finally { setCargandoReporte(false); }
    };

    useEffect(() => { if (pestaña === 'reporte') generarReporte(); }, [pestaña]);

    // ── helpers ──
    const getProductoSel   = (id) => productos.find(p => p.id_producto === parseInt(id)) || null;
    const detectarGrupo    = (prod) => { if (!prod?.tallas?.length) return ''; const t = prod.tallas[0].talla; return GRUPOS_TALLA.find(g => g.tallas.includes(t))?.label || ''; };
    const getTallaGrupo    = (item) => { const g = GRUPOS_TALLA.find(g => g.label === item.grupoTalla); if (!g) return []; const prod = getProductoSel(item.id_producto); return g.tallas.map(t => { const ex = prod?.tallas?.find(tt => tt.talla === t); return { talla: t, stockActual: ex?.cantidad || 0, tieneStock: !!ex }; }); };
    const totalUds         = (item) => Object.values(item.tallas).reduce((s, c) => s + c, 0);
    const subtotalItem     = (item) => totalUds(item) * (parseFloat(item.precio_unitario) || 0);
    const totalCompra      = () => items.reduce((s, i) => s + subtotalItem(i), 0);
    const getNombreProd    = (id) => productos.find(p => p.id_producto === id)?.nombre || `Producto #${id}`;
    const getNombreProv    = (id) => proveedores.find(p => p.id_proveedor === id)?.nombre_empresa || `Proveedor #${id}`;

    const handleProductoChange = (i, id) => { const n = [...items]; n[i] = { ...itemInicial, id_producto: id, precio_unitario: getProductoSel(id)?.costo_promedio || '', grupoTalla: id ? detectarGrupo(getProductoSel(id)) : '' }; setItems(n); };
    const handlePrecio         = (i, v) => { const n = [...items]; n[i].precio_unitario = v; setItems(n); };
    const handleGrupo          = (i, l) => { const n = [...items]; n[i].grupoTalla = l; n[i].tallas = {}; setItems(n); };
    const handleTalla          = (i, t, v) => { const n = [...items]; const c = parseInt(v) || 0; if (c === 0) { const { [t]: _, ...r } = n[i].tallas; n[i].tallas = r; } else { n[i].tallas = { ...n[i].tallas, [t]: c }; } setItems(n); };

    const handleGuardar = async () => {
        if (!idProveedor) { setErrorModal('Selecciona un proveedor'); return; }
        const detalles = items.flatMap(item => !item.id_producto || !item.precio_unitario ? [] :
            Object.entries(item.tallas).filter(([, c]) => c > 0).map(([talla, cantidad]) => ({
                id_producto: parseInt(item.id_producto), talla, cantidad, precio_unitario: parseFloat(item.precio_unitario),
            }))
        );
        if (!detalles.length) { setErrorModal('Ingresa al menos una talla con cantidad mayor a 0'); return; }
        try {
            await crearCompra({ id_proveedor: parseInt(idProveedor), id_usuario: usuario?.id_usuario || usuario?.id, detalles });
            setModalAbierto(false); setIdProveedor(''); setItems([{ ...itemInicial }]);
            cargarTodo(); setError('');
        } catch (err) { setErrorModal(err.response?.data?.error || 'Error al registrar la compra'); }
    };

    const handleVerDetalles = async (id) => {
        if (expandido === id) { setExpandido(null); return; }
        setExpandido(id);
        if (!detallesExpandido[id]) {
            try { const d = await getDetallesCompra(id); setDetallesExpandido(prev => ({ ...prev, [id]: d })); }
            catch { setError('Error al cargar detalles'); }
        }
    };

    return (
        <div style={s.layout}>
            <Sidebar />
            <div style={s.contenido}>

                <div style={s.header}>
                    <div>
                        <h1 style={s.titulo}>🛒 Compras</h1>
                        <p style={s.subtitulo}>{compras.length} compra{compras.length !== 1 ? 's' : ''} registrada{compras.length !== 1 ? 's' : ''}</p>
                    </div>
                    {pestaña === 'historial' && (
                        <button onClick={() => { setItems([{ ...itemInicial }]); setModalAbierto(true); }} style={s.botonNuevo}>
                            + Nueva Compra
                        </button>
                    )}
                </div>

                {error && <p style={s.error}>{error}</p>}

                {/* Pestañas */}
                <div style={s.tabs}>
                    <button onClick={() => setPestaña('historial')} style={{ ...s.tab, ...(pestaña === 'historial' ? s.tabActivo : {}) }}>
                        📋 Historial de compras
                    </button>
                    <button onClick={() => setPestaña('reporte')} style={{ ...s.tab, ...(pestaña === 'reporte' ? s.tabActivo : {}) }}>
                        📊 Reporte por proveedor
                    </button>
                </div>

                {/* ── PESTAÑA HISTORIAL ── */}
                {pestaña === 'historial' && (
                    <>
                        <Modal isOpen={modalAbierto} onClose={() => setModalAbierto(false)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 0' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#2d2d2d' }}>Nueva Compra</h2>
                                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>Completa los datos de la compra</p>
                                </div>
                                <button onClick={() => setModalAbierto(false)} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#aaa', cursor: 'pointer' }}>✕</button>
                            </div>
                            <div style={{ padding: '20px 28px' }}>
                                {errorModal && <div style={{ color: '#e53935', backgroundColor: '#fdecea', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>⚠️ {errorModal}</div>}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={s.label}>Proveedor *</label>
                                    <select value={idProveedor} onChange={e => setIdProveedor(e.target.value)} style={s.select}>
                                        <option value="">-- Selecciona un proveedor --</option>
                                        {proveedores.map(p => <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_empresa}</option>)}
                                    </select>
                                </div>
                                <p style={{ fontSize: '14px', fontWeight: '700', color: '#2e7d52', margin: '0 0 12px' }}>📦 Productos a comprar</p>
                                {items.map((item, i) => {
                                    const prod = getProductoSel(item.id_producto);
                                    const tallasGrupo = getTallaGrupo(item);
                                    return (
                                        <div key={i} style={{ backgroundColor: '#f8fffe', border: '1.5px solid #e0ede6', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '14px' }}>
                                                <div style={{ flex: 2 }}>
                                                    <label style={s.labelSm}>Producto *</label>
                                                    <select value={item.id_producto} onChange={e => handleProductoChange(i, e.target.value)} style={s.select}>
                                                        <option value="">-- Selecciona --</option>
                                                        {productos.map(p => <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>)}
                                                    </select>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={s.labelSm}>Precio costo *</label>
                                                    <input type="number" min="0" placeholder="$" value={item.precio_unitario} onChange={e => handlePrecio(i, e.target.value)} style={s.input} />
                                                </div>
                                                <button onClick={() => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); }} style={{ backgroundColor: '#fdecea', color: '#e53935', border: 'none', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                                            </div>
                                            {item.id_producto && (
                                                <>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                                        {GRUPOS_TALLA.map(g => (
                                                            <button key={g.label} onClick={() => handleGrupo(i, g.label)} style={{ padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', backgroundColor: item.grupoTalla === g.label ? '#2e7d52' : 'white', color: item.grupoTalla === g.label ? 'white' : '#555', border: `2px solid ${item.grupoTalla === g.label ? '#2e7d52' : '#e0ede6'}` }}>
                                                                {g.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {item.grupoTalla && (
                                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                            {tallasGrupo.map(({ talla, stockActual, tieneStock }) => {
                                                                const cant = item.tallas[talla] || 0;
                                                                const bajo = tieneStock && stockActual < STOCK_MINIMO;
                                                                return (
                                                                    <div key={talla} style={{ border: `2px solid ${cant > 0 ? '#2e7d52' : bajo ? '#e65100' : '#e0ede6'}`, borderRadius: '10px', padding: '10px 12px', minWidth: '90px', backgroundColor: cant > 0 ? '#f0faf4' : bajo ? '#fff8f0' : 'white', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
                                                                        <span style={{ fontSize: '17px', fontWeight: 'bold', color: '#2d2d2d' }}>{talla}</span>
                                                                        <span style={{ fontSize: '10px', color: !tieneStock ? '#aaa' : bajo ? '#e65100' : '#2e7d52', fontWeight: '600' }}>
                                                                            {tieneStock ? `${stockActual} uds` : 'Sin reg.'}{bajo ? ' ⚠️' : ''}
                                                                        </span>
                                                                        <label style={{ fontSize: '10px', color: '#888' }}>A comprar</label>
                                                                        <input type="number" min="0" value={cant || ''} placeholder="0" onChange={e => handleTalla(i, talla, e.target.value)} style={{ width: '68px', padding: '5px 8px', border: `1.5px solid ${cant > 0 ? '#2e7d52' : '#ccc'}`, borderRadius: '6px', fontSize: '14px', textAlign: 'center', outline: 'none' }} />
                                                                        {cant > 0 && <span style={{ fontSize: '11px', color: '#1565c0', backgroundColor: '#e3f2fd', borderRadius: '4px', padding: '2px 6px' }}>{stockActual} → {stockActual + cant}</span>}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    {totalUds(item) > 0 && (
                                                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', backgroundColor: '#e8f5ee', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
                                                            <span style={{ color: '#555' }}>📦 {totalUds(item)} unidades en {Object.keys(item.tallas).length} talla{Object.keys(item.tallas).length !== 1 ? 's' : ''}</span>
                                                            <span style={{ color: '#2e7d52' }}>Subtotal: <strong>{fmt(subtotalItem(item))}</strong></span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                                <button onClick={() => setItems([...items, { ...itemInicial }])} style={{ backgroundColor: 'transparent', color: '#2e7d52', border: '1.5px dashed #2e7d52', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', width: '100%', marginBottom: '16px' }}>
                                    + Agregar otro producto
                                </button>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e8f5ee', padding: '16px 20px', borderRadius: '10px' }}>
                                    <div>
                                        <p style={{ fontSize: '14px', fontWeight: '700', color: '#2e7d52', margin: 0 }}>TOTAL DE LA COMPRA</p>
                                        <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>{items.reduce((s, i) => s + totalUds(i), 0)} unidades en total</p>
                                    </div>
                                    <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#2e7d52' }}>{fmt(totalCompra())}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '16px 28px 24px', borderTop: '1px solid #f0f0f0' }}>
                                <button onClick={() => setModalAbierto(false)} style={{ backgroundColor: 'white', color: '#666', border: '1.5px solid #ddd', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={handleGuardar} style={{ backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>💾 Registrar Compra</button>
                            </div>
                        </Modal>

                        {cargando ? (
                            <div style={s.sinDatos}>Cargando compras...</div>
                        ) : compras.length === 0 ? (
                            <div style={s.sinDatos}><p style={{ fontSize: '40px', margin: 0 }}>🛒</p><p>No hay compras registradas</p></div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {compras.map(c => {
                                    const detalles = detallesExpandido[c.id_compra];
                                    return (
                                        <div key={c.id_compra} style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px' }}>
                                                <div style={{ fontSize: '28px' }}>🛒</div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#2d2d2d', margin: '0 0 3px' }}>Compra #{c.id_compra}</p>
                                                    <p style={{ fontSize: '13px', color: '#555', margin: '0 0 3px' }}>🏭 {getNombreProv(c.id_proveedor)}</p>
                                                    <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>📅 {c.fecha_compra ? new Date(c.fecha_compra).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#2e7d52', margin: 0 }}>{fmt(c.total)}</p>
                                                </div>
                                                <button onClick={() => handleVerDetalles(c.id_compra)} style={{ backgroundColor: '#f0f4f0', color: '#555', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                                                    {expandido === c.id_compra ? '▲ Ocultar' : '▼ Ver detalle'}
                                                </button>
                                            </div>
                                            {expandido === c.id_compra && (
                                                <div style={{ borderTop: '1px solid #f0f4f0', padding: '15px 20px', backgroundColor: '#fafffe' }}>
                                                    {!detalles ? <p style={{ color: '#999', fontSize: '13px' }}>Cargando...</p> : (
                                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                            <thead><tr style={{ backgroundColor: '#f0f4f0' }}>
                                                                <th style={s.th}>Producto</th>
                                                                <th style={s.th}>Cantidad</th>
                                                                <th style={s.th}>Precio unit.</th>
                                                                <th style={s.th}>Subtotal</th>
                                                            </tr></thead>
                                                            <tbody>{detalles.detalles?.map(d => (
                                                                <tr key={d.id_detalle} style={{ borderTop: '1px solid #f0f4f0' }}>
                                                                    <td style={s.td}>{getNombreProd(d.id_producto)}</td>
                                                                    <td style={s.td}>{d.cantidad} uds</td>
                                                                    <td style={s.td}>{fmt(d.precio_unitario)}</td>
                                                                    <td style={s.td}>{fmt(d.subtotal)}</td>
                                                                </tr>
                                                            ))}</tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ── PESTAÑA REPORTE ── */}
                {pestaña === 'reporte' && (
                    <>
                        {/* Filtros de fecha */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '16px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={s.label}>Desde</label>
                                <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={s.input} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={s.label}>Hasta</label>
                                <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={s.input} />
                            </div>
                            <button onClick={generarReporte} style={{ ...s.botonNuevo, height: '38px' }}>
                                📊 Generar reporte
                            </button>
                            <button onClick={() => { setDesde(inicioMes()); setHasta(hoy()); setTimeout(generarReporte, 0); }} style={{ ...s.botonSecundario, height: '38px' }}>
                                Este mes
                            </button>
                            <button onClick={() => { setDesde(hace30()); setHasta(hoy()); setTimeout(generarReporte, 0); }} style={{ ...s.botonSecundario, height: '38px' }}>
                                Últimos 30 días
                            </button>
                        </div>

                        {cargandoReporte && <div style={s.sinDatos}>Generando reporte...</div>}

                        {reporte && !cargandoReporte && (
                            <>
                                {/* Métricas resumen */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                                    {[
                                        { label: 'Proveedores', valor: reporte.total_proveedores, color: '#2d2d2d', esNum: true },
                                        { label: 'Total gastado',       valor: fmt(reporte.total_global),    color: '#e53935' },
                                        { label: 'Unidades ingresadas', valor: `${reporte.total_unidades} uds`, color: '#1565c0' },
                                        { label: 'Órdenes de compra',   valor: reporte.total_ordenes,        color: '#2d2d2d', esNum: true },
                                    ].map(({ label, valor, color }) => (
                                        <div key={label} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 6px' }}>{label}</p>
                                            <p style={{ fontSize: '20px', fontWeight: '600', color, margin: 0 }}>{valor}</p>
                                        </div>
                                    ))}
                                </div>

                                {reporte.proveedores.length === 0 ? (
                                    <div style={s.sinDatos}><p style={{ fontSize: '32px', margin: 0 }}>🏭</p><p>Sin compras en este período</p></div>
                                ) : (
                                    reporte.proveedores.map((prov, idx) => {
                                        const abierto = expandidoProv === prov.id_proveedor;
                                        const color   = COLORES[idx % COLORES.length];
                                        return (
                                            <div key={prov.id_proveedor} style={{ backgroundColor: 'white', borderRadius: '12px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                                                {/* Header proveedor */}
                                                <div onClick={() => setExpandidoProv(abierto ? null : prov.id_proveedor)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', cursor: 'pointer' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600', flexShrink: 0 }}>
                                                            {iniciales(prov.nombre_empresa)}
                                                        </div>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#2d2d2d' }}>{prov.nombre_empresa}</p>
                                                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#888' }}>
                                                                {prov.total_ordenes} orden{prov.total_ordenes !== 1 ? 'es' : ''} · {prov.productos.length} producto{prov.productos.length !== 1 ? 's' : ''} · {prov.total_unidades} uds
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <p style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#e53935' }}>{fmt(prov.total_gastado)}</p>
                                                            <p style={{ margin: 0, fontSize: '11px', color: '#aaa' }}>{prov.porcentaje}% del total</p>
                                                        </div>
                                                        <span style={{ color: '#ccc', fontSize: '14px' }}>{abierto ? '▼' : '▶'}</span>
                                                    </div>
                                                </div>

                                                {/* Detalle productos */}
                                                {abierto && (
                                                    <>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 110px', gap: '4px', padding: '8px 18px 8px 32px', backgroundColor: '#f8fffe', fontSize: '11px', fontWeight: '600', color: '#aaa', borderTop: '0.5px solid #f0f4f0' }}>
                                                            <span>PRODUCTO</span>
                                                            <span style={{ textAlign: 'center' }}>UNIDADES</span>
                                                            <span style={{ textAlign: 'center' }}>ÓRDENES</span>
                                                            <span style={{ textAlign: 'right' }}>SUBTOTAL</span>
                                                        </div>
                                                        {prov.productos.map(prod => (
                                                            <div key={prod.id_producto} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 110px', gap: '4px', padding: '11px 18px 11px 32px', borderTop: '0.5px solid #f0f4f0', fontSize: '13px', alignItems: 'center' }}>
                                                                <span style={{ color: '#2d2d2d' }}>{prod.nombre}</span>
                                                                <span style={{ textAlign: 'center' }}>
                                                                    <span style={{ backgroundColor: '#e3f2fd', color: '#0C447C', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                                                                        {prod.total_unidades} uds
                                                                    </span>
                                                                </span>
                                                                <span style={{ textAlign: 'center', color: '#999' }}>{prod.total_ordenes}</span>
                                                                <span style={{ textAlign: 'right', fontWeight: '600', color: '#2d2d2d' }}>{fmt(prod.subtotal)}</span>
                                                            </div>
                                                        ))}

                                                        {/* Barra de porcentaje */}
                                                        <div style={{ padding: '10px 18px 14px', borderTop: '0.5px solid #f0f4f0' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>
                                                                <span>Participación en el gasto total</span>
                                                                <span>{prov.porcentaje}%</span>
                                                            </div>
                                                            <div style={{ height: '6px', backgroundColor: '#f0f4f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                                <div style={{ height: '100%', width: `${prov.porcentaje}%`, backgroundColor: color, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const s = {
    layout:          { display: 'flex', minHeight: '100vh', backgroundColor: '#f0f4f0' },
    contenido:       { marginLeft: '250px', flex: 1, padding: '30px' },
    header:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e0ede6' },
    titulo:          { fontSize: '26px', color: '#2e7d52', fontWeight: 'bold', margin: 0 },
    subtitulo:       { color: '#666', marginTop: '4px', fontSize: '14px' },
    botonNuevo:      { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
    botonSecundario: { backgroundColor: 'white', color: '#555', border: '1.5px solid #e0ede6', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
    error:           { color: '#e53935', backgroundColor: '#fdecea', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px' },
    tabs:            { display: 'flex', gap: '4px', marginBottom: '20px', backgroundColor: 'white', padding: '4px', borderRadius: '10px', width: 'fit-content', border: '1px solid #e0ede6' },
    tab:             { padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none', backgroundColor: 'transparent', color: '#666' },
    tabActivo:       { backgroundColor: '#e8f5ee', color: '#2e7d52' },
    label:           { fontSize: '13px', color: '#555', fontWeight: '600', display: 'block', marginBottom: '6px' },
    labelSm:         { fontSize: '12px', color: '#777', fontWeight: '600', display: 'block', marginBottom: '4px' },
    select:          { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', width: '100%' },
    input:           { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
    th:              { padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: '#555', fontWeight: '600' },
    td:              { padding: '10px 14px', fontSize: '13px', color: '#333' },
    sinDatos:        { backgroundColor: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', color: '#999' },
};

export default Compras;