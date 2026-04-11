import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Html5QrcodeScanner } from 'html5-qrcode';
import AuthContext from '../context/AuthContext';

const StudentDashboard = () => {
    const { user } = useContext(AuthContext);
    const [fullHistory, setFullHistory] = useState([]);
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchFullHistory();
    }, []);

    const fetchFullHistory = async () => {
        try {
            const res = await api.get('attendance/full-history/');
            setFullHistory(res.data);
        } catch (err) {
            console.error("Failed to fetch attendance history", err);
        }
    };

    useEffect(() => {
        if (scanning) {
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
            );

            scanner.render(onScanSuccess, onScanFailure);

            function onScanSuccess(decodedText) {
                scanner.clear();
                setScanning(false);
                markAttendance(decodedText);
            }

            function onScanFailure(error) {
                // console.warn(`Code scan error = ${error}`);
            }

            return () => {
                scanner.clear().catch(error => {
                    console.error("Failed to clear html5-qrcode scanner. ", error);
                });
            };
        }
    }, [scanning]);

    const markAttendance = async (qrToken) => {
        if (!navigator.geolocation) {
             setError("Geolocation is not supported by your browser. Cannot mark attendance.");
             setTimeout(() => setError(''), 5000);
             return;
        }

        setError("Fetching location... please wait");
        
        navigator.geolocation.getCurrentPosition(async (position) => {
            setError('');
            try {
                await api.post('attendance/mark/', { 
                    qr_token: qrToken,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                setScanResult('Attendance Marked Successfully!');
                fetchFullHistory();
                setTimeout(() => setScanResult(''), 3000);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to mark attendance');
                setTimeout(() => setError(''), 5000);
            }
        }, (err) => {
            setError("Location access denied. Please enable location to mark attendance.");
            setTimeout(() => setError(''), 5000);
        });
    };

    const presentCount = fullHistory.filter(r => r.status === 'Present').length;
    const absentCount = fullHistory.filter(r => r.status === 'Absent').length;
    const totalSessions = fullHistory.length;
    const attendancePercent = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <Navbar />
            <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Student Dashboard</h2>
                    <div className="bg-blue-900 bg-opacity-30 border border-blue-800 text-blue-300 px-4 py-2 rounded-lg text-sm">
                        Logged in as: <strong>{user?.username}</strong>
                    </div>
                </div>

                {/* Scanner Section */}
                <div className="bg-gray-800 border border-gray-700 p-6 rounded shadow-lg mb-8 text-center">
                    {scanResult && <div className="bg-green-900 bg-opacity-40 text-green-400 p-4 rounded mb-4 border border-green-800">{scanResult}</div>}
                    {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

                    {!scanning ? (
                        <button
                            onClick={() => setScanning(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transform active:scale-95 transition-all duration-150 shadow-md"
                        >
                            Scan QR Code
                        </button>
                    ) : (
                        <div>
                            <div id="reader" className="w-full max-w-sm mx-auto"></div>
                            <button
                                onClick={() => setScanning(false)}
                                className="mt-4 text-red-600 underline"
                            >
                                Cancel Scan
                            </button>
                        </div>
                    )}
                </div>

                {/* Attendance Summary */}
                {totalSessions > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-gray-800 border border-gray-700 p-4 rounded shadow-lg text-center">
                            <p className="text-3xl font-bold text-green-500">{presentCount}</p>
                            <p className="text-sm text-gray-400">Present</p>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 p-4 rounded shadow-lg text-center">
                            <p className="text-3xl font-bold text-red-500">{absentCount}</p>
                            <p className="text-sm text-gray-400">Absent</p>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 p-4 rounded shadow-lg text-center">
                            <p className={`text-3xl font-bold ${attendancePercent >= 75 ? 'text-green-500' : 'text-red-500'}`}>{attendancePercent}%</p>
                            <p className="text-sm text-gray-400">Attendance</p>
                        </div>
                    </div>
                )}

                {/* Full History */}
                <div className="bg-gray-800 border border-gray-700 rounded shadow-lg overflow-hidden">
                    <h3 className="text-xl font-bold p-6 border-b border-gray-700">Attendance History</h3>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-700">
                                <th className="p-4">Date</th>
                                <th className="p-4">Subject</th>
                                <th className="p-4">Department</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fullHistory.map((record, idx) => (
                                <tr key={idx} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                                    <td className="p-4">{record.date} {record.time}</td>
                                    <td className="p-4 font-semibold">{record.subject}</td>
                                    <td className="p-4 text-gray-400">{record.department}</td>
                                    <td className="p-4">
                                        {record.status === 'Present' ? (
                                            <span className="bg-green-900 bg-opacity-40 text-green-400 border border-green-800 px-2 py-1 rounded text-sm">✅ Present</span>
                                        ) : (
                                            <span className="bg-red-900 bg-opacity-40 text-red-400 border border-red-800 px-2 py-1 rounded text-sm">❌ Absent</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {fullHistory.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-4 text-center text-gray-400">No attendance records found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
