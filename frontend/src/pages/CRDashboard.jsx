import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AuthContext from '../context/AuthContext';

const CRDashboard = () => {
    const { user } = useContext(AuthContext);
    const [groups, setGroups] = useState([]);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [groupStudents, setGroupStudents] = useState([]);
    const [newStudentsInput, setNewStudentsInput] = useState('');
    const [createdCredentials, setCreatedCredentials] = useState([]);
    const [editingStudent, setEditingStudent] = useState(null);
    const [editName, setEditName] = useState('');
    const [editRegNo, setEditRegNo] = useState('');

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        const res = await api.get('groups/');
        setGroups(res.data);
    };

    const createGroup = async (e) => {
        e.preventDefault();
        try {
            await api.post('groups/', { name: newGroupName });
            setNewGroupName('');
            fetchGroups();
        } catch (err) {
            console.error(err);
        }
    };

    const viewGroupDetails = async (group) => {
        setSelectedGroup(group);
        if (!selectedGroup || selectedGroup.id !== group.id) {
            setCreatedCredentials([]);
        }
        const res = await api.get(`groups/${group.id}/details/`);
        setGroupStudents(res.data);
    };

    const refreshStudentList = async () => {
        if (selectedGroup) {
            const res = await api.get(`groups/${selectedGroup.id}/details/`);
            setGroupStudents(res.data);
            fetchGroups();
        }
    };

    const addStudents = async () => {
        const lines = newStudentsInput.split('\n');
        const students = lines.map(line => {
            const [name, regNo] = line.split(',');
            if (name && regNo) {
                return { name: name.trim(), register_number: regNo.trim() };
            }
            return null;
        }).filter(Boolean);

        if (students.length === 0) return;

        try {
            const res = await api.post(`groups/${selectedGroup.id}/students/`, { students });
            setCreatedCredentials(res.data);
            setNewStudentsInput('');
            refreshStudentList();
        } catch (err) {
            console.error("Failed to add students", err);
        }
    };

    const startEdit = (student) => {
        setEditingStudent(student.id);
        setEditName(student.name);
        setEditRegNo(student.register_number);
    };

    const cancelEdit = () => {
        setEditingStudent(null);
        setEditName('');
        setEditRegNo('');
    };

    const saveEdit = async (studentId) => {
        try {
            await api.put(`groups/${selectedGroup.id}/students/${studentId}/update/`, {
                name: editName,
                register_number: editRegNo
            });
            setEditingStudent(null);
            refreshStudentList();
        } catch (err) {
            console.error("Failed to update student", err);
        }
    };

    const removeStudent = async (studentId) => {
        if (!window.confirm('Are you sure you want to remove this student?')) return;
        try {
            await api.delete(`groups/${selectedGroup.id}/students/${studentId}/remove/`);
            refreshStudentList();
        } catch (err) {
            console.error("Failed to remove student", err);
        }
    };

    const copyAllCredentials = () => {
        const studentsWithCreds = groupStudents.filter(s => s.login_username);
        if (studentsWithCreds.length === 0) {
            alert('No credentials available yet. Add students first.');
            return;
        }
        const text = studentsWithCreds.map(s => `${s.name} | ${s.login_username} | ${s.login_password}`).join('\n');
        navigator.clipboard.writeText(text);
        alert('Credentials copied to clipboard!');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Class Representative Dashboard</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Groups Management */}
                    <div>
                        <div className="bg-white p-6 rounded shadow mb-6">
                            <h3 className="text-xl font-semibold mb-4">Create Student Group</h3>
                            <form onSubmit={createGroup} className="flex gap-4">
                                <input
                                    className="border p-2 rounded flex-1"
                                    placeholder="Group Name (e.g. CSE Sem 5)"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    required
                                />
                                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Create</button>
                            </form>
                        </div>

                        <div className="bg-white p-6 rounded shadow">
                            <h3 className="text-xl font-semibold mb-4">Your Groups</h3>
                            <ul className="space-y-2">
                                {groups.map(group => (
                                    <li
                                        key={group.id}
                                        onClick={() => viewGroupDetails(group)}
                                        className={`p-3 rounded cursor-pointer border ${selectedGroup?.id === group.id ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="flex justify-between">
                                            <span className="font-semibold">{group.name}</span>
                                            <span className="text-gray-500">{group.student_count} Students</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Group Details & Add Students */}
                    {selectedGroup && (
                        <div>
                            <div className="bg-white p-6 rounded shadow mb-6">
                                <h3 className="text-xl font-semibold mb-4">Add Students to {selectedGroup.name}</h3>
                                <p className="text-sm text-gray-500 mb-2">Enter details (Name, RegisterNumber) one per line.</p>
                                <textarea
                                    className="w-full border p-2 rounded h-32"
                                    placeholder={"John Doe, REG001\nJane Smith, REG002"}
                                    value={newStudentsInput}
                                    onChange={(e) => setNewStudentsInput(e.target.value)}
                                ></textarea>
                                <button onClick={addStudents} className="bg-blue-600 text-white px-4 py-2 rounded mt-2">Generate Credentials</button>
                            </div>

                            {/* Newly Created Credentials (flash display) */}
                            {createdCredentials.length > 0 && (
                                <div className="bg-yellow-50 p-6 rounded shadow mb-6 border border-yellow-200">
                                    <h3 className="text-lg font-bold text-yellow-800 mb-2">🔑 Just Created</h3>
                                    <p className="text-sm text-yellow-700 mb-3">These credentials are also saved permanently below.</p>
                                    <div className="max-h-40 overflow-y-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-yellow-300">
                                                    <th className="pb-2">Name</th>
                                                    <th className="pb-2">Username</th>
                                                    <th className="pb-2">Password</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {createdCredentials.map((creds, idx) => (
                                                    <tr key={idx} className="border-b border-yellow-200">
                                                        <td className="py-1">{creds.name}</td>
                                                        <td className="py-1 font-mono">{creds.username}</td>
                                                        <td className="py-1 font-mono font-bold text-green-700">{creds.password}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Students List WITH Credentials */}
                            <div className="bg-white p-6 rounded shadow">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-semibold">Students & Credentials ({groupStudents.length})</h3>
                                    <button
                                        onClick={copyAllCredentials}
                                        className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
                                    >
                                        📋 Copy All Credentials
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b bg-gray-50">
                                                <th className="p-2">Name</th>
                                                <th className="p-2">Reg No.</th>
                                                <th className="p-2">Login Username</th>
                                                <th className="p-2">Password</th>
                                                <th className="p-2">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {groupStudents.map(student => (
                                                <tr key={student.id} className="border-b hover:bg-gray-50">
                                                    {editingStudent === student.id ? (
                                                        <>
                                                            <td className="p-2">
                                                                <input className="border p-1 rounded w-full" value={editName} onChange={(e) => setEditName(e.target.value)} />
                                                            </td>
                                                            <td className="p-2">
                                                                <input className="border p-1 rounded w-full" value={editRegNo} onChange={(e) => setEditRegNo(e.target.value)} />
                                                            </td>
                                                            <td className="p-2 font-mono text-gray-400">—</td>
                                                            <td className="p-2 font-mono text-gray-400">—</td>
                                                            <td className="p-2">
                                                                <button onClick={() => saveEdit(student.id)} className="text-green-600 mr-2 text-sm">✓ Save</button>
                                                                <button onClick={cancelEdit} className="text-gray-500 text-sm">✕ Cancel</button>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="p-2 font-semibold">{student.name}</td>
                                                            <td className="p-2 font-mono text-gray-600">{student.register_number}</td>
                                                            <td className="p-2 font-mono text-blue-700">{student.login_username || '—'}</td>
                                                            <td className="p-2 font-mono font-bold">{student.login_password || '—'}</td>
                                                            <td className="p-2">
                                                                <button onClick={() => startEdit(student)} className="text-blue-600 hover:text-blue-800 text-sm mr-2">✏️</button>
                                                                <button onClick={() => removeStudent(student.id)} className="text-red-600 hover:text-red-800 text-sm">🗑️</button>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {groupStudents.length === 0 && (
                                        <p className="text-center text-gray-400 py-4">No students added yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CRDashboard;
