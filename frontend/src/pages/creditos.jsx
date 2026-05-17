import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getCreditos, crearCredito, cancelarCredito } from '../api/creditos';
import { getClientes } from '../api/clientes';
import { getProductos } from '../api/productos';

const ESTADOS = {
    PENDIENTE: { color: '#1565c0', bg: '#e3f2fd', label: 'Pendiente' },
    PAGADO:    { color: '#2e7d52', bg: '#e8f5ee', label: 'Pagado' },
    VENCIDO:   { color: '#e65100', bg: '#fff3e0', label: 'Vencido' },
};

const itemVacio = () => ({ id_producto: '', talla: '', cantidad: 1, precio_unitario: '' });

const Creditos = () => {
    const [creditos, setCreditos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [idCliente, setIdCliente] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [items, setItems] = useState([itemVacio()]);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const [filtro, setFiltro] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [expandido, setExpandido] = useState(null);

    const usuario = JSON.parse(localStorage.getItem('usuario'));

    useEffect(() => { cargarTodo(); }, []);

    const cargarTodo = async () => {
        setCargando(true);
        try {
            const [cr, cl, pr] = await Promise.all([
                getCreditos(), getClientes(), getProductos()
            ]);
            setCreditos(cr);
            setClientes(cl);
            setProductos(pr);
        } catch {
            setError('Error al cargar los datos');
        } finally {
            setCargando(false);
        }
    };

    const tallasDeProducto = (idProducto) => {
        if (!idProducto) return [];
        const prod = productos.find(p => p.id_producto === parseInt(idProducto));
        return prod?.tallas?.filter(t => t.cantidad > 0) || [];
    };

    const handleItemChange = (index, campo, valor) => {
        const nuevos = [...items];
        nuevos[index][campo] = valor;
        if (campo === 'id_producto') {
            nuevos[index].talla = '';
            const prod = productos.find(p => p.id_producto === parseInt(valor));
            nuevos[index].precio_unitario = prod?.precio_venta || '';
        }
        setItems(nuevos);
    };

    const agregarItem = () => setItems([...items, itemVacio()]);
    const quitarItem = (i) => {
        if (items.length === 1) return;
        setItems(items.filter((_, idx) => idx !== i));
    };

    const calcularTotal = () => items.reduce((s, i) =>
        s + (parseFloat(i.precio_unitario) || 0) * (parseInt(i.cantidad) || 0), 0
    );

    const handleGuardar = async () => {
        if (!idCliente || !fechaFin) {
            setError('Cliente y fecha límite son obligatorios');
            return;
        }
        const itemsValidos = items.filter(
            i => i.id_producto && i.talla && i.cantidad > 0 && i.precio_unitario > 0
        );
        if (itemsValidos.length === 0) {
            setError('Agrega al menos un producto con talla, cantidad y precio');
            return;
        }
        try {
            await crearCredito({
                id_cliente: parseInt(idCliente),
                id_vendedor: usuario?.id_usuario || usuario?.id,
                fecha_limite: fechaFin,
                detalles: itemsValidos.map(i => ({
                    id_producto: parseInt(i.id_producto),
                    talla: i.talla,
                    cantidad: parseInt(i.cantidad),
                    precio_unitario: parseFloat(i.precio_unitario),
                }))
            });
            setMostrarForm(false);
            setIdCliente('');
            setFechaFin('');
            setItems([itemVacio()]);
            setError('');
            cargarTodo();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al crear el crédito');
        }
    };

    const handleCancelar = async (id) => {
        if (!confirm('¿Seguro que quieres cancelar este crédito?')) return;
        try {
            await cancelarCredito(id);
            cargarTodo();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al cancelar');
        }
    };

    const getNombreCliente = (id) => {
        const c = clientes.find(c => c.id_cliente === id);
        return c ? `${c.nombre} ${c.apellido || ''}`.trim() : `Cliente #${id}`;
    };

    const getNombreProducto = (id) => {
        const p = productos.find(p => p.id_producto === id);
        return p ? p.nombre : `Producto #${id}`;
    };

    const esVencido = (c) =>
        c.estado === 'PENDIENTE' && new Date(c.fecha_limite) < new Date();
    const getEstado = (c) => esVencido(c) ? 'VENCIDO' : c.estado;

const creditosFiltrados = creditos.filter(c => {
    const estado = getEstado(c);
    const matchFiltro = filtro === 'todos' || estado === filtro;
    const nombre = getNombreCliente(c.id_cliente).toLowerCase();
    const matchBusqueda = !busqueda || nombre.includes(busqueda.toLowerCase());
    return matchFiltro && matchBusqueda;
});

const resumen = {
    activos:  creditos.filter(c => c.estado === 'PENDIENTE' && !esVencido(c)).length,
    vencidos: creditos.filter(c => esVencido(c)).length,
    pagados:  creditos.filter(c => c.estado === 'PAGADO').length,
    saldo:    creditos.reduce((s, c) => s + parseFloat(c.saldo_pendiente || 0), 0),
};

    return (
        <div style={styles.layout}>
            <Sidebar />
            <div style={styles.contenido}>

                <div style={styles.header}>
                    <div>
                        <h1 style={styles.titulo}>📋 Créditos</h1>
                        <p style={styles.subtitulo}>{creditos.length} créditos registrados</p>
                    </div>
                    <button onClick={() => { setMostrarForm(true); setError(''); }} style={styles.botonNuevo}>
                        + Nuevo Crédito
                    </button>
                </div>

                {/* Resumen */}
                <div style={styles.resumenGrid}>
                    {[
                        { valor: resumen.activos, label: 'Activos', color: '#1565c0' },
                        { valor: resumen.vencidos, label: 'Vencidos', color: '#e65100' },
                        { valor: resumen.pagados, label: 'Pagados', color: '#2e7d52' },
                        { valor: `$${resumen.saldo.toLocaleString()}`, label: 'Saldo pendiente', color: '#6a1b9a' },
                    ].map(({ valor, label, color }) => (
                        <div key={label} style={{ ...styles.resumenCard, borderLeft: `4px solid ${color}` }}>
                            <p style={styles.resumenNumero}>{valor}</p>
                            <p style={styles.resumenLabel}>{label}</p>
                        </div>
                    ))}
                </div>

                {/* Filtros */}
                <div style={styles.filtrosRow}>
                    <div style={styles.buscadorContainer}>
                        <span>🔍</span>
                        <input
                            placeholder="Buscar por cliente..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            style={styles.buscador}
                        />
                            </div>
                            <div style={styles.filtrosBotones}>
                            {['todos', 'PENDIENTE', 'VENCIDO', 'PAGADO'].map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
                ...styles.filtroBton,
                backgroundColor: filtro === f ? '#2e7d52' : 'white',
                color: filtro === f ? 'white' : '#555',
            }}>
                {f === 'todos' ? 'Todos' :
                f === 'PENDIENTE' ? 'Pendiente' :
                f === 'VENCIDO' ? 'Vencido' : 'Pagado'}
            </button>
        ))}
                    </div>
                </div>

                {error && <p style={styles.error}>{error}</p>}

                {/* Formulario */}
                {mostrarForm && (
                    <div style={styles.formulario}>
                        <h3 style={styles.formTitulo}>➕ Nuevo Crédito</h3>
                        <div style={styles.formGrid}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Cliente *</label>
                                <select value={idCliente} onChange={e => setIdCliente(e.target.value)} style={styles.select}>
                                    <option value="">-- Selecciona cliente --</option>
                                    {clientes.map(c => (
                                        <option key={c.id_cliente} value={c.id_cliente}>
                                            {c.nombre} {c.apellido || ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Fecha límite *</label>
                                <input
                                    type="date"
                                    value={fechaFin}
                                    onChange={e => setFechaFin(e.target.value)}
                                    style={styles.input}
                                />
                            </div>
                        </div>

                        {/* Productos */}
                        <div style={styles.productosSeccion}>
                            <p style={styles.seccionTitulo}>👕 Productos del crédito</p>
                            {items.map((item, i) => {
                                const tallas = tallasDeProducto(item.id_producto);
                                return (
                                    <div key={i} style={styles.itemRow}>
                                        <div style={{ flex: 2 }}>
                                            <label style={styles.labelSmall}>Producto</label>
                                            <select
                                                value={item.id_producto}
                                                onChange={e => handleItemChange(i, 'id_producto', e.target.value)}
                                                style={styles.select}
                                            >
                                                <option value="">-- Producto --</option>
                                                {productos.map(p => (
                                                    <option key={p.id_producto} value={p.id_producto}>
                                                        {p.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={styles.labelSmall}>Talla</label>
                                            <select
                                                value={item.talla}
                                                onChange={e => handleItemChange(i, 'talla', e.target.value)}
                                                style={styles.select}
                                                disabled={!item.id_producto}
                                            >
                                                <option value="">-- Talla --</option>
                                                {tallas.map(t => (
                                                    <option key={t.talla} value={t.talla}>
                                                        {t.talla} ({t.cantidad} disp.)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={styles.labelSmall}>Cantidad</label>
                                            <input
                                                type="number" min="1"
                                                value={item.cantidad}
                                                onChange={e => handleItemChange(i, 'cantidad', e.target.value)}
                                                style={styles.input}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={styles.labelSmall}>Precio</label>
                                            <input
                                                type="number" min="0"
                                                value={item.precio_unitario}
                                                onChange={e => handleItemChange(i, 'precio_unitario', e.target.value)}
                                                style={styles.input}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={styles.labelSmall}>Subtotal</label>
                                            <div style={styles.subtotalBox}>
                                                ${((parseFloat(item.precio_unitario) || 0) * (parseInt(item.cantidad) || 0)).toLocaleString()}
                                            </div>
                                        </div>
                                        <button onClick={() => quitarItem(i)} style={styles.botonQuitar}>✕</button>
                                    </div>
                                );
                            })}
                            <button onClick={agregarItem} style={styles.botonAgregar}>
                                + Agregar otro producto
                            </button>
                        </div>

                        <div style={styles.totalBox}>
                            <span style={styles.totalLabel}>TOTAL</span>
                            <span style={styles.totalValor}>${calcularTotal().toLocaleString()}</span>
                        </div>

                        <div style={styles.formBotones}>
                            <button onClick={handleGuardar} style={styles.botonGuardar}>💾 Crear Crédito</button>
                            <button onClick={() => { setMostrarForm(false); setItems([itemVacio()]); }} style={styles.botonCancelar}>Cancelar</button>
                        </div>
                    </div>
                )}

                {/* Lista */}
                {cargando ? (
                    <div style={styles.sinDatos}>Cargando créditos...</div>
                ) : creditosFiltrados.length === 0 ? (
                    <div style={styles.sinDatos}>
                        <p style={{ fontSize: '40px', margin: 0 }}>📋</p>
                        <p>No hay créditos {filtro !== 'todos' ? filtro + 's' : 'registrados'}</p>
                    </div>
                ) : (
                    <div style={styles.lista}>
                        {creditosFiltrados.map((credito) => {
                            const estado = getEstado(credito);
                            const cfg = ESTADOS[estado] || ESTADOS['PENDIENTE']; 
                            const porcentaje = credito.valor_total > 0
                                ? ((credito.valor_total - credito.saldo_pendiente) / credito.valor_total) * 100
                                : 0;

                            return (
                                <div key={credito.id_credito} style={styles.creditoCard}>
                                    <div style={styles.creditoFila}>
                                        <div style={styles.creditoInfo}>
                                            <div style={styles.creditoTop}>
                                                <span style={styles.creditoId}>Crédito #{credito.id_credito}</span>
                                                <span style={{ ...styles.badge, backgroundColor: cfg.bg, color: cfg.color }}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            <p style={styles.creditoCliente}>👤 {getNombreCliente(credito.id_cliente)}</p>
                                            <p style={styles.creditoFecha}>
                                                📅 Vence: {credito.fecha_limite
                                                    ? new Date(credito.fecha_limite + 'T00:00:00').toLocaleDateString('es-CO')
                                                    : '—'}
                                            </p>
                                        </div>

                                        <div style={styles.creditoFinanzas}>
                                            {[
                                                { label: 'Total', valor: `$${Number(credito.valor_total).toLocaleString()}`, color: '#2d2d2d' },
                                                { label: 'Saldo', valor: `$${Number(credito.saldo_pendiente).toLocaleString()}`, color: credito.saldo_pendiente > 0 ? '#e65100' : '#2e7d52' },
                                            ].map(({ label, valor, color }) => (
                                                <div key={label} style={styles.finanzaItem}>
                                                    <span style={styles.finanzaLabel}>{label}</span>
                                                    <span style={{ ...styles.finanzaValor, color }}>{valor}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <button
                                                onClick={() => setExpandido(expandido === credito.id_credito ? null : credito.id_credito)}
                                                style={styles.botonVerProductos}
                                            >
                                                {expandido === credito.id_credito ? '▲ Ocultar' : '▼ Ver productos'}
                                            </button>
                                            {estado === 'PENDIENTE' && (
                                                <button onClick={() => handleCancelar(credito.id_credito)} style={styles.botonCancelarCredito}>
                                                    Cancelar crédito
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Barra progreso */}
                                    <div style={styles.progressContainer}>
                                        <div style={styles.progressBar}>
                                            <div style={{
                                                ...styles.progressFill,
                                                width: `${Math.min(porcentaje, 100)}%`,
                                                backgroundColor: porcentaje >= 100 ? '#2e7d52' : '#1565c0',
                                            }} />
                                        </div>
                                        <span style={styles.progressLabel}>{porcentaje.toFixed(0)}% pagado</span>
                                    </div>

                                    {/* Productos expandidos */}
                                    {expandido === credito.id_credito && (
                                        <div style={styles.productosExpandidos}>
                                            <p style={styles.productosExpandidosTitulo}>👕 Productos del crédito</p>
                                            {credito.detalles && credito.detalles.length > 0 ? (
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
                                                        {credito.detalles.map(d => (
                                                            <tr key={d.id_detalle} style={{ borderTop: '1px solid #f0f4f0' }}>
                                                                <td style={styles.td}>{getNombreProducto(d.id_producto)}</td>
                                                                <td style={styles.td}>
                                                                    <span style={styles.tallaPill}>{d.talla}</span>
                                                                </td>
                                                                <td style={styles.td}>{d.cantidad} uds</td>
                                                                <td style={styles.td}>${Number(d.precio_unitario).toLocaleString()}</td>
                                                                <td style={{ ...styles.td, fontWeight: 'bold', color: '#2e7d52' }}>
                                                                    ${Number(d.subtotal).toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <p style={{ color: '#999', fontSize: '13px' }}>Sin productos</p>
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
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e0ede6' },
    titulo: { fontSize: '26px', color: '#2e7d52', fontWeight: 'bold', margin: 0 },
    subtitulo: { color: '#666', marginTop: '4px', fontSize: '14px' },
    botonNuevo: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
    resumenGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' },
    resumenCard: { backgroundColor: 'white', padding: '18px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    resumenNumero: { fontSize: '22px', fontWeight: 'bold', color: '#2d2d2d', margin: '0 0 4px 0' },
    resumenLabel: { fontSize: '12px', color: '#888', margin: 0 },
    filtrosRow: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
    buscadorContainer: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', border: '1.5px solid #e0ede6', borderRadius: '10px', padding: '0 15px', flex: 1 },
    buscador: { border: 'none', outline: 'none', padding: '11px 0', fontSize: '14px', width: '100%' },
    filtrosBotones: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    filtroBton: { border: '1.5px solid #e0ede6', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    error: { color: '#e53935', backgroundColor: '#fdecea', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' },
    formulario: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 2px 15px rgba(0,0,0,0.06)' },
    formTitulo: { color: '#2e7d52', marginBottom: '20px', marginTop: 0 },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', color: '#555', fontWeight: '600' },
    labelSmall: { fontSize: '12px', color: '#777', fontWeight: '600', display: 'block', marginBottom: '4px' },
    select: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', width: '100%' },
    input: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
    productosSeccion: { backgroundColor: '#f8fffe', border: '1.5px solid #e0ede6', borderRadius: '10px', padding: '18px', marginBottom: '20px' },
    seccionTitulo: { fontSize: '14px', fontWeight: '700', color: '#2e7d52', marginBottom: '15px', marginTop: 0 },
    itemRow: { display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '12px', backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e0ede6' },
    subtotalBox: { padding: '10px 14px', backgroundColor: '#f0f4f0', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: '#2e7d52' },
    botonQuitar: { backgroundColor: '#fdecea', color: '#e53935', border: 'none', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0 },
    botonAgregar: { backgroundColor: 'transparent', color: '#2e7d52', border: '1.5px dashed #2e7d52', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', marginTop: '4px' },
    totalBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e8f5ee', padding: '15px 20px', borderRadius: '10px', marginBottom: '20px' },
    totalLabel: { fontSize: '14px', fontWeight: '700', color: '#2e7d52' },
    totalValor: { fontSize: '22px', fontWeight: 'bold', color: '#2e7d52' },
    formBotones: { display: 'flex', gap: '10px' },
    botonGuardar: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    botonCancelar: { backgroundColor: 'white', color: '#666', border: '1px solid #ddd', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
    lista: { display: 'flex', flexDirection: 'column', gap: '12px' },
    creditoCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' },
    creditoFila: { display: 'flex', alignItems: 'center', gap: '20px', padding: '18px 20px' },
    creditoInfo: { flex: 2 },
    creditoTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' },
    creditoId: { fontSize: '15px', fontWeight: 'bold', color: '#2d2d2d' },
    badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
    creditoCliente: { fontSize: '14px', color: '#333', margin: '2px 0' },
    creditoFecha: { fontSize: '12px', color: '#999', margin: '2px 0' },
    creditoFinanzas: { display: 'flex', gap: '20px', flex: 1 },
    finanzaItem: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    finanzaLabel: { fontSize: '11px', color: '#999' },
    finanzaValor: { fontSize: '15px', fontWeight: 'bold' },
    botonVerProductos: { backgroundColor: '#f0f4f0', color: '#555', border: 'none', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    botonCancelarCredito: { backgroundColor: '#fdecea', color: '#e53935', border: 'none', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    progressContainer: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', borderTop: '1px solid #f0f4f0', backgroundColor: '#fafffe' },
    progressBar: { flex: 1, height: '8px', backgroundColor: '#e0ede6', borderRadius: '4px', overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' },
    progressLabel: { fontSize: '12px', color: '#666', minWidth: '70px', textAlign: 'right' },
    productosExpandidos: { borderTop: '1px solid #f0f4f0', padding: '15px 20px', backgroundColor: '#fafffe' },
    productosExpandidosTitulo: { fontSize: '13px', fontWeight: '700', color: '#2e7d52', margin: '0 0 12px 0' },
    tabla: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: '#555', fontWeight: '600' },
    td: { padding: '10px 14px', fontSize: '13px', color: '#333' },
    tallaPill: { backgroundColor: '#e8f5ee', color: '#2e7d52', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
    sinDatos: { backgroundColor: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', color: '#999' },
};

export default Creditos;