import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    // 1. Obtenemos el string del localStorage
    const usuarioString = localStorage.getItem('usuario');
    
    // 2. Si ni siquiera está logueado, directo al login
    if (!usuarioString) {
        return <Navigate to="/login" replace />;
    }

    // 3. Convertimos el string a un objeto para leer sus propiedades
    const usuario = JSON.parse(usuarioString);

    // 4. Si la ruta requiere roles específicos y el id_rol del usuario no está incluido
    if (allowedRoles && !allowedRoles.includes(usuario?.id_rol)) {
        // Lo redirigimos al dashboard para evitar que se quede atrapado en una pantalla en blanco
        return <Navigate to="/dashboard" replace />;
    }

    // 5. Si está autenticado y tiene el rol correcto, se le permite ver la página
    return children;
};

export default ProtectedRoute;