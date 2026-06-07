import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getCajaDiaria } from '../api/dashboard';

const METODO_ICONS = { efectivo: '💵', transferencia: '🏦', tarjeta: '💳' };
const fmt = (n) => `$${Number(n).toLocaleString('es-CO')}`;

const CajaDiaria = () => {
    const [data, setData]         = useState(null);
    const [fecha, setFecha]       = useState('');
    const [cargando, setCargando] = useState(false);
    const [error, setError]       = useState('');

    useEffect(() => { cargar(); }, [fecha]);

    const cargar = async () => {
        setCargando(true);
        setError('');
        try {
            const res = await getCajaDiaria(fecha || null);
            setData(res);
        } catch {
            setError('No se pudo cargar el reporte de caja');
        } finally {
            setCargando(false);
        }
    };

    const fechaLegible = (str) => {
        const d = new Date(str + 'T12:00:00');
        return d.toLocaleDateString('es-CO', {
            weekday: 'long', day: 'numeric',
            month: 'long', year: 'numeric'
        });
    };

    return (
        <div style={s.layout}>
            <Sidebar />
            <div style={s.contenido}>

                <div style={s.header}>
                    <div>
                        <h1 style={s.titulo}>🧾 Caja diaria</h1>
                        <p style={s.subtitulo}>
                            {data ? fechaLegible(data.fecha) : 'Cargando...'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                            type="date"
                            value={fecha}
                            onChange={e => setFecha(e.target.value)}
                            style={s.inputFecha}
                        />
                        <button onClick={() => setFecha('')} style={s.botonHoy}>
                            Hoy
                        </button>
                    </div>
                </div>

                {error && <p style={s.error}>{error}</p>}

                {cargando && (
                    <div style={s.sinDatos}>Cargando reporte...</div>
                )}

                {!cargando && data && (
                    <>
                        {/* Tarjetas resumen */}
                        <div style={s.metricGrid}>
                            {[
                                { label: 'Ingresos totales', valor: data.resumen.total_ingresos, color: '#2e7d52' },
                                { label: 'Egresos totales',  valor: data.resumen.total_egresos,  color: '#e53935' },
                                { label: 'Neto en caja',     valor: data.resumen.neto_caja,      color: '#1565c0' },
                                { label: 'Transacciones',    valor: data.resumen.total_transacciones, color: '#555', esNum: true },
                            ].map(({ label, valor, color, esNum }) => (
                                <div key={label} style={s.metricCard}>
                                    <p style={s.metricLabel}>{label}</p>
                                    <p style={{ ...s.metricVal, color }}>
                                        {esNum ? valor : fmt(valor)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Ventas por método */}
                        <div style={s.seccion}>
                            <p style={s.secTitulo}>Ventas del día</p>
                            <div style={s.tablaHeader3Cols}>
                                <span>Método</span>
                                <span style={s.textCenter}>Transacciones</span>
                                <span style={s.textRight}>Total</span>
                            </div>
                            {Object.entries(data.ventas.por_metodo).map(([metodo, d]) => (
                                <div key={metodo} style={s.tablaFila3Cols}>
                                    <span>{METODO_ICONS[metodo] || '💰'} {metodo}</span>
                                    <span style={{ ...s.muted, ...s.textCenter }}>{d.cantidad} venta{d.cantidad !== 1 ? 's' : ''}</span>
                                    <span style={{ fontWeight: '600', color: '#2e7d52', ...s.textRight }}>{fmt(d.total)}</span>
                                </div>
                            ))}
                            {Object.keys(data.ventas.por_metodo).length === 0 && (
                                <p style={s.sinMovs}>Sin ventas este día</p>
                            )}
                            <div style={s.totalFila}>
                                <span>Total ventas</span>
                                <span style={{ color: '#2e7d52' }}>{fmt(data.ventas.total)}</span>
                            </div>
                        </div>

                        {/* Cobros créditos */}
                        <div style={s.seccion}>
                            <p style={s.secTitulo}>Cobros de créditos</p>
                            <div style={s.tablaHeader3Cols}>
                                <span>Cliente</span>
                                <span style={s.textCenter}>Método</span>
                                <span style={s.textRight}>Monto</span>
                            </div>
                            {data.cobros_creditos.detalle.map((c, i) => (
                                <div key={i} style={s.tablaFila3Cols}>
                                    <span>👤 {c.cliente}</span>
                                    <span style={{ ...s.muted, ...s.textCenter }}>{METODO_ICONS[c.metodo] || '💰'} {c.metodo}</span>
                                    <span style={{ fontWeight: '600', color: '#2e7d52', ...s.textRight }}>{fmt(c.monto)}</span>
                                </div>
                            ))}
                            {data.cobros_creditos.detalle.length === 0 && (
                                <p style={s.sinMovs}>Sin cobros este día</p>
                            )}
                            <div style={s.totalFila}>
                                <span>Total cobros</span>
                                <span style={{ color: '#2e7d52' }}>{fmt(data.cobros_creditos.total)}</span>
                            </div>
                        </div>

                        {/* Cambios y devoluciones */}
                        {data.cambios && data.cambios.cantidad > 0 && (
                            <div style={s.seccion}>
                                <p style={s.secTitulo}>🔄 Cambios y Devoluciones</p>

                                {/* Resumen de cambios */}
                                <div style={s.cambiosResumen}>
                                    <div style={{ ...s.cambioResCard, borderLeft: '3px solid #2e7d52' }}>
                                        <p style={s.cambioResLabel}>Excedentes cobrados</p>
                                        <p style={{ ...s.cambioResVal, color: '#2e7d52' }}>
                                            + {fmt(data.cambios.ingresos_excedentes)}
                                        </p>
                                        <p style={s.cambioResNote}>Cliente pagó más</p>
                                    </div>
                                    <div style={{ ...s.cambioResCard, borderLeft: '3px solid #e53935' }}>
                                        <p style={s.cambioResLabel}>Saldos devueltos</p>
                                        <p style={{ ...s.cambioResVal, color: '#e53935' }}>
                                            − {fmt(data.cambios.egresos_saldo_favor)}
                                        </p>
                                        <p style={s.cambioResNote}>Tienda devolvió saldo</p>
                                    </div>
                                    <div style={{ ...s.cambioResCard, borderLeft: '3px solid #1565c0' }}>
                                        <p style={s.cambioResLabel}>Neto cambios</p>
                                        <p style={{
                                            ...s.cambioResVal,
                                            color: data.cambios.neto_cambios >= 0 ? '#2e7d52' : '#e53935'
                                        }}>
                                            {data.cambios.neto_cambios >= 0 ? '+' : '−'} {fmt(Math.abs(data.cambios.neto_cambios))}
                                        </p>
                                        <p style={s.cambioResNote}>{data.cambios.cantidad} cambio{data.cambios.cantidad !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>

                                {/* Detalle de cada cambio */}
                                <div style={s.tablaHeader4Cols}>
                                    <span>Cambio #</span>
                                    <span style={s.textCenter}>Devolución</span>
                                    <span style={s.textCenter}>Nuevo</span>
                                    <span style={s.textRight}>Resultado</span>
                                </div>
                                {data.cambios.detalle.map((c) => {
                                    const esIngreso = c.excedente_pagado > 0;
                                    const esEgreso  = c.excedente_pagado < 0;
                                    const esNeutro  = c.excedente_pagado === 0;
                                    return (
                                        <div key={c.id_cambio} style={s.tablaFila4Cols}>
                                            <span style={{ color: '#555' }}>
                                                Cambio #{c.id_cambio}
                                            </span>
                                            <span style={{ ...s.muted, ...s.textCenter }}>
                                                {fmt(c.total_devolucion)}
                                            </span>
                                            <span style={{ ...s.muted, ...s.textCenter }}>
                                                {fmt(c.total_nuevo)}
                                            </span>
                                            <span style={{ ...s.textRight, fontWeight: '600' }}>
                                                {esNeutro && (
                                                    <span style={s.badgeNeutro}>≡ Cambio directo</span>
                                                )}
                                                {esIngreso && (
                                                    <span style={s.badgeIngreso}>
                                                        + {fmt(c.excedente_pagado)} cobrado
                                                        {c.metodo_pago !== '—' && (
                                                            <span style={{ fontSize: '10px', marginLeft: '4px' }}>
                                                                {METODO_ICONS[c.metodo_pago] || ''}
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                                {esEgreso && (
                                                    <span style={s.badgeEgreso}>
                                                        − {fmt(Math.abs(c.excedente_pagado))} devuelto
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Egresos */}
                        <div style={s.seccion}>
                            <p style={s.secTitulo}>Egresos</p>
                            <div style={s.tablaHeader3Cols}>
                                <span>Concepto</span>
                                <span style={s.textCenter}>Cantidad</span>
                                <span style={s.textRight}>Total</span>
                            </div>
                            <div style={s.tablaFila3Cols}>
                                <span>📦 Compras a proveedores</span>
                                <span style={{ ...s.muted, ...s.textCenter }}>{data.egresos.compras.cantidad} compra{data.egresos.compras.cantidad !== 1 ? 's' : ''}</span>
                                <span style={{ fontWeight: '600', color: '#e53935', ...s.textRight }}>
                                    − {fmt(data.egresos.compras.total)}
                                </span>
                            </div>
                            <div style={s.tablaFila3Cols}>
                                <span>🔄 Saldos devueltos en cambios</span>
                                <span style={{ ...s.muted, ...s.textCenter }}>
                                    {data.egresos.devoluciones.cantidad} cambio{data.egresos.devoluciones.cantidad !== 1 ? 's' : ''}
                                </span>
                                <span style={{ fontWeight: '600', color: '#e53935', ...s.textRight }}>
                                    − {fmt(data.egresos.devoluciones.total)}
                                </span>
                            </div>
                            <div style={s.totalFila}>
                                <span>Total egresos</span>
                                <span style={{ color: '#e53935' }}>
                                    − {fmt(data.resumen.total_egresos)}
                                </span>
                            </div>
                        </div>

                        {/* Resumen final */}
                        <div style={{ ...s.seccion, border: '1.5px solid #1565c0' }}>
                            <p style={{ ...s.secTitulo, color: '#1565c0' }}>Resumen final de caja</p>
                            {[
                                { label: 'Ventas del día',             val: data.ventas.total,                   signo: '+', color: '#2e7d52' },
                                { label: 'Cobros de créditos',         val: data.cobros_creditos.total,          signo: '+', color: '#2e7d52' },
                                ...(data.cambios && data.cambios.ingresos_excedentes > 0 ? [
                                    { label: 'Excedentes cobrados en cambios', val: data.cambios.ingresos_excedentes, signo: '+', color: '#2e7d52' }
                                ] : []),
                                { label: 'Compras',                    val: data.egresos.compras.total,          signo: '−', color: '#e53935' },
                                ...(data.egresos.devoluciones.total > 0 ? [
                                    { label: 'Saldos devueltos en cambios', val: data.egresos.devoluciones.total, signo: '−', color: '#e53935' }
                                ] : []),
                            ].map(({ label, val, signo, color }) => (
                                <div key={label} style={s.tablaFilaResumen}>
                                    <span>{label}</span>
                                    <span style={{ color, fontWeight: '500' }}>
                                        {signo} {fmt(val)}
                                    </span>
                                </div>
                            ))}
                            <div style={{ ...s.totalFila, borderTopWidth: '1.5px', paddingTop: '14px', marginTop: '4px' }}>
                                <span style={{ fontSize: '16px' }}>Neto en caja</span>
                                <span style={{
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    color: data.resumen.neto_caja >= 0 ? '#1565c0' : '#e53935'
                                }}>
                                    {fmt(data.resumen.neto_caja)}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const s = {
    layout:      { display: 'flex', minHeight: '100vh', backgroundColor: '#f0f4f0' },
    contenido:   { marginLeft: '250px', flex: 1, padding: '30px' },
    header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e0ede6' },
    titulo:      { fontSize: '26px', color: '#2e7d52', fontWeight: 'bold', margin: 0 },
    subtitulo:   { color: '#666', marginTop: '4px', fontSize: '14px', textTransform: 'capitalize' },
    inputFecha:  { padding: '8px 12px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none' },
    botonHoy:    { backgroundColor: 'white', color: '#2e7d52', border: '1.5px solid #2e7d52', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
    error:       { color: '#e53935', backgroundColor: '#fdecea', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px' },
    metricGrid:  { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' },
    metricCard:  { backgroundColor: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    metricLabel: { fontSize: '12px', color: '#888', margin: '0 0 6px' },
    metricVal:   { fontSize: '20px', fontWeight: '600', margin: 0 },
    seccion:     { backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    secTitulo:   { fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px' },

    tablaHeader3Cols: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '6px 0', borderBottom: '1px solid #f0f4f0', fontSize: '12px', color: '#aaa', marginBottom: '4px' },
    tablaFila3Cols:   { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', alignItems: 'center', padding: '9px 0', borderBottom: '0.5px solid #f0f4f0', fontSize: '14px', color: '#333' },

    tablaHeader4Cols: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr', padding: '6px 0', borderBottom: '1px solid #f0f4f0', fontSize: '12px', color: '#aaa', marginBottom: '4px' },
    tablaFila4Cols:   { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.5fr', alignItems: 'center', padding: '9px 0', borderBottom: '0.5px solid #f0f4f0', fontSize: '13px', color: '#333' },

    tablaFilaResumen: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '0.5px solid #f0f4f0', fontSize: '14px', color: '#333' },

    textCenter:  { textAlign: 'center' },
    textRight:   { textAlign: 'right' },

    totalFila:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', marginTop: '4px', borderTop: '1px solid #e0ede6', fontWeight: '600', fontSize: '15px' },
    muted:       { color: '#999', fontSize: '13px' },
    sinMovs:     { color: '#bbb', fontSize: '13px', textAlign: 'center', padding: '12px 0', margin: 0 },
    sinDatos:    { backgroundColor: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#999' },

    // Cambios section
    cambiosResumen: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' },
    cambioResCard:  { backgroundColor: '#f8fffe', borderRadius: '8px', padding: '12px 14px' },
    cambioResLabel: { fontSize: '11px', color: '#888', margin: '0 0 4px', fontWeight: '600', textTransform: 'uppercase' },
    cambioResVal:   { fontSize: '18px', fontWeight: '700', margin: '0 0 2px' },
    cambioResNote:  { fontSize: '11px', color: '#aaa', margin: 0 },

    badgeNeutro:  { backgroundColor: '#f0f4f0', color: '#666', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' },
    badgeIngreso: { backgroundColor: '#e8f5ee', color: '#2e7d52', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' },
    badgeEgreso:  { backgroundColor: '#fdecea', color: '#e53935', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' },
};

export default CajaDiaria;
