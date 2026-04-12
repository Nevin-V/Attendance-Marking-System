import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import logo from '../assets/scan mark logo.png';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="bg-gray-800 border-b border-gray-700 p-4 text-white flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-3">
                <img src={logo} alt="Logo" className="h-14 w-auto object-contain scale-125 ml-2" />
                <h1 className="text-2xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 font-sans">SCAN MARK</h1>
            </div>
            <div className="flex items-center gap-4">
                {user && (
                    <>
                        <Link to={user.role === 'FACULTY' ? '/faculty' : user.role === 'CLASS_REP' ? '/cr' : '/student'} className="hover:underline">Dashboard</Link>
                        {user.role === 'CLASS_REP' && (
                            <Link to="/student" className="hover:underline">Scan QR</Link>
                        )}
                        <Link to="/analytics" className="hover:underline">Analytics</Link>
                    </>
                )}
                <span className="mr-2">Welcome, {user?.full_name || user?.username} ({user?.role})</span>
                <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 transform active:scale-95 transition-all duration-150 px-3 py-1 rounded">Logout</button>
            </div>
        </nav>
    );
};

export default Navbar;
