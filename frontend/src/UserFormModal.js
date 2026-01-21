import React, { useState, useEffect } from 'react';

function UserFormModal({ isOpen, onClose, onSubmit, user = null, loading = false }) {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    sex: '',
    age: '',
    email: ''
  });
  const [errors, setErrors] = useState({});

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Populate form when editing
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        surname: user.surname || '',
        sex: user.sex || '',
        age: user.age != null ? String(user.age) : '',
        email: user.email || ''
      });
    } else {
      // Reset form for new user
      setFormData({
        name: '',
        surname: '',
        sex: '',
        age: '',
        email: ''
      });
    }
    setErrors({});
  }, [user, isOpen]);

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.surname.trim()) {
      newErrors.surname = 'Surname is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Email format is invalid';
    }

    if (formData.age && (isNaN(formData.age) || parseInt(formData.age) < 0 || parseInt(formData.age) > 150)) {
      newErrors.age = 'Age must be a valid number between 0 and 150';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit({
      name: formData.name.trim(),
      surname: formData.surname.trim(),
      email: formData.email.trim(),
      sex: formData.sex || null,
      age: formData.age ? parseInt(formData.age) : null
    });
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>{user ? 'Edit User' : 'Add New User'}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label htmlFor="modal-name" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Name <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              id="modal-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '16px',
                border: errors.name ? '2px solid red' : '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
            {errors.name && <span style={{ color: 'red', fontSize: '14px' }}>{errors.name}</span>}
          </div>

          <div>
            <label htmlFor="modal-surname" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Surname <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              id="modal-surname"
              name="surname"
              value={formData.surname}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '16px',
                border: errors.surname ? '2px solid red' : '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
            {errors.surname && <span style={{ color: 'red', fontSize: '14px' }}>{errors.surname}</span>}
          </div>

          <div>
            <label htmlFor="modal-email" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Email <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="email"
              id="modal-email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '16px',
                border: errors.email ? '2px solid red' : '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
            {errors.email && <span style={{ color: 'red', fontSize: '14px' }}>{errors.email}</span>}
          </div>

          <div>
            <label htmlFor="modal-sex" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Sex
            </label>
            <select
              id="modal-sex"
              name="sex"
              value={formData.sex}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="modal-age" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Age
            </label>
            <input
              type="number"
              id="modal-age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              min="0"
              max="150"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '16px',
                border: errors.age ? '2px solid red' : '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
            {errors.age && <span style={{ color: 'red', fontSize: '14px' }}>{errors.age}</span>}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: loading ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {loading ? (user ? 'Updating...' : 'Creating...') : (user ? 'Update User' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserFormModal;
