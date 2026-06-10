import api from './axios';

export const getProductos = async () => {
    const response = await api.get('/productos/productos/');
    return response.data;
};

/**
 * Crea un producto.
 * Payload: { nombre, descripcion, precio_venta, costo_promedio, stock, tallas? }
 * El backend registra el stock inicial en el Kardex automáticamente.
 */
export const crearProducto = async (data) => {
    const response = await api.post('/productos/productos/', data);
    return response.data;
};

/**
 * Actualización parcial (PATCH).
 * Solo se envían los campos que cambian.
 * El backend tiene partial=True en update(), así que acepta cualquier subconjunto.
 */
export const actualizarProducto = async (id_producto, data) => {
    const response = await api.patch(`/productos/productos/${id_producto}/`, data);
    return response.data;
};

/**
 * Desactiva el producto (soft delete).
 * El backend pone activo=False en lugar de borrarlo.
 */
export const eliminarProducto = async (id_producto) => {
    const response = await api.delete(`/productos/productos/${id_producto}/`);
    return response.data;
};

export const getAlertasStock = async () => {
    const response = await api.get('/productos/productos/alertas_stock/');
    return response.data;
};

export const getKardexProducto = async (id_producto) => {
    const response = await api.get(`/productos/kardex/producto/${id_producto}/`);
    return response.data;
};

export const getProductosConKardex = async () => {
    const [productos, kardex] = await Promise.all([
        getProductos(),
        api.get('/productos/kardex/').then(r => r.data),
    ]);
    // Cuenta movimientos por producto
    const conteo = {};
    kardex.forEach(k => {
        const id = k.id_producto;
        conteo[id] = (conteo[id] || 0) + 1;
    });
    return productos.map(p => ({
        ...p,
        total_movimientos: conteo[p.id_producto] || 0,
    }));
};