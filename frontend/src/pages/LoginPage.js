// frontend/src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InputField from '../components/common/InputField'; // Corrected casing
import Button from '../components/common/Button';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); // For registration
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      if (isRegistering) {
        await register(username, email, password);
        setMessage('Registration successful! Please log in.');
        setIsRegistering(false); // Switch to login form after successful registration
      } else {
        await login(username, password);
        setMessage('Login successful!');
        navigate('/dashboard'); // Redirect to dashboard on successful login
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
      console.error('Auth error:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          {isRegistering ? 'Register' : 'Login'}
        </h2>

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Username"
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {isRegistering && (
            <InputField
              label="Email"
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
          <InputField
            label="Password"
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">
            {isRegistering ? 'Register' : 'Login'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setMessage('');
                setError('');
                setUsername('');
                setPassword('');
                setEmail('');
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              {isRegistering ? 'Login here' : 'Register here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
