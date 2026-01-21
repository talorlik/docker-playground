import React, { useState } from 'react';

function App() {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    sex: '',
    age: '',
    email: ''
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          surname: formData.surname.trim(),
          email: formData.email.trim(),
          sex: formData.sex || null,
          age: formData.age ? parseInt(formData.age) : null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors) {
          const serverErrors = {};
          errorData.errors.forEach(err => {
            if (err.includes('Name')) serverErrors.name = err;
            else if (err.includes('Surname')) serverErrors.surname = err;
            else if (err.includes('Email')) serverErrors.email = err;
            else if (err.includes('Age')) serverErrors.age = err;
          });
          setErrors(serverErrors);
        } else {
          setErrors({ submit: errorData.error || 'Failed to create user' });
        }
        return;
      }

      const user = await response.json();
      console.log('User created:', user);
      setSuccess(true);
      setFormData({
        name: '',
        surname: '',
        sex: '',
        age: '',
        email: ''
      });
    } catch (error) {
      console.error('Error creating user:', error);
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Add New User</h1>

      {success && (
        <div style={{
          padding: '10px',
          backgroundColor: '#d4edda',
          color: '#155724',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          User created successfully!
        </div>
      )}

      {errors.submit && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {errors.submit}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Name <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            id="name"
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
          <label htmlFor="surname" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Surname <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            id="surname"
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
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Email <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="email"
            id="email"
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
          <label htmlFor="sex" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Sex
          </label>
          <select
            id="sex"
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
          <label htmlFor="age" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Age
          </label>
          <input
            type="number"
            id="age"
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

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px',
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </form>
    </div>
  );
}

export default App;
