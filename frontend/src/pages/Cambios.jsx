import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { buscarOrigenCambio, registrarCambioUnificado, getHistorialCambios } from '../api/cambios';
import { getProductos } from '../api/productos';

const METODOS = ['efectivo', 'transferencia', 'tarjeta'];
const METODO_ICONS = { efectivo: '💵', transferencia: '🏦', tarjeta: '💳' };
const STOCK_MINIMO = 3;

const CambiosPage = () => {
    const [vista, setVista] = useState('nuevo'); // 'nuevo' | 'historial'
    const [tipoOrigen, setTipoOrigen] = useState('venta');
    const [idOrigen, setIdOrigen] = useState('');
    const [cargandoOrigen, setCargandoOrigen] = useState(false);
    const [datosOrigen, setDatosOrigen] = useState(null);
    const [productosDisponiblesNuevos, setProductosDisponiblesNuevos] = useState([]);
    const [productosDevueltos, setProductosDevueltos] = useState([]);
    const [productosNuevos, setProductosNuevos] = useState([]);
    const [metodoExcedente, setMetodoExcedente] = useState('efectivo');
    const [loading, setLoading] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [error, setError] = useState(null);

    // Historial
    const [historial, setHistorial] = useState([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);
    const [expandidoHistorial, setExpandidoHistorial] = useState(null);
    const [busquedaHistorial, setBusquedaHistorial] = useState('');

    useEffect(() => {
        getProductos().then(setProductosDisponiblesNuevos).catch(() => {});
    }, []);

    useEffect(() => {
        if (vista === 'historial') cargarHistorial();
    }, [vista]);

    const cargarHistorial = async () => {
        setCargandoHistorial(true);
        try {
            const data = await getHistorialCambios();
            setHistorial(data);
        } catch {
            setHistorial([]);
        } finally {
            setCargandoHistorial(false);
        }
    };

    const consultarOrigen = async () => {
        if (!idOrigen) return;
        setCargandoOrigen(true);
        setError(null);
        setMensaje(null);
        setProductosDevueltos([]);
        setProductosNuevos([]);
        try {
            const data = await buscarOrigenCambio(tipoOrigen, idOrigen);
            setDatosOrigen(data);
        } catch (err) {
            setError(err.response?.data?.error || 'No se encontró el registro solicitado.');
            setDatosOrigen(null);
        } finally {
            setCargandoOrigen(false);
        }
    };

    const toggleSeleccionDevolucion = (prodOriginal) => {
        const existe = productosDevueltos.find(p => p.id_producto === prodOriginal.id_producto && p.talla === prodOriginal.talla);
        if (existe) {
            setProductosDevueltos(productosDevueltos.filter(p => !(p.id_producto === prodOriginal.id_producto && p.talla === prodOriginal.talla)));
        } else {
            setProductosDevueltos([...productosDevueltos, {
                id_producto: prodOriginal.id_producto,
                nombre_producto: prodOriginal.nombre_producto || 'Producto sin nombre',
                talla: prodOriginal.talla,
                cantidad: 1,
                cantidad_maxima: prodOriginal.cantidad_maxima || prodOriginal.cantidad || 1,
                precio_unitario: parseFloat(prodOriginal.precio_unitario || 0)
            }]);
        }
    };

    const manejarCantidadDevuelta = (index, valor) => {
        const nuevasFilas = [...productosDevueltos];
        const cant = parseInt(valor) || 1;
        nuevasFilas[index].cantidad = Math.max(1, Math.min(cant, nuevasFilas[index].cantidad_maxima));
        setProductosDevueltos(nuevasFilas);
    };

    const agregarProductoNuevo = () => {
        setProductosNuevos([...productosNuevos, { id_producto: '', talla: '', cantidad: 1, precio_unitario: 0 }]);
    };

    const handleProductoNuevoChange = (index, idProducto) => {
        const nuevasFilas = [...productosNuevos];
        nuevasFilas[index].id_producto = idProducto;
        nuevasFilas[index].talla = '';
        nuevasFilas[index].cantidad = 1;
        const prod = productosDisponiblesNuevos.find(p => p.id_producto === parseInt(idProducto));
        nuevasFilas[index].precio_unitario = prod ? parseFloat(prod.precio_venta) : 0;
        setProductosNuevos(nuevasFilas);
    };

    const handleTallaCantidadNuevo = (index, talla, valor) => {
        const nuevasFilas = [...productosNuevos];
        nuevasFilas[index].talla = talla;
        nuevasFilas[index].cantidad = parseInt(valor) || 1;
        setProductosNuevos(nuevasFilas);
    };

    const manejarCambioNuevo = (index, campo, valor) => {
        const nuevasFilas = [...productosNuevos];
        nuevasFilas[index][campo] = valor;
        setProductosNuevos(nuevasFilas);
    };

    const eliminarProductoNuevo = (index) => {
        setProductosNuevos(productosNuevos.filter((_, i) => i !== index));
    };

    const totalDevuelto = productosDevueltos.reduce((s, p) => s + (p.precio_unitario * p.cantidad), 0);
    const totalNuevo = productosNuevos.reduce((s, p) => s + (p.precio_unitario * (parseInt(p.cantidad) || 0)), 0);
    const diferencia = totalNuevo - totalDevuelto;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const usuarioSesion = JSON.parse(localStorage.getItem('usuario'));
        if (!usuarioSesion) { setError('Tu sesión ha expirado. Vuelve a iniciar sesión.'); return; }
        if (productosDevueltos.length === 0) { setError('Debe seleccionar al menos un producto original para devolver.'); return; }
        if (diferencia < 0 && !datosOrigen?.id_cliente) { setError('No se puede generar saldo a favor para un Cliente ocasional.'); return; }

        setLoading(true);
        setMensaje(null);
        setError(null);

        const payload = {
            id_cliente: datosOrigen?.id_cliente || null,
            id_venta: tipoOrigen === 'venta' ? parseInt(idOrigen) : null,
            id_credito: tipoOrigen === 'credito' ? parseInt(idOrigen) : null,
            id_vendedor: parseInt(usuarioSesion.id_usuario || usuarioSesion.id),
            total_devolucion: totalDevuelto,
            total_nuevo: totalNuevo,
            excedente_pago: diferencia > 0 ? diferencia : 0,
            metodo_pago_excedente: diferencia > 0 ? metodoExcedente : null,
            productos_devueltos: productosDevueltos.map(p => ({ id_producto: p.id_producto, talla: p.talla, cantidad: p.cantidad })),
            productos_nuevos: productosNuevos.map(p => ({ id_producto: parseInt(p.id_producto), talla: p.talla, cantidad: parseInt(p.cantidad) }))
        };

        try {
            const respuesta = await registrarCambioUnificado(payload);
            setMensaje(respuesta.message || '¡Cambio registrado exitosamente!');
            setProductosDevueltos([]);
            setProductosNuevos([]);
            setDatosOrigen(null);
            setIdOrigen('');
        } catch (err) {
            setError(err.response?.data?.error || 'Error al procesar el cambio.');
        } finally {
            setLoading(false);
        }
    };

    // Historial filtrado
    const historialFiltrado = historial.filter(c => {
        if (!busquedaHistorial) return true;
        const q = busquedaHistorial.toLowerCase();
        return (
            (c.nombre_cliente || '').toLowerCase().includes(q) ||
            (c.nombre_vendedor || '').toLowerCase().includes(q) ||
            String(c.id_cambio).includes(q) ||
            String(c.id_venta || '').includes(q) ||
            String(c.id_credito || '').includes(q)
        );
    });

    return (
        <div style={styles.layout}>
            <Sidebar />
            <div style={styles.contenido}>

                {/* Header con tabs */}
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.titulo}>🔄 Devoluciones y Cambios</h1>
                        <p style={styles.subtitulo}>Gestiona canjes y consulta el historial de cambios realizados</p>
                    </div>
                    <div style={styles.tabs}>
                        <button
                            onClick={() => setVista('nuevo')}
                            style={{ ...styles.tab, ...(vista === 'nuevo' ? styles.tabActivo : {}) }}
                        >
                            ➕ Nuevo cambio
                        </button>
                        <button
                            onClick={() => setVista('historial')}
                            style={{ ...styles.tab, ...(vista === 'historial' ? styles.tabActivo : {}) }}
                        >
                            📋 Historial ({historial.length || '—'})
                        </button>
                    </div>
                </div>

                <hr style={{ border: '0.5px solid #e0ede6', marginBottom: '20px' }} />

                {/* ======================== VISTA: NUEVO CAMBIO ======================== */}
                {vista === 'nuevo' && (
                    <>
                        {mensaje && <div style={styles.alertaExito}>{mensaje}</div>}
                        {error && <div style={styles.alertaError}>⚠️ {error}</div>}

                        {/* Paso 1 */}
                        <div style={styles.card}>
                            <h4 style={styles.cardTitulo}>🔍 Paso 1: Localizar compra original</h4>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div>
                                    <label style={styles.label}>Buscar en:</label>
                                    <select value={tipoOrigen} onChange={e => setTipoOrigen(e.target.value)} style={styles.select}>
                                        <option value="venta">Venta normal</option>
                                        <option value="credito">Crédito activo</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={styles.label}>Número de ID:</label>
                                    <input type="number" value={idOrigen} onChange={e => setIdOrigen(e.target.value)} placeholder="Ej: 10" style={styles.input} />
                                </div>
                                <button type="button" onClick={consultarOrigen} disabled={cargandoOrigen} style={{ ...styles.botonPrimario, backgroundColor: '#1565c0' }}>
                                    {cargandoOrigen ? 'Buscando...' : 'Cargar detalles'}
                                </button>
                            </div>
                        </div>

                        {datosOrigen && (
                            <form onSubmit={handleSubmit}>
                                {/* Info cliente */}
                                <div style={styles.infoBanner}>
                                    <span>Comprador: <strong>👤 {datosOrigen?.nombre_cliente || 'Cliente ocasional'}</strong></span>
                                    <span style={{ color: '#555', fontSize: '14px' }}>
                                        Total original: <strong>${datosOrigen?.total_transaccion ? parseFloat(datosOrigen.total_transaccion).toLocaleString() : '0'}</strong>
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                    {/* Devoluciones */}
                                    <div style={{ flex: 1, minWidth: '350px', ...styles.card }}>
                                        <h3 style={{ margin: '0 0 5px 0', color: '#bc4747' }}>⬇️ 2. ¿Qué prenda va a devolver?</h3>
                                        <p style={{ fontSize: '12px', color: '#777', marginBottom: '15px' }}>Selecciona los artículos que el cliente entrega:</p>

                                        {(datosOrigen?.detalles || []).length > 0 ? (
                                            (datosOrigen?.detalles || []).map((prod, index) => {
                                                const keyId = prod.id_producto || index;
                                                const seleccionado = productosDevueltos.some(p => p.id_producto === prod.id_producto && p.talla === prod.talla);
                                                const idxDev = productosDevueltos.findIndex(p => p.id_producto === prod.id_producto && p.talla === prod.talla);
                                                return (
                                                    <div key={`${keyId}-${prod.talla || index}`} style={{ padding: '14px', border: '1px solid #e0ede6', borderRadius: '8px', marginBottom: '10px', backgroundColor: seleccionado ? '#fff5f5' : '#fff' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#2d2d2d' }}>{prod.nombre_producto || 'Producto sin nombre'}</span><br />
                                                                <span style={{ fontSize: '12px', color: '#666' }}>
                                                                    Talla: <span style={styles.tallaPill}>{prod.talla || 'N/A'}</span> | Precio: ${prod.precio_unitario ? parseFloat(prod.precio_unitario).toLocaleString() : '0'}
                                                                </span>
                                                            </div>
                                                            <button type="button" onClick={() => toggleSeleccionDevolucion(prod)} style={{ padding: '6px 14px', backgroundColor: seleccionado ? '#dc3545' : '#2e7d52', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                                                                {seleccionado ? 'Quitar' : 'Devolver'}
                                                            </button>
                                                        </div>
                                                        {seleccionado && idxDev !== -1 && (
                                                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e0ede6', paddingTop: '8px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <label style={{ fontSize: '12px', color: '#555' }}>Cant. (Max {prod.cantidad_maxima || prod.cantidad || 1}):</label>
                                                                    <input type="number" min="1" max={prod.cantidad_maxima || prod.cantidad || 1} value={productosDevueltos[idxDev]?.cantidad || 1} onChange={e => manejarCantidadDevuelta(idxDev, e.target.value)} style={{ ...styles.input, width: '65px', padding: '5px', textAlign: 'center' }} />
                                                                </div>
                                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#bc4747' }}>
                                                                    -${((productosDevueltos[idxDev]?.precio_unitario || 0) * (productosDevueltos[idxDev]?.cantidad || 1)).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div style={{ padding: '15px', border: '1px dashed #e53935', backgroundColor: '#fdfcea', borderRadius: '8px', color: '#c62828', fontSize: '13px' }}>
                                                ⚠️ No se encontraron productos en este registro.
                                            </div>
                                        )}
                                    </div>

                                    {/* Prendas nuevas */}
                                    <div style={{ flex: 1, minWidth: '350px', ...styles.card }}>
                                        <h3 style={{ margin: '0 0 5px 0', color: '#2e7d52' }}>⬆️ 3. ¿Qué prendas nuevas se lleva?</h3>
                                        <p style={{ fontSize: '12px', color: '#777', marginBottom: '15px' }}>Agrega y selecciona las tallas de cambio con stock:</p>

                                        {productosNuevos.map((item, idx) => {
                                            const prod = productosDisponiblesNuevos.find(p => p.id_producto === parseInt(item.id_producto));
                                            return (
                                                <div key={idx} style={{ backgroundColor: '#f8fffe', border: '1px solid #e0ede6', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '12px' }}>
                                                        <div style={{ flex: 2 }}>
                                                            <label style={{ fontSize: '12px', color: '#777', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Producto nuevo</label>
                                                            <select value={item.id_producto} onChange={e => handleProductoNuevoChange(idx, e.target.value)} style={styles.select}>
                                                                <option value="">-- Seleccione producto --</option>
                                                                {productosDisponiblesNuevos.map(p => (
                                                                    <option key={p.id_producto} value={p.id_producto}>{p.nombre} — Stock: {p.stock}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <button type="button" onClick={() => eliminarProductoNuevo(idx)} style={{ backgroundColor: '#fdecea', color: '#e53935', border: 'none', width: '38px', height: '38px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0, fontWeight: 'bold' }}>✕</button>
                                                    </div>

                                                    {prod && (
                                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                                            {prod.tallas && prod.tallas.length > 0 ? (
                                                                prod.tallas.map(t => {
                                                                    const seleccionada = item.talla === t.talla;
                                                                    const sinStock = t.cantidad === 0;
                                                                    const stockBajo = t.cantidad > 0 && t.cantidad < STOCK_MINIMO;
                                                                    return (
                                                                        <div key={t.talla} onClick={() => !sinStock && handleTallaCantidadNuevo(idx, t.talla, 1)} style={{ border: `2px solid ${seleccionada ? '#2e7d52' : stockBajo ? '#e65100' : sinStock ? '#ddd' : '#e0ede6'}`, borderRadius: '10px', padding: '8px 12px', minWidth: '75px', textAlign: 'center', backgroundColor: seleccionada ? '#e8f5ee' : sinStock ? '#f9f9f9' : 'white', opacity: sinStock ? 0.5 : 1, cursor: sinStock ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                                                            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#2d2d2d' }}>{t.talla}</div>
                                                                            <div style={{ fontSize: '11px', color: sinStock ? '#ccc' : stockBajo ? '#e65100' : '#2e7d52', fontWeight: '600' }}>
                                                                                {sinStock ? 'Sin stock' : `${t.cantidad} disp.`}
                                                                                {stockBajo && !sinStock && ' ⚠️'}
                                                                            </div>
                                                                            {seleccionada && (
                                                                                <input type="number" min="1" max={t.cantidad} value={item.cantidad} onClick={e => e.stopPropagation()} onChange={e => manejarCambioNuevo(idx, 'cantidad', e.target.value)} style={{ width: '55px', padding: '3px 4px', border: '1.5px solid #2e7d52', borderRadius: '6px', fontSize: '13px', textAlign: 'center', outline: 'none', marginTop: '4px' }} />
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <p style={{ color: '#999', fontSize: '13px' }}>Sin tallas registradas</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {item.talla && item.precio_unitario > 0 && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0faf4', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', color: '#555', marginTop: '6px' }}>
                                                            <span>Talla <strong>{item.talla}</strong> × {item.cantidad} ud(s)</span>
                                                            <span style={{ color: '#2e7d52', fontWeight: 'bold' }}>+${(item.precio_unitario * item.cantidad).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        <button type="button" onClick={agregarProductoNuevo} style={{ backgroundColor: 'transparent', color: '#2e7d52', border: '1.5px dashed #2e7d52', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', width: '100%', marginTop: '8px' }}>
                                            + Vincular nueva prenda al cambio
                                        </button>
                                    </div>
                                </div>

                                {/* Resumen financiero */}
                                <div style={{ backgroundColor: '#e8f5ee', padding: '18px 22px', borderRadius: '10px', marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #cbdcd0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '500' }}>Total a favor por devolución:</span>
                                        <span style={{ color: '#bc4747', fontWeight: 'bold', fontSize: '16px' }}>-${totalDevuelto.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '500' }}>Total nuevas prendas solicitadas:</span>
                                        <span style={{ color: '#2e7d52', fontWeight: 'bold', fontSize: '16px' }}>+${totalNuevo.toLocaleString()}</span>
                                    </div>
                                    <hr style={{ border: '0.5px solid #cce3d5', margin: '12px 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#2d2d2d' }}>Diferencia neta de caja:</span>
                                        <span style={{ fontSize: '22px', fontWeight: 'bold', color: diferencia > 0 ? '#e65100' : diferencia < 0 ? '#1565c0' : '#2e7d52' }}>
                                            {diferencia > 0 ? `+$${diferencia.toLocaleString()}` : diferencia < 0 ? `-$${Math.abs(diferencia).toLocaleString()}` : '$0'}
                                        </span>
                                    </div>
                                    <div style={{ marginTop: '10px', padding: '12px', borderRadius: '6px', backgroundColor: 'white', border: '1px solid #cce3d5', fontSize: '13px', color: '#444' }}>
                                        <strong>Efecto en transacción:</strong>{' '}
                                        {diferencia === 0 && 'Cambio directo neto ($0). No se altera el crédito ni se requieren movimientos de dinero.'}
                                        {diferencia > 0 && (tipoOrigen === 'credito' ? `Se inyectarán $${diferencia.toLocaleString()} como incremento en el saldo pendiente de este crédito.` : `Excedente generado. Se debe cobrar $${diferencia.toLocaleString()} al comprador en caja.`)}
                                        {diferencia < 0 && (datosOrigen?.id_cliente ? `Dinero a favor. Se restarán $${Math.abs(diferencia).toLocaleString()} de la deuda total del crédito del cliente.` : '❌ No puedes generar saldo a favor para un Cliente ocasional. Agrega otra prenda o disminuye la devolución.')}
                                    </div>
                                </div>

                                {diferencia > 0 && (
                                    <div style={{ marginTop: '20px' }}>
                                        <label style={styles.label}>Método de pago para cobrar el excedente *</label>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                            {METODOS.map(m => (
                                                <button key={m} type="button" onClick={() => setMetodoExcedente(m)} style={{ flex: 1, padding: '9px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', backgroundColor: metodoExcedente === m ? '#2e7d52' : 'white', color: metodoExcedente === m ? 'white' : '#555', border: `2px solid ${metodoExcedente === m ? '#2e7d52' : '#e0ede6'}` }}>
                                                    {METODO_ICONS[m]} {m.charAt(0).toUpperCase() + m.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button type="submit" disabled={loading || (diferencia < 0 && !datosOrigen?.id_cliente)} style={{ ...styles.botonPrimario, width: '100%', marginTop: '20px', padding: '14px', fontSize: '15px', opacity: (loading || (diferencia < 0 && !datosOrigen?.id_cliente)) ? 0.6 : 1 }}>
                                    {loading ? 'Procesando en servidor...' : 'Confirmar e inyectar transmisión de cambio'}
                                </button>
                            </form>
                        )}
                    </>
                )}

                {/* ======================== VISTA: HISTORIAL ======================== */}
                {vista === 'historial' && (
                    <>
                        {/* Buscador */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
                            <div style={styles.buscadorContainer}>
                                <span style={{ fontSize: '16px' }}>🔍</span>
                                <input
                                    placeholder="Buscar por cliente, vendedor, ID de cambio o venta..."
                                    value={busquedaHistorial}
                                    onChange={e => setBusquedaHistorial(e.target.value)}
                                    style={styles.buscadorInput}
                                />
                            </div>
                            <button onClick={cargarHistorial} style={{ ...styles.botonPrimario, backgroundColor: '#555', whiteSpace: 'nowrap' }}>
                                🔄 Actualizar
                            </button>
                        </div>

                        {/* Resumen rápido */}
                        {historial.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ ...styles.card, textAlign: 'center' }}>
                                    <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#2e7d52', margin: '0 0 4px 0' }}>{historial.length}</p>
                                    <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Total de cambios</p>
                                </div>
                                <div style={{ ...styles.card, textAlign: 'center' }}>
                                    <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#bc4747', margin: '0 0 4px 0' }}>
                                        ${historial.reduce((s, c) => s + parseFloat(c.total_devolucion || 0), 0).toLocaleString()}
                                    </p>
                                    <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Total devuelto</p>
                                </div>
                                <div style={{ ...styles.card, textAlign: 'center' }}>
                                    <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#e65100', margin: '0 0 4px 0' }}>
                                        ${historial.reduce((s, c) => s + parseFloat(c.excedente_pagado || 0), 0).toLocaleString()}
                                    </p>
                                    <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Excedentes cobrados</p>
                                </div>
                            </div>
                        )}

                        {cargandoHistorial ? (
                            <div style={styles.sinDatos}>Cargando historial...</div>
                        ) : historialFiltrado.length === 0 ? (
                            <div style={styles.sinDatos}>
                                <p style={{ fontSize: '40px', margin: 0 }}>🔄</p>
                                <p>{busquedaHistorial ? 'No se encontraron resultados' : 'No hay cambios registrados aún'}</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {historialFiltrado.map(cambio => {
                                    const estaExpandido = expandidoHistorial === cambio.id_cambio;
                                    const diferenciaCambio = parseFloat(cambio.total_nuevo) - parseFloat(cambio.total_devolucion);
                                    const origenLabel = cambio.id_venta ? `Venta #${cambio.id_venta}` : cambio.id_credito ? `Crédito #${cambio.id_credito}` : '—';

                                    return (
                                        <div key={cambio.id_cambio} style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e0ede6' }}>
                                            {/* Cabecera */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px' }}>
                                                <div style={{ width: '46px', height: '46px', borderRadius: '10px', backgroundColor: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                                                    🔄
                                                </div>

                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#2d2d2d' }}>Cambio #{cambio.id_cambio}</span>
                                                        <span style={{ backgroundColor: '#e3f2fd', color: '#1565c0', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                                                            Origen: {origenLabel}
                                                        </span>
                                                        {cambio.metodo_pago_excedente && (
                                                            <span style={{ backgroundColor: '#fff3e0', color: '#e65100', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                                                                {METODO_ICONS[cambio.metodo_pago_excedente]} {cambio.metodo_pago_excedente}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p style={{ fontSize: '13px', color: '#555', margin: '0 0 2px 0' }}>
                                                        👤 {cambio.nombre_cliente || 'Cliente ocasional'}
                                                        {cambio.nombre_vendedor && <span style={{ color: '#999', marginLeft: '10px' }}>• Atendido por: {cambio.nombre_vendedor}</span>}
                                                    </p>
                                                    <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>
                                                        📅 {cambio.fecha_cambio ? new Date(cambio.fecha_cambio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </p>
                                                </div>

                                                {/* Montos */}
                                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <p style={{ fontSize: '11px', color: '#999', margin: '0 0 2px 0' }}>Devuelto</p>
                                                        <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#bc4747', margin: 0 }}>-${Number(cambio.total_devolucion).toLocaleString()}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <p style={{ fontSize: '11px', color: '#999', margin: '0 0 2px 0' }}>Nuevo</p>
                                                        <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#2e7d52', margin: 0 }}>+${Number(cambio.total_nuevo).toLocaleString()}</p>
                                                    </div>
                                                    {parseFloat(cambio.excedente_pagado) > 0 && (
                                                        <div style={{ textAlign: 'center' }}>
                                                            <p style={{ fontSize: '11px', color: '#999', margin: '0 0 2px 0' }}>Excedente</p>
                                                            <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#e65100', margin: 0 }}>${Number(cambio.excedente_pagado).toLocaleString()}</p>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => setExpandidoHistorial(estaExpandido ? null : cambio.id_cambio)}
                                                        style={{ backgroundColor: '#f0f4f0', color: '#555', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}
                                                    >
                                                        {estaExpandido ? '▲ Ocultar' : '▼ Ver productos'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Detalle expandido */}
                                            {estaExpandido && (
                                                <div style={{ borderTop: '1px solid #f0f4f0', backgroundColor: '#fafffe', padding: '20px' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                        {/* Prendas devueltas (entradas) */}
                                                        <div>
                                                            <p style={{ fontSize: '13px', fontWeight: '700', color: '#bc4747', marginBottom: '10px', marginTop: 0 }}>
                                                                ⬇️ Prendas devueltas por el cliente
                                                            </p>
                                                            {cambio.detalles_entrada && cambio.detalles_entrada.length > 0 ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    {cambio.detalles_entrada.map((d, i) => (
                                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff5f5', border: '1px solid #fca8a6', borderRadius: '8px', padding: '10px 14px' }}>
                                                                            <div>
                                                                                <p style={{ fontSize: '14px', fontWeight: '600', color: '#2d2d2d', margin: '0 0 2px 0' }}>{d.nombre_producto}</p>
                                                                                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                                                                                    Talla: <span style={{ ...styles.tallaPill, backgroundColor: '#fdecea', color: '#bc4747' }}>{d.talla}</span>
                                                                                    {' '}&times;{d.cantidad} ud{d.cantidad > 1 ? 's' : ''}
                                                                                </p>
                                                                            </div>
                                                                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#bc4747' }}>
                                                                                -${(parseFloat(d.precio_pactado) * d.cantidad).toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p style={{ color: '#aaa', fontSize: '13px' }}>Sin prendas devueltas registradas</p>
                                                            )}
                                                        </div>

                                                        {/* Prendas nuevas (salidas) */}
                                                        <div>
                                                            <p style={{ fontSize: '13px', fontWeight: '700', color: '#2e7d52', marginBottom: '10px', marginTop: 0 }}>
                                                                ⬆️ Prendas nuevas entregadas al cliente
                                                            </p>
                                                            {cambio.detalles_salida && cambio.detalles_salida.length > 0 ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                    {cambio.detalles_salida.map((d, i) => (
                                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0faf4', border: '1px solid #cce3d5', borderRadius: '8px', padding: '10px 14px' }}>
                                                                            <div>
                                                                                <p style={{ fontSize: '14px', fontWeight: '600', color: '#2d2d2d', margin: '0 0 2px 0' }}>{d.nombre_producto}</p>
                                                                                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                                                                                    Talla: <span style={styles.tallaPill}>{d.talla}</span>
                                                                                    {' '}&times;{d.cantidad} ud{d.cantidad > 1 ? 's' : ''}
                                                                                </p>
                                                                            </div>
                                                                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#2e7d52' }}>
                                                                                +${(parseFloat(d.precio_venta) * d.cantidad).toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p style={{ color: '#aaa', fontSize: '13px' }}>Sin prendas nuevas registradas</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Resumen del cambio */}
                                                    <div style={{ marginTop: '16px', backgroundColor: 'white', border: '1px solid #e0ede6', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#555' }}>Diferencia neta:</span>
                                                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: diferenciaCambio > 0 ? '#e65100' : diferenciaCambio < 0 ? '#1565c0' : '#2e7d52' }}>
                                                            {diferenciaCambio > 0 ? `+$${diferenciaCambio.toLocaleString()}` : diferenciaCambio < 0 ? `-$${Math.abs(diferenciaCambio).toLocaleString()}` : '$0 (Cambio directo)'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const styles = {
    layout: { display: 'flex', minHeight: '100vh', backgroundColor: '#f0f4f0' },
    contenido: { marginLeft: '250px', flex: 1, padding: '30px', fontFamily: 'sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' },
    titulo: { fontSize: '26px', color: '#2e7d52', fontWeight: 'bold', margin: 0 },
    subtitulo: { color: '#666', marginTop: '4px', fontSize: '14px' },
    tabs: { display: 'flex', gap: '8px', flexShrink: 0 },
    tab: { padding: '9px 18px', borderRadius: '8px', border: '1.5px solid #e0ede6', cursor: 'pointer', fontSize: '14px', fontWeight: '600', backgroundColor: 'white', color: '#555' },
    tabActivo: { backgroundColor: '#2e7d52', color: 'white', borderColor: '#2e7d52' },
    label: { fontSize: '13px', color: '#555', fontWeight: '600', display: 'block', marginBottom: '4px' },
    input: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white' },
    select: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', width: '100%', boxSizing: 'border-box' },
    botonPrimario: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
    tallaPill: { backgroundColor: '#e8f5ee', color: '#2e7d52', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
    card: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e0ede6', marginBottom: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' },
    cardTitulo: { margin: '0 0 12px 0', color: '#2e7d52' },
    infoBanner: { backgroundColor: '#f0faf4', padding: '14px 20px', borderRadius: '8px', marginBottom: '25px', borderLeft: '4px solid #2e7d52', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    alertaExito: { padding: '12px 15px', backgroundColor: '#e8f5ee', color: '#2e7d52', borderRadius: '8px', marginBottom: '15px', fontWeight: '500' },
    alertaError: { padding: '12px 15px', backgroundColor: '#fdecea', color: '#e53935', borderRadius: '8px', marginBottom: '15px' },
    buscadorContainer: { display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1.5px solid #e0ede6', borderRadius: '10px', padding: '0 15px', flex: 1, gap: '10px' },
    buscadorInput: { border: 'none', outline: 'none', padding: '12px 0', fontSize: '14px', width: '100%', backgroundColor: 'transparent' },
    sinDatos: { backgroundColor: 'white', borderRadius: '12px', padding: '50px', textAlign: 'center', color: '#999' },
};

export default CambiosPage;
