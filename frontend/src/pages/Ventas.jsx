import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getVentas, crearVenta, getResumenVentas } from '../api/ventas';
import { getProductos } from '../api/productos';
import { getClientes } from '../api/clientes';

const METODOS = ['efectivo', 'transferencia', 'tarjeta'];
const METODO_ICONS = { efectivo: '💵', transferencia: '🏦', tarjeta: '💳' };
const STOCK_MINIMO = 3;

const itemVacio = () => ({ id_producto: '', talla: '', cantidad: 1, precio_unitario: '' });

const Ventas = () => {
    const [ventas, setVentas] = useState([]);
    const [productos, setProductos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [resumen, setResumen] = useState(null);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [expandido, setExpandido] = useState(null);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [cargando, setCargando] = useState(false);
    const [filtroDia, setFiltroDia] = useState('hoy');
    const [busqueda, setBusqueda] = useState('');

    // Formulario
    const [idCliente, setIdCliente] = useState('');
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [items, setItems] = useState([itemVacio()]);

    const usuario = JSON.parse(localStorage.getItem('usuario'));

    useEffect(() => { cargarTodo(); }, []);

    const cargarTodo = async () => {
        setCargando(true);
        try {
            const [v, p, c, r] = await Promise.all([
                getVentas(), getProductos(), getClientes(), getResumenVentas()
            ]);
            setVentas(v);
            setProductos(p);
            setClientes(c);
            setResumen(r);
        } catch {
            setError('Error al cargar los datos');
        } finally {
            setCargando(false);
        }
    };

    const getProductoSeleccionado = (id) =>
        productos.find(p => p.id_producto === parseInt(id)) || null;

    const handleProductoChange = (index, idProducto) => {
        const nuevos = [...items];
        nuevos[index].id_producto = idProducto;
        nuevos[index].talla = '';
        const prod = getProductoSeleccionado(idProducto);
        nuevos[index].precio_unitario = prod?.precio_venta || '';
        setItems(nuevos);
    };

    const handleItemChange = (index, campo, valor) => {
        const nuevos = [...items];
        nuevos[index][campo] = valor;
        setItems(nuevos);
    };

    const handleTallaCantidad = (index, talla, valor) => {
        const nuevos = [...items];
        nuevos[index].talla = talla;
        nuevos[index].cantidad = parseInt(valor) || 1;
        setItems(nuevos);
    };

    const calcularTotal = () =>
        items.reduce((s, i) =>
            s + (parseFloat(i.precio_unitario) || 0) * (parseInt(i.cantidad) || 0), 0
        );

    const handleGuardar = async () => {
        const itemsValidos = items.filter(
            i => i.id_producto && i.talla && i.cantidad > 0 && i.precio_unitario > 0
        );
        if (itemsValidos.length === 0) {
            setError('Agrega al menos un producto con talla, cantidad y precio');
            return;
        }
        try {
            const res = await crearVenta({
                id_cliente: idCliente ? parseInt(idCliente) : null,
                id_vendedor: usuario?.id_usuario || usuario?.id,
                metodo_pago: metodoPago,
                detalles: itemsValidos.map(i => ({
                    id_producto: parseInt(i.id_producto),
                    talla: i.talla,
                    cantidad: parseInt(i.cantidad),
                    precio_unitario: parseFloat(i.precio_unitario),
                }))
            });
            setExito(`✅ Venta #${res.id_venta} registrada — Total: $${Number(res.total).toLocaleString()}`);
            setMostrarForm(false);
            setIdCliente('');
            setMetodoPago('efectivo');
            setItems([itemVacio()]);
            setError('');
            cargarTodo();
            setTimeout(() => setExito(''), 5000);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al registrar la venta');
        }
    };

    const getNombreCliente = (id) => {
        if (!id) return 'Cliente ocasional';
        const c = clientes.find(c => c.id_cliente === id);
        return c ? `${c.nombre} ${c.apellido || ''}`.trim() : `Cliente #${id}`;
    };

    // Filtro por día
    const ventasFiltradas = ventas.filter(v => {
        const fecha = new Date(v.fecha_venta);
        const hoy = new Date();
        if (filtroDia === 'hoy') {
            return fecha.toDateString() === hoy.toDateString();
        }
        if (filtroDia === 'semana') {
            const hace7 = new Date(hoy - 7 * 24 * 60 * 60 * 1000);
            return fecha >= hace7;
        }
        if (filtroDia === 'mes') {
            return fecha.getMonth() === hoy.getMonth() &&
                fecha.getFullYear() === hoy.getFullYear();
        }
        return true;
    }).filter(v => {
        if (!busqueda) return true;
        const cliente = getNombreCliente(v.id_cliente).toLowerCase();
        return cliente.includes(busqueda.toLowerCase()) ||
            String(v.id_venta).includes(busqueda);
    });

    const totalFiltrado = ventasFiltradas.reduce((s, v) => s + parseFloat(v.total || 0), 0);

    return (
        <div style={styles.layout}>
            <Sidebar />
            <div style={styles.contenido}>

                {/* Encabezado */}
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.titulo}>💵 Ventas</h1>
                        <p style={styles.subtitulo}>Control de ventas diarias</p>
                    </div>
                    <button onClick={() => { setMostrarForm(true); setError(''); }} style={styles.botonNuevo}>
                        + Registrar Venta
                    </button>
                </div>

                {/* Resumen */}
                {resumen && (
                    <div style={styles.resumenGrid}>
                        {[
                            { label: 'Ventas hoy', cantidad: resumen.hoy.cantidad, total: resumen.hoy.total, color: '#2e7d52' },
                            { label: 'Esta semana', cantidad: resumen.semana.cantidad, total: resumen.semana.total, color: '#1565c0' },
                            { label: 'Este mes', cantidad: resumen.mes.cantidad, total: resumen.mes.total, color: '#6a1b9a' },
                        ].map(({ label, cantidad, total, color }) => (
                            <div key={label} style={{ ...styles.resumenCard, borderTop: `4px solid ${color}` }}>
                                <p style={styles.resumenLabel}>{label}</p>
                                <p style={{ ...styles.resumenTotal, color }}>${Number(total).toLocaleString()}</p>
                                <p style={styles.resumenCantidad}>{cantidad} venta{cantidad !== 1 ? 's' : ''}</p>
                            </div>
                        ))}
                        <div style={{ ...styles.resumenCard, borderTop: '4px solid #e65100', backgroundColor: '#fff8f0' }}>
                            <p style={styles.resumenLabel}>Mostrando ahora</p>
                            <p style={{ ...styles.resumenTotal, color: '#e65100' }}>${totalFiltrado.toLocaleString()}</p>
                            <p style={styles.resumenCantidad}>{ventasFiltradas.length} venta{ventasFiltradas.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                )}

                {/* Filtros */}
                <div style={styles.filtrosRow}>
                    <div style={styles.buscadorContainer}>
                        <span>🔍</span>
                        <input
                            placeholder="Buscar por cliente o # venta..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            style={styles.buscador}
                        />
                    </div>
                    <div style={styles.filtrosBotones}>
                        {[
                            { key: 'hoy', label: '📅 Hoy' },
                            { key: 'semana', label: '📆 7 días' },
                            { key: 'mes', label: '🗓️ Este mes' },
                            { key: 'todos', label: 'Todos' },
                        ].map(({ key, label }) => (
                            <button key={key} onClick={() => setFiltroDia(key)} style={{
                                ...styles.filtroBton,
                                backgroundColor: filtroDia === key ? '#2e7d52' : 'white',
                                color: filtroDia === key ? 'white' : '#555',
                            }}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {exito && <p style={styles.exito}>{exito}</p>}
                {error && <p style={styles.error}>{error}</p>}

                {/* Formulario */}
                {mostrarForm && (
                    <div style={styles.formulario}>
                        <h3 style={styles.formTitulo}>💵 Registrar Nueva Venta</h3>

                        <div style={styles.formGrid}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Cliente (opcional)</label>
                                <select value={idCliente} onChange={e => setIdCliente(e.target.value)} style={styles.select}>
                                    <option value="">👤 Cliente ocasional</option>
                                    {clientes.map(c => (
                                        <option key={c.id_cliente} value={c.id_cliente}>
                                            {c.nombre} {c.apellido || ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Método de pago *</label>
                                <div style={styles.metodosRow}>
                                    {METODOS.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setMetodoPago(m)}
                                            style={{
                                                ...styles.metodoBtn,
                                                backgroundColor: metodoPago === m ? '#2e7d52' : 'white',
                                                color: metodoPago === m ? 'white' : '#555',
                                                border: `2px solid ${metodoPago === m ? '#2e7d52' : '#e0ede6'}`,
                                            }}
                                        >
                                            {METODO_ICONS[m]} {m.charAt(0).toUpperCase() + m.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Productos */}
                        <div style={styles.productosSeccion}>
                            <p style={styles.seccionTitulo}>👕 Productos a vender</p>
                            {items.map((item, i) => {
                                const prod = getProductoSeleccionado(item.id_producto);
                                return (
                                    <div key={i} style={styles.itemCard}>
                                        <div style={styles.itemHeader}>
                                            <div style={{ flex: 2 }}>
                                                <label style={styles.labelSmall}>Producto</label>
                                                <select
                                                    value={item.id_producto}
                                                    onChange={e => handleProductoChange(i, e.target.value)}
                                                    style={styles.select}
                                                >
                                                    <option value="">-- Selecciona un producto --</option>
                                                    {productos.map(p => (
                                                        <option key={p.id_producto} value={p.id_producto}>
                                                            {p.nombre} — Stock: {p.stock}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={styles.labelSmall}>Precio de venta</label>
                                                <input
                                                    type="number" min="0"
                                                    value={item.precio_unitario}
                                                    onChange={e => handleItemChange(i, 'precio_unitario', e.target.value)}
                                                    style={styles.input}
                                                    placeholder="$"
                                                />
                                            </div>
                                            <button onClick={() => {
                                                if (items.length > 1) setItems(items.filter((_, idx) => idx !== i));
                                            }} style={styles.botonQuitar}>✕</button>
                                        </div>

                                        {/* Tallas del producto */}
                                        {prod && (
                                            <div style={styles.tallasGrid}>
                                                {prod.tallas && prod.tallas.length > 0 ? (
                                                    prod.tallas.map(t => {
                                                        const seleccionada = item.talla === t.talla;
                                                        const sinStock = t.cantidad === 0;
                                                        const stockBajo = t.cantidad > 0 && t.cantidad < STOCK_MINIMO;
                                                        return (
                                                            <div
                                                                key={t.talla}
                                                                onClick={() => !sinStock && handleTallaCantidad(i, t.talla, 1)}
                                                                style={{
                                                                    ...styles.tallaCard,
                                                                    borderColor: seleccionada ? '#2e7d52' : stockBajo ? '#e65100' : sinStock ? '#ddd' : '#e0ede6',
                                                                    backgroundColor: seleccionada ? '#e8f5ee' : sinStock ? '#f9f9f9' : 'white',
                                                                    opacity: sinStock ? 0.5 : 1,
                                                                    cursor: sinStock ? 'not-allowed' : 'pointer',
                                                                }}
                                                            >
                                                                <div style={styles.tallaNombre}>{t.talla}</div>
                                                                <div style={{
                                                                    fontSize: '11px',
                                                                    color: sinStock ? '#ccc' : stockBajo ? '#e65100' : '#2e7d52',
                                                                    fontWeight: '600'
                                                                }}>
                                                                    {sinStock ? 'Sin stock' : `${t.cantidad} disp.`}
                                                                    {stockBajo && !sinStock && ' ⚠️'}
                                                                </div>
                                                                {seleccionada && (
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max={t.cantidad}
                                                                        value={item.cantidad}
                                                                        onClick={e => e.stopPropagation()}
                                                                        onChange={e => handleItemChange(i, 'cantidad', e.target.value)}
                                                                        style={styles.tallaInput}
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <p style={{ color: '#999', fontSize: '13px' }}>Sin tallas registradas</p>
                                                )}
                                            </div>
                                        )}

                                        {/* Subtotal del item */}
                                        {item.talla && item.precio_unitario && (
                                            <div style={styles.itemResumen}>
                                                <span>Talla <strong>{item.talla}</strong> × {item.cantidad} ud{item.cantidad > 1 ? 's' : ''}</span>
                                                <span style={{ color: '#2e7d52', fontWeight: 'bold' }}>
                                                    ${((parseFloat(item.precio_unitario) || 0) * (parseInt(item.cantidad) || 0)).toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            <button
                                onClick={() => setItems([...items, itemVacio()])}
                                style={styles.botonAgregar}
                            >
                                + Agregar otro producto
                            </button>
                        </div>

                        {/* Total */}
                        <div style={styles.totalBox}>
                            <div>
                                <p style={styles.totalLabel}>TOTAL DE LA VENTA</p>
                                <p style={styles.totalMetodo}>
                                    {METODO_ICONS[metodoPago]} Pago en {metodoPago}
                                </p>
                            </div>
                            <span style={styles.totalValor}>${calcularTotal().toLocaleString()}</span>
                        </div>

                        <div style={styles.formBotones}>
                            <button onClick={handleGuardar} style={styles.botonGuardar}>
                                💵 Confirmar Venta
                            </button>
                            <button onClick={() => { setMostrarForm(false); setItems([itemVacio()]); }} style={styles.botonCancelar}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Lista de ventas */}
                {cargando ? (
                    <div style={styles.sinDatos}>Cargando ventas...</div>
                ) : ventasFiltradas.length === 0 ? (
                    <div style={styles.sinDatos}>
                        <p style={{ fontSize: '40px', margin: 0 }}>💵</p>
                        <p>No hay ventas en este período</p>
                    </div>
                ) : (
                    <div style={styles.lista}>
                        {ventasFiltradas.map(v => (
                            <div key={v.id_venta} style={styles.ventaCard}>
                                <div style={styles.ventaFila}>
                                    <div style={styles.ventaMetodo}>
                                        <span style={{ fontSize: '24px' }}>{METODO_ICONS[v.metodo_pago] || '💵'}</span>
                                        <span style={styles.ventaMetodoLabel}>{v.metodo_pago}</span>
                                    </div>
                                    <div style={styles.ventaInfo}>
                                        <p style={styles.ventaId}>Venta #{v.id_venta}</p>
                                        <p style={styles.ventaCliente}>
                                            👤 {getNombreCliente(v.id_cliente)}
                                        </p>
                                        <p style={styles.ventaFecha}>
                                            📅 {v.fecha_venta
                                                ? new Date(v.fecha_venta).toLocaleDateString('es-CO', {
                                                    day: '2-digit', month: 'short',
                                                    hour: '2-digit', minute: '2-digit'
                                                }) : '—'}
                                        </p>
                                    </div>
                                    <div style={styles.ventaTotal}>
                                        ${Number(v.total).toLocaleString()}
                                    </div>
                                    <button
                                        onClick={() => setExpandido(expandido === v.id_venta ? null : v.id_venta)}
                                        style={styles.botonVer}
                                    >
                                        {expandido === v.id_venta ? '▲ Ocultar' : '▼ Detalle'}
                                    </button>
                                </div>

                                {/* Detalles expandidos */}
                                {expandido === v.id_venta && v.detalles && (
                                    <div style={styles.detallesContainer}>
                                        <table style={styles.tabla}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#f0f4f0' }}>
                                                    <th style={styles.th}>Producto</th>
                                                    <th style={styles.th}>Talla</th>
                                                    <th style={styles.th}>Cantidad</th>
                                                    <th style={styles.th}>Precio unit.</th>
                                                    <th style={styles.th}>Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {v.detalles.map(d => {
                                                    const prod = productos.find(p => p.id_producto === d.id_producto);
                                                    return (
                                                        <tr key={d.id_detalle} style={{ borderTop: '1px solid #f0f4f0' }}>
                                                            <td style={styles.td}>{prod?.nombre || `Producto #${d.id_producto}`}</td>
                                                            <td style={styles.td}>
                                                                <span style={styles.tallaPill}>{d.talla}</span>
                                                            </td>
                                                            <td style={styles.td}>{d.cantidad} uds</td>
                                                            <td style={styles.td}>${Number(d.precio_unitario).toLocaleString()}</td>
                                                            <td style={{ ...styles.td, color: '#2e7d52', fontWeight: 'bold' }}>
                                                                ${Number(d.subtotal).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
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

    resumenGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' },
    resumenCard: { backgroundColor: 'white', padding: '18px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    resumenLabel: { fontSize: '12px', color: '#888', margin: '0 0 8px 0' },
    resumenTotal: { fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px 0' },
    resumenCantidad: { fontSize: '12px', color: '#aaa', margin: 0 },

    filtrosRow: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
    buscadorContainer: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', border: '1.5px solid #e0ede6', borderRadius: '10px', padding: '0 15px', flex: 1 },
    buscador: { border: 'none', outline: 'none', padding: '11px 0', fontSize: '14px', width: '100%' },
    filtrosBotones: { display: 'flex', gap: '8px' },
    filtroBton: { border: '1.5px solid #e0ede6', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },

    exito: { color: '#2e7d52', backgroundColor: '#e8f5ee', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' },
    error: { color: '#e53935', backgroundColor: '#fdecea', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' },

    formulario: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 2px 15px rgba(0,0,0,0.06)' },
    formTitulo: { color: '#2e7d52', marginBottom: '20px', marginTop: 0 },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', color: '#555', fontWeight: '600' },
    labelSmall: { fontSize: '12px', color: '#777', fontWeight: '600', display: 'block', marginBottom: '4px' },
    select: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', width: '100%' },
    input: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
    metodosRow: { display: 'flex', gap: '10px' },
    metodoBtn: { flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },

    productosSeccion: { backgroundColor: '#f8fffe', border: '1.5px solid #e0ede6', borderRadius: '10px', padding: '18px', marginBottom: '20px' },
    seccionTitulo: { fontSize: '14px', fontWeight: '700', color: '#2e7d52', marginBottom: '15px', marginTop: 0 },
    itemCard: { backgroundColor: 'white', border: '1px solid #e0ede6', borderRadius: '10px', padding: '15px', marginBottom: '12px' },
    itemHeader: { display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '14px' },
    botonQuitar: { backgroundColor: '#fdecea', color: '#e53935', border: 'none', width: '34px', height: '34px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 },
    tallasGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' },
    tallaCard: { border: '2px solid #e0ede6', borderRadius: '10px', padding: '10px 14px', minWidth: '80px', textAlign: 'center', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' },
    tallaNombre: { fontSize: '16px', fontWeight: 'bold', color: '#2d2d2d' },
    tallaInput: { width: '60px', padding: '4px 6px', border: '1.5px solid #2e7d52', borderRadius: '6px', fontSize: '14px', textAlign: 'center', outline: 'none', marginTop: '4px' },
    itemResumen: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0faf4', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', color: '#555' },
    botonAgregar: { backgroundColor: 'transparent', color: '#2e7d52', border: '1.5px dashed #2e7d52', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', width: '100%', marginTop: '4px' },

    totalBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e8f5ee', padding: '18px 24px', borderRadius: '10px', marginBottom: '20px' },
    totalLabel: { fontSize: '14px', fontWeight: '700', color: '#2e7d52', margin: 0 },
    totalMetodo: { fontSize: '13px', color: '#888', margin: '4px 0 0 0' },
    totalValor: { fontSize: '28px', fontWeight: 'bold', color: '#2e7d52' },
    formBotones: { display: 'flex', gap: '10px' },
    botonGuardar: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' },
    botonCancelar: { backgroundColor: 'white', color: '#666', border: '1px solid #ddd', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },

    lista: { display: 'flex', flexDirection: 'column', gap: '10px' },
    ventaCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' },
    ventaFila: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' },
    ventaMetodo: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '55px' },
    ventaMetodoLabel: { fontSize: '10px', color: '#888', textTransform: 'capitalize', marginTop: '2px' },
    ventaInfo: { flex: 1 },
    ventaId: { fontSize: '14px', fontWeight: 'bold', color: '#2d2d2d', margin: '0 0 2px 0' },
    ventaCliente: { fontSize: '13px', color: '#555', margin: '0 0 2px 0' },
    ventaFecha: { fontSize: '12px', color: '#aaa', margin: 0 },
    ventaTotal: { fontSize: '20px', fontWeight: 'bold', color: '#2e7d52', minWidth: '120px', textAlign: 'right' },
    botonVer: { backgroundColor: '#f0f4f0', color: '#555', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 },
    detallesContainer: { borderTop: '1px solid #f0f4f0', padding: '15px 20px', backgroundColor: '#fafffe' },
    tabla: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: '#555', fontWeight: '600' },
    td: { padding: '10px 14px', fontSize: '13px', color: '#333' },
    tallaPill: { backgroundColor: '#e8f5ee', color: '#2e7d52', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
    sinDatos: { backgroundColor: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', color: '#999' },
};

export default Ventas;