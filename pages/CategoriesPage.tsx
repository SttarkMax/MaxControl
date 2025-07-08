import React, { useState, useEffect, useCallback } from 'react';
import { Category } from '../types';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import TagIcon from '../components/icons/TagIcon';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PencilIcon from '../components/icons/PencilIcon';
import { api } from '../services/apiService';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/api/categories');
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      alert("Falha ao carregar categorias.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
      if (isEditing) {
        await api.put(`/api/categories/${currentCategory.id}`, { name: currentCategory.name });
      } else {
        await api.post('/api/categories', { name: currentCategory.name });
      }
      await fetchCategories();
      closeModal();
    } catch (error) {
      console.error("Failed to save category:", error);
      alert(`Erro ao salvar categoria: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria? Os produtos associados não serão removidos, mas perderão esta categorização.')) {
      try {
        await api.delete(`/api/categories/${categoryId}`);
        await fetchCategories();
      } catch (error) {
        console.error("Failed to delete category:", error);
        alert(`Erro ao excluir categoria: ${error}`);
      }
    }
  };
  
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Spinner size="lg" />
        </div>
    );
  }

  return (
    <div className="p-6 text-white">
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
        <div className="text-center py-10 bg-[#1d1d1d] shadow-xl rounded-lg">
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
        <div className="bg-[#1d1d1d] shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-[#282828]">
            <thead className="bg-[#282828]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nome da Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-[#282828]">
              {categories.map(category => (
                <tr key={category.id} className="hover:bg-[#1d1d1d]">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{category.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                        <Button onClick={() => openModalForEdit(category)} variant="secondary" size="sm" iconLeft={<PencilIcon className="w-4 h-4"/>}>
                            Editar
                        </Button>
                        <Button onClick={() => handleDelete(category.id)} variant="danger" size="sm" iconLeft={<TrashIcon className="w-4 h-4"/>}>
                            Excluir
                        </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-[#1d1d1d] p-6 md:p-8 rounded-lg shadow-xl w-full max-w-lg text-white">
            <h3 className="text-xl font-semibold mb-6 text-white">{isEditing ? 'Editar Categoria' : 'Adicionar Nova Categoria'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input 
                label="Nome da Categoria" 
                name="name" 
                value={currentCategory.name} 
                onChange={handleInputChange} 
                required 
              />
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
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
