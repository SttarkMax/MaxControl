import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { APP_NAME } from '../constants';
import UserCircleIcon from '../components/icons/UserCircleIcon';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const success = await onLogin(username, password);
      if (success) {
        navigate('/');
      } else {
        setError('Nome de usuário ou senha inválidos.');
      }
    } catch (err: any) {
      setError(err.message || 'Falha no login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-gray-800 p-10 rounded-xl shadow-2xl">
        <div>
          <UserCircleIcon className="mx-auto h-16 w-auto text-yellow-500" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Acessar {APP_NAME}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Bem-vindo! Insira suas credenciais.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
           {error && <p className="text-center text-sm text-red-500 bg-red-900/20 p-2 rounded-md">{error}</p>}
          <Input
            label="Nome de Usuário"
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="Ex: joao.silva"
            autoComplete="username"
            disabled={isLoading}
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
            disabled={isLoading}
          />
          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading} disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
         <p className="mt-4 text-center text-xs text-gray-500">
            Para o primeiro acesso, use 'admin' como usuário e 'admin' como senha. O backend criará o usuário administrador se não existir.
          </p>
      </div>
    </div>
  );
};

export default LoginPage;