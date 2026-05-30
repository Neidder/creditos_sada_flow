import api from "./axios";

// Busca los datos de la venta o crédito original ingresando el ID y el tipo
export const buscarOrigenCambio = async (tipo, id) => {
    const res = await api.get(`/cambios/buscar-origen/?tipo=${tipo}&id=${id}`);
    return res.data;
};

// Envía la cabecera y los detalles del canje al backend
export const registrarCambioUnificado = async (datos) => {
    const res = await api.post('/cambios/realizar-cambio/', datos);
    return res.data;
};

// Historial por si quieres listar los cambios realizados
export const getHistorialCambios = async () => {
    const res = await api.get('/cambios/historial/');
    return res.data;
};