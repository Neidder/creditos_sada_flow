import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getPagos, crearPago, getPagosPorPlan } from '../api/pagos';
import { getPlanes } from '../api/planesSepare';
import { getClientes } from '../api/clientes';
import { getProductos } from '../api/productos';

const METODOS = ['efectivo', 'transferencia', 'tarjeta'];

const METODO_ICONS = {
    efectivo: '💵',
    transferencia: '🏦',
    tarjeta: '💳',
};

// Estados con sus colores — igual que PlanesSepare
const ESTADOS = {
    activo:    { color: '#1565c0', bg: '#e3f2fd', label: 'Activo' },
    pagado:    { color: '#2e7d52', bg: '#e8f5ee', label: 'Pagado' },
    cancelado: { color: '#e53935', bg: '#fdecea', label: 'Cancelado' },
    vencido:   { color: '#e65100', bg: '#fff3e0', label: 'Vencido' },
};

const formInicial = {
    id_plan_separe: '',
    monto: '',
    metodo_pago: 'efectivo',
};

// Igual que PlanesSepare: un plan es vencido si está activo y su fecha_fin ya pasó
const esVencido = (plan) =>
    plan.estado === 'activo' && new Date(plan.fecha_fin) < new Date();

const getEstadoPlan = (plan) => (esVencido(plan) ? 'vencido' : plan.estado);

const Pagos = () => {
    const [pagos, setPagos] = useState([]);
    const [planes, setPlanes] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [productos, setProductos] = useState([]);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [form, setForm] = useState(formInicial);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [cargando, setCargando] = useState(false);
    const [expandido, setExpandido] = useState(null);
    const [detallesPlan, setDetallesPlan] = useState({});
    const [busqueda, setBusqueda] = useState('');
    const [filtroMetodo, setFiltroMetodo] = useState('todos');

    const usuario = JSON.parse(localStorage.getItem('usuario'));

    useEffect(() => { cargarTodo(); }, []);

    const cargarTodo = async () => {
        setCargando(true);
        try {
            const [pg, pl, cl, pr] = await Promise.all([
                getPagos(),
                getPlanes(),
                getClientes(),
                getProductos(),
            ]);
            setPagos(pg);
            setPlanes(pl);
            setClientes(cl);
            setProductos(pr);
        } catch {
            setError('Error al cargar los datos');
        } finally {
            setCargando(false);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const planSeleccionado = planes.find(
        p => p.id_plan_separe === parseInt(form.id_plan_separe)
    );

    const handleGuardar = async () => {
        if (!form.id_plan_separe || !form.monto || !form.metodo_pago) {
            setError('Todos los campos son obligatorios');
            return;
        }
        if (parseFloat(form.monto) <= 0) {
            setError('El monto debe ser mayor a 0');
            return;
        }
        if (planSeleccionado && parseFloat(form.monto) > parseFloat(planSeleccionado.saldo_restante)) {
            setError(`El monto no puede superar el saldo restante de $${Number(planSeleccionado.saldo_restante).toLocaleString()}`);
            return;
        }
        try {
            const res = await crearPago({
                id_plan_separe: parseInt(form.id_plan_separe),
                monto: parseFloat(form.monto),
                metodo_pago: form.metodo_pago,
                registrado_por: usuario?.id_usuario || usuario?.id,
            });
            setExito(`✅ Pago registrado. Saldo restante: $${Number(res.saldo_restante).toLocaleString()}`);
            setMostrarForm(false);
            setForm(formInicial);
            setError('');
            cargarTodo();
            setTimeout(() => setExito(''), 5000);
        } catch (err) {
            const msg = err.response?.data?.error || 'Error al registrar el pago';
            setError(msg);
        }
    };

    const handleVerPlan = async (idPlan) => {
        if (expandido === idPlan) {
            setExpandido(null);
            return;
        }
        setExpandido(idPlan);
        if (!detallesPlan[idPlan]) {
            try {
                const data = await getPagosPorPlan(idPlan);
                setDetallesPlan(prev => ({ ...prev, [idPlan]: data }));
            } catch {
                setError('Error al cargar detalles del plan');
            }
        }
    };

    const getNombreCliente = (idPlan) => {
        const plan = planes.find(p => p.id_plan_separe === idPlan);
        if (!plan) return '—';
        const cliente = clientes.find(c => c.id_cliente === plan.id_cliente);
        return cliente ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : `Cliente #${plan.id_cliente}`;
    };

    const getNombreProducto = (idPlan) => {
        const plan = planes.find(p => p.id_plan_separe === idPlan);
        if (!plan) return '—';
        if (plan.detalles && plan.detalles.length > 0) {
            const nombres = plan.detalles.map(d => {
                const prod = productos.find(p => p.id_producto === d.id_producto);
                return prod ? `${prod.nombre} (${d.talla})` : `Producto #${d.id_producto}`;
            });
            return nombres.join(', ');
        }
        if (plan.id_producto) {
            const producto = productos.find(p => p.id_producto === plan.id_producto);
            return producto ? producto.nombre : `Producto #${plan.id_producto}`;
        }
        return '—';
    };

    // Filtros
    const pagosFiltrados = pagos.filter(p => {
        const matchMetodo = filtroMetodo === 'todos' || p.metodo_pago === filtroMetodo;
        const cliente = getNombreCliente(p.id_plan_separe).toLowerCase();
        const producto = getNombreProducto(p.id_plan_separe).toLowerCase();
        const matchBusqueda = !busqueda ||
            cliente.includes(busqueda.toLowerCase()) ||
            producto.includes(busqueda.toLowerCase()) ||
            String(p.id_plan_separe).includes(busqueda);
        return matchMetodo && matchBusqueda;
    });

    // Solo planes con saldo pendiente para registrar pagos
    // Un plan vencido sigue pudiendo recibir pagos (tiene saldo)
    const planesConSaldo = planes.filter(p =>
        (p.estado === 'activo') && parseFloat(p.saldo_restante) > 0
    );

    // Resumen
    const totalRecaudado = pagos.reduce((s, p) => s + parseFloat(p.monto || 0), 0);
    const pagoHoy = pagos.filter(p => {
        const hoy = new Date().toDateString();
        return new Date(p.fecha_pago).toDateString() === hoy;
    }).reduce((s, p) => s + parseFloat(p.monto || 0), 0);

    // Planes pendientes = activos con saldo (incluyendo vencidos que aún deben)
    const planesPendientes = planes.filter(p =>
        p.estado === 'activo' && parseFloat(p.saldo_restante) > 0
    ).length;

    return (
        <div style={styles.layout}>
            <Sidebar />
            <div style={styles.contenido}>

                {/* Encabezado */}
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.titulo}>💰 Pagos</h1>
                        <p style={styles.subtitulo}>
                            {pagos.length} pago{pagos.length !== 1 ? 's' : ''} registrado{pagos.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button onClick={() => { setMostrarForm(true); setError(''); setExito(''); }} style={styles.botonNuevo}>
                        + Registrar Pago
                    </button>
                </div>

                {/* Resumen */}
                <div style={styles.resumenGrid}>
                    <div style={{ ...styles.resumenCard, borderLeft: '4px solid #2e7d52' }}>
                        <p style={styles.resumenNumero}>${totalRecaudado.toLocaleString()}</p>
                        <p style={styles.resumenLabel}>Total recaudado</p>
                    </div>
                    <div style={{ ...styles.resumenCard, borderLeft: '4px solid #1565c0' }}>
                        <p style={styles.resumenNumero}>{pagos.length}</p>
                        <p style={styles.resumenLabel}>Pagos totales</p>
                    </div>
                    <div style={{ ...styles.resumenCard, borderLeft: '4px solid #6a1b9a' }}>
                        <p style={styles.resumenNumero}>${pagoHoy.toLocaleString()}</p>
                        <p style={styles.resumenLabel}>Recaudado hoy</p>
                    </div>
                    <div style={{ ...styles.resumenCard, borderLeft: '4px solid #e65100' }}>
                        <p style={styles.resumenNumero}>{planesPendientes}</p>
                        <p style={styles.resumenLabel}>Planes pendientes</p>
                    </div>
                </div>

                {/* Filtros */}
                <div style={styles.filtrosRow}>
                    <div style={styles.buscadorContainer}>
                        <span>🔍</span>
                        <input
                            placeholder="Buscar por cliente, producto o plan..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            style={styles.buscador}
                        />
                    </div>
                    <div style={styles.filtrosBotones}>
                        {['todos', ...METODOS].map(m => (
                            <button
                                key={m}
                                onClick={() => setFiltroMetodo(m)}
                                style={{
                                    ...styles.filtroBton,
                                    backgroundColor: filtroMetodo === m ? '#2e7d52' : 'white',
                                    color: filtroMetodo === m ? 'white' : '#555',
                                }}
                            >
                                {m === 'todos' ? 'Todos' : `${METODO_ICONS[m]} ${m.charAt(0).toUpperCase() + m.slice(1)}`}
                            </button>
                        ))}
                    </div>
                </div>

                {exito && <p style={styles.exito}>{exito}</p>}
                {error && <p style={styles.error}>{error}</p>}

                {/* Formulario */}
                {mostrarForm && (
                    <div style={styles.formulario}>
                        <h3 style={styles.formTitulo}>💰 Registrar Pago</h3>
                        <div style={styles.formGrid}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Plan Separe *</label>
                                <select
                                    name="id_plan_separe"
                                    value={form.id_plan_separe}
                                    onChange={handleChange}
                                    style={styles.select}
                                >
                                    <option value="">-- Selecciona un plan con saldo pendiente --</option>
                                    {planesConSaldo.map(p => {
                                        const cliente = clientes.find(c => c.id_cliente === p.id_cliente);
                                        const estado = getEstadoPlan(p);
                                        const estadoCfg = ESTADOS[estado] || ESTADOS.activo;
                                        return (
                                            <option key={p.id_plan_separe} value={p.id_plan_separe}>
                                                Plan #{p.id_plan_separe} — {cliente?.nombre || 'Cliente'} — Saldo: ${Number(p.saldo_restante).toLocaleString()} {estado === 'vencido' ? '⚠️ VENCIDO' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Método de Pago *</label>
                                <select
                                    name="metodo_pago"
                                    value={form.metodo_pago}
                                    onChange={handleChange}
                                    style={styles.select}
                                >
                                    {METODOS.map(m => (
                                        <option key={m} value={m}>
                                            {METODO_ICONS[m]} {m.charAt(0).toUpperCase() + m.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Monto *</label>
                                <input
                                    name="monto"
                                    type="number"
                                    min="0"
                                    placeholder="Ej: 50000"
                                    value={form.monto}
                                    onChange={handleChange}
                                    style={styles.input}
                                />
                            </div>

                            {/* Info del plan seleccionado */}
                            {planSeleccionado && (() => {
                                const estadoPlan = getEstadoPlan(planSeleccionado);
                                const cfgEstado = ESTADOS[estadoPlan] || ESTADOS.activo;
                                return (
                                    <div style={styles.infoplanBox}>
                                        <div style={styles.infoPlanHeader}>
                                            <p style={styles.infoPlanTitulo}>📋 Info del plan</p>
                                            <span style={{
                                                ...styles.estadoBadge,
                                                backgroundColor: cfgEstado.bg,
                                                color: cfgEstado.color,
                                            }}>
                                                {cfgEstado.label}
                                            </span>
                                        </div>
                                        {estadoPlan === 'vencido' && (
                                            <div style={styles.alertaVencido}>
                                                ⚠️ Este plan venció el {new Date(planSeleccionado.fecha_fin + 'T00:00:00').toLocaleDateString('es-CO')}. Aún puedes registrar el pago.
                                            </div>
                                        )}
                                        <div style={styles.infoPlanGrid}>
                                            <span style={styles.infoPlanLabel}>Total:</span>
                                            <span style={styles.infoPlanValor}>${Number(planSeleccionado.valor_total).toLocaleString()}</span>
                                            <span style={styles.infoPlanLabel}>Pagado:</span>
                                            <span style={{ ...styles.infoPlanValor, color: '#2e7d52' }}>
                                                ${(Number(planSeleccionado.valor_total) - Number(planSeleccionado.saldo_restante)).toLocaleString()}
                                            </span>
                                            <span style={styles.infoPlanLabel}>Saldo:</span>
                                            <span style={{ ...styles.infoPlanValor, color: '#e65100', fontWeight: 'bold' }}>
                                                ${Number(planSeleccionado.saldo_restante).toLocaleString()}
                                            </span>
                                            <span style={styles.infoPlanLabel}>Vence:</span>
                                            <span style={{
                                                ...styles.infoPlanValor,
                                                color: estadoPlan === 'vencido' ? '#e65100' : '#333',
                                                fontWeight: estadoPlan === 'vencido' ? 'bold' : 'normal',
                                            }}>
                                                {planSeleccionado.fecha_fin
                                                    ? new Date(planSeleccionado.fecha_fin + 'T00:00:00').toLocaleDateString('es-CO')
                                                    : '—'}
                                                {estadoPlan === 'vencido' ? ' ⚠️' : ''}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div style={styles.formBotones}>
                            <button onClick={handleGuardar} style={styles.botonGuardar}>
                                💾 Registrar Pago
                            </button>
                            <button onClick={() => { setMostrarForm(false); setForm(formInicial); }} style={styles.botonCancelar}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Lista de pagos */}
                {cargando ? (
                    <div style={styles.sinDatos}>Cargando pagos...</div>
                ) : pagosFiltrados.length === 0 ? (
                    <div style={styles.sinDatos}>
                        <p style={{ fontSize: '40px', margin: 0 }}>💰</p>
                        <p>No hay pagos registrados</p>
                    </div>
                ) : (
                    <div style={styles.lista}>
                        {pagosFiltrados.map((pago) => {
                            const detalle = detallesPlan[pago.id_plan_separe];
                            // Obtener el plan para calcular estado real
                            const planDelPago = planes.find(p => p.id_plan_separe === pago.id_plan_separe);
                            const estadoReal = planDelPago ? getEstadoPlan(planDelPago) : null;
                            const cfgEstado = estadoReal ? (ESTADOS[estadoReal] || ESTADOS.activo) : null;

                            return (
                                <div key={pago.id_pago} style={styles.pagoCard}>
                                    <div style={styles.pagoFila}>

                                        {/* Ícono método */}
                                        <div style={styles.metodoBadge}>
                                            <span style={styles.metodoIcon}>
                                                {METODO_ICONS[pago.metodo_pago] || '💰'}
                                            </span>
                                            <span style={styles.metodoLabel}>
                                                {pago.metodo_pago}
                                            </span>
                                        </div>

                                        {/* Info del pago */}
                                        <div style={styles.pagoInfo}>
                                            <div style={styles.pagoIdRow}>
                                                <p style={styles.pagoId}>Pago #{pago.id_pago}</p>
                                                {cfgEstado && (
                                                    <span style={{
                                                        ...styles.estadoBadgeSmall,
                                                        backgroundColor: cfgEstado.bg,
                                                        color: cfgEstado.color,
                                                    }}>
                                                        {cfgEstado.label}
                                                    </span>
                                                )}
                                            </div>
                                            <p style={styles.pagoCliente}>
                                                👤 {getNombreCliente(pago.id_plan_separe)}
                                            </p>
                                            <p style={styles.pagoProducto}>
                                                👕 {getNombreProducto(pago.id_plan_separe)} — Plan #{pago.id_plan_separe}
                                            </p>
                                            <p style={styles.pagoFecha}>
                                                📅 {pago.fecha_pago
                                                    ? new Date(pago.fecha_pago).toLocaleDateString('es-CO', {
                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })
                                                    : '—'}
                                            </p>
                                        </div>

                                        {/* Monto */}
                                        <div style={styles.pagoMonto}>
                                            ${Number(pago.monto).toLocaleString()}
                                        </div>

                                        {/* Ver plan */}
                                        <button
                                            onClick={() => handleVerPlan(pago.id_plan_separe)}
                                            style={styles.botonVerPlan}
                                        >
                                            {expandido === pago.id_plan_separe ? '▲ Ocultar' : '▼ Ver plan'}
                                        </button>
                                    </div>

                                    {/* Detalles del plan expandido */}
                                    {expandido === pago.id_plan_separe && detalle && (() => {
                                        // Calcular estado real desde los datos del detalle
                                        const estadoDetalle = detalle.plan?.estado === 'activo' && detalle.plan?.fecha_fin
                                            && new Date(detalle.plan.fecha_fin) < new Date()
                                            ? 'vencido'
                                            : detalle.plan?.estado;
                                        const cfgDetalle = ESTADOS[estadoDetalle] || ESTADOS.activo;

                                        return (
                                            <div style={styles.planDetalles}>
                                                <div style={styles.planDetallesGrid}>
                                                    <div style={styles.planDetalleItem}>
                                                        <span style={styles.planDetalleLabel}>Valor total</span>
                                                        <span style={styles.planDetalleValor}>
                                                            ${Number(detalle.plan?.valor_total).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div style={styles.planDetalleItem}>
                                                        <span style={styles.planDetalleLabel}>Saldo restante</span>
                                                        <span style={{ ...styles.planDetalleValor, color: detalle.plan?.saldo_restante > 0 ? '#e65100' : '#2e7d52' }}>
                                                            ${Number(detalle.plan?.saldo_restante).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div style={styles.planDetalleItem}>
                                                        <span style={styles.planDetalleLabel}>Estado</span>
                                                        <span style={{
                                                            ...styles.estadoBadge,
                                                            backgroundColor: cfgDetalle.bg,
                                                            color: cfgDetalle.color,
                                                            fontSize: '13px',
                                                            padding: '3px 10px',
                                                        }}>
                                                            {cfgDetalle.label}
                                                        </span>
                                                    </div>
                                                    <div style={styles.planDetalleItem}>
                                                        <span style={styles.planDetalleLabel}>Total pagos</span>
                                                        <span style={styles.planDetalleValor}>{detalle.total_pagos}</span>
                                                    </div>
                                                </div>

                                                {/* Alerta si vencido con saldo */}
                                                {estadoDetalle === 'vencido' && detalle.plan?.saldo_restante > 0 && (
                                                    <div style={styles.alertaVencidoDetalle}>
                                                         Plan vencido con saldo pendiente de ${Number(detalle.plan.saldo_restante).toLocaleString()}
                                                    </div>
                                                )}

                                                {/* Historial de pagos del plan */}
                                                <p style={styles.historialTitulo}>Historial de pagos</p>
                                                <table style={styles.tablaHistorial}>
                                                    <thead>
                                                        <tr style={{ backgroundColor: '#f0f4f0' }}>
                                                            <th style={styles.th}>#</th>
                                                            <th style={styles.th}>Monto</th>
                                                            <th style={styles.th}>Método</th>
                                                            <th style={styles.th}>Fecha</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {detalle.pagos?.map(p => (
                                                            <tr key={p.id_pago} style={{ borderTop: '1px solid #f0f4f0' }}>
                                                                <td style={styles.td}>#{p.id_pago}</td>
                                                                <td style={{ ...styles.td, color: '#2e7d52', fontWeight: 'bold' }}>
                                                                    ${Number(p.monto).toLocaleString()}
                                                                </td>
                                                                <td style={styles.td}>
                                                                    {METODO_ICONS[p.metodo_pago]} {p.metodo_pago}
                                                                </td>
                                                                <td style={styles.td}>
                                                                    {p.fecha_pago
                                                                        ? new Date(p.fecha_pago).toLocaleDateString('es-CO')
                                                                        : '—'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    })()}
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
    resumenNumero: { fontSize: '20px', fontWeight: 'bold', color: '#2d2d2d', margin: '0 0 4px 0' },
    resumenLabel: { fontSize: '12px', color: '#888', margin: 0 },

    filtrosRow: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
    buscadorContainer: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', border: '1.5px solid #e0ede6', borderRadius: '10px', padding: '0 15px', flex: 1, minWidth: '200px' },
    buscador: { border: 'none', outline: 'none', padding: '11px 0', fontSize: '14px', width: '100%' },
    filtrosBotones: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    filtroBton: { border: '1.5px solid #e0ede6', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },

    exito: { color: '#2e7d52', backgroundColor: '#e8f5ee', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' },
    error: { color: '#e53935', backgroundColor: '#fdecea', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' },

    formulario: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 2px 15px rgba(0,0,0,0.06)' },
    formTitulo: { color: '#2e7d52', marginBottom: '20px', marginTop: 0 },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', color: '#555', fontWeight: '600' },
    select: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' },
    input: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none' },
    formBotones: { display: 'flex', gap: '10px' },
    botonGuardar: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    botonCancelar: { backgroundColor: 'white', color: '#666', border: '1px solid #ddd', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },

    infoplanBox: { backgroundColor: '#f8fffe', border: '1.5px solid #e0ede6', borderRadius: '10px', padding: '15px', gridColumn: '1 / -1' },
    infoPlanHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' },
    infoPlanTitulo: { fontSize: '13px', fontWeight: '700', color: '#2e7d52', margin: 0 },
    infoPlanGrid: { display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: '8px', alignItems: 'center' },
    infoPlanLabel: { fontSize: '12px', color: '#888' },
    infoPlanValor: { fontSize: '14px', fontWeight: '600', color: '#2d2d2d' },

    alertaVencido: { backgroundColor: '#fff3e0', border: '1px solid #ffcc02', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#e65100', marginBottom: '10px' },
    alertaVencidoDetalle: { backgroundColor: '#fff3e0', border: '1px solid #ffcc02', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', color: '#e65100', marginBottom: '12px' },

    estadoBadge: { padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
    estadoBadgeSmall: { padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },

    lista: { display: 'flex', flexDirection: 'column', gap: '10px' },
    pagoCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' },
    pagoFila: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' },
    metodoBadge: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' },
    metodoIcon: { fontSize: '24px' },
    metodoLabel: { fontSize: '11px', color: '#888', textTransform: 'capitalize' },
    pagoInfo: { flex: 1 },
    pagoIdRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' },
    pagoId: { fontSize: '14px', fontWeight: 'bold', color: '#2d2d2d', margin: 0 },
    pagoCliente: { fontSize: '13px', color: '#555', margin: '0 0 2px 0' },
    pagoProducto: { fontSize: '12px', color: '#888', margin: '0 0 2px 0' },
    pagoFecha: { fontSize: '12px', color: '#aaa', margin: 0 },
    pagoMonto: { fontSize: '20px', fontWeight: 'bold', color: '#2e7d52', minWidth: '120px', textAlign: 'right' },
    botonVerPlan: { backgroundColor: '#f0f4f0', color: '#555', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 },

    planDetalles: { borderTop: '1px solid #f0f4f0', padding: '16px 20px', backgroundColor: '#fafffe' },
    planDetallesGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' },
    planDetalleItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
    planDetalleLabel: { fontSize: '11px', color: '#999' },
    planDetalleValor: { fontSize: '15px', fontWeight: 'bold', color: '#2d2d2d' },
    historialTitulo: { fontSize: '13px', fontWeight: '700', color: '#2e7d52', margin: '0 0 10px 0' },
    tablaHistorial: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '10px 14px', textAlign: 'left', fontSize: '12px', color: '#555', fontWeight: '600' },
    td: { padding: '10px 14px', fontSize: '13px', color: '#333' },

    sinDatos: { backgroundColor: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', color: '#999' },
};

export default Pagos;
