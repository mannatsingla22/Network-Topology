import React, { useState } from 'react';
import Button from '../components/Button';
import Input from '../components/Input';

const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('admin@example.com');
    const [password, setPassword] = useState('password');

    const handleLogin = (e) => {
        e.preventDefault();
        // This is a mock login, no validation needed
        onLogin();
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        Network Visualizer
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Sign in to continue
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                           <Input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                placeholder="Email address"
                                className="rounded-t-md"
                           />
                        </div>
                        <div>
                            <Input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder="Password"
                                className="rounded-b-md"
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full">
                        Sign In
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
