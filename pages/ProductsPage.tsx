import React, { useState, useEffect, useCallback } from 'react';
import { Product, Category, PricingModel } from '../types';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Textarea from '../components/common/Textarea';
import SquaresPlusIcon from '../components/icons/SquaresPlusIcon';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PencilIcon from '../components/icons/PencilIcon';
import LightBulbIcon from '../components/icons/LightBulbIcon';
import { formatCurrency, apiGetProducts, apiGetCategories, apiSaveProduct, apiDeleteProduct } from '../utils';
import { generateProductDescriptionIdea } from '../services/geminiService';
import Spinner from '../components/common/Spinner';

const initialProductState: Omit<Product, 'id'> = {
  name: '',
  description: '',
  pricingModel: PricingModel.PER_UNIT,
  basePrice: 0,
  unit: 'unidade',
  customCashPrice: undefined,
  customCardPrice: undefined,
  supplierCost: undefined,
  categoryId: '',
};

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>(initialProductState);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [productsData, categoriesData] = await Promise.all([
        apiGetProducts(),
        apiGetCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar dados.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue: any = value;
    
    if (type === 'number') {
      // ✅ CORREÇÃO: Verificar se é número válido antes de usar parseFloat
      const numValue = parseFloat(value);
      processedValue = isNaN(numValue) ? 0 : numValue;
    }
    
    setCurrentProduct(prev => ({ ...prev, [name]: processedValue }));
    
    // Auto-update unit field based on pricing model
    if (name === 'pricingModel') {
      setCurrentProduct(prev => ({
        ...prev,
        unit: value === PricingModel.PER_SQUARE_METER ? 'm²' : 'unidade'
      }));
    }
  };

  const openModalForNew = () => {
    setCurrentProduct(initialProductState);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openModalForEdit = (product: Product) => {
    setCurrentProduct(product);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentProduct(initialProductState);
  };

  const handleGenerateDescription = async () => {
    if (!currentProduct.name) {
      alert("Digite o nome do produto primeiro.");
      return;
    }
    
    setIsGeneratingDescription(true);
    try {
      const category = categories.find(c => c.id === currentProduct.categoryId);
      const description = await generateProductDescriptionIdea(
        currentProduct.name, 
        category?.name || 'produto gráfico'
      );
      setCurrentProduct(prev => ({ ...prev, description }));
    } catch (err: any) {
      console.error("Erro ao gerar descrição:", err);
      alert(`Erro ao gerar descrição: ${err.message}`);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentProduct.name?.trim()) {
      alert("Nome do produto é obrigatório.");
      return;
    }
    
    // ✅ CORREÇÃO: Verificar se basePrice é número válido
    if (!currentProduct.basePrice || currentProduct.basePrice <= 0) {
      alert("Preço base deve ser maior que zero.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await apiSaveProduct(currentProduct as Product);
      closeModal();
      await loadData();
    } catch (err: any) {
      alert(`Falha ao salvar produto: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await apiDeleteProduct(productId);
        await loadData();
      } catch (err: any) {
        alert(`Falha ao excluir produto: ${err.message}`);
      }
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pricingModelOptions = [
    { value: PricingModel.PER_UNIT, label: 'Por Unidade/Pacote' },
    { value: PricingModel.PER_SQUARE_METER, label: 'Por Metro Quadrado (m²)' }
  ];

  const categoryOptions = [
    { value: '', label: 'Sem categoria' },
    ...categories.map(c => ({ value: c.id, label: c.name }))
  ];

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
          <SquaresPlusIcon className="h-8 w-8 text-yellow-500 mr-3" />
          <h2 className="text-2xl font-semibold text-white">Gerenciamento de Produtos</h2>
        </div>
        <Button onClick={openModalForNew} variant="primary" iconLeft={<PlusIcon className="w-5 h-5"/>}>
          Adicionar Produto
        </Button>
      </div>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {products.length === 0 ? (
        <div className="text-center py-10 bg-gray-800 shadow-xl rounded-lg">
          <SquaresPlusIcon className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-white">Nenhum produto cadastrado</h3>
          <p className="mt-1 text-sm text-gray-400">Comece adicionando um novo produto.</p>
          <div className="mt-6">
            <Button onClick={openModalForNew} variant="primary" iconLeft={<PlusIcon className="w-4 h-4"/>}>
              Adicionar Produto
            </Button>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-10 bg-gray-800 shadow-xl rounded-lg">
          <SquaresPlusIcon className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-white">Nenhum produto encontrado</h3>
          <p className="mt-1 text-sm text-gray-400">Tente uma busca diferente.</p>
        </div>
      ) : (
        <div className="bg-gray-800 shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Produto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Modelo de Preço</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Preço Base</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {filteredProducts.map(product => {
                const category = categories.find(c => c.id === product.categoryId);
                return (
                  <tr key={product.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{product.name}</div>
                      <div className="text-xs text-gray-400">{product.description}</div>
                      {category && <div className="text-xs text-yellow-400 mt-1">📁 {category.name}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {product.pricingModel === PricingModel.PER_SQUARE_METER ? 'Por m²' : `Por ${product.unit || 'unidade'}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-white text-right font-semibold">
                      {formatCurrency(product.basePrice)}
                      {product.pricingModel === PricingModel.PER_SQUARE_METER && <span className="text-xs text-gray-400">/m²</span>}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <Button
                        onClick={() => openModalForEdit(product)}
                        variant="secondary"
                        size="sm"
                        iconLeft={<PencilIcon className="w-4 h-4"/>}
                      >
                        Editar
                      </Button>
                      <Button
                        onClick={() => handleDelete(product.id)}
                        variant="danger"
                        size="sm"
                        iconLeft={<TrashIcon className="w-4 h-4"/>}
                      >
                        Excluir
                      </Button>
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
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-6 text-white">
              {isEditing ? 'Editar Produto' : 'Adicionar Novo Produto'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome do Produto"
                  name="name"
                  value={currentProduct.name || ''}
                  onChange={handleInputChange}
                  required
                  placeholder="Ex: Cartão de Visita Premium"
                />
                <Select
                  label="Categoria"
                  name="categoryId"
                  value={currentProduct.categoryId || ''}
                  onChange={handleInputChange}
                  options={categoryOptions}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Textarea
                    label="Descrição"
                    name="description"
                    value={currentProduct.description || ''}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Descreva as características do produto..."
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleGenerateDescription}
                    isLoading={isGeneratingDescription}
                    iconLeft={<LightBulbIcon className="w-4 h-4"/>}
                    className="mt-6"
                  >
                    IA
                  </Button>
                </div>
                <p className="text-xs text-gray-400">💡 Use o botão IA para gerar uma sugestão de descrição</p>
              </div>

              <Select
                label="Modelo de Precificação"
                name="pricingModel"
                value={currentProduct.pricingModel}
                onChange={handleInputChange}
                options={pricingModelOptions}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Preço Base"
                  name="basePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentProduct.basePrice && currentProduct.basePrice > 0 ? currentProduct.basePrice.toString() : ''}
                  onChange={handleInputChange}
                  required
                  placeholder="0.00"
                />
                <Input
                  label="Unidade de Venda"
                  name="unit"
                  value={currentProduct.unit || ''}
                  onChange={handleInputChange}
                  placeholder={currentProduct.pricingModel === PricingModel.PER_SQUARE_METER ? 'm²' : 'Ex: unidade, pacote c/ 100'}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Preço à Vista (Opcional)"
                  name="customCashPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentProduct.customCashPrice && currentProduct.customCashPrice > 0 ? currentProduct.customCashPrice.toString() : ''}
                  onChange={handleInputChange}
                  placeholder="Deixe vazio para usar preço base"
                />
                <Input
                  label="Preço no Cartão (Opcional)"
                  name="customCardPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentProduct.customCardPrice && currentProduct.customCardPrice > 0 ? currentProduct.customCardPrice.toString() : ''}
                  onChange={handleInputChange}
                  placeholder="Deixe vazio para calcular automático"
                />
              </div>

              <Input
                label="Custo do Fornecedor (Opcional)"
                name="supplierCost"
                type="number"
                step="0.01"
                min="0"
                value={currentProduct.supplierCost && currentProduct.supplierCost > 0 ? currentProduct.supplierCost.toString() : ''}
                onChange={handleInputChange}
                placeholder="Para cálculo de margem"
              />

              <div className="flex justify-end space-x-3 pt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Salvando..." : (isEditing ? 'Salvar Alterações' : 'Adicionar Produto')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;