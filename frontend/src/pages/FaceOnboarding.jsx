import React, { useRef, useState, useEffect, useContext } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import AuthContext from '../context/AuthContext';

const FaceOnboarding = () => {
    const webcamRef = useRef(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { logout } = useContext(AuthContext);

    const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

    useEffect(() => {
        const loadModels = async () => {
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
            } catch (err) {
                console.error("Failed to load models", err);
                setError("Failed to load AI face models. Please check your internet connection.");
            }
        };
        loadModels();
    }, []);

    const captureAndRegister = async () => {
        if (!webcamRef.current) return;
        setIsCapturing(true);
        setError(null);

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
            setError("Failed to grab camera frame. Please try again.");
            setIsCapturing(false);
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
                setError("No face detected! Please ensure you are in a well-lit area and looking directly at the camera.");
                setIsCapturing(false);
                return;
            }

            const faceDescriptor = Array.from(detection.descriptor);

            const response = await api.post('auth/face-register/', { face_descriptor: faceDescriptor });
            if (response.data.status === 'success') {
                localStorage.setItem('trusted_device_id', response.data.device_id);
                // We logout so the user logs in again to get the updated JWT token payload.
                logout();
                alert("Facial Registration successful! Please log in again to enter your dashboard.");
                navigate('/');
            }
        } catch (err) {
            console.error(err);
            setError("Failed to register face. Please contact administration.");
        }
        setIsCapturing(false);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100 p-4">
            <div className="bg-gray-800 p-8 rounded shadow-2xl max-w-lg w-full border border-gray-700 text-center">
                <h2 className="text-3xl font-bold mb-2">Initialize Your Account</h2>
                <p className="text-gray-400 mb-6">
                    You must register a baseline facial scan to verify attendance on this device. 
                    This will securely pin your identity to this proxy defense system.
                </p>



                <div className="relative w-full overflow-hidden rounded bg-black flex justify-center items-center mb-6" style={{ height: '300px' }}>
                    {!modelsLoaded ? (
                        <div className="text-blue-400 animate-pulse">Loading AI Biometric Models...</div>
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

                <div className="flex gap-4 w-full">
                    <button
                        onClick={captureAndRegister}
                        disabled={!modelsLoaded || isCapturing}
                        className={`flex-1 ${!modelsLoaded || isCapturing ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'} text-white py-3 rounded transform active:scale-95 transition-all duration-150 font-bold`}
                    >
                        {isCapturing ? 'Scanning...' : 'Register My Face'}
                    </button>
                    <button
                        onClick={() => { logout(); navigate('/'); }}
                        className="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded transform active:scale-95 transition-all duration-150"
                    >
                        Cancel
                    </button>
                </div>

                {/* Face Registration Error Overlay */}
                {error && (
                    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-[100]">
                        <div className="bg-gray-800 border-2 border-red-600 p-8 rounded-lg shadow-2xl max-w-sm w-full text-center">
                            <div className="text-red-500 text-6xl mb-4">⚠️</div>
                            <h3 className="text-2xl font-bold text-white mb-2">Registration Issue</h3>
                            <p className="text-gray-300 mb-6">{error}</p>
                            <button 
                                onClick={() => setError(null)}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors transform active:scale-95 shadow-lg"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaceOnboarding;
