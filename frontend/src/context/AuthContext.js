// frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import * as authApi from '../api/auth'; // Import all functions from auth.js

// Create the Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // To manage initial auth check

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('jwtToken');
                if (token) {
                    // Validate token with backend or just set user from decoded token (less secure)
                    // For a robust app, fetch user details using the token
                    const response = await authApi.getMe(); // Call getMe from auth.js
                    if (response && response.user) {
                        setUser(response.user);
                        setIsAuthenticated(true);
                    } else {
                        localStorage.removeItem('jwtToken'); // Token might be invalid or expired
                        setUser(null);
                        setIsAuthenticated(false);
                    }
                }
            } catch (error) {
                console.error("Authentication check failed:", error);
                localStorage.removeItem('jwtToken');
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []); // Run once on component mount

    const login = async (username, password) => {
        setIsLoading(true);
        try {
            const response = await authApi.login(username, password);
            localStorage.setItem('jwtToken', response.token);
            setUser(response.user);
            setIsAuthenticated(true);
            return response; // Return the full response including user data
        } catch (error) {
            console.error("Login failed:", error);
            throw error; // Re-throw to be caught by the calling component
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('jwtToken');
        setUser(null);
        setIsAuthenticated(false);
        // Redirect to login page will be handled by PrivateRoute/App.js
    };

    const register = async (username, email, password) => {
        setIsLoading(true);
        try {
            const response = await authApi.register(username, email, password);
            return response; // Return the registration response
        } catch (error) {
            console.error("Registration failed:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the Auth Context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
