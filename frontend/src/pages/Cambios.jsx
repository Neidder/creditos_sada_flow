import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar'; 
import { buscarOrigenCambio, registrarCambioUnificado } from '../api/cambios';
import { getProductos } from '../api/productos'; 

const METODOS = ['efectivo', 'transferencia', 'tarjeta'];
const METODO_ICONS = { efectivo: '💵', transferencia: '🏦', tarjeta: '💳' };
const STOCK_MINIMO = 3;

const CambiosPage = () => {
    const [tipoOrigen, setTipoOrigen] = useState('venta');
    const [idOrigen, setIdOrigen] = useState('');
    const [cargandoOrigen, setCargandoOrigen] = useState(false);
    
    // Datos cargados desde la Factura/Crédito original
    const [datosOrigen, setDatosOrigen] = useState(null); 
    const [productosDisponiblesNuevos, setProductosDisponiblesNuevos] = useState([]);

    // Estructuras del cambio actual
    const [productosDevueltos, setProductosDevueltos] = useState([]);
    const [productosNuevos, setProductosNuevos] = useState([]);
    const [metodoExcedente, setMetodoExcedente] = useState('efectivo');

    // Feedbacks
    const [loading, setLoading] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [error, setError] = useState(null);

    // Cargar catálogo de productos para cuando se escojan las prendas nuevas
    useEffect(() => {
        getProductos().then(setProductosDisponiblesNuevos).catch(() => {});
    }, []);

    // 1. Buscar Factura o Crédito Activo en el Backend
    const consultarOrigen = async () => {
        if (!idOrigen) return;
        setCargandoOrigen(true);
        setError(null);
        setMensaje(null);
        setProductosDevueltos([]);
        setProductosNuevos([]);
        try {
            const data = await buscarOrigenCambio(tipoOrigen, idOrigen);
            
            // DIAGNÓSTICO: Abre la consola del navegador (F12) para ver qué campos devuelve tu Django
            console.log("➡️ JSON RECIBIDO DEL BACKEND:", data);
            
            setDatosOrigen(data);
        } catch (err) {
            console.error("Error al buscar origen:", err);
            setError(err.response?.data?.error || "No se encontró el registro solicitado o el servidor no respondió.");
            setDatosOrigen(null);
        } finally {
            setCargandoOrigen(false);
        }
    };

    // 2. Gestionar productos elegidos para devolver
    const toggleSeleccionDevolucion = (prodOriginal) => {
        const existe = productosDevueltos.find(p => p.id_producto === prodOriginal.id_producto && p.talla === prodOriginal.talla);
        if (existe) {
            setProductosDevueltos(productosDevueltos.filter(p => !(p.id_producto === prodOriginal.id_producto && p.talla === prodOriginal.talla)));
        } else {
            setProductosDevueltos([...productosDevueltos, {
                id_producto: prodOriginal.id_producto,
                nombre_producto: prodOriginal.nombre_producto || "Producto sin nombre",
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

    // 3. Gestionar prendas nuevas (Salidas)
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

    // Cálculos Dinámicos Financieros
    const totalDevuelto = productosDevueltos.reduce((s, p) => s + (p.precio_unitario * p.cantidad), 0);
    const totalNuevo = productosNuevos.reduce((s, p) => s + (p.precio_unitario * (parseInt(p.cantidad) || 0)), 0);
    const diferencia = totalNuevo - totalDevuelto;

    // 4. Procesamiento final hacia el Backend
    const handleSubmit = async (e) => {
        e.preventDefault();

        // 🌟 Recuperar el usuario de la sesión para evitar el error de id_vendedor nulo
        const usuarioSesion = JSON.parse(localStorage.getItem('usuario'));
        
        if (!usuarioSesion) {
            setError("Tu sesión ha expirado o no es válida. Por favor, vuelve a iniciar sesión.");
            return;
        }

        if (productosDevueltos.length === 0) {
            setError("Debe seleccionar al menos un producto original para devolver.");
            return;
        }

        if (diferencia < 0 && !datosOrigen?.id_cliente) {
            setError("No se puede generar saldo a favor para un 'Cliente ocasional'. Por favor, ajuste los artículos nuevos o vincule un cliente real.");
            return;
        }

        setLoading(true);
        setMensaje(null);
        setError(null);

        const payload = {
            id_cliente: datosOrigen?.id_cliente || null,
            id_venta: tipoOrigen === 'venta' ? parseInt(idOrigen) : null,
            id_credito: tipoOrigen === 'credito' ? parseInt(idOrigen) : null,
            
            // 🌟 Inyectamos el ID del vendedor autenticado convertido a entero
            id_vendedor: parseInt(usuarioSesion.id_usuario || usuarioSesion.id),
            
            total_devolucion: totalDevuelto,
            total_nuevo: totalNuevo,
            excedente_pago: diferencia > 0 ? diferencia : 0,
            metodo_pago_excedente: diferencia > 0 ? metodoExcedente : null,
            productos_devueltos: productosDevueltos.map(p => ({
                id_producto: p.id_producto,
                talla: p.talla,
                cantidad: p.cantidad
            })),
            productos_nuevos: productosNuevos.map(p => ({
                id_producto: parseInt(p.id_producto),
                talla: p.talla,
                cantidad: parseInt(p.cantidad)
            }))
        };

        try {
            const respuesta = await registrarCambioUnificado(payload);
            setMensaje(respuesta.message || "¡Cambio inyectado de manera exitosa!");
            setProductosDevueltos([]);
            setProductosNuevos([]);
            setDatosOrigen(null);
            setIdOrigen('');
        } catch (err) {
            setError(err.response?.data?.error || "Error al procesar el cambio.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.layout}>
            <Sidebar />
            <div style={styles.contenido}>
                <h2>🔄 Devoluciones y Cambios (Créditos)</h2>
                <p style={{ color: '#666', fontSize: '14px' }}>Busca el documento de venta o crédito para procesar retornos sin errores manuales.</p>
             
                <hr style={{ border: '0.5px solid #e0ede6', marginBottom: '20px' }} />

                {mensaje && <div style={{ padding: '12px 15px', backgroundColor: '#e8f5ee', color: '#2e7d52', borderRadius: '8px', marginBottom: '15px', fontWeight: '500' }}>{mensaje}</div>}
                {error && <div style={{ padding: '12px 15px', backgroundColor: '#fdecea', color: '#e53935', borderRadius: '8px', marginBottom: '15px' }}>⚠️ {error}</div>}

                {/* PASO 1: LOCALIZADOR DE LA COMPRA */}
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e0ede6', marginBottom: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#2e7d52' }}>🔍 Paso 1: Localizar Compra Original</h4>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div>
                            <label style={styles.label}>Buscar en:</label>
                            <select value={tipoOrigen} onChange={(e) => setTipoOrigen(e.target.value)} style={styles.selectField}>
                                <option value="venta">Venta Normal</option>
                                <option value="credito">Crédito Activo</option>
                            </select>
                        </div>
                        <div>
                            <label style={styles.label}>Número de ID (Factura / Crédito):</label>
                            <input type="number" value={idOrigen} onChange={(e) => setIdOrigen(e.target.value)} placeholder="Ej: 10" style={styles.input} />
                        </div>
                        <button type="button" onClick={consultarOrigen} disabled={cargandoOrigen} style={{ ...styles.botonNuevo, backgroundColor: '#1565c0' }}>
                            {cargandoOrigen ? 'Buscando...' : 'Cargar Detalles'}
                        </button>
                    </div>
                </div>

                {/* EL FORMULARIO SOLO SE MUESTRA SI HAY datosOrigen */}
                {datosOrigen && (
                    <form onSubmit={handleSubmit}>
                        {/* HEADER INFORMATIVO SEGURO */}
                        <div style={{ backgroundColor: '#f0faf4', padding: '14px 20px', borderRadius: '8px', marginBottom: '25px', borderLeft: '4px solid #2e7d52', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Comprador Vinculado: <strong>👤 {datosOrigen?.nombre_cliente || 'Cliente Ocasional'}</strong></span>
                            <span style={{ color: '#555', fontSize: '14px' }}>
                                Monto total original: <strong>${datosOrigen?.total_transaccion ? parseFloat(datosOrigen.total_transaccion).toLocaleString() : '0'}</strong>
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            
                            {/* PRODUCTOS COMPRADOS ORIGINALES */}
                            <div style={{ flex: 1, minWidth: '350px', backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e0ede6' }}>
                                <h3 style={{ margin: '0 0 5px 0', color: '#bc4747' }}>⬇️ 2. ¿Qué prenda va a devolver?</h3>
                                <p style={{ fontSize: '12px', color: '#777', marginBottom: '15px' }}>Selecciona los artículos que el cliente entrega:</p>
                                
                                {/* CONDICIONAL PARA CAPTURAR SI "detalles" ESTÁ VACÍO O TIENE OTRO NOMBRE */}
                                {(datosOrigen?.detalles || []).length > 0 ? (
                                    (datosOrigen?.detalles || []).map((prod, index) => {
                                        const keyId = prod.id_producto || index;
                                        const seleccionado = productosDevueltos.some(p => p.id_producto === prod.id_producto && p.talla === prod.talla);
                                        const idxDev = productosDevueltos.findIndex(p => p.id_producto === prod.id_producto && p.talla === prod.talla);
                                        
                                        return (
                                            <div key={`${keyId}-${prod.talla || index}`} style={{ padding: '14px', border: '1px solid #e0ede6', borderRadius: '8px', marginBottom: '10px', backgroundColor: seleccionado ? '#fff5f5' : '#fff', transition: 'all 0.2s' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#2d2d2d' }}>{prod.nombre_producto || "Producto sin nombre"}</span><br />
                                                        <span style={{ fontSize: '12px', color: '#666' }}>
                                                            Talla: <span style={styles.tallaPill}>{prod.talla || 'N/A'}</span> | Precio Unit: ${prod.precio_unitario ? parseFloat(prod.precio_unitario).toLocaleString() : '0'}
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
                                                            <input type="number" min="1" max={prod.cantidad_maxima || prod.cantidad || 1} value={productosDevueltos[idxDev]?.cantidad || 1} onChange={(e) => manejarCantidadDevuelta(idxDev, e.target.value)} style={{ ...styles.input, width: '65px', padding: '5px', textAlign: 'center' }} />
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
                                        ⚠️ La respuesta de la venta no contains productos válidos en el listado. Revisa en tu Consola (F12) si el campo se llama de otra forma en Django (ej. <code>items</code> o <code>productos</code>).
                                    </div>
                                )}
                            </div>

                            {/* ASIGNACIÓN DE PRENDAS NUEVAS */}
                            <div style={{ flex: 1, minWidth: '350px', backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e0ede6' }}>
                                <h3 style={{ margin: '0 0 5px 0', color: '#2e7d52' }}>⬆️ 3. ¿Qué prendas nuevas se lleva?</h3>
                                <p style={{ fontSize: '12px', color: '#777', marginBottom: '15px' }}>Agrega y selecciona las tallas de cambio con stock:</p>
                                
                                {productosNuevos.map((item, idx) => {
                                    const prod = productosDisponiblesNuevos.find(p => p.id_producto === parseInt(item.id_producto));
                                    return (
                                        <div key={idx} style={styles.itemCard}>
                                            <div style={styles.itemHeader}>
                                                <div style={{ flex: 2 }}>
                                                    <label style={styles.labelSmall}>Producto Nuevo</label>
                                                    <select value={item.id_producto} onChange={(e) => handleProductoNuevoChange(idx, e.target.value)} style={styles.selectField}>
                                                        <option value="">-- Seleccione Producto --</option>
                                                        {productosDisponiblesNuevos.map(p => (
                                                            <option key={p.id_producto} value={p.id_producto}>{p.nombre} — Stock: {p.stock}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button type="button" onClick={() => eliminarProductoNuevo(idx)} style={styles.botonQuitar}>✕</button>
                                            </div>

                                            {prod && (
                                                <div style={styles.tallasGrid}>
                                                    {prod.tallas && prod.tallas.length > 0 ? (
                                                        prod.tallas.map(t => {
                                                            const BureauSeleccionada = item.talla === t.talla;
                                                            const sinStock = t.cantidad === 0;
                                                            const stockBajo = t.cantidad > 0 && t.cantidad < STOCK_MINIMO;
                                                            return (
                                                                <div
                                                                    key={t.talla}
                                                                    onClick={() => !sinStock && handleTallaCantidadNuevo(idx, t.talla, 1)}
                                                                    style={{
                                                                        ...styles.tallaCard,
                                                                        borderColor: BureauSeleccionada ? '#2e7d52' : stockBajo ? '#e65100' : sinStock ? '#ddd' : '#e0ede6',
                                                                        backgroundColor: BureauSeleccionada ? '#e8f5ee' : sinStock ? '#f9f9f9' : 'white',
                                                                        opacity: sinStock ? 0.5 : 1,
                                                                        cursor: sinStock ? 'not-allowed' : 'pointer',
                                                                    }}
                                                                >
                                                                    <div style={styles.tallaNombre}>{t.talla}</div>
                                                                    <div style={{ fontSize: '11px', color: sinStock ? '#ccc' : stockBajo ? '#e65100' : '#2e7d52', fontWeight: '600' }}>
                                                                        {sinStock ? 'Sin stock' : `${t.cantidad} disp.`}
                                                                        {stockBajo && !sinStock && ' ⚠️'}
                                                                    </div>
                                                                    {BureauSeleccionada && (
                                                                        <input
                                                                            type="number"
                                                                            min="1"
                                                                            max={t.cantidad}
                                                                            value={item.cantidad}
                                                                            onClick={e => e.stopPropagation()}
                                                                            onChange={e => manejarCambioNuevo(idx, 'cantidad', e.target.value)}
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

                                            {item.talla && item.precio_unitario > 0 && (
                                                <div style={styles.itemResumen}>
                                                    <span>Talla <strong>{item.talla}</strong> × {item.cantidad} ud(s)</span>
                                                    <span style={{ color: '#2e7d52', fontWeight: 'bold' }}>
                                                        +${(item.precio_unitario * item.cantidad).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <button type="button" onClick={agregarProductoNuevo} style={styles.botonAgregar}>+ Vincular Nueva Prenda al Cambio</button>
                            </div>
                        </div>

                        {/* RESUMEN FINANCIERO */}
                        <div style={styles.totalBoxExtended}>
                            <div style={styles.totalRow}>
                                <span style={{ fontWeight: '500' }}>Total a Favor por Devolución:</span>
                                <span style={{ color: '#bc4747', fontWeight: 'bold', fontSize: '16px' }}>-${totalDevuelto.toLocaleString()}</span>
                            </div>
                            <div style={styles.totalRow}>
                                <span style={{ fontWeight: '500' }}>Total Nuevas Prendas Solicitadas:</span>
                                <span style={{ color: '#2e7d52', fontWeight: 'bold', fontSize: '16px' }}>+${totalNuevo.toLocaleString()}</span>
                            </div>
                            <hr style={{ border: '0.5px solid #cce3d5', margin: '12px 0' }} />
                            <div style={styles.totalRow}>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#2d2d2d' }}>Diferencia Neta de Caja:</span>
                                <span style={{ fontSize: '22px', fontWeight: 'bold', color: diferencia > 0 ? '#e65100' : diferencia < 0 ? '#1565c0' : '#2e7d52' }}>
                                    {diferencia > 0 ? `+$${diferencia.toLocaleString()}` : diferencia < 0 ? `-$${Math.abs(diferencia).toLocaleString()}` : '$0'}
                                </span>
                            </div>
                            
                            <div style={{ marginTop: '10px', padding: '12px', borderRadius: '6px', backgroundColor: 'white', border: '1px solid #cce3d5', fontSize: '13px', color: '#444' }}>
                                <strong>Efecto en Transacción:</strong>{' '}
                                {diferencia === 0 && "Cambio Directo Neto ($0). No se altera el crédito ni se requieren movimientos manuales de dinero."}
                                {diferencia > 0 && 
                                    (tipoOrigen === 'credito' 
                                    ? `Se inyectarán $${diferencia.toLocaleString()} automáticamente como un incremento en el saldo pendiente de este Crédito.`
                                    : `Excedente generado. Se debe realizar el cobro de $${diferencia.toLocaleString()} al comprador en caja.`)}
                                {diferencia < 0 && (datosOrigen?.id_cliente 
                                    ? `Dinero restante a favor. Se restarán $${Math.abs(diferencia).toLocaleString()} de la deuda total del Crédito del cliente.`
                                    : "❌ BLOQUEO AUTOMÁTICO: No puedes generar saldo a favor para un Cliente Ocasional. Agrega otra prenda nueva o disminuye la cantidad de devolución.")}
                            </div>
                        </div>

                        {/* Selección de método de pago por excedente */}
                        {diferencia > 0 && (
                            <div style={{ marginTop: '20px' }}>
                                <label style={styles.label}>Método de pago para cobrar el excedente *</label>
                                <div style={styles.metodosRow}>
                                    {METODOS.map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setMetodoExcedente(m)}
                                            style={{
                                                ...styles.metodoBtn,
                                                backgroundColor: metodoExcedente === m ? '#2e7d52' : 'white',
                                                color: metodoExcedente === m ? 'white' : '#555',
                                                border: `2px solid ${metodoExcedente === m ? '#2e7d52' : '#e0ede6'}`,
                                            }}
                                        >
                                            {METODO_ICONS[m]} {m.charAt(0).toUpperCase() + m.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button type="submit" disabled={loading || (diferencia < 0 && !datosOrigen?.id_cliente)} style={{ ...styles.botonEnviar, opacity: (loading || (diferencia < 0 && !datosOrigen?.id_cliente)) ? 0.6 : 1 }}>
                            {loading ? 'Procesando en Servidor...' : 'Confirmar e Inyectar Transmisión de Cambio'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

const styles = {
    layout: { display: 'flex', minHeight: '100vh', backgroundColor: '#f0f4f0' },
    contenido: { marginLeft: '250px', flex: 1, padding: '30px', fontFamily: 'sans-serif' },
    label: { fontSize: '13px', color: '#555', fontWeight: '600', display: 'block', marginBottom: '4px' },
    labelSmall: { fontSize: '12px', color: '#777', fontWeight: '600', display: 'block', marginBottom: '4px' },
    input: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white' },
    selectField: { padding: '10px 14px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', width: '100%', boxSizing: 'border-box' },
    botonNuevo: { backgroundColor: '#2e7d52', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
    tallaPill: { backgroundColor: '#e8f5ee', color: '#2e7d52', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
    itemCard: { backgroundColor: '#f8fffe', border: '1px solid #e0ede6', borderRadius: '10px', padding: '14px', marginBottom: '12px' },
    itemHeader: { display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '12px' },
    botonQuitar: { backgroundColor: '#fdecea', color: '#e53935', border: 'none', width: '38px', height: '38px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0, fontWeight: 'bold' },
    tallasGrid: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px', marginTop: '8px' },
    tallaCard: { border: '2px solid #e0ede6', borderRadius: '10px', padding: '8px 12px', minWidth: '75px', textAlign: 'center', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' },
    tallaNombre: { fontSize: '15px', fontWeight: 'bold', color: '#2d2d2d' },
    tallaInput: { width: '55px', padding: '3px 4px', border: '1.5px solid #2e7d52', borderRadius: '6px', fontSize: '13px', textAlign: 'center', outline: 'none', marginTop: '4px' },
    itemResumen: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0faf4', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', color: '#555', marginTop: '6px' },
    botonAgregar: { backgroundColor: 'transparent', color: '#2e7d52', border: '1.5px dashed #2e7d52', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', width: '100%', marginTop: '8px' },
    botonEnviar: { marginTop: '20px', width: '100%', padding: '14px', backgroundColor: '#2e7d52', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(46, 125, 82, 0.2)' },
    totalBoxExtended: { backgroundColor: '#e8f5ee', padding: '18px 22px', borderRadius: '10px', marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #cbdcd0' },
    totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    metodosRow: { display: 'flex', gap: '8px', marginTop: '8px' },
    metodoBtn: { flex: 1, padding: '9px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
};

export default CambiosPage;