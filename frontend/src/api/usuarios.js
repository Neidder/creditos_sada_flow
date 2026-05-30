import api from './axios';

export const login = async (correo, contrasena) => {
    const response = await api.post('/usuarios/login/', { correo, contrasena });
    const data = response.data;

    // Guarda tokens separados del objeto usuario
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);

    // Guarda info del usuario sin los tokens
    const usuario = {
        id_usuario: data.id_usuario,
        nombre: data.nombre,
        apellido: data.apellido,
        correo: data.correo,
        id_rol: data.id_rol,
    };
    localStorage.setItem('usuario', JSON.stringify(usuario));

    return usuario;
};

// El resto de funciones no cambia
export const getUsuarios = async () => {
    const response = await api.get('/usuarios/usuarios/');
    return response.data;
};

export const crearUsuario = async (data) => {
    const response = await api.post('/usuarios/usuarios/', data);
    return response.data;
};

export const actualizarUsuario = async (id, data) => {
    const response = await api.put(`/usuarios/usuarios/${id}/`, data);
    return response.data;
};

export const desactivarUsuario = async (id) => {
    const response = await api.delete(`/usuarios/usuarios/${id}/`);
    return response.data;
};

export const getRoles = async () => {
    const response = await api.get('/usuarios/roles/');
    return response.data;
};