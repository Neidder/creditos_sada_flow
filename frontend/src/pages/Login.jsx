import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/usuarios';

const Login = () => {
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setCargando(true);
        setError('');
        try {
            const data = await login(correo, contrasena);
            localStorage.setItem('usuario', JSON.stringify(data));
            navigate('/dashboard');
        } catch {
            setError('Correo o contraseña incorrectos');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div style={styles.container}>
            {/* Formas decorativas */}
            <div style={styles.burbuja1} />
            <div style={styles.burbuja2} />

            <div style={styles.card}>
                {/* Icono */}
                <div style={styles.iconContainer}>
                    <span style={styles.icon}>🛍️</span>
                </div>

                <h1 style={styles.titulo}>WhiteBlack</h1>
                <p style={styles.subtitulo}>Bienvenido, inicia sesión</p>

                <form onSubmit={handleLogin} style={styles.form}>
                    <div style={styles.inputWrapper}>
                        <span style={styles.inputIcon}>✉️</span>
                        <input
                            type="email"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            style={styles.input}
                            placeholder="CORREO"
                            required
                        />
                    </div>

                    <div style={styles.inputWrapper}>
                        <span style={styles.inputIcon}>🔒</span>
                        <input
                            type="password"
                            value={contrasena}
                            onChange={(e) => setContrasena(e.target.value)}
                            style={styles.input}
                            placeholder="CONTRASEÑA"
                            required
                        />
                    </div>

                    {error && <p style={styles.error}>{error}</p>}

                    <button
                        type="submit"
                        style={styles.boton}
                        disabled={cargando}
                    >
                        {cargando ? 'INGRESANDO...' : 'INGRESAR'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f0f4f0',
        position: 'relative',
        overflow: 'hidden',
    },
    burbuja1: {
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        backgroundColor: 'rgba(46, 125, 82, 0.08)',
        top: '-100px',
        left: '-100px',
    },
    burbuja2: {
        position: 'absolute',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        backgroundColor: 'rgba(46, 125, 82, 0.08)',
        bottom: '-80px',
        right: '-80px',
    },
    card: {
        backgroundColor: 'white',
        padding: '45px 40px',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1,
    },
    iconContainer: {
        width: '70px',
        height: '70px',
        borderRadius: '50%',
        backgroundColor: '#e8f5ee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '15px',
    },
    icon: {
        fontSize: '35px',
    },
    titulo: {
        color: '#2e7d52',
        fontSize: '26px',
        fontWeight: 'bold',
        marginBottom: '5px',
        textTransform: 'uppercase',
        letterSpacing: '2px',
    },
    subtitulo: {
        color: '#999',
        fontSize: '13px',
        marginBottom: '30px',
    },
    form: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
    },
    inputWrapper: {
        display: 'flex',
        alignItems: 'center',
        border: '1.5px solid #e0ede6',
        borderRadius: '10px',
        padding: '0 15px',
        backgroundColor: '#fafffe',
    },
    inputIcon: {
        fontSize: '16px',
        marginRight: '10px',
    },
    input: {
        border: 'none',
        outline: 'none',
        padding: '14px 0',
        width: '100%',
        fontSize: '13px',
        backgroundColor: 'transparent',
        color: '#333',
        letterSpacing: '1px',
    },
    error: {
        color: '#e53935',
        fontSize: '13px',
        textAlign: 'center',
    },
    boton: {
        backgroundColor: '#2e7d52',
        color: 'white',
        border: 'none',
        padding: '14px',
        borderRadius: '10px',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        letterSpacing: '2px',
        marginTop: '5px',
        width: '100%',
    },
};

export default Login;