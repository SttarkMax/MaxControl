import React, { useState, useEffect, useCallback } from 'react';
import { User, UserAccessLevel, LoggedInUser } from '../types';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import UserGroupIcon from '../components/icons/UserGroupIcon';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PencilIcon from '../components/icons/PencilIcon';
import { api } from '../services/apiService';
import Spinner from '../components/common/Spinner';

const initialUserState: Omit<User, 'id'> = {
  username: '',
  fullName: '',
  password: '',
  role: UserAccessLevel.SALES,
};

interface UsersPageProps {
  loggedInUser: LoggedInUser;
}

const UsersPage: React.FC<UsersPageProps> = ({ loggedInUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUserForm, setCurrentUserForm] = useState<Omit<User, 'id'> & { id?: string }>(initialUserState);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/api/users');
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      alert("Falha ao carregar usuários.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentUserForm(prev => ({ ...prev, [name]: value }));
  };

  const openModalForNew = () => {
    setCurrentUserForm(initialUserState);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openModalForEdit = (user: User) => {
    setCurrentUserForm({ ...user, password: '' }); // Clear password field for editing
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentUserForm(initialUserState);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserForm.username.trim() || !currentUserForm.fullName?.trim()) {
        alert("Nome de usuário e nome completo são obrigatórios.");
        return;
    }
    if (!isEditing && !currentUserForm.password?.trim()) {
        alert("A senha é obrigatória para novos usuários.");
        return;
    }
    const adminUsers = users.filter(u => u.role === UserAccessLevel.ADMIN);
    if (isEditing && currentUserForm.id === loggedInUser.id && currentUserForm.role !== UserAccessLevel.ADMIN && adminUsers.length <= 1) {
        alert("Você não pode remover seu próprio acesso de administrador se for o único.");
        return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && currentUserForm.id) {
        await api.put(`/api/users/${currentUserForm.id}`, currentUserForm);
      } else {
        await api.post('/api/users', currentUserForm);
      }
      await fetchUsers();
      closeModal();
    } catch (error) {
      console.error("Failed to save user:", error);
      alert(`Erro ao salvar usuário: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (userId === loggedInUser.id) {
      alert('Você não pode excluir seu próprio usuário.');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await api.delete(`/api/users/${userId}`);
        await fetchUsers();
      } catch (error) {
        console.error("Failed to delete user:", error);
        alert(`Erro ao excluir usuário: ${error}`);
      }
    }
  };

  const roleOptions = [
    { value: UserAccessLevel.ADMIN, label: 'Administrador' },
    { value: UserAccessLevel.SALES, label: 'Vendas' },
    { value: UserAccessLevel.VIEWER, label: 'Visualização' },
  ];

  const getRoleLabelAndStyle = (roleValue: UserAccessLevel): { label: string, style: string } => {
    const roleInfo = roleOptions.find(opt => opt.value === roleValue);
    const label = roleInfo?.label || roleValue;
    let style = 'text-gray-300';
    if (roleValue === UserAccessLevel.ADMIN) style = 'text-yellow-400 font-semibold';
    else if (roleValue === UserAccessLevel.SALES) style = 'text-green-400 font-semibold';
    return { label, style };
  };

  if (isLoading) {
    return <div className="p-6 flex justify-center items-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-6 text-gray-300">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <UserGroupIcon className="h-8 w-8 text-yellow-500 mr-3" />
          <h2 className="text-2xl font-semibold text-white">Gerenciamento de Usuários</h2>
        </div>
        <Button onClick={openModalForNew} variant="primary" iconLeft={<PlusIcon className="w-5 h-5"/>}>
          Adicionar Usuário
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-10 bg-[#1d1d1d] shadow-xl rounded-lg">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-white">Nenhum usuário cadastrado</h3>
          <p className="mt-1 text-sm text-gray-400">Comece adicionando um novo usuário ao sistema.</p>
        </div>
      ) : (
        <div className="bg-[#1d1d1d] shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-[#282828]">
            <thead className="bg-[#282828]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nome Completo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nome de Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nível de Acesso</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-[#282828]">
              {users.map(user => {
                const { label: roleLabel, style: roleStyle } = getRoleLabelAndStyle(user.role);
                return (
                  <tr key={user.id} className="hover:bg-[#282828]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.fullName || user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.username}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${roleStyle}`}>{roleLabel}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center space-x-2">
                      <Button onClick={() => openModalForEdit(user)} variant="secondary" size="sm" iconLeft={<PencilIcon className="w-4 h-4"/>}>Editar</Button>
                      <Button onClick={() => handleDelete(user.id)} variant="danger" size="sm" iconLeft={<TrashIcon className="w-4 h-4"/>} disabled={user.id === loggedInUser.id}>Excluir</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1d1d1d] p-6 md:p-8 rounded-lg shadow-xl w-full max-w-lg text-white">
            <h3 className="text-xl font-semibold mb-6 text-white">{isEditing ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Nome Completo" name="fullName" value={currentUserForm.fullName || ''} onChange={handleInputChange} required />
              <Input label="Nome de Usuário" name="username" value={currentUserForm.username} onChange={handleInputChange} required />
              <Input
                label={isEditing ? "Nova Senha (deixe em branco para não alterar)" : "Senha"}
                name="password"
                type="password"
                value={currentUserForm.password || ''}
                onChange={handleInputChange}
                required={!isEditing}
                placeholder={isEditing ? "Digite a nova senha aqui" : "Mínimo 6 caracteres"}
              />
              <Select
                label="Nível de Acesso"
                name="role"
                options={roleOptions}
                value={currentUserForm.role}
                onChange={handleInputChange}
                required
              />
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>{isSubmitting ? "Salvando..." : (isEditing ? 'Salvar Alterações' : 'Adicionar Usuário')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
