import React, { useState, useMemo } from 'react';

function UsersTable({ users, loading, onEdit, onDelete }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSex, setFilterSex] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter and search users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = !filterSex || user.sex === filterSex;
      
      return matchesSearch && matchesFilter;
    });
  }, [users, searchTerm, filterSex]);

  // Sort users
  const sortedUsers = useMemo(() => {
    if (!sortConfig.key) return filteredUsers;

    return [...filteredUsers].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // Handle numeric values
      if (sortConfig.key === 'age' || sortConfig.key === 'id') {
        aValue = aValue || 0;
        bValue = bValue || 0;
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle string values
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredUsers, sortConfig]);

  // Paginate users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedUsers.slice(startIndex, endIndex);
  }, [sortedUsers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  const handleSort = (key) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        // Toggle direction if same column
        return {
          key,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      // New column, default to ascending
      return { key, direction: 'asc' };
    });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return '↕️';
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading users...</div>;
  }

  // Show empty state when no users exist at all
  if (users.length === 0) {
    return (
      <div style={{ marginTop: '40px' }}>
        <h2>Users Table</h2>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          color: '#666'
        }}>
          <p style={{ fontSize: '18px', margin: 0 }}>There aren't any users yet.</p>
          <p style={{ fontSize: '14px', margin: '10px 0 0 0' }}>Click "Add User" to create your first user.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '40px' }}>
      <h2>Users Table</h2>
      
      {/* Search and Filter Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '20px', 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label htmlFor="search" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Search:
          </label>
          <input
            type="text"
            id="search"
            placeholder="Search by name, surname, or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ minWidth: '150px' }}>
          <label htmlFor="filterSex" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Filter by Sex:
          </label>
          <select
            id="filterSex"
            value={filterSex}
            onChange={(e) => {
              setFilterSex(e.target.value);
              setCurrentPage(1); // Reset to first page on filter
            }}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
          >
            <option value="">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div style={{ minWidth: '120px' }}>
          <label htmlFor="itemsPerPage" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Items per page:
          </label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1); // Reset to first page
            }}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div style={{ marginBottom: '10px', color: '#666' }}>
        Showing {paginatedUsers.length} of {sortedUsers.length} users
        {sortedUsers.length !== users.length && ` (filtered from ${users.length} total)`}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderRadius: '4px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th
                onClick={() => handleSort('id')}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #dee2e6',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: 'bold'
                }}
              >
                ID {getSortIcon('id')}
              </th>
              <th
                onClick={() => handleSort('name')}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #dee2e6',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: 'bold'
                }}
              >
                Name {getSortIcon('name')}
              </th>
              <th
                onClick={() => handleSort('surname')}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #dee2e6',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: 'bold'
                }}
              >
                Surname {getSortIcon('surname')}
              </th>
              <th
                onClick={() => handleSort('email')}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #dee2e6',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: 'bold'
                }}
              >
                Email {getSortIcon('email')}
              </th>
              <th
                onClick={() => handleSort('sex')}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #dee2e6',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: 'bold'
                }}
              >
                Sex {getSortIcon('sex')}
              </th>
              <th
                onClick={() => handleSort('age')}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #dee2e6',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: 'bold'
                }}
              >
                Age {getSortIcon('age')}
              </th>
              <th
                onClick={() => handleSort('created_at')}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #dee2e6',
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: 'bold'
                }}
              >
                Created At {getSortIcon('created_at')}
              </th>
              <th
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  borderBottom: '2px solid #dee2e6',
                  fontWeight: 'bold'
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No users found matching your search/filter criteria
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>{user.id}</td>
                  <td style={{ padding: '12px' }}>{user.name || '-'}</td>
                  <td style={{ padding: '12px' }}>{user.surname || '-'}</td>
                  <td style={{ padding: '12px' }}>{user.email || '-'}</td>
                  <td style={{ padding: '12px' }}>{user.sex || '-'}</td>
                  <td style={{ padding: '12px' }}>{user.age != null ? user.age : '-'}</td>
                  <td style={{ padding: '12px' }}>
                    {user.created_at 
                      ? new Date(user.created_at).toLocaleString()
                      : '-'
                    }
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <button
                        onClick={() => onEdit && onEdit(user)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '5px',
                          fontSize: '18px',
                          color: '#007bff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Edit user"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${user.name} ${user.surname}?`)) {
                            onDelete && onDelete(user.id);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '5px',
                          fontSize: '18px',
                          color: '#dc3545',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Delete user"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '20px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                backgroundColor: currentPage === 1 ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              First
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                backgroundColor: currentPage === 1 ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            <span style={{ padding: '0 10px' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                backgroundColor: currentPage === totalPages ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                backgroundColor: currentPage === totalPages ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersTable;
