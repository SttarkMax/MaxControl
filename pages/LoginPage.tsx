import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { APP_NAME } from '../constants';
import UserCircleIcon from '../components/icons/UserCircleIcon';
import { api } from '../services/apiService';
import { LoggedInUser } from '../types';

interface LoginPageProps {
  onLogin: (user: LoggedInUser, token: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const data = await api.post('/api/auth/login', { username, password });
      onLogin(data.user, data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Falha no login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-[#1d1d1d] p-10 rounded-xl shadow-2xl">
        <div>
          <UserCircleIcon className="mx-auto h-16 w-auto text-yellow-500" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Acessar {APP_NAME}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            Bem-vindo! Insira suas credenciais.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && <p className="text-center text-sm text-red-500">{error}</p>}
          <Input
            label="Nome de Usuário"
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="Seu usuário"
            autoComplete="username"
          />
          <Input
            label="Senha"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="********"
            autoComplete="current-password"
          />
          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading} disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
         <p className="mt-4 text-center text-xs text-gray-400">
            Para demonstração, use as credenciais fornecidas ou cadastradas na tela de Usuários.
          </p>
      </div>
    </div>
  );
};

export default LoginPage;
