import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import AuthContext from '../context/AuthContext';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

const StudentDashboard = () => {
    const { user } = useContext(AuthContext);
    const [fullHistory, setFullHistory] = useState([]);
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState('');
    const [error, setError] = useState('');
    const [faceError, setFaceError] = useState('');
    
    // Face verification states
    const [requireFace, setRequireFace] = useState(false);
    const [verifyingFace, setVerifyingFace] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [pendingQrToken, setPendingQrToken] = useState(null);
    const webcamRef = useRef(null);

    const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

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
                { 
                    fps: 15,
                    // qrbox focuses the scan region for live camera; does not restrict file upload
                    qrbox: { width: 300, height: 300 },
                    aspectRatio: 1.0,
                    experimentalFeatures: {
                        useBarCodeDetectorIfSupported: true
                    },
                    formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
                    showNotScanSameQrCode: false, // Force re-scan
                },
            /* verbose= */ false
            );

            let isProcessing = false;
            scanner.render((decodedText) => {
                if (isProcessing) return;
                isProcessing = true;
                
                console.log("Scanned QR Token:", decodedText);
                
                // Stop the scanner immediately and clear UI to prevent buffering multiple results
                scanner.clear().then(() => {
                    setScanning(false);
                    setError(''); // Clear any previous 'expired' error immediately on fresh scan
                    markAttendance(decodedText);
                }).catch(err => {
                    console.error("Scanner clear failed", err);
                    setScanning(false);
                    markAttendance(decodedText);
                });
            }, (error) => {
                // Ignore transient scanning errors to keep UI quiet
            });

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

    const markAttendance = (qrToken, faceDescriptor = null) => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                const msg = "Geolocation is not supported by your browser. Cannot mark attendance.";
                setError(msg);
                setTimeout(() => setError(''), 5000);
                return reject(new Error(msg));
            }

            setError("Fetching location... please wait");
            
            navigator.geolocation.getCurrentPosition(async (position) => {
                setError('');
                try {
                    const device_id = localStorage.getItem('trusted_device_id') || 'unknown';
                    const payload = { 
                        qr_token: qrToken,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        device_id: device_id
                    };
                    if (faceDescriptor) payload.face_descriptor = faceDescriptor;

                    await api.post('attendance/mark/', payload);
                    setScanResult('Attendance Marked Successfully!');
                    setRequireFace(false);
                    setFaceError(''); // Clear face errors on success
                    fetchFullHistory();
                    setTimeout(() => setScanResult(''), 3000);
                    resolve();
                } catch (err) {
                    const responseData = err.response?.data;
                    const errMsg = responseData?.error || 'Failed to mark attendance';
                    
                    if (responseData?.require_face) {
                        setError("Device mismatched. Live facial verification required.");
                        setPendingQrToken(qrToken);
                        setRequireFace(true);
                        loadFaceModels(); 
                    } else {
                        // If we were doing face verification, show it in the modal overlay
                        if (faceDescriptor) {
                            setFaceError(errMsg);
                        } else {
                            setError(`${errMsg} (Token: ${qrToken.substring(0, 8)}...)`);
                            setTimeout(() => setError(''), 5000);
                        }
                    }
                    // We don't necessarily want to call reject() here because we've handled the error state in UI
                    resolve(); 
                }
            }, (err) => {
                const msg = "Location access denied. Please enable location to mark attendance.";
                setError(msg);
                setTimeout(() => setError(''), 5000);
                reject(new Error(msg));
            });
        });
    };

    const loadFaceModels = async () => {
        if (modelsLoaded) return;
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            setModelsLoaded(true);
        } catch (err) {
            console.error("Failed to load models", err);
            setFaceError("Failed to load AI face models.");
        }
    };

    const handleFaceVerification = async () => {
        if (!webcamRef.current || !pendingQrToken) return;
        setVerifyingFace(true);
        setFaceError('');

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
            setFaceError("Failed to grab camera frame.");
            setVerifyingFace(false);
            return;
        }

        try {
            const img = new Image();
            img.src = imageSrc;
            await new Promise(resolve => img.onload = resolve);

            const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                setFaceError("No face detected! Look straight into the camera.");
                setVerifyingFace(false);
                return;
            }

            const faceDescriptor = Array.from(detection.descriptor);
            // Re-attempt attendance with the live face
            await markAttendance(pendingQrToken, faceDescriptor);
        } catch (err) {
            console.error(err);
            setFaceError("Error processing verification.");
        }
        setVerifyingFace(false);
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
                        Logged in as: <strong>{user?.full_name || user?.username}</strong>
                    </div>
                </div>

                {/* Scanner Section */}
                <div className="bg-gray-800 border border-gray-700 p-6 rounded shadow-lg mb-8 text-center">
                    {scanResult && <div className="bg-green-900 bg-opacity-40 text-green-400 p-4 rounded mb-4 border border-green-800">{scanResult}</div>}
                    {error && <div className="bg-red-900 bg-opacity-20 text-red-500 p-4 rounded mb-4 border border-red-800 font-semibold">{error}</div>}

                    {!scanning ? (
                        <div className="flex flex-col items-center gap-3">
                            <p className="text-gray-400 text-sm mb-2">Point your camera at the QR code shown by your faculty</p>
                            <button
                                onClick={() => setScanning(true)}
                                className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transform active:scale-95 transition-all duration-150 shadow-md flex items-center gap-3"
                            >
                                <span className="text-2xl">📷</span> Scan QR Code
                            </button>
                        </div>
                    ) : (
                        <div>
                            {/* Scanning status indicator */}
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <span className="inline-block w-3 h-3 bg-green-400 rounded-full animate-ping"></span>
                                <span className="text-green-400 font-semibold text-sm">Scanning — Hold your camera steady towards the QR Code</span>
                            </div>
                            <div id="reader" className="w-full max-w-md mx-auto rounded-lg overflow-hidden border-2 border-blue-700"></div>
                            <button
                                onClick={() => setScanning(false)}
                                className="mt-4 text-red-400 hover:text-red-300 underline text-sm"
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

                {/* Face Verification Modal */}
                {requireFace && (
                    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 p-8 rounded shadow-2xl max-w-lg w-full border border-red-700 text-center">
                            <h3 className="text-2xl font-bold text-red-500 mb-2">Unrecognized Device</h3>
                            <p className="text-gray-300 mb-6 font-semibold">
                                Live Facial Verification required to mark attendance on this device.
                            </p>
                            
                            <div className="relative w-full overflow-hidden rounded bg-black flex justify-center items-center mb-6" style={{ height: '300px' }}>
                                {!modelsLoaded ? (
                                    <div className="text-blue-400 animate-pulse">Loading Biometric Models...</div>
                                ) : (
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        className="w-full h-full object-cover"
                                        videoConstraints={{ facingMode: "user" }}
                                    />
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleFaceVerification}
                                    disabled={!modelsLoaded || verifyingFace}
                                    className={`flex-1 ${!modelsLoaded || verifyingFace ? 'bg-gray-600' : 'bg-red-600 hover:bg-red-700'} text-white py-3 rounded transform active:scale-95 font-bold`}
                                >
                                    {verifyingFace ? 'Verifying...' : 'Verify My Face'}
                                </button>
                                <button
                                    onClick={() => { setRequireFace(false); setPendingQrToken(null); }}
                                    className="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded transform active:scale-95"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Face Verification Error Overlay */}
                {faceError && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[100]">
                        <div className="bg-gray-800 border-2 border-red-600 p-6 rounded-lg shadow-2xl max-w-sm w-full text-center">
                            <div className="text-red-500 text-5xl mb-4">⚠️</div>
                            <h3 className="text-xl font-bold text-white mb-2">Face Verification Failed</h3>
                            <p className="text-gray-300 mb-6">{faceError}</p>
                            <button 
                                onClick={() => setFaceError('')}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors transform active:scale-95 shadow-lg"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;
