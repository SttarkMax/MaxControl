
import React, { useState, useEffect, useCallback } from 'react';
import { Category } from '../types';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import TagIcon from '../components/icons/TagIcon';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PencilIcon from '../components/icons/PencilIcon';
import { apiGetCategories, apiSaveCategory, apiDeleteCategory } from '../utils';
import Spinner from '../components/common/Spinner';

const initialCategoryState: Category = {
  id: '',
  name: '',
};

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category>(initialCategoryState);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetCategories();
      setCategories(data);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar categorias.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentCategory(prev => ({ ...prev, [name]: value }));
  };

  const openModalForNew = () => {
    setCurrentCategory(initialCategoryState);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openModalForEdit = (category: Category) => {
    setCurrentCategory(category);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentCategory(initialCategoryState);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategory.name.trim()) {
        alert("O nome da categoria não pode ser vazio.");
        return;
    }
    setIsSubmitting(true);
    try {
        await apiSaveCategory(currentCategory);
        closeModal();
        await loadCategories();
    } catch(err: any) {
        alert(`Erro ao salvar: ${err.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria? Os produtos associados não serão removidos, mas perderão esta categorização.')) {
        try {
            await apiDeleteCategory(categoryId);
            await loadCategories();
        } catch(err: any) {
            alert(`Erro ao excluir: ${err.message}`);
        }
    }
  };
  
  if (isLoading) {
    return <div className="p-6 text-center"><Spinner size="lg" /></div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-500 bg-red-900/20 rounded-md">{error}</div>;
  }

  return (
    <div className="p-6 text-gray-300">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <TagIcon className="h-8 w-8 text-yellow-500 mr-3" />
          <h2 className="text-2xl font-semibold text-white">Gerenciamento de Categorias de Produtos</h2>
        </div>
        <Button onClick={openModalForNew} variant="primary" iconLeft={<PlusIcon className="w-5 h-5"/>}>
          Adicionar Categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-10 bg-gray-800 shadow-xl rounded-lg">
          <TagIcon className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-white">Nenhuma categoria cadastrada</h3>
          <p className="mt-1 text-sm text-gray-400">Comece adicionando uma nova categoria para organizar seus produtos.</p>
          <div className="mt-6">
            <Button onClick={openModalForNew} variant="primary" iconLeft={<PlusIcon className="w-4 h-4"/>}>
              Adicionar Categoria
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nome da Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {categories.map(category => (
                <tr key={category.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{category.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center space-x-2">
                    <Button onClick={() => openModalForEdit(category)} variant="secondary" size="sm" iconLeft={<PencilIcon className="w-4 h-4"/>}>Editar</Button>
                    <Button onClick={() => handleDelete(category.id)} variant="danger" size="sm" iconLeft={<TrashIcon className="w-4 h-4"/>}>Excluir</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-lg text-gray-300">
            <h3 className="text-xl font-semibold mb-6 text-white">{isEditing ? 'Editar Categoria' : 'Adicionar Nova Categoria'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input 
                label="Nome da Categoria" 
                name="name" 
                value={currentCategory.name} 
                onChange={handleInputChange} 
                placeholder="Ex: Cartões de Visita, Banners, Adesivos"
                required 
              />
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={closeModal} disabled={isSubmitting}>Cancelar</Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>{isSubmitting ? "Salvando..." : (isEditing ? 'Salvar Alterações' : 'Adicionar Categoria')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
