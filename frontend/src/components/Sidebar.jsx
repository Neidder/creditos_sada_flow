import { Link, useNavigate, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    const handleLogout = () => {
        localStorage.removeItem('usuario');
        navigate('/login');
    };

    // 1. Definimos todos los ítems posibles del menú
    const menuItems = [
        { path: '/dashboard', icon: '🏠', label: 'Dashboard', rolesPermitidos: [1, 2] },
        { path: '/productos', icon: '📦', label: 'Productos', rolesPermitidos: [1, 2] },
        { path: '/clientes', icon: '👥', label: 'Clientes', rolesPermitidos: [1, 2] },
        { path: '/proveedores', icon: '🏭', label: 'Proveedores', rolesPermitidos: [1] }, // Solo Admin
        { path: '/compras', icon: '🛒', label: 'Compras', rolesPermitidos: [1] },         // Solo Admin
        { path: '/ventas', icon: '💵', label: 'Ventas', rolesPermitidos: [1, 2] },
        { path: '/creditos', icon: '📋', label: 'Créditos', rolesPermitidos: [1, 2] },
        { path: '/pagos', icon: '💰', label: 'Pagos', rolesPermitidos: [1, 2] },
        { path: '/cambios', icon: '🔄', label: 'Cambios', rolesPermitidos: [1, 2] },
        { path: '/usuarios', icon: '⚙️', label: 'Usuarios', rolesPermitidos: [1] },
        
    ];

    // 2. Filtramos los ítems según el rol del usuario conectado
    const menuFiltrado = menuItems.filter(item => 
        item.rolesPermitidos.includes(usuario?.id_rol)
    );

    return (
        <div style={styles.sidebar}>
            <div style={styles.logo}>
                <span style={styles.logoIcon}>🛍️</span>
                <span style={styles.logoText}>SADA-FLOW</span>
            </div>
            <div style={styles.usuarioCard}>
                <div style={styles.avatar}>
                    {usuario?.nombre?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p style={styles.usuarioNombre}>{usuario?.nombre}</p>
                    <p style={styles.usuarioRol}>
                        {usuario?.id_rol === 1 ? 'Administrador' : 'Vendedor'}
                    </p>
                </div>
            </div>
            <nav style={styles.nav}>
                {/* 3. Renderizamos el menú ya filtrado */}
                {menuFiltrado.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        style={{
                            ...styles.menuItem,
                            ...(location.pathname === item.path ? styles.menuItemActivo : {})
                        }}
                    >
                        <span style={styles.menuIcon}>{item.icon}</span>
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>
            <button onClick={handleLogout} style={styles.logout}>
                🚪 Cerrar Sesión
            </button>
        </div>
    );
};

const styles = {
    sidebar: { width: '250px', height: '100vh', backgroundColor: '#ffffff', borderRight: '1px solid #e0ede6', display: 'flex', flexDirection: 'column', padding: '20px 0', position: 'fixed', top: 0, left: 0, boxShadow: '2px 0 15px rgba(0,0,0,0.05)' },
    logo: { display: 'flex', alignItems: 'center', gap: '10px', padding: '0 20px 25px 20px', borderBottom: '1px solid #e0ede6', flexShrink: 0 },
    logoIcon: { fontSize: '28px' },
    logoText: { fontSize: '20px', fontWeight: 'bold', color: '#2e7d52' },
    usuarioCard: { display: 'flex', alignItems: 'center', gap: '12px', padding: '20px', borderBottom: '1px solid #e0ede6', marginBottom: '10px', flexShrink: 0 },
    avatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#2e7d52', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' },
    usuarioNombre: { fontSize: '14px', fontWeight: 'bold', color: '#2d2d2d', textTransform: 'capitalize', margin: 0 },
    usuarioRol: { fontSize: '12px', color: '#666', margin: 0 },
    nav: { display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', padding: '0 10px' },
    menuItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', borderRadius: '8px', textDecoration: 'none', color: '#555', fontSize: '14px', marginBottom: '5px' },
    menuItemActivo: { backgroundColor: '#e8f5ee', color: '#2e7d52', fontWeight: 'bold' },
    menuIcon: { fontSize: '18px' },
    logout: { flexShrink: 0, margin: '10px 15px', padding: '12px', backgroundColor: '#e53935', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
};

export default Sidebar;