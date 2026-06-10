import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/usuarios';

const Login = () => {
    const [correo, setCorreo]         = useState('');
    const [contrasena, setContrasena] = useState('');
    const [verPass, setVerPass]       = useState(false);
    const [error, setError]           = useState('');
    const [cargando, setCargando]     = useState(false);
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
        <>
            <style>{`
                @keyframes lb-rise {
                    from { opacity:0; transform:translateY(28px) scale(.97); }
                    to   { opacity:1; transform:translateY(0) scale(1); }
                }
                @keyframes lb-fade-up {
                    from { opacity:0; transform:translateY(12px); }
                    to   { opacity:1; transform:translateY(0); }
                }
                @keyframes lb-badge-pop {
                    from { opacity:0; transform:scale(.5); }
                    to   { opacity:1; transform:scale(1); }
                }
                @keyframes lb-spin { to { transform:rotate(360deg); } }
                @keyframes lb-shake {
                    0%,100%{transform:translateX(0)}  20%{transform:translateX(-5px)}
                    40%{transform:translateX(5px)}    60%{transform:translateX(-3px)}
                    80%{transform:translateX(3px)}
                }
                @keyframes lb-bounce {
                    0%,80%,100%{transform:scale(.5);opacity:.4} 40%{transform:scale(1);opacity:1}
                }
                @keyframes lb-shimmer {
                    from{transform:translateX(-100%) skewX(-15deg)}
                    to{transform:translateX(120%) skewX(-15deg)}
                }
                /* Burbujas: cada una con trayectoria propia */
                @keyframes orb1 {
                    0%   { transform: translate(0,0) scale(1); }
                    25%  { transform: translate(30px,-40px) scale(1.05); }
                    50%  { transform: translate(-20px,-60px) scale(.95); }
                    75%  { transform: translate(40px,-20px) scale(1.03); }
                    100% { transform: translate(0,0) scale(1); }
                }
                @keyframes orb2 {
                    0%   { transform: translate(0,0) scale(1); }
                    30%  { transform: translate(-35px,30px) scale(1.06); }
                    60%  { transform: translate(20px,50px) scale(.94); }
                    100% { transform: translate(0,0) scale(1); }
                }
                @keyframes orb3 {
                    0%   { transform: translate(0,0) scale(1); }
                    40%  { transform: translate(25px,-35px) scale(1.08); }
                    70%  { transform: translate(-15px,20px) scale(.92); }
                    100% { transform: translate(0,0) scale(1); }
                }
                @keyframes orb4 {
                    0%   { transform: translate(0,0) scale(1); }
                    35%  { transform: translate(-20px,-25px) scale(1.1); }
                    65%  { transform: translate(30px,15px) scale(.93); }
                    100% { transform: translate(0,0) scale(1); }
                }
                @keyframes orb5 {
                    0%   { transform: translate(0,0) scale(1); opacity:.4; }
                    50%  { transform: translate(-30px,-20px) scale(1.12); opacity:.7; }
                    100% { transform: translate(0,0) scale(1); opacity:.4; }
                }
                .lb-badge::after {
                    content:''; position:absolute; inset:-5px; border-radius:50%;
                    border:2px dashed rgba(46,125,82,.2); animation:lb-spin 14s linear infinite;
                }
                .lb-iw:focus-within { border-color:#2e7d52 !important; box-shadow:0 0 0 3px rgba(46,125,82,.10) !important; }
                .lb-iw:focus-within .lb-ico { color:#2e7d52 !important; }
                .lb-inp::placeholder { color:#bbb; letter-spacing:1px; text-transform:uppercase; font-size:12px; }
                .lb-btn::after { content:''; position:absolute; inset:0; background:rgba(255,255,255,.13); transform:translateX(-100%) skewX(-15deg); }
                .lb-btn:not(:disabled):hover { background:#256642 !important; transform:translateY(-1px) !important; box-shadow:0 6px 22px rgba(46,125,82,.30) !important; }
                .lb-btn:not(:disabled):hover::after { animation:lb-shimmer .4s ease forwards; }
                .lb-btn:not(:disabled):active { transform:scale(.98) !important; }
                .lb-eye:hover { color:#2e7d52 !important; }
            `}</style>

            <div style={s.container}>
                {/* 5 burbujas con animación independiente */}
                <div style={s.o1} />
                <div style={s.o2} />
                <div style={s.o3} />
                <div style={s.o4} />
                <div style={s.o5} />

                <div style={s.card}>
                    <div className="lb-badge" style={s.badge}>
                        <span style={{fontSize:'34px'}}>🛍️</span>
                    </div>

                    <h1 style={s.titulo}>WhiteBlack</h1>
                    <p style={s.subtitulo}>Bienvenido, inicia sesión</p>

                    <form onSubmit={handleLogin} style={s.form}>
                        <div className="lb-iw" style={{...s.inputWrap, animationDelay:'.45s'}}>
                            <span className="lb-ico" style={s.ico}>✉️</span>
                            <input
                                type="email"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                className="lb-inp"
                                style={s.input}
                                placeholder="Correo"
                                required
                            />
                        </div>

                        <div className="lb-iw" style={{...s.inputWrap, animationDelay:'.55s'}}>
                            <span className="lb-ico" style={s.ico}>🔒</span>
                            <input
                                type={verPass ? 'text' : 'password'}
                                value={contrasena}
                                onChange={(e) => setContrasena(e.target.value)}
                                className="lb-inp"
                                style={s.input}
                                placeholder="Contraseña"
                                required
                            />
                            <button
                                type="button"
                                className="lb-eye"
                                onClick={() => setVerPass(!verPass)}
                                style={s.eyeBtn}
                                aria-label={verPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                {verPass ? '🙈' : '👁️'}
                            </button>
                        </div>

                        {error && (
                            <div style={s.errorBox}>
                                <span style={{fontSize:'15px'}}>⚠️</span>
                                <span style={s.errorTxt}>{error}</span>
                            </div>
                        )}

                        <button type="submit" className="lb-btn" style={s.boton} disabled={cargando}>
                            {cargando ? (
                                <span style={s.loader}>
                                    <span style={{...s.dot, animationDelay:'0s'}}   />
                                    <span style={{...s.dot, animationDelay:'.18s'}} />
                                    <span style={{...s.dot, animationDelay:'.36s'}} />
                                </span>
                            ) : 'INGRESAR'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};

const orb = {
    position:'absolute', borderRadius:'50%',
    background:'rgba(46,125,82,.09)',
};

const s = {
    container: {
        display:'flex', justifyContent:'center', alignItems:'center',
        minHeight:'100vh', backgroundColor:'#f0f4f0',
        position:'relative', overflow:'hidden',
        fontFamily:"system-ui, -apple-system, sans-serif",
    },
    /* Burbuja 1 – grande arriba izquierda */
    o1: { ...orb, width:'420px', height:'420px', top:'-140px', left:'-140px',
          animation:'orb1 11s ease-in-out infinite' },
    /* Burbuja 2 – grande abajo derecha */
    o2: { ...orb, width:'320px', height:'320px', bottom:'-100px', right:'-80px',
          animation:'orb2 13s ease-in-out infinite' },
    /* Burbuja 3 – mediana izquierda centro */
    o3: { ...orb, width:'180px', height:'180px', top:'50%', left:'3%',
          animation:'orb3 9s ease-in-out infinite' },
    /* Burbuja 4 – mediana arriba derecha */
    o4: { ...orb, width:'240px', height:'240px', top:'10%', right:'5%',
          background:'rgba(46,125,82,.06)', animation:'orb4 10s ease-in-out infinite' },
    /* Burbuja 5 – pequeña abajo izquierda */
    o5: { ...orb, width:'100px', height:'100px', bottom:'15%', left:'20%',
          background:'rgba(46,125,82,.07)', animation:'orb5 7s ease-in-out infinite' },

    card: {
        background:'#fff', borderRadius:'20px', padding:'42px 38px 38px',
        width:'100%', maxWidth:'370px', position:'relative', zIndex:2,
        boxShadow:'0 10px 40px rgba(0,0,0,.08)',
        display:'flex', flexDirection:'column', alignItems:'center',
        animation:'lb-rise .65s cubic-bezier(.22,1,.36,1) both',
    },
    badge: {
        width:'70px', height:'70px', borderRadius:'50%', background:'#e8f5ee',
        display:'flex', alignItems:'center', justifyContent:'center',
        marginBottom:'14px', position:'relative',
        animation:'lb-badge-pop .5s cubic-bezier(.34,1.56,.64,1) .15s both',
    },
    titulo: {
        color:'#2e7d52', fontSize:'26px', fontWeight:700,
        margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'2px',
        animation:'lb-fade-up .4s ease .3s both',
    },
    subtitulo: {
        color:'#666', fontSize:'13px', margin:'0 0 26px',
        animation:'lb-fade-up .4s ease .4s both',
    },
    form: { width:'100%', display:'flex', flexDirection:'column', gap:'14px' },
    inputWrap: {
        display:'flex', alignItems:'center',
        border:'1.5px solid #e0ede6', borderRadius:'10px',
        padding:'0 14px', background:'#fafffe',
        transition:'border-color .25s, box-shadow .25s',
        animation:'lb-fade-up .4s ease both',
    },
    ico: { fontSize:'16px', color:'#b5d4c0', marginRight:'10px', transition:'color .2s', flexShrink:0 },
    input: {
        border:'none', outline:'none', padding:'13px 0', width:'100%',
        fontSize:'13px', fontFamily:'inherit', background:'transparent',
        color:'#222', letterSpacing:'.5px',
    },
    eyeBtn: {
        background:'none', border:'none', cursor:'pointer',
        padding:0, color:'#b5d4c0', fontSize:'16px',
        display:'flex', alignItems:'center', transition:'color .2s',
    },
    errorBox: {
        display:'flex', alignItems:'center', gap:'7px',
        background:'#fff0f0', borderRadius:'8px', padding:'9px 12px',
        animation:'lb-shake .4s ease',
    },
    errorTxt: { fontSize:'12px', color:'#e53935' },
    boton: {
        width:'100%', background:'#2e7d52', color:'#fff', border:'none',
        padding:'14px', borderRadius:'10px', fontSize:'14px',
        fontFamily:'inherit', fontWeight:700, cursor:'pointer',
        letterSpacing:'2px', textTransform:'uppercase',
        position:'relative', overflow:'hidden',
        transition:'transform .15s, box-shadow .2s, background .2s',
        animation:'lb-fade-up .4s ease .65s both',
    },
    loader: { display:'inline-flex', alignItems:'center', gap:'6px' },
    dot: {
        width:'5px', height:'5px', borderRadius:'50%', background:'#fff',
        display:'inline-block', animation:'lb-bounce 1.1s ease infinite',
    },
};

export default Login;
