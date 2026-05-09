import api from './axios';

export const getCompras = async () => {
    const response = await api.get('/compras/compras/');
    return response.data;
};

/**
 * Crea una compra completa.
 * El backend (CompraViewSet.create) recibe:
 * {
 *   id_proveedor: int,
 *   id_usuario:   int,
 *   detalles: [
 *     { id_producto: int, talla: str, cantidad: int, precio_unitario: decimal }
 *   ]
 * }
 * Y se encarga de:
 *   - Calcular el total
 *   - Actualizar costo_promedio ponderado de cada producto
 *   - Sumar stock general y stock por talla
 *   - Registrar cada movimiento en el Kardex
 */
export const crearCompra = async (data) => {
    const response = await api.post('/compras/compras/', data);
    return response.data;
};

export const getDetallesCompra = async (id_compra) => {
    const response = await api.get(`/compras/compras/${id_compra}/detalles/`);
    return response.data;
};
