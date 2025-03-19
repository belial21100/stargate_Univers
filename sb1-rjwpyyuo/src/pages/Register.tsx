import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, Lock, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownTimer, setCooldownTimer] = useState(0);
  const signUp = useAuthStore(state => state.signUp);

  useEffect(() => {
    let timer: number;
    if (cooldownTimer > 0) {
      timer = window.setInterval(() => {
        setCooldownTimer(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldownTimer]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSubmitting || cooldownTimer > 0) {
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setIsSubmitting(true);
      await signUp(email.toLowerCase(), password, username);
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
      if (err.message.includes('Please wait')) {
        const seconds = parseInt(err.message.match(/\d+/)[0]);
        setCooldownTimer(seconds);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isDisabled = isSubmitting || cooldownTimer > 0;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-700">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-500/10 p-4 rounded-full mb-4">
              <Shield className="w-12 h-12 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Create Account</h2>
            <p className="text-gray-400 mt-2">Join the Stargate Command</p>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {cooldownTimer > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-lg mb-6 text-sm">
              Please wait {formatTime(cooldownTimer)} before trying again
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50"
                  required
                  placeholder="your.email@example.com"
                  autoComplete="email"
                  disabled={isDisabled}
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username (optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.trim())}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50"
                  placeholder="Choose a username"
                  autoComplete="username"
                  disabled={isDisabled}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-700/50 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50"
                  required
                  minLength={6}
                  placeholder="Enter your password (min. 6 characters)"
                  autoComplete="new-password"
                  disabled={isDisabled}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isDisabled}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-4 rounded-lg transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner className="w-5 h-5 mr-2" />
                  Creating Account...
                </>
              ) : cooldownTimer > 0 ? (
                <>
                  <LoadingSpinner className="w-5 h-5 mr-2" />
                  Wait {formatTime(cooldownTimer)}
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};