import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getPlanes, crearPlan, cancelarPlan } from '../api/creditos';
import { getClientes } from '../api/clientes';
import { getProductos } from '../api/productos';

const ESTADOS = {
    activo:    { color: '#1565c0', bg: '#e3f2fd', label: 'Activo' },
    pagado:    { color: '#2e7d52', bg: '#e8f5ee', label: 'Pagado' },
    cancelado: { color: '#e53935', bg: '#fdecea', label: 'Cancelado' },
    vencido:   { color: '#e65100', bg: '#fff3e0', label: 'Vencido' },
};

const itemVacio = () => ({ id_producto: '', talla: '', cantidad: 1, precio_unitario: '' });

const PlanesSepare = () => {
    const [planes, setPlanes] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [idCliente, setIdCliente] = useState('');
    const [anticipo, setAnticipo] = useState('');
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
            const [pl, cl, pr] = await Promise.all([
                getPlanes(), getClientes(), getProductos()
            ]);
            setPlanes(pl);
            setClientes(cl);
            setProductos(pr);
        } catch {
            setError('Error al cargar los datos');
        } finally {
            setCargando(false);
        }
    };

    // Tallas disponibles del producto seleccionado
    const tallasDeProducto = (idProducto) => {
        if (!idProducto) return [];
        const prod = productos.find(p => p.id_producto === parseInt(idProducto));
        return prod?.tallas?.filter(t => t.cantidad > 0) || [];
    };

    const handleItemChange = (index, campo, valor) => {
        const nuevos = [...items];
        nuevos[index][campo] = valor;
        // Si cambia el producto resetear talla y autocompletar precio
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
        if (!idCliente || !anticipo || !fechaFin) {
            setError('Cliente, anticipo y fecha límite son obligatorios');
            return;
        }
        const itemsValidos = items.filter(i => i.id_producto && i.talla && i.cantidad > 0 && i.precio_unitario > 0);
        if (itemsValidos.length === 0) {
            setError('Agrega al menos un producto con talla, cantidad y precio');
            return;
        }
        if (parseFloat(anticipo) < 0) {
            setError('El anticipo no puede ser negativo');
            return;
        }
        if (parseFloat(anticipo) > calcularTotal()) {
            setError('El anticipo no puede ser mayor al valor total');
            return;
        }
        try {
            await crearPlan({
                id_cliente: parseInt(idCliente),
                id_vendedor: usuario?.id_usuario || usuario?.id,
                anticipo: parseFloat(anticipo),
                fecha_fin: fechaFin,
                detalles: itemsValidos.map(i => ({
                    id_producto: parseInt(i.id_producto),
                    talla: i.talla,
                    cantidad: parseInt(i.cantidad),
                    precio_unitario: parseFloat(i.precio_unitario),
                }))
            });
            setMostrarForm(false);
            setIdCliente(''); setAnticipo(''); setFechaFin('');
            setItems([itemVacio()]);
            setError('');
            cargarTodo();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al crear el plan');
        }
    };

    const handleCancelar = async (id) => {
        if (!confirm('¿Seguro que quieres cancelar este plan?')) return;
        try {
            await cancelarPlan(id);
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

    const esVencido = (plan) => plan.estado === 'activo' && new Date(plan.fecha_fin) < new Date();
    const getEstado = (plan) => esVencido(plan) ? 'vencido' : plan.estado;

    const planesFiltrados = planes.filter(p => {
        const estado = getEstado(p);
        const matchFiltro = filtro === 'todos' || estado === filtro;
        const nombre = getNombreCliente(p.id_cliente).toLowerCase();
        const matchBusqueda = !busqueda || nombre.includes(busqueda.toLowerCase());
        return matchFiltro && matchBusqueda;
    });

    const resumen = {
        activos: planes.filter(p => getEstado(p) === 'activo').length,
        vencidos: planes.filter(p => getEstado(p) === 'vencido').length,
        pagados: planes.filter(p => p.estado === 'pagado').length,
        saldo: planes.reduce((s, p) => s + parseFloat(p.saldo_restante || 0), 0),
    };

    return (
        <div style={styles.layout}>
            <Sidebar />
            <div style={styles.contenido}>

                <div style={styles.header}>
                    <div>
                        <h1 style={styles.titulo}>📋 Planes Separe</h1>
                        <p style={styles.subtitulo}>{planes.length} planes registrados</p>
                    </div>
                    <button onClick={() => { setMostrarForm(true); setError(''); }} style={styles.botonNuevo}>
                        + Nuevo Plan
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
                        {['todos', 'activo', 'vencido', 'pagado', 'cancelado'].map(f => (
                            <button key={f} onClick={() => setFiltro(f)} style={{
                                ...styles.filtroBton,
                                backgroundColor: filtro === f ? '#2e7d52' : 'white',
                                color: filtro === f ? 'white' : '#555',
                            }}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {error && <p style={styles.error}>{error}</p>}

                {/* Formulario */}
                {mostrarForm && (
                    <div style={styles.formulario}>
                        <h3 style={styles.formTitulo}>➕ Nuevo Plan Separe</h3>

                        {/* Cliente y fecha */}
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
                                <label style={styles.label}>Fecha límite de pago *</label>
                                <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} style={styles.input} />
                            </div>
                        </div>

                        {/* Productos */}
                        <div style={styles.productosSeccion}>
                            <p style={styles.seccionTitulo}>👕 Productos del separe</p>
                            {items.map((item, i) => {
                                const tallas = tallasDeProducto(item.id_producto);
                                return (
                                    <div key={i} style={styles.itemRow}>
                                        {/* Producto */}
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

                                        {/* Talla */}
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

                                        {/* Cantidad */}
                                        <div style={{ flex: 1 }}>
                                            <label style={styles.labelSmall}>Cantidad</label>
                                            <input
                                                type="number" min="1"
                                                value={item.cantidad}
                                                onChange={e => handleItemChange(i, 'cantidad', e.target.value)}
                                                style={styles.input}
                                            />
                                        </div>

                                        {/* Precio */}
                                        <div style={{ flex: 1 }}>
                                            <label style={styles.labelSmall}>Precio</label>
                                            <input
                                                type="number" min="0"
                                                value={item.precio_unitario}
                                                onChange={e => handleItemChange(i, 'precio_unitario', e.target.value)}
                                                style={styles.input}
                                            />
                                        </div>

                                        {/* Subtotal */}
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

                        {/* Total y anticipo */}
                        <div style={styles.totalSection}>
                            <div style={styles.totalBox}>
                                <span style={styles.totalLabel}>TOTAL</span>
                                <span style={styles.totalValor}>${calcularTotal().toLocaleString()}</span>
                            </div>
                            <div style={styles.anticipoGroup}>
                                <label style={styles.label}>Anticipo *</label>
                                <input
                                    type="number" min="0"
                                    placeholder="Ej: 50000"
                                    value={anticipo}
                                    onChange={e => setAnticipo(e.target.value)}
                                    style={styles.input}
                                />
                                <p style={styles.saldoTexto}>
                                    Saldo restante: <strong>${(calcularTotal() - (parseFloat(anticipo) || 0)).toLocaleString()}</strong>
                                </p>
                            </div>
                        </div>

                        <div style={styles.formBotones}>
                            <button onClick={handleGuardar} style={styles.botonGuardar}>💾 Crear Plan</button>
                            <button onClick={() => { setMostrarForm(false); setItems([itemVacio()]); }} style={styles.botonCancelar}>Cancelar</button>
                        </div>
                    </div>
                )}

                {/* Lista de planes */}
                {cargando ? (
                    <div style={styles.sinDatos}>Cargando planes...</div>
                ) : planesFiltrados.length === 0 ? (
                    <div style={styles.sinDatos}>
                        <p style={{ fontSize: '40px', margin: 0 }}>📋</p>
                        <p>No hay planes {filtro !== 'todos' ? filtro + 's' : 'registrados'}</p>
                    </div>
                ) : (
                    <div style={styles.lista}>
                        {planesFiltrados.map((plan) => {
                            const estado = getEstado(plan);
                            const cfg = ESTADOS[estado] || ESTADOS.activo;
                            const porcentaje = plan.valor_total > 0
                                ? ((plan.valor_total - plan.saldo_restante) / plan.valor_total) * 100
                                : 0;

                            return (
                                <div key={plan.id_plan_separe} style={styles.planCard}>
                                    <div style={styles.planFila}>
                                        <div style={styles.planInfo}>
                                            <div style={styles.planTop}>
                                                <span style={styles.planId}>Plan #{plan.id_plan_separe}</span>
                                                <span style={{ ...styles.badge, backgroundColor: cfg.bg, color: cfg.color }}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            <p style={styles.planCliente}>👤 {getNombreCliente(plan.id_cliente)}</p>
                                            <p style={styles.planFecha}>
                                                📅 Vence: {plan.fecha_fin
                                                    ? new Date(plan.fecha_fin + 'T00:00:00').toLocaleDateString('es-CO')
                                                    : '—'}
                                            </p>
                                        </div>

                                        <div style={styles.planFinanzas}>
                                            {[
                                                { label: 'Total', valor: `$${Number(plan.valor_total).toLocaleString()}`, color: '#2d2d2d' },
                                                { label: 'Anticipo', valor: `$${Number(plan.anticipo).toLocaleString()}`, color: '#2e7d52' },
                                                { label: 'Saldo', valor: `$${Number(plan.saldo_restante).toLocaleString()}`, color: plan.saldo_restante > 0 ? '#e65100' : '#2e7d52' },
                                            ].map(({ label, valor, color }) => (
                                                <div key={label} style={styles.finanzaItem}>
                                                    <span style={styles.finanzaLabel}>{label}</span>
                                                    <span style={{ ...styles.finanzaValor, color }}>{valor}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <button
                                                onClick={() => setExpandido(expandido === plan.id_plan_separe ? null : plan.id_plan_separe)}
                                                style={styles.botonVerProductos}
                                            >
                                                {expandido === plan.id_plan_separe ? '▲ Ocultar' : '▼ Ver productos'}
                                            </button>
                                            {estado === 'activo' && (
                                                <button onClick={() => handleCancelar(plan.id_plan_separe)} style={styles.botonCancelarPlan}>
                                                    Cancelar plan
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

                                    {/* Productos del plan expandidos */}
                                    {expandido === plan.id_plan_separe && (
                                        <div style={styles.productosExpandidos}>
                                            <p style={styles.productosExpandidosTitulo}>👕 Productos del plan</p>
                                            {plan.detalles && plan.detalles.length > 0 ? (
                                                <table style={styles.tablaProductos}>
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
                                                        {plan.detalles.map(d => (
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
                                                <p style={{ color: '#999', fontSize: '13px' }}>Sin productos registrados</p>
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
    totalSection: { display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '20px' },
    totalBox: { flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e8f5ee', padding: '15px 20px', borderRadius: '10px' },
    totalLabel: { fontSize: '14px', fontWeight: '700', color: '#2e7d52' },
    totalValor: { fontSize: '22px', fontWeight: 'bold', color: '#2e7d52' },
    anticipoGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' },
    saldoTexto: { fontSize: '13px', color: '#e65100', margin: '4px 0 0 0' },
    formBotones: { display: 'flex', gap: '10px' },
    botonGuardar: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    botonCancelar: { backgroundColor: 'white', color: '#666', border: '1px solid #ddd', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
    lista: { display: 'flex', flexDirection: 'column', gap: '12px' },
    planCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' },
    planFila: { display: 'flex', alignItems: 'center', gap: '20px', padding: '18px 20px' },
    planInfo: { flex: 2 },
    planTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' },
    planId: { fontSize: '15px', fontWeight: 'bold', color: '#2d2d2d' },
    badge: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
    planCliente: { fontSize: '14px', color: '#333', margin: '2px 0' },
    planFecha: { fontSize: '12px', color: '#999', margin: '2px 0' },
    planFinanzas: { display: 'flex', gap: '20px', flex: 1 },
    finanzaItem: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    finanzaLabel: { fontSize: '11px', color: '#999' },
    finanzaValor: { fontSize: '15px', fontWeight: 'bold' },
    botonVerProductos: { backgroundColor: '#f0f4f0', color: '#555', border: 'none', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
    botonCancelarPlan: { backgroundColor: '#fdecea', color: '#e53935', border: 'none', padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    progressContainer: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', borderTop: '1px solid #f0f4f0', backgroundColor: '#fafffe' },
    progressBar: { flex: 1, height: '8px', backgroundColor: '#e0ede6', borderRadius: '4px', overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' },
    progressLabel: { fontSize: '12px', color: '#666', minWidth: '70px', textAlign: 'right' },
    productosExpandidos: { borderTop: '1px solid #f0f4f0', padding: '15px 20px', backgroundColor: '#fafffe' },
    productosExpandidosTitulo: { fontSize: '13px', fontWeight: '700', color: '#2e7d52', margin: '0 0 12px 0' },
    tablaProductos: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: '#555', fontWeight: '600' },
    td: { padding: '10px 14px', fontSize: '13px', color: '#333' },
    tallaPill: { backgroundColor: '#e8f5ee', color: '#2e7d52', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
    sinDatos: { backgroundColor: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', color: '#999' },
};

export default PlanesSepare;