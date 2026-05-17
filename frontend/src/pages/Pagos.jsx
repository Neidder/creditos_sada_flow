import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getPagos, crearPago } from '../api/pagos';
import { getCreditos } from '../api/creditos';
import { getClientes } from '../api/clientes';

const METODOS = ['efectivo', 'transferencia', 'tarjeta'];
const METODO_ICONS = { efectivo: '💵', transferencia: '🏦', tarjeta: '💳' };

const formInicial = { id_credito: '', monto: '', metodo_pago: 'efectivo' };

const esVencido = (c) => c.estado === 'activo' && new Date(c.fecha_fin) < new Date();
const getEstadoCredito = (c) => esVencido(c) ? 'vencido' : c.estado;

const Pagos = () => {
    const [pagos, setPagos] = useState([]);
    const [creditos, setCreditos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [form, setForm] = useState(formInicial);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [cargando, setCargando] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [filtroMetodo, setFiltroMetodo] = useState('todos');

    const usuario = JSON.parse(localStorage.getItem('usuario'));

    useEffect(() => { cargarTodo(); }, []);

    const cargarTodo = async () => {
        setCargando(true);
        try {
            const [pg, cr, cl] = await Promise.all([
                getPagos(), getCreditos(), getClientes(),
            ]);
            setPagos(pg);
            setCreditos(cr);
            setClientes(cl);
        } catch {
            setError('Error al cargar los datos');
        } finally {
            setCargando(false);
        }
    };

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const creditoSeleccionado = creditos.find(
        c => c.id_credito === parseInt(form.id_credito)
    );

    const handleGuardar = async () => {
        if (!form.id_credito || !form.monto || !form.metodo_pago) {
            setError('Todos los campos son obligatorios');
            return;
        }
        if (parseFloat(form.monto) <= 0) {
            setError('El monto debe ser mayor a 0');
            return;
        }
        if (creditoSeleccionado && parseFloat(form.monto) > parseFloat(creditoSeleccionado.saldo_pendiente)) {
            setError(`El monto no puede superar el saldo de $${Number(creditoSeleccionado.saldo_pendiente).toLocaleString()}`);
            return;
        }
        try {
            const res = await crearPago({
                id_credito: parseInt(form.id_credito),
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
            setError(err.response?.data?.error || 'Error al registrar el pago');
        }
    };

    const getNombreCliente = (idCredito) => {
        const credito = creditos.find(c => c.id_credito === idCredito);
        if (!credito) return '—';
        const cliente = clientes.find(c => c.id_cliente === credito.id_cliente);
        return cliente ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : `Cliente #${credito.id_cliente}`;
    };

    // Solo créditos activos con saldo
    const creditosConSaldo = creditos.filter(c =>
        c.estado === 'PENDIENTE' && parseFloat(c.saldo_pendiente) > 0
    );

    const pagosFiltrados = pagos.filter(p => {
        const matchMetodo = filtroMetodo === 'todos' || p.metodo_pago === filtroMetodo;
        const cliente = getNombreCliente(p.id_credito).toLowerCase();
        const matchBusqueda = !busqueda || cliente.includes(busqueda.toLowerCase());
        return matchMetodo && matchBusqueda;
    });

    const totalRecaudado = pagos.reduce((s, p) => s + parseFloat(p.monto || 0), 0);
    const pagoHoy = pagos.filter(p =>
        new Date(p.fecha_pago).toDateString() === new Date().toDateString()
    ).reduce((s, p) => s + parseFloat(p.monto || 0), 0);
    const creditosPendientes = creditos.filter(c =>
        c.estado === 'PENDIENTE' && parseFloat(c.saldo_pendiente) > 0
    ).length;

    return (
        <div style={styles.layout}>
            <Sidebar />
            <div style={styles.contenido}>

                <div style={styles.header}>
                    <div>
                        <h1 style={styles.titulo}>💰 Pagos</h1>
                        <p style={styles.subtitulo}>{pagos.length} pagos registrados</p>
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
                        <p style={styles.resumenNumero}>{creditosPendientes}</p>
                        <p style={styles.resumenLabel}>Créditos pendientes</p>
                    </div>
                </div>

                {/* Filtros */}
                <div style={styles.filtrosRow}>
                    <div style={styles.buscadorContainer}>
                        <span>🔍</span>
                        <input
                            placeholder="Buscar por cliente..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            style={styles.buscador}
                        />
                    </div>
                    <div style={styles.filtrosBotones}>
                        {['todos', ...METODOS].map(m => (
                            <button key={m} onClick={() => setFiltroMetodo(m)} style={{
                                ...styles.filtroBton,
                                backgroundColor: filtroMetodo === m ? '#2e7d52' : 'white',
                                color: filtroMetodo === m ? 'white' : '#555',
                            }}>
                                {m === 'todos' ? 'Todos' : `${METODO_ICONS[m]} ${m}`}
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
                                <label style={styles.label}>Crédito *</label>
                                <select name="id_credito" value={form.id_credito} onChange={handleChange} style={styles.select}>
                                    <option value="">-- Selecciona un crédito --</option>
                                    {creditosConSaldo.map(c => {
                                        const cliente = clientes.find(cl => cl.id_cliente === c.id_cliente);
                                        return (
                                            <option key={c.id_credito} value={c.id_credito}>
                                                Crédito #{c.id_credito} — {cliente?.nombre || 'Cliente'} — Saldo: ${Number(c.saldo_pendiente).toLocaleString()}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Método de Pago *</label>
                                <select name="metodo_pago" value={form.metodo_pago} onChange={handleChange} style={styles.select}>
                                    {METODOS.map(m => (
                                        <option key={m} value={m}>{METODO_ICONS[m]} {m}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Monto *</label>
                                <input
                                    name="monto" type="number" min="0"
                                    placeholder="Ej: 50000"
                                    value={form.monto}
                                    onChange={handleChange}
                                    style={styles.input}
                                />
                            </div>

                            {/* Info del crédito seleccionado */}
                            {creditoSeleccionado && (
                                <div style={styles.infoBox}>
                                    <p style={styles.infoTitulo}>📋 Info del crédito</p>
                                    <div style={styles.infoGrid}>
                                        <span style={styles.infoLabel}>Total:</span>
                                        <span style={styles.infoValor}>${Number(creditoSeleccionado.valor_total).toLocaleString()}</span>
                                        <span style={styles.infoLabel}>Saldo pendiente:</span>
                                        <span style={{ ...styles.infoValor, color: '#e65100', fontWeight: 'bold' }}>
                                            ${Number(creditoSeleccionado.saldo_pendiente).toLocaleString()}
                                        </span>
                                        <span style={styles.infoLabel}>Vence:</span>
                                        <span style={styles.infoValor}>
                                            {creditoSeleccionado.fecha_limite
                                                ? new Date(creditoSeleccionado.fecha_limite + 'T00:00:00').toLocaleDateString('es-CO')
                                                : '—'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={styles.formBotones}>
                            <button onClick={handleGuardar} style={styles.botonGuardar}>💾 Registrar Pago</button>
                            <button onClick={() => { setMostrarForm(false); setForm(formInicial); }} style={styles.botonCancelar}>Cancelar</button>
                        </div>
                    </div>
                )}

                {/* Lista */}
                {cargando ? (
                    <div style={styles.sinDatos}>Cargando pagos...</div>
                ) : pagosFiltrados.length === 0 ? (
                    <div style={styles.sinDatos}>
                        <p style={{ fontSize: '40px', margin: 0 }}>💰</p>
                        <p>No hay pagos registrados</p>
                    </div>
                ) : (
                    <div style={styles.lista}>
                        {pagosFiltrados.map((pago) => (
                            <div key={pago.id_pago} style={styles.pagoCard}>
                                <div style={styles.pagoFila}>
                                    <div style={styles.metodoBadge}>
                                        <span style={{ fontSize: '24px' }}>{METODO_ICONS[pago.metodo_pago] || '💰'}</span>
                                        <span style={styles.metodoLabel}>{pago.metodo_pago}</span>
                                    </div>
                                    <div style={styles.pagoInfo}>
                                        <p style={styles.pagoId}>Pago #{pago.id_pago}</p>
                                        <p style={styles.pagoDetalle}>👤 {getNombreCliente(pago.id_credito)}</p>
                                        <p style={styles.pagoDetalle}>📋 Crédito #{pago.id_credito}</p>
                                        <p style={styles.pagoFecha}>
                                            📅 {pago.fecha_pago
                                                ? new Date(pago.fecha_pago).toLocaleDateString('es-CO', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                }) : '—'}
                                        </p>
                                    </div>
                                    <div style={styles.pagoMonto}>
                                        ${Number(pago.monto).toLocaleString()}
                                    </div>
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
    botonNuevo: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
    resumenGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' },
    resumenCard: { backgroundColor: 'white', padding: '18px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    resumenNumero: { fontSize: '20px', fontWeight: 'bold', color: '#2d2d2d', margin: '0 0 4px 0' },
    resumenLabel: { fontSize: '12px', color: '#888', margin: 0 },
    filtrosRow: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
    buscadorContainer: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', border: '1.5px solid #e0ede6', borderRadius: '10px', padding: '0 15px', flex: 1 },
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
    infoBox: { backgroundColor: '#f8fffe', border: '1.5px solid #e0ede6', borderRadius: '10px', padding: '15px', gridColumn: '1 / -1' },
    infoTitulo: { fontSize: '13px', fontWeight: '700', color: '#2e7d52', margin: '0 0 10px 0' },
    infoGrid: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px', alignItems: 'center' },
    infoLabel: { fontSize: '12px', color: '#888' },
    infoValor: { fontSize: '14px', fontWeight: '600', color: '#2d2d2d' },
    formBotones: { display: 'flex', gap: '10px' },
    botonGuardar: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    botonCancelar: { backgroundColor: 'white', color: '#666', border: '1px solid #ddd', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
    lista: { display: 'flex', flexDirection: 'column', gap: '10px' },
    pagoCard: { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' },
    pagoFila: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' },
    metodoBadge: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' },
    metodoLabel: { fontSize: '11px', color: '#888', textTransform: 'capitalize' },
    pagoInfo: { flex: 1 },
    pagoId: { fontSize: '14px', fontWeight: 'bold', color: '#2d2d2d', margin: '0 0 2px 0' },
    pagoDetalle: { fontSize: '13px', color: '#555', margin: '0 0 2px 0' },
    pagoFecha: { fontSize: '12px', color: '#aaa', margin: 0 },
    pagoMonto: { fontSize: '20px', fontWeight: 'bold', color: '#2e7d52', minWidth: '120px', textAlign: 'right' },
    sinDatos: { backgroundColor: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', color: '#999' },
};

export default Pagos;