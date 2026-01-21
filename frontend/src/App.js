import React, { useState, useEffect } from 'react';
import UsersTable from './UsersTable';
import UserFormModal from './UserFormModal';
import ToastContainer from './ToastContainer';

function App() {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Fetch users from API
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/users`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error('Failed to fetch users');
        showToast('Failed to fetch users', 'error');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Toast notification helper
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration: 3000 }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Open modal for adding new user
  const handleAddClick = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  // Open modal for editing user
  const handleEdit = (user) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  // Handle form submission (create or update)
  const handleFormSubmit = async (formData) => {
    setFormLoading(true);

    try {
      const isEdit = !!editingUser;
      const url = isEdit 
        ? `${API_URL}/api/users/${editingUser.id}`
        : `${API_URL}/api/users`;
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showToast(errorData.error || `Failed to ${isEdit ? 'update' : 'create'} user`, 'error');
        return;
      }

      // Success - refresh table and show toast
      await fetchUsers();
      showToast(
        isEdit 
          ? `User ${formData.name} ${formData.surname} updated successfully!`
          : `User ${formData.name} ${formData.surname} added successfully!`,
        'success'
      );
      
      // Don't close modal - keep it open for adding more users
      // Only close if editing
      if (isEdit) {
        setModalOpen(false);
        setEditingUser(null);
      }
    } catch (error) {
      console.error(`Error ${editingUser ? 'updating' : 'creating'} user:`, error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete user
  const handleDelete = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to delete user', 'error');
        return;
      }

      // Success - refresh table and show toast
      await fetchUsers();
      showToast('User deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Network error. Please try again.', 'error');
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>User Management</h1>
        <button
          onClick={handleAddClick}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          + Add User
        </button>
      </div>

      <UsersTable 
        users={users} 
        loading={usersLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <UserFormModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
        user={editingUser}
        loading={formLoading}
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;
