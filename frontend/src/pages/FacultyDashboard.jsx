import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { QRCodeSVG } from 'qrcode.react';

const FacultyDashboard = () => {
    const [classes, setClasses] = useState([]);
    const [newClass, setNewClass] = useState({ subject: '', department: '', semester: '' });
    const [activeSession, setActiveSession] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [attendanceList, setAttendanceList] = useState([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historySessions, setHistorySessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [historyAttendance, setHistoryAttendance] = useState([]);
    const [historyAbsentees, setHistoryAbsentees] = useState([]);
    const [studentGroups, setStudentGroups] = useState([]);

    useEffect(() => {
        fetchStudentGroups();
    }, []);

    const fetchStudentGroups = async () => {
        try {
            const res = await api.get('groups/');
            setStudentGroups(res.data);
        } catch (error) {
            console.error("Failed to fetch student groups", error);
        }
    };


    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        let interval;
        if (activeSession) {
            fetchSessionAttendance(activeSession.id);
            interval = setInterval(() => {
                fetchSessionAttendance(activeSession.id);
            }, 5000); // Poll every 5 seconds
        }
        return () => clearInterval(interval);
    }, [activeSession]);

    const fetchSessionAttendance = async (sessionId) => {
        try {
            const res = await api.get(`attendance/session/${sessionId}/`);
            setAttendanceList(res.data);

            // If session has a group, fetch group students to find absentees
            // We need to know the group ID. It's not in the attendance response directly usually, 
            // but we have activeSession.student_group (if we update session start response or fetch it)
            // Let's assume activeSession has student_group_id if we fetch it properly.
            // Actually, we might need to fetch session details again or rely on what we have.
            // The activeSession state comes from startSession response.
        } catch (error) {
            console.error("Failed to fetch attendance list", error);
        }
    };

    // We need to fetch group members if activeSession has a group
    const [absentees, setAbsentees] = useState([]);

    useEffect(() => {
        if (activeSession && activeSession.student_group) {
            fetchGroupStudents(activeSession.student_group);
        }
    }, [activeSession, attendanceList]);

    const fetchGroupStudents = async (groupId) => {
        try {
            const res = await api.get(`groups/${groupId}/details/`);
            const allStudents = res.data;
            const presentUsernames = attendanceList.map(a => a.student_name); // student_name is username
            const absent = allStudents.filter(s => !presentUsernames.includes(s.username));
            setAbsentees(absent);
        } catch (err) {
            console.error("Failed to fetch group students", err);
        }
    };

    const fetchClasses = async () => {
        const res = await api.get('classes/');
        setClasses(res.data);
    };

    const createClass = async (e) => {
        e.preventDefault();
        await api.post('classes/', newClass);
        setNewClass({ subject: '', department: '', semester: '' });
        fetchClasses();
    };

    const updateClassGroup = async (classId, groupId) => {
        try {
            await api.patch(`classes/${classId}/`, { student_group: groupId || null });
            fetchClasses();
        } catch (err) {
            console.error("Failed to update class group", err);
        }
    };

    const startSession = async (classId) => {
        const res = await api.post('sessions/start/', { class_instance: classId });
        setActiveSession(res.data);
        setTimeLeft(300);
    };

    useEffect(() => {
        if (activeSession && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && activeSession) {
            // Auto-end session UI-wise, but backend handles actual expiry logic (or we call end endpoint)
            // Prompt says "End session manually" but "QR expires after 60s".
            // We'll just hide QR after 60s.
        }
    }, [activeSession, timeLeft]);

    const endSession = async () => {
        if (activeSession) {
            await api.patch(`sessions/${activeSession.id}/end/`);
            setActiveSession(null);
            setTimeLeft(0);
        }
    };

    const openHistory = async (classId) => {
        try {
            const res = await api.get(`sessions/class/${classId}/`);
            setHistorySessions(res.data);
            setShowHistoryModal(true);
            setSelectedSession(null);
            setHistoryAttendance([]);
        } catch (err) {
            console.error("Failed to fetch session history", err);
            alert("Failed to load session history. Please try again.");
        }
    };

    const viewSessionDetails = async (session) => {
        setSelectedSession(session);
        setHistoryAttendance([]);
        setHistoryAbsentees([]);
        try {
            const res = await api.get(`attendance/session/${session.id}/`);
            setHistoryAttendance(res.data);

            // Compute absentees if session has a student group
            if (session.student_group) {
                const groupRes = await api.get(`groups/${session.student_group}/details/`);
                const allStudents = groupRes.data;
                const presentUsernames = res.data.map(a => a.student_name);
                const absent = allStudents.filter(s => !presentUsernames.includes(s.username));
                setHistoryAbsentees(absent);
            }
        } catch (err) {
            console.error("Failed to fetch session attendance", err);
        }
    };

    const closeHistory = () => {
        setShowHistoryModal(false);
        setHistorySessions([]);
        setSelectedSession(null);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Faculty Dashboard</h2>



                {/* Create Class Form */}
                <div className="bg-white p-6 rounded shadow mb-8">
                    <h3 className="text-xl font-semibold mb-4">Create New Class</h3>
                    <form onSubmit={createClass} className="flex gap-4 flex-wrap">
                        <input
                            placeholder="Subject"
                            className="border p-2 rounded flex-1"
                            value={newClass.subject}
                            onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                            required
                        />
                        <input
                            placeholder="Department"
                            className="border p-2 rounded flex-1"
                            value={newClass.department}
                            onChange={(e) => setNewClass({ ...newClass, department: e.target.value })}
                            required
                        />
                        <input
                            type="number"
                            placeholder="Semester"
                            className="border p-2 rounded w-24"
                            value={newClass.semester}
                            onChange={(e) => setNewClass({ ...newClass, semester: e.target.value })}
                            required
                        />
                        <select
                            className="border p-2 rounded flex-1"
                            value={newClass.student_group || ''}
                            onChange={(e) => setNewClass({ ...newClass, student_group: e.target.value })}
                        >
                            <option value="">Select Student Group (Optional)</option>
                            {studentGroups.map(group => (
                                <option key={group.id} value={group.id}>{group.name} ({group.student_count})</option>
                            ))}
                        </select>
                        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Add Class</button>
                    </form>
                </div>

                {/* Active Session / QR Code */}
                {activeSession && (
                    <div className="bg-white p-6 rounded shadow mb-8 border-l-4 border-blue-500">
                        <div className="flex flex-col md:flex-row gap-8">
                            <div>
                                <h3 className="text-xl font-bold mb-4">Active Session</h3>
                                {timeLeft > 0 ? (
                                    <div>
                                        <QRCodeSVG value={activeSession.qr_token} size={256} />
                                        <p className="mt-2 text-center font-bold text-red-500">Expires in: {timeLeft}s</p>
                                    </div>
                                ) : (
                                    <div className="w-64 h-64 bg-gray-200 flex items-center justify-center rounded">
                                        <p className="text-gray-500">QR Code Expired</p>
                                    </div>
                                )}
                                <div className="mt-4">
                                    <p><strong>Class ID:</strong> {activeSession.class_instance}</p>
                                    <p><strong>Session ID:</strong> {activeSession.id}</p>
                                    <button onClick={endSession} className="bg-red-600 text-white px-4 py-2 rounded mt-2 w-full">
                                        End Session
                                    </button>
                                </div>
                            </div>

                            {/* Attendance List */}
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold">Attendance Live Feed</h3>
                                    <button
                                        onClick={() => fetchSessionAttendance(activeSession.id)}
                                        className="text-blue-600 underline"
                                    >
                                        Refresh
                                    </button>
                                </div>
                                <div className="bg-gray-100 p-4 rounded h-48 overflow-y-auto">
                                    {attendanceList.length === 0 ? (
                                        <p className="text-gray-500 text-center">No attendance marked yet.</p>
                                    ) : (
                                        <ul className="space-y-2">
                                            {attendanceList.map((record) => (
                                                <li key={record.id} className="bg-white p-2 rounded shadow flex justify-between">
                                                    <span className="font-semibold">{record.student_name}</span>
                                                    <span className="text-sm text-gray-500">{new Date(record.timestamp).toLocaleTimeString()}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="mt-2 flex justify-between font-bold">
                                    <span className="text-green-600">✅ Present: {attendanceList.length}</span>
                                    {activeSession.student_group && (
                                        <span className="text-red-600">❌ Absent: {absentees.length}</span>
                                    )}
                                </div>

                                {/* Absentee List */}
                                {activeSession.student_group && absentees.length > 0 && (
                                    <div className="mt-4 border-t pt-4">
                                        <h4 className="font-bold text-red-600 mb-2">Absentees ({absentees.length})</h4>
                                        <div className="bg-red-50 p-3 rounded max-h-40 overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-red-200">
                                                        <th className="text-left pb-1">Name</th>
                                                        <th className="text-left pb-1">Reg No.</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {absentees.map(s => (
                                                        <tr key={s.username} className="border-b border-red-100">
                                                            <td className="py-1 text-red-700">{s.name}</td>
                                                            <td className="py-1 font-mono text-red-600 text-xs">{s.register_number}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                                {activeSession.student_group && absentees.length === 0 && attendanceList.length > 0 && (
                                    <div className="mt-4 border-t pt-4">
                                        <p className="text-green-600 font-bold">🎉 All students are present!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Classes List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map((cls) => (
                        <div key={cls.id} className="bg-white p-6 rounded shadow">
                            <h4 className="text-xl font-bold">{cls.subject}</h4>
                            <p className="text-gray-600">{cls.department} - Sem {cls.semester}</p>
                            {cls.student_group_name ? (
                                <p className="text-sm text-purple-600 mt-1">📎 Group: {cls.student_group_name}</p>
                            ) : (
                                <p className="text-sm text-orange-500 mt-1">⚠️ No student group assigned</p>
                            )}
                            <select
                                className="border p-1 rounded text-sm w-full mt-2"
                                value={cls.student_group || ''}
                                onChange={(e) => updateClassGroup(cls.id, e.target.value)}
                            >
                                <option value="">No Group</option>
                                {studentGroups.map(group => (
                                    <option key={group.id} value={group.id}>{group.name} ({group.student_count})</option>
                                ))}
                            </select>
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={() => startSession(cls.id)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                >
                                    Start Session
                                </button>
                                <button
                                    onClick={() => openHistory(cls.id)}
                                    className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                                >
                                    History
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* History Modal */}
                {showHistoryModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-3/4 flex overflow-hidden">
                            {/* Session List */}
                            <div className="w-1/3 border-r overflow-y-auto p-4 bg-gray-50">
                                <h3 className="font-bold text-lg mb-4">Past Sessions</h3>
                                <ul className="space-y-2">
                                    {historySessions.map(session => (
                                        <li
                                            key={session.id}
                                            onClick={() => viewSessionDetails(session)}
                                            className={`p-3 rounded cursor-pointer ${selectedSession?.id === session.id ? 'bg-blue-100 border-l-4 border-blue-500' : 'bg-white hover:bg-gray-100'}`}
                                        >
                                            <p className="font-semibold">{new Date(session.start_time).toLocaleDateString()}</p>
                                            <p className="text-sm text-gray-500">{new Date(session.start_time).toLocaleTimeString()}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Attendance Details */}
                            <div className="w-2/3 p-6 overflow-y-auto">
                                <div className="flex justify-between items-start mb-6">
                                    <h3 className="text-xl font-bold">
                                        {selectedSession ? `Attendance for ${new Date(selectedSession.start_time).toLocaleString()}` : 'Select a session'}
                                    </h3>
                                    <button onClick={closeHistory} className="text-gray-500 hover:text-gray-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {selectedSession ? (
                                    <>
                                        <div className="bg-gray-50 p-4 rounded mb-4 flex justify-between">
                                            <span className="text-green-600">✅ Present: <strong>{historyAttendance.length}</strong></span>
                                            {selectedSession.student_group && (
                                                <span className="text-red-600">❌ Absent: <strong>{historyAbsentees.length}</strong></span>
                                            )}
                                            <span>Status: <span className={selectedSession.is_active ? "text-green-600" : "text-gray-600"}>{selectedSession.is_active ? 'Active' : 'Ended'}</span></span>
                                        </div>

                                        {/* Present Students */}
                                        <h4 className="font-bold text-green-700 mb-2">Present Students</h4>
                                        <table className="w-full text-left mb-4">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="pb-2">Student Name</th>
                                                    <th className="pb-2">Time Marked</th>
                                                    <th className="pb-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {historyAttendance.map(record => (
                                                    <tr key={record.id} className="border-b">
                                                        <td className="py-2">{record.student_name}</td>
                                                        <td className="py-2">{new Date(record.timestamp).toLocaleTimeString()}</td>
                                                        <td className="py-2"><span className="text-green-600">Present</span></td>
                                                    </tr>
                                                ))}
                                                {historyAttendance.length === 0 && (
                                                    <tr>
                                                        <td colSpan="3" className="py-4 text-center text-gray-500">No attendance records.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>

                                        {/* Absentees in History */}
                                        {historyAbsentees.length > 0 && (
                                            <div className="border-t pt-4">
                                                <h4 className="font-bold text-red-600 mb-2">Absentees ({historyAbsentees.length})</h4>
                                                <div className="bg-red-50 p-3 rounded">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b border-red-200">
                                                                <th className="text-left pb-1">Name</th>
                                                                <th className="text-left pb-1">Reg No.</th>
                                                                <th className="text-left pb-1">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {historyAbsentees.map(s => (
                                                                <tr key={s.username} className="border-b border-red-100">
                                                                    <td className="py-1 text-red-700">{s.name}</td>
                                                                    <td className="py-1 font-mono text-red-600 text-xs">{s.register_number}</td>
                                                                    <td className="py-1"><span className="text-red-600 font-bold">Absent</span></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                        {selectedSession.student_group && historyAbsentees.length === 0 && historyAttendance.length > 0 && (
                                            <div className="border-t pt-4">
                                                <p className="text-green-600 font-bold">🎉 All students were present!</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400">
                                        Select a session from the left to view details.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FacultyDashboard;
