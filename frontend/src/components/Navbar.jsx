import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    const handleLogout = () => {
        localStorage.removeItem('usuario');
        navigate('/login');
    };

    return (
        <nav style={styles.nav}>
            <div style={styles.logo}>whiteblack</div>
            <div style={styles.links}>
                <Link to="/dashboard" style={styles.link}>Dashboard</Link>
                <Link to="/productos" style={styles.link}>Productos</Link>
                <Link to="/clientes" style={styles.link}>Clientes</Link>
                <Link to="/proveedores" style={styles.link}>Proveedores</Link>
                <Link to="/compras" style={styles.link}>Compras</Link>
                <Link to="/planes-separe" style={styles.link}>Planes Separe</Link>
                <Link to="/pagos" style={styles.link}>Pagos</Link>
            </div>
            <div style={styles.user}>
                <span style={styles.userName}>👤 {usuario?.nombre}</span>
                <button onClick={handleLogout} style={styles.logout}>Cerrar sesión</button>
            </div>
        </nav>
    );
};

const styles = {
    nav: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
        padding: '10px 20px',
        color: 'white',
    },
    logo: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#e94560',
    },
    links: {
        display: 'flex',
        gap: '15px',
    },
    link: {
        color: 'white',
        textDecoration: 'none',
        fontSize: '14px',
    },
    user: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    userName: {
        fontSize: '14px',
    },
    logout: {
        backgroundColor: '#e94560',
        color: 'white',
        border: 'none',
        padding: '5px 10px',
        borderRadius: '5px',
        cursor: 'pointer',
    }
};

export default Navbar;