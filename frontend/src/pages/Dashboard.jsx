import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getDashboard } from '../api/dashboard';

const METODO_ICONS = {
    efectivo: '💵',
    transferencia: '🏦',
    tarjeta: '💳',
};

const Dashboard = () => {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const [data, setData] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => { cargarDashboard(); }, []);

    const cargarDashboard = async () => {
        setCargando(true);
        try {
            const res = await getDashboard();
            setData(res);
        } catch {
            setError('No se pudieron cargar las estadísticas');
        } finally {
            setCargando(false);
        }
    };

    if (cargando) return (
        <div style={styles.layout}>
            <Sidebar />
            <div style={styles.contenido}>
                <div style={styles.cargando}>
                    <p style={{ fontSize: '40px', margin: 0 }}>⏳</p>
                    <p>Cargando estadísticas...</p>
                </div>
            </div>
        </div>
    );

    if (error) return (
        <div style={styles.layout}>
            <Sidebar />
            <div style={styles.contenido}>
                <p style={styles.error}>{error}</p>
            </div>
        </div>
    );

    const totalMetodos = Object.values(data.pagos_por_metodo).reduce((s, v) => s + v, 0);

    return (
        <div style={styles.layout}>
            <Sidebar />
            <div style={styles.contenido}>

                {/* Encabezado */}
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.titulo}>🏠 Dashboard</h1>
                        <p style={styles.subtitulo}>
                            Bienvenido, <strong>{usuario?.nombre}</strong> 👋 — {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                    <button onClick={cargarDashboard} style={styles.botonRefresh}>
                        🔄 Actualizar
                    </button>
                </div>

                {/* ── Tarjetas generales ── */}
                <div style={styles.cardsGrid}>
                    {[
                        { icon: '👥', label: 'Clientes', valor: data.generales.clientes, color: '#1565c0', bg: '#e3f2fd' },
                        { icon: '👕', label: 'Productos', valor: data.generales.productos, color: '#6a1b9a', bg: '#f3e5f5' },
                        { icon: '🏭', label: 'Proveedores', valor: data.generales.proveedores, color: '#e65100', bg: '#fff3e0' },
                        { icon: '📋', label: 'Planes activos', valor: data.generales.planes_activos, color: '#2e7d52', bg: '#e8f5ee' },
                    ].map(({ icon, label, valor, color, bg }) => (
                        <div key={label} style={{ ...styles.card, borderTop: `4px solid ${color}` }}>
                            <div style={{ ...styles.cardIcono, backgroundColor: bg, color }}>
                                {icon}
                            </div>
                            <div>
                                <p style={styles.cardValor}>{valor}</p>
                                <p style={styles.cardLabel}>{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Finanzas del mes ── */}
                <div style={styles.seccionTitulo}>💰 Resumen financiero del mes</div>
                <div style={styles.finanzasGrid}>
                    {[
                        { label: 'Recaudado este mes', valor: data.finanzas.recaudado_mes, color: '#2e7d52', icon: '📈' },
                        { label: 'Compras este mes', valor: data.finanzas.compras_mes, color: '#e53935', icon: '📉' },
                        { label: 'Saldo pendiente', valor: data.finanzas.saldo_pendiente, color: '#e65100', icon: '⏳' },
                        { label: 'Planes vencidos', valor: data.finanzas.planes_vencidos, color: '#e53935', icon: '⚠️', esCantidad: true },
                    ].map(({ label, valor, color, icon, esCantidad }) => (
                        <div key={label} style={styles.finanzaCard}>
                            <div style={styles.finanzaTop}>
                                <span style={styles.finanzaIcon}>{icon}</span>
                                <span style={styles.finanzaLabel}>{label}</span>
                            </div>
                            <p style={{ ...styles.finanzaValor, color }}>
                                {esCantidad ? valor : `$${Number(valor).toLocaleString()}`}
                            </p>
                        </div>
                    ))}
                </div>

                {/* ── Fila de tablas ── */}
                <div style={styles.tablasFila}>

                    {/* Últimos pagos */}
                    <div style={styles.tablaCard}>
                        <p style={styles.tablaTitulo}>💰 Últimos pagos</p>
                        {data.ultimos_pagos.length === 0 ? (
                            <p style={styles.sinDatos}>Sin pagos registrados</p>
                        ) : (
                            <table style={styles.tabla}>
                                <thead>
                                    <tr style={styles.tablaHeader}>
                                        <th style={styles.th}>Cliente</th>
                                        <th style={styles.th}>Método</th>
                                        <th style={styles.th}>Monto</th>
                                        <th style={styles.th}>Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.ultimos_pagos.map(p => (
                                        <tr key={p.id} style={styles.tablaFila}>
                                            <td style={styles.td}>{p.cliente}</td>
                                            <td style={styles.td}>
                                                {METODO_ICONS[p.metodo] || '💰'} {p.metodo}
                                            </td>
                                            <td style={{ ...styles.td, color: '#2e7d52', fontWeight: 'bold' }}>
                                                ${Number(p.monto).toLocaleString()}
                                            </td>
                                            <td style={{ ...styles.td, color: '#999' }}>{p.fecha}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Últimas compras */}
                    <div style={styles.tablaCard}>
                        <p style={styles.tablaTitulo}>🛒 Últimas compras</p>
                        {data.ultimas_compras.length === 0 ? (
                            <p style={styles.sinDatos}>Sin compras registradas</p>
                        ) : (
                            <table style={styles.tabla}>
                                <thead>
                                    <tr style={styles.tablaHeader}>
                                        <th style={styles.th}>Proveedor</th>
                                        <th style={styles.th}>Total</th>
                                        <th style={styles.th}>Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.ultimas_compras.map(c => (
                                        <tr key={c.id} style={styles.tablaFila}>
                                            <td style={styles.td}>{c.proveedor}</td>
                                            <td style={{ ...styles.td, color: '#e53935', fontWeight: 'bold' }}>
                                                ${Number(c.total).toLocaleString()}
                                            </td>
                                            <td style={{ ...styles.td, color: '#999' }}>{c.fecha}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* ── Fila inferior ── */}
                <div style={styles.tablasFila}>

                    {/* Stock bajo */}
                    <div style={styles.tablaCard}>
                        <p style={styles.tablaTitulo}>⚠️ Productos con stock bajo</p>
                        {data.productos_stock_bajo.length === 0 ? (
                            <p style={{ ...styles.sinDatos, color: '#2e7d52' }}>
                                ✅ Todos los productos tienen buen stock
                            </p>
                        ) : (
                            <div style={styles.stockLista}>
                                {data.productos_stock_bajo.map((p, i) => (
                                    <div key={i} style={styles.stockItem}>
                                        <span style={styles.stockNombre}>👕 {p.nombre}</span>
                                        <span style={{
                                            ...styles.stockBadge,
                                            backgroundColor: p.stock === 0 ? '#fdecea' : '#fff3e0',
                                            color: p.stock === 0 ? '#e53935' : '#e65100',
                                        }}>
                                            {p.stock === 0 ? '🚨 Sin stock' : `⚠️ ${p.stock} uds`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pagos por método */}
                    <div style={styles.tablaCard}>
                        <p style={styles.tablaTitulo}>📊 Pagos por método (últimos 30 días)</p>
                        {Object.keys(data.pagos_por_metodo).length === 0 ? (
                            <p style={styles.sinDatos}>Sin pagos en los últimos 30 días</p>
                        ) : (
                            <div style={styles.metodosLista}>
                                {Object.entries(data.pagos_por_metodo).map(([metodo, monto]) => {
                                    const porcentaje = totalMetodos > 0 ? (monto / totalMetodos) * 100 : 0;
                                    return (
                                        <div key={metodo} style={styles.metodoItem}>
                                            <div style={styles.metodoTop}>
                                                <span style={styles.metodoNombre}>
                                                    {METODO_ICONS[metodo] || '💰'} {metodo.charAt(0).toUpperCase() + metodo.slice(1)}
                                                </span>
                                                <span style={styles.metodoMonto}>
                                                    ${Number(monto).toLocaleString()}
                                                </span>
                                            </div>
                                            <div style={styles.barraContainer}>
                                                <div style={{
                                                    ...styles.barraFill,
                                                    width: `${porcentaje}%`,
                                                    backgroundColor: metodo === 'efectivo' ? '#2e7d52' : metodo === 'transferencia' ? '#1565c0' : '#6a1b9a',
                                                }} />
                                            </div>
                                            <span style={styles.metodoPorcentaje}>{porcentaje.toFixed(0)}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

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
    botonRefresh: { backgroundColor: 'white', color: '#2e7d52', border: '1.5px solid #2e7d52', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
    cargando: { textAlign: 'center', padding: '80px', color: '#999' },
    error: { color: '#e53935', backgroundColor: '#fdecea', padding: '15px', borderRadius: '8px' },

    cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '25px' },
    card: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px' },
    cardIcono: { width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 },
    cardValor: { fontSize: '28px', fontWeight: 'bold', color: '#2d2d2d', margin: 0 },
    cardLabel: { fontSize: '13px', color: '#888', margin: '2px 0 0 0' },

    seccionTitulo: { fontSize: '15px', fontWeight: '700', color: '#2d2d2d', marginBottom: '14px' },
    finanzasGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '25px' },
    finanzaCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    finanzaTop: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' },
    finanzaIcon: { fontSize: '18px' },
    finanzaLabel: { fontSize: '12px', color: '#888' },
    finanzaValor: { fontSize: '22px', fontWeight: 'bold', margin: 0 },

    tablasFila: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' },
    tablaCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    tablaTitulo: { fontSize: '14px', fontWeight: '700', color: '#2d2d2d', margin: '0 0 15px 0' },
    tabla: { width: '100%', borderCollapse: 'collapse' },
    tablaHeader: { backgroundColor: '#f0f4f0' },
    th: { padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#555', fontWeight: '600' },
    tablaFila: { borderTop: '1px solid #f0f4f0' },
    td: { padding: '10px 12px', fontSize: '13px', color: '#333' },
    sinDatos: { textAlign: 'center', color: '#aaa', fontSize: '13px', padding: '20px 0' },

    stockLista: { display: 'flex', flexDirection: 'column', gap: '10px' },
    stockItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#fafafa', borderRadius: '8px' },
    stockNombre: { fontSize: '13px', color: '#333' },
    stockBadge: { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },

    metodosLista: { display: 'flex', flexDirection: 'column', gap: '14px' },
    metodoItem: { display: 'flex', flexDirection: 'column', gap: '5px' },
    metodoTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    metodoNombre: { fontSize: '13px', color: '#333', fontWeight: '600' },
    metodoMonto: { fontSize: '13px', color: '#2e7d52', fontWeight: 'bold' },
    barraContainer: { height: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' },
    barraFill: { height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' },
    metodoPorcentaje: { fontSize: '11px', color: '#aaa', textAlign: 'right' },
};

export default Dashboard;