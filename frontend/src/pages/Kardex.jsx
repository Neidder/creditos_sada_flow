import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getProductosConKardex, getKardexProducto } from '../api/productos';

const TIPO_CONFIG = {
    entrada: { label: 'Entrada', bg: '#e8f5ee', color: '#085041', signo: '+' },
    salida:  { label: 'Salida',  bg: '#fdecea', color: '#791F1F', signo: '−' },
    SALIDA:  { label: 'Salida',  bg: '#fdecea', color: '#791F1F', signo: '−' },
    ENTRADA: { label: 'Entrada', bg: '#e8f5ee', color: '#085041', signo: '+' },
};

const fmt = (fecha) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const Kardex = () => {
    const navigate = useNavigate();
    const [productos,        setProductos]        = useState([]);
    const [productoActivo,   setProductoActivo]   = useState(null);
    const [movimientos,      setMovimientos]      = useState([]);
    const [filtroTipo,       setFiltroTipo]       = useState('todos');
    const [cargandoLista,    setCargandoLista]    = useState(true);
    const [cargandoMovs,     setCargandoMovs]     = useState(false);
    const [busqueda,         setBusqueda]         = useState('');
    const [error,            setError]            = useState('');

    useEffect(() => {
        getProductosConKardex()
            .then(data => {
                setProductos(data);
                if (data.length > 0) seleccionarProducto(data[0]);
            })
            .catch(() => setError('No se pudieron cargar los productos'))
            .finally(() => setCargandoLista(false));
    }, []);

    const seleccionarProducto = async (prod) => {
        setProductoActivo(prod);
        setMovimientos([]);
        setCargandoMovs(true);
        setFiltroTipo('todos');
        try {
            const data = await getKardexProducto(prod.id_producto);
            setMovimientos(data);
        } catch {
            setMovimientos([]);
        } finally {
            setCargandoMovs(false);
        }
    };

    const productosFiltrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    const movsFiltrados = movimientos.filter(m =>
        filtroTipo === 'todos' ||
        m.tipo_movimiento?.toLowerCase() === filtroTipo
    );

    const totalEntradas = movimientos
        .filter(m => m.tipo_movimiento?.toLowerCase() === 'entrada')
        .reduce((s, m) => s + (m.cantidad || 0), 0);

    const totalSalidas = movimientos
        .filter(m => m.tipo_movimiento?.toLowerCase() === 'salida')
        .reduce((s, m) => s + (m.cantidad || 0), 0);

    return (
        <div style={s.layout}>
            <Sidebar />
            <div style={s.contenido}>

                <div style={s.header}>
                    <div>
                        <h1 style={s.titulo}>📊 Kardex de inventario</h1>
                        <p style={s.subtitulo}>Historial de movimientos por producto</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                            value={filtroTipo}
                            onChange={e => setFiltroTipo(e.target.value)}
                            style={s.select}
                        >
                            <option value="todos">Todos los tipos</option>
                            <option value="entrada">Solo entradas</option>
                            <option value="salida">Solo salidas</option>
                        </select>
                    </div>
                </div>

                {error && <p style={s.error}>{error}</p>}

                <div style={s.grid}>

                    {/* Lista de productos */}
                    <div style={s.listaContainer}>
                        <div style={s.buscadorWrap}>
                            <span>🔍</span>
                            <input
                                placeholder="Buscar producto..."
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                style={s.buscador}
                            />
                        </div>
                        {cargandoLista ? (
                            <p style={s.muted}>Cargando...</p>
                        ) : (
                            productosFiltrados.map(p => {
                                const activo = productoActivo?.id_producto === p.id_producto;
                                return (
                                    <div
                                        key={p.id_producto}
                                        onClick={() => seleccionarProducto(p)}
                                        style={{
                                            ...s.prodItem,
                                            ...(activo ? s.prodItemActivo : {}),
                                        }}
                                    >
                                        <div>
                                            <p style={{ margin: 0, fontSize: '13px', fontWeight: activo ? '600' : '400', color: activo ? '#2e7d52' : '#2d2d2d' }}>
                                                {p.nombre}
                                            </p>
                                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#888' }}>
                                                Stock: {p.stock} uds
                                            </p>
                                        </div>
                                        {p.total_movimientos > 0 && (
                                            <span style={s.badgeMov}>
                                                {p.total_movimientos}
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Panel de movimientos */}
                    <div style={s.panelMovs}>
                        {!productoActivo ? (
                            <div style={s.sinSeleccion}>
                                <p style={{ fontSize: '32px', margin: 0 }}>📦</p>
                                <p style={{ color: '#999', marginTop: '8px' }}>Selecciona un producto</p>
                            </div>
                        ) : (
                            <>
                                {/* Header del panel */}
                                <div style={s.panelHeader}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#2d2d2d' }}>
                                            {productoActivo.nombre}
                                        </p>
                                        <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#888' }}>
                                            {movimientos.length} movimientos · Stock actual: {productoActivo.stock} uds
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <span style={{ ...s.pillBase, backgroundColor: '#e8f5ee', color: '#085041' }}>
                                            +{totalEntradas} entradas
                                        </span>
                                        <span style={{ ...s.pillBase, backgroundColor: '#fdecea', color: '#791F1F' }}>
                                            −{totalSalidas} salidas
                                        </span>
                                    </div>
                                </div>

                                {/* Tabla */}
                                {cargandoMovs ? (
                                    <div style={s.sinSeleccion}>
                                        <p style={{ color: '#999' }}>Cargando movimientos...</p>
                                    </div>
                                ) : movsFiltrados.length === 0 ? (
                                    <div style={s.sinSeleccion}>
                                        <p style={{ color: '#999' }}>Sin movimientos registrados</p>
                                    </div>
                                ) : (
                                    <>
                                        <div style={s.tablaHeader}>
                                            <span style={{ flex: 2 }}>Fecha</span>
                                            <span style={{ width: '80px', textAlign: 'center' }}>Tipo</span>
                                            <span style={{ width: '80px', textAlign: 'center' }}>Cantidad</span>
                                            <span style={{ width: '80px', textAlign: 'center' }}>Ant.</span>
                                            <span style={{ width: '80px', textAlign: 'right' }}>Nuevo</span>
                                        </div>
                                        {movsFiltrados.map((m) => {
                                            const cfg = TIPO_CONFIG[m.tipo_movimiento] || TIPO_CONFIG['entrada'];
                                            return (
                                                <div key={m.id_kardex} style={s.tablaFila}>
                                                    <div style={{ flex: 2 }}>
                                                        <p style={{ margin: 0, fontSize: '13px', color: '#2d2d2d' }}>
                                                            {fmt(m.fecha_movimiento)}
                                                        </p>
                                                        {m.referencia && (
                                                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#aaa' }}>
                                                                {m.referencia}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div style={{ width: '80px', textAlign: 'center' }}>
                                                        <span style={{
                                                            ...s.pillBase,
                                                            backgroundColor: cfg.bg,
                                                            color: cfg.color,
                                                            fontSize: '11px',
                                                        }}>
                                                            {cfg.label}
                                                        </span>
                                                    </div>
                                                    <p style={{ width: '80px', textAlign: 'center', margin: 0, fontSize: '13px', fontWeight: '600', color: cfg.color }}>
                                                        {cfg.signo}{m.cantidad}
                                                    </p>
                                                    <p style={{ width: '80px', textAlign: 'center', margin: 0, fontSize: '13px', color: '#999' }}>
                                                        {m.stock_anterior}
                                                    </p>
                                                    <p style={{ width: '80px', textAlign: 'right', margin: 0, fontSize: '13px', fontWeight: '600', color: '#2d2d2d' }}>
                                                        {m.stock_nuevo}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const s = {
    layout:         { display: 'flex', minHeight: '100vh', backgroundColor: '#f0f4f0' },
    contenido:      { marginLeft: '250px', flex: 1, padding: '30px' },
    header:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e0ede6' },
    titulo:         { fontSize: '26px', color: '#2e7d52', fontWeight: 'bold', margin: 0 },
    subtitulo:      { color: '#666', marginTop: '4px', fontSize: '14px' },
    select:         { padding: '8px 12px', border: '1.5px solid #e0ede6', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white' },
    error:          { color: '#e53935', backgroundColor: '#fdecea', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px' },
    grid:           { display: 'grid', gridTemplateColumns: '240px 1fr', gap: '16px', height: 'calc(100vh - 160px)' },
    listaContainer: { backgroundColor: 'white', borderRadius: '12px', padding: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflowY: 'auto' },
    buscadorWrap:   { display: 'flex', alignItems: 'center', gap: '8px', border: '1.5px solid #e0ede6', borderRadius: '8px', padding: '0 10px', marginBottom: '10px' },
    buscador:       { border: 'none', outline: 'none', padding: '8px 0', fontSize: '13px', width: '100%', backgroundColor: 'transparent' },
    prodItem:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px', border: '0.5px solid transparent' },
    prodItemActivo: { backgroundColor: '#f0faf4', border: '0.5px solid #2e7d52' },
    badgeMov:       { backgroundColor: '#e8f5ee', color: '#2e7d52', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: '600', flexShrink: 0 },
    panelMovs:      { backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
    panelHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f4f0', flexShrink: 0 },
    tablaHeader:    { display: 'flex', alignItems: 'center', padding: '8px 20px', borderBottom: '1px solid #f0f4f0', fontSize: '12px', color: '#aaa', flexShrink: 0 },
    tablaFila:      { display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '0.5px solid #f0f4f0' },
    pillBase:       { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },
    sinSeleccion:   { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#999' },
    muted:          { color: '#999', fontSize: '13px', padding: '10px 12px' },
};

export default Kardex;