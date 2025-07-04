import React, { useState, useEffect, useCallback, ChangeEvent, useRef } from 'react';
import { Product, PricingModel, Category, CompanyInfo } from '../types';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Select from '../components/common/Select';
import Spinner from '../components/common/Spinner';
import { CARD_SURCHARGE_PERCENTAGE } from '../constants';
import SquaresPlusIcon from '../components/icons/SquaresPlusIcon';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PencilIcon from '../components/icons/PencilIcon';
import LightBulbIcon from '../components/icons/LightBulbIcon';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import DocumentTextIcon from '../components/icons/DocumentTextIcon';
import { formatCurrency, apiGetProducts, apiSaveProduct, apiDeleteProduct, apiGetCategories, apiGetCompanyInfo } from '../utils';

// Importação condicional do jsPDF para evitar erro se não estiver disponível
let jsPDF: any = null;
let autoTable: any = null;

try {
  jsPDF = require('jspdf').default || require('jspdf');
  autoTable = require('jspdf-autotable').default || require('jspdf-autotable');
} catch (error) {
  console.warn('jsPDF não disponível:', error);
}

// Importação condicional do serviço Gemini
let generateProductDescriptionIdea: any = null;
try {
  const geminiService = require('../services/geminiService');
  generateProductDescriptionIdea = geminiService.generateProductDescriptionIdea;
} catch (error) {
  console.warn('Serviço Gemini não disponível:', error);
}

const initialProductState: Product = {
  id: '',
  name: '',
  description: '',
  pricingModel: PricingModel.PER_UNIT,
  basePrice: 0,
  unit: 'un',
  categoryId: '',
};

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product>(initialProductState);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiDescriptionLoading, setAiDescriptionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterCategoryId, setSelectedFilterCategoryId] = useState<string>('');

  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [priceExportOption, setPriceExportOption] = useState<'cash' | 'card' | 'both'>('both');
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔄 Carregando dados de produtos...');
      
      const [productsData, categoriesData, companyInfoData] = await Promise.all([
        apiGetProducts().catch(err => {
          console.error('Erro ao carregar produtos:', err);
          return [];
        }),
        apiGetCategories().catch(err => {
          console.error('Erro ao carregar categorias:', err);
          return [];
        }),
        apiGetCompanyInfo().catch(err => {
          console.error('Erro ao carregar info da empresa:', err);
          return null;
        }),
      ]);
      
      console.log('✅ Dados carregados:', { 
        produtos: productsData.length, 
        categorias: categoriesData.length,
        empresa: !!companyInfoData 
      });
      
      setProducts(productsData || []);
      setCategories(categoriesData || []);
      setCompanyInfo(companyInfoData);
    } catch (err: any) {
      console.error('❌ Erro geral ao carregar dados:', err);
      setError(err.message || "Falha ao carregar dados. Tente recarregar a página.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('🚀 ProductsPage montada, iniciando carregamento...');
    fetchData();

    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fetchData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentProduct(prev => ({ 
      ...prev, 
      [name]: name === 'basePrice' || name === 'customCashPrice' || name === 'customCardPrice' 
        ? parseFloat(value) || 0 
        : value 
    }));
  };
  
  const handlePricingModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPricingModel = e.target.value as PricingModel;
    setCurrentProduct(prev => ({ 
      ...prev, 
      pricingModel: newPricingModel,
      unit: newPricingModel === PricingModel.PER_SQUARE_METER 
        ? 'm²' 
        : (prev.unit === 'm²' ? 'un' : (prev.unit || 'un')) 
    }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const productToSave = {
      ...currentProduct,
      categoryId: currentProduct.categoryId === '' ? undefined : currentProduct.categoryId
    };

    try {
      await apiSaveProduct(productToSave);
      await fetchData();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar o produto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      setError(null);
      try {
        await apiDeleteProduct(productId);
        await fetchData();
        setSelectedProductIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
      } catch (err: any) {
        setError(err.message || 'Falha ao excluir o produto.');
      }
    }
  };

  const handleGenerateDescription = async () => {
    if (!generateProductDescriptionIdea) {
      alert("Serviço de IA não está disponível.");
      return;
    }
    
    if (!currentProduct.name || !currentProduct.pricingModel) {
      alert("Por favor, insira o nome e o tipo do produto primeiro.");
      return;
    }
    
    setAiDescriptionLoading(true);
    try {
      const idea = await generateProductDescriptionIdea(currentProduct.name, currentProduct.pricingModel);
      setCurrentProduct(prev => ({ ...prev, description: idea }));
    } catch (error) {
      console.error("Failed to generate description:", error);
      alert("Falha ao gerar descrição. Verifique o console para mais detalhes.");
    } finally {
      setAiDescriptionLoading(false);
    }
  };

  const calculateCardPrice = (basePrice: number) => basePrice * (1 + CARD_SURCHARGE_PERCENTAGE / 100);
  
  const getEffectivePrices = (product: Product) => {
    const cashPrice = product.customCashPrice ?? product.basePrice;
    const cardPrice = product.customCardPrice ?? calculateCardPrice(cashPrice);
    return { cashPrice, cardPrice };
  };

  const pricingModelOptions = [
    { value: PricingModel.PER_UNIT, label: 'Por Unidade/Pacote' }, 
    { value: PricingModel.PER_SQUARE_METER, label: 'Por Metro Quadrado (m²)' }
  ];
  
  const unitLabel = currentProduct.pricingModel === PricingModel.PER_SQUARE_METER 
    ? 'm²' 
    : (currentProduct.unit || 'unidade');
    
  const modalCategoryOptions = [
    { value: '', label: 'Nenhuma categoria' }, 
    ...categories.map(cat => ({ value: cat.id, label: cat.name }))
  ];
  
  const filterCategoryOptions = [
    { value: '', label: 'Todas as Categorias' }, 
    ...categories.map(cat => ({ value: cat.id, label: cat.name }))
  ];
  
  const getCategoryName = (categoryId?: string) => 
    categories.find(cat => cat.id === categoryId)?.name || '-';

  const filteredProducts = products.filter(product => {
    const nameMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryMatch = selectedFilterCategoryId ? product.categoryId === selectedFilterCategoryId : true;
    return nameMatch && categoryMatch;
  });

  const getNoResultsMessage = () => {
    if (searchTerm && selectedFilterCategoryId) {
      return `Nenhum produto encontrado com "${searchTerm}" na categoria "${getCategoryName(selectedFilterCategoryId)}".`;
    }
    if (searchTerm) return `Nenhum produto encontrado com "${searchTerm}".`;
    if (selectedFilterCategoryId) return `Nenhum produto encontrado na categoria "${getCategoryName(selectedFilterCategoryId)}".`;
    return "Nenhum produto cadastrado.";
  };

  const handleToggleSelectProduct = (productId: string) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    const allFilteredIds = new Set(filteredProducts.map(p => p.id));
    const currentSelectedFiltered = new Set(
      Array.from(selectedProductIds).filter(id => allFilteredIds.has(id))
    );
    
    if (currentSelectedFiltered.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProductIds(prev => {
        const newSet = new Set(prev);
        allFilteredIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedProductIds(prev => new Set([...Array.from(prev), ...Array.from(allFilteredIds)]));
    }
  };

  const isAllFilteredSelected = filteredProducts.length > 0 && 
    filteredProducts.every(p => selectedProductIds.has(p.id));

  // PDF generation (simplified)
  const generateProductsPdf = (productsToExport: Product[], priceOption: 'cash' | 'card' | 'both') => {
    if (!jsPDF || !autoTable) {
      alert('Funcionalidade de PDF não disponível.');
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
      let yPos = 15;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Tabela de Preços de Produtos", pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 10, yPos, { align: 'right' });
      yPos += 10;

      const head: string[][] = [[]];
      head[0].push("Produto");
      head[0].push("Unidade");
      if (priceOption === 'cash' || priceOption === 'both') head[0].push("Preço à Vista (R$)");
      if (priceOption === 'card' || priceOption === 'both') head[0].push("Preço Cartão (R$)");
      
      const body = productsToExport.map(product => {
        const { cashPrice, cardPrice } = getEffectivePrices(product);
        const row: (string | number)[] = [
          product.name, 
          product.pricingModel === PricingModel.PER_SQUARE_METER ? 'm²' : (product.unit || 'un')
        ];
        if (priceOption === 'cash' || priceOption === 'both') row.push(formatCurrency(cashPrice));
        if (priceOption === 'card' || priceOption === 'both') row.push(formatCurrency(cardPrice));
        return row;
      });

      autoTable(doc, {
        startY: yPos,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [40, 40, 40], textColor: [255,255,255] },
        bodyStyles: { textColor: [0,0,0] },
        margin: { left: 10, right: 10 }
      });

      doc.save(`Tabela_Produtos_${new Date().toISOString().slice(0,10)}.pdf`);
      setIsExportDropdownOpen(false);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Verifique o console para mais detalhes.');
    }
  };

  const handleExportPdf = (exportType: 'all_filtered' | 'selected') => {
    let productsToExport: Product[] = [];
    if (exportType === 'selected') {
      if (selectedProductIds.size === 0) {
        alert("Nenhum produto selecionado.");
        return;
      }
      productsToExport = products.filter(p => selectedProductIds.has(p.id));
    } else { 
      if (filteredProducts.length === 0) {
        alert("Nenhum produto na lista atual.");
        return;
      }
      productsToExport = filteredProducts;
    }
    generateProductsPdf(productsToExport, priceExportOption);
  };

  // Debug: Log do estado atual
  console.log('🐛 ProductsPage State:', {
    isLoading,
    error,
    productsCount: products.length,
    categoriesCount: categories.length,
    hasCompanyInfo: !!companyInfo
  });

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-400">Carregando produtos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500 bg-red-900/20 rounded-md">
        <p className="font-semibold">Erro ao carregar página de produtos:</p>
        <p className="mt-2">{error}</p>
        <Button 
          onClick={() => {
            setError(null);
            fetchData();
          }} 
          variant="primary" 
          className="mt-4"
        >
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 text-gray-300">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center w-full md:w-auto">
          <SquaresPlusIcon className="h-8 w-8 text-yellow-500 mr-3 hidden sm:block" />
          <h2 className="text-2xl font-semibold text-white">Gerenciamento de Produtos</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <Input 
            id="productSearch" 
            type="text" 
            placeholder="Pesquisar por nome..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full sm:w-40" 
          />
          
          <Select 
            id="categoryFilter" 
            options={filterCategoryOptions} 
            value={selectedFilterCategoryId} 
            onChange={(e) => setSelectedFilterCategoryId(e.target.value)} 
            className="w-full sm:w-40" 
          />
          
          <div className="relative" ref={exportDropdownRef}>
            <Button 
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)} 
              variant="secondary" 
              size="sm" 
              iconRight={<ChevronDownIcon className="w-4 h-4"/>} 
              className="w-full sm:w-auto" 
              title="Exportar para PDF"
            >
              <DocumentTextIcon className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Exportar</span>
            </Button>
            
            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-20 p-4 space-y-3">
                <Select 
                  label="Incluir Preços:" 
                  options={[
                    { value: 'both', label: 'Ambos (À Vista e Cartão)' }, 
                    { value: 'cash', label: 'Apenas Preço à Vista' }, 
                    { value: 'card', label: 'Apenas Preço Cartão' }
                  ]} 
                  value={priceExportOption} 
                  onChange={(e) => setPriceExportOption(e.target.value as any)} 
                />
                <Button 
                  onClick={() => handleExportPdf('selected')} 
                  variant="primary" 
                  className="w-full" 
                  disabled={selectedProductIds.size === 0}
                >
                  Exportar {selectedProductIds.size} Selecionado(s)
                </Button>
                <Button 
                  onClick={() => handleExportPdf('all_filtered')} 
                  variant="outline" 
                  className="w-full"
                >
                  Exportar Lista Atual ({filteredProducts.length})
                </Button>
              </div>
            )}
          </div>
          
          <Button 
            onClick={openModalForNew} 
            variant="primary" 
            size="sm" 
            className="w-full sm:w-auto" 
            title="Adicionar Produto"
          >
            <PlusIcon className="w-4 h-4"/>
            <span className="hidden sm:inline ml-2">Adicionar</span>
          </Button>
        </div>
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
          <p className="mt-1 text-sm text-gray-400">{getNoResultsMessage()}</p>
        </div>
      ) : (
        <div className="bg-gray-800 shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Input 
                    type="checkbox" 
                    checked={isAllFilteredSelected} 
                    onChange={handleToggleSelectAllFiltered} 
                    aria-label="Selecionar todos" 
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Preço Base (Vista)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Preço Cartão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {filteredProducts.map(product => {
                const { cashPrice, cardPrice } = getEffectivePrices(product);
                return (
                  <tr 
                    key={product.id} 
                    className={`hover:bg-gray-700/50 ${selectedProductIds.has(product.id) ? 'bg-gray-700' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <Input 
                        type="checkbox" 
                        checked={selectedProductIds.has(product.id)} 
                        onChange={() => handleToggleSelectProduct(product.id)} 
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{product.name}</div>
                      <div className="text-xs text-gray-400 truncate max-w-xs">{product.description}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {getCategoryName(product.categoryId)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      R$ {cashPrice.toFixed(2)} / {product.pricingModel === PricingModel.PER_SQUARE_METER ? 'm²' : (product.unit || 'un')}
                      {product.customCashPrice && <span className="text-xs text-yellow-400 ml-1">(M)</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      R$ {cardPrice.toFixed(2)} / {product.pricingModel === PricingModel.PER_SQUARE_METER ? 'm²' : (product.unit || 'un')}
                      {product.customCardPrice && <span className="text-xs text-yellow-400 ml-1">(M)</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Button 
                          onClick={() => openModalForEdit(product)} 
                          variant="secondary" 
                          size="sm" 
                          title="Editar"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                        <Button 
                          onClick={() => handleDelete(product.id)} 
                          variant="danger" 
                          size="sm" 
                          title="Excluir"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
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
              {isEditing ? 'Editar Produto' : 'Novo Produto'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input 
                label="Nome do Produto" 
                name="name" 
                value={currentProduct.name} 
                onChange={handleInputChange} 
                required 
              />
              
              <div className="relative">
                <Textarea 
                  label="Descrição" 
                  name="description" 
                  value={currentProduct.description} 
                  onChange={handleInputChange} 
                  rows={3} 
                />
                {generateProductDescriptionIdea && (
                  <Button 
                    type="button" 
                    onClick={handleGenerateDescription} 
                    isLoading={aiDescriptionLoading} 
                    disabled={aiDescriptionLoading} 
                    variant="secondary" 
                    size="xs" 
                    className="absolute bottom-3 right-3" 
                    iconLeft={<LightBulbIcon className="w-4 h-4" />}
                  >
                    {aiDescriptionLoading ? 'Gerando...' : 'Sugerir (IA)'}
                  </Button>
                )}
              </div>
              
              <Select 
                label="Categoria" 
                name="categoryId" 
                value={currentProduct.categoryId || ''} 
                onChange={handleInputChange} 
                options={modalCategoryOptions} 
              />
              
              <Select 
                label="Precificação" 
                name="pricingModel" 
                value={currentProduct.pricingModel} 
                onChange={handlePricingModelChange} 
                options={pricingModelOptions} 
                required 
              />
              
              <Input 
                label={currentProduct.pricingModel === PricingModel.PER_SQUARE_METER ? "Unidade (m²)" : "Unidade de Venda"} 
                name="unit" 
                value={currentProduct.unit} 
                onChange={handleInputChange} 
                disabled={currentProduct.pricingModel === PricingModel.PER_SQUARE_METER && currentProduct.unit === 'm²'} 
              />
              
              <Input 
                label={`Preço Base (p/ ${unitLabel})`} 
                name="basePrice" 
                type="number" 
                step="0.01" 
                value={currentProduct.basePrice} 
                onChange={handleInputChange} 
                required 
              />
              
              <div className="p-3 bg-gray-700 rounded-md">
                <p className="text-sm font-medium">Preços Calculados (p/ {unitLabel}):</p>
                <p className="text-xs">Vista: R$ {currentProduct.basePrice.toFixed(2)}</p>
                <p className="text-xs">Cartão: R$ {calculateCardPrice(currentProduct.basePrice).toFixed(2)}</p>
              </div>
              
              <Input 
                label={`Preço Manual Vista (Opcional)`} 
                name="customCashPrice" 
                type="number" 
                step="0.01" 
                value={currentProduct.customCashPrice ?? ''} 
                onChange={handleInputChange} 
              />
              
              <Input 
                label={`Preço Manual Cartão (Opcional)`} 
                name="customCardPrice" 
                type="number" 
                step="0.01" 
                value={currentProduct.customCardPrice ?? ''} 
                onChange={handleInputChange} 
              />
              
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  {isSubmitting ? "Salvando..." : (isEditing ? 'Salvar' : 'Adicionar')}
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