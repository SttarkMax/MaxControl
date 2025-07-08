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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../utils';
import { api } from '../services/apiService';

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
  const [aiDescriptionLoading, setAiDescriptionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterCategoryId, setSelectedFilterCategoryId] = useState<string>('');

  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [priceExportOption, setPriceExportOption] = useState<'cash' | 'card' | 'both'>('both');
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData, companyInfoData] = await Promise.all([
        api.get('/api/products'),
        api.get('/api/categories'),
        api.get('/api/settings/company-info'),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setCompanyInfo(companyInfoData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      alert("Falha ao carregar dados do servidor.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentProduct(prev => ({ 
      ...prev, 
      [name]: name === 'basePrice' || name === 'customCashPrice' || name === 'customCardPrice' || name === 'supplierCost' ? parseFloat(value) || 0 : value 
    }));
  };
  
  const handlePricingModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPricingModel = e.target.value as PricingModel;
    setCurrentProduct(prev => ({ 
      ...prev, 
      pricingModel: newPricingModel,
      unit: newPricingModel === PricingModel.PER_SQUARE_METER ? 'm²' : (prev.unit === 'm²' ? 'un' : (prev.unit || 'un')) 
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
    const productToSave = {
      ...currentProduct,
      categoryId: currentProduct.categoryId === '' ? null : currentProduct.categoryId
    };

    try {
        if (isEditing) {
            await api.put(`/api/products/${productToSave.id}`, productToSave);
        } else {
            await api.post('/api/products', productToSave);
        }
        await fetchData(); // Refetch all data to stay in sync
        closeModal();
    } catch (error) {
        console.error("Failed to save product:", error);
        alert(`Erro ao salvar produto: ${error}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
        try {
            await api.delete(`/api/products/${productId}`);
            setSelectedProductIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(productId);
                return newSet;
            });
            await fetchData();
        } catch (error) {
            console.error("Failed to delete product:", error);
            alert(`Erro ao excluir produto: ${error}`);
        }
    }
  };

  const handleGenerateDescription = async () => {
    if (!currentProduct.name || !currentProduct.pricingModel) {
      alert("Por favor, insira o nome e o tipo do produto primeiro.");
      return;
    }
    setAiDescriptionLoading(true);
    try {
      const { description: idea } = await api.post('/api/ai/generate-description', {
        productName: currentProduct.name,
        productType: currentProduct.pricingModel
      });
      setCurrentProduct(prev => ({ ...prev, description: idea }));
    } catch (error) {
      console.error("Failed to generate description:", error);
      alert("Falha ao gerar descrição. Verifique o console para mais detalhes.");
    } finally {
      setAiDescriptionLoading(false);
    }
  };

  const calculateCardPrice = (basePrice: number) => {
    return basePrice * (1 + CARD_SURCHARGE_PERCENTAGE / 100);
  };

  const getEffectivePrices = (product: Product) => {
    const cashPrice = product.customCashPrice ?? product.basePrice;
    const cardPrice = product.customCardPrice ?? calculateCardPrice(cashPrice);
    return { cashPrice, cardPrice };
  };

  const pricingModelOptions = [
    { value: PricingModel.PER_UNIT, label: 'Por Unidade/Pacote' },
    { value: PricingModel.PER_SQUARE_METER, label: 'Por Metro Quadrado (m²)' },
  ];
  
  const unitLabel = currentProduct.pricingModel === PricingModel.PER_SQUARE_METER 
    ? 'm²' 
    : (currentProduct.unit || 'unidade de venda');

  const modalCategoryOptions = [
    { value: '', label: 'Nenhuma categoria' },
    ...categories.map(cat => ({ value: cat.id, label: cat.name }))
  ];

  const filterCategoryOptions = [
    { value: '', label: 'Todas as Categorias' },
    ...categories.map(cat => ({ value: cat.id, label: cat.name }))
  ];
  
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return '-';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : '-';
  };

  const filteredProducts = products.filter(product => {
    const nameMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryMatch = selectedFilterCategoryId ? product.categoryId === selectedFilterCategoryId : true;
    return nameMatch && categoryMatch;
  });

  const getNoResultsMessage = () => {
    const selectedCategoryName = getCategoryName(selectedFilterCategoryId);
    if (searchTerm && selectedFilterCategoryId) {
      return `Nenhum produto encontrado com o termo "${searchTerm}" na categoria "${selectedCategoryName}".`;
    }
    if (searchTerm) {
      return `Nenhum produto encontrado com o termo "${searchTerm}".`;
    }
    if (selectedFilterCategoryId) {
      return `Nenhum produto encontrado na categoria "${selectedCategoryName}".`;
    }
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

  const isAllFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.has(p.id));

  const generateProductsPdf = (productsToExport: Product[], priceOption: 'cash' | 'card' | 'both') => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    const margin = 10;
    let yPos = 15; 
    const lineHeight = 4.5; 

    // Company Header
    if (companyInfo) {
      let companyDetailsX = margin;
      let potentialLogoHeight = 0;
      const logoForPdf = companyInfo.logoUrlLightBg;

      if (logoForPdf && logoForPdf.startsWith('data:image')) {
        try {
          const imageMimeType = logoForPdf.substring(logoForPdf.indexOf(':') + 1, logoForPdf.indexOf(';'));
          const imageFormat = imageMimeType.split('/')[1]?.toUpperCase();
          
          if (imageFormat && (imageFormat === 'PNG' || imageFormat === 'JPEG' || imageFormat === 'JPG')) {
            const maxLogoDisplayWidth = 35; 
            const maxLogoDisplayHeight = 20; 
            doc.addImage(logoForPdf, imageFormat, margin, yPos, maxLogoDisplayWidth, maxLogoDisplayHeight);
            companyDetailsX = margin + maxLogoDisplayWidth + 5; 
            potentialLogoHeight = maxLogoDisplayHeight;
          } else {
             console.warn(`Formato de logo (PDF) não suportado: ${imageFormat}. Apenas PNG, JPEG/JPG são bem suportados. Logo não adicionado.`);
          }
        } catch (e) { 
            console.error("Error adding logo to PDF:", e);
        }
      }
      
      let textYPos = yPos; 
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
      doc.text(companyInfo.name, companyDetailsX, textYPos); textYPos += (lineHeight + 1.5);
      
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      if (companyInfo.address) {
        const addressLines = doc.splitTextToSize(companyInfo.address, pageWidth - companyDetailsX - margin);
        doc.text(addressLines, companyDetailsX, textYPos); textYPos += (addressLines.length * lineHeight);
      }
      
      let contactLine = '';
      if (companyInfo.phone) contactLine += `Tel: ${companyInfo.phone}`;
      if (companyInfo.email) contactLine += `${companyInfo.phone ? ' | ' : ''}Email: ${companyInfo.email}`;
      if (contactLine) { 
        doc.text(contactLine, companyDetailsX, textYPos); textYPos += lineHeight; 
      }
      
      if (companyInfo.cnpj) {
        doc.text(`CNPJ: ${companyInfo.cnpj}`, companyDetailsX, textYPos); textYPos += lineHeight;
      }

      let webContactLine = '';
       if (companyInfo.website) webContactLine += `Site: ${companyInfo.website}`;
       if (companyInfo.instagram) webContactLine += `${companyInfo.website ? ' | ' : ''}Instagram: ${companyInfo.instagram}`;
       if (webContactLine) {
         doc.text(webContactLine, companyDetailsX, textYPos); textYPos += lineHeight;
       }
      
      const headerBlockBottomY = Math.max(textYPos, yPos + potentialLogoHeight);
      yPos = headerBlockBottomY + 8; // Padding below header
    } else {
      yPos = margin + 5; 
    }

    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(0,0,0);
    doc.text("Tabela de Preços de Produtos", pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(50,50,50);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 10;

    // Table
    const head: string[][] = [[]];
    head[0].push("Produto");
    head[0].push("Unidade");
    if (priceOption === 'cash' || priceOption === 'both') {
      head[0].push("Preço à Vista (R$)");
    }
    if (priceOption === 'card' || priceOption === 'both') {
      head[0].push("Preço Cartão (R$)");
    }
    
    const body = productsToExport.map(product => {
      const { cashPrice, cardPrice } = getEffectivePrices(product);
      const row: (string | number)[] = [];
      row.push(product.name);
      row.push(product.pricingModel === PricingModel.PER_SQUARE_METER ? 'm²' : (product.unit || 'un'));
      if (priceOption === 'cash' || priceOption === 'both') {
        row.push(formatCurrency(cashPrice));
      }
      if (priceOption === 'card' || priceOption === 'both') {
        row.push(formatCurrency(cardPrice));
      }
      return row;
    });

    autoTable(doc, {
      startY: yPos,
      head: head,
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [40, 40, 40], textColor: [255,255,255], fontStyle: 'bold' },
      bodyStyles: { textColor: [0,0,0], cellPadding: 1.5, fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { left: margin, right: margin },
      tableWidth: 'auto',
      styles: { cellWidth: 'wrap', font: 'helvetica', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 'auto' as const }, // Product name
        1: { cellWidth: 30 },    // Unit
        2: { cellWidth: 40, halign: 'right' as const }, // Cash Price
        3: { cellWidth: 40, halign: 'right' as const }, // Card Price
      },
      didDrawPage: (data: any) => { 
        doc.setFontSize(8);
        doc.setTextColor(100,100,100);
        doc.text(`Página ${data.pageNumber}`, data.settings.margin.left, pageHeight - margin / 2);
      }
    });

    doc.save(`Tabela_Produtos_${new Date().toISOString().slice(0,10)}.pdf`);
    setIsExportDropdownOpen(false);
  };

  const handleExportPdf = (exportType: 'all_filtered' | 'selected') => {
    let productsToExport: Product[] = [];
    if (exportType === 'selected') {
      if (selectedProductIds.size === 0) {
        alert("Nenhum produto selecionado para exportar.");
        return;
      }
      productsToExport = products.filter(p => selectedProductIds.has(p.id));
    } else { 
      if (filteredProducts.length === 0) {
        alert("Nenhum produto na lista atual para exportar.");
        return;
      }
      productsToExport = filteredProducts;
    }
    
    if (productsToExport.length === 0) {
      alert("Nenhum produto para exportar.");
      return;
    }
    generateProductsPdf(productsToExport, priceExportOption);
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
              <span className="hidden sm:inline ml-2">Exportar para PDF</span>
            </Button>
            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-black border border-[#282828] rounded-md shadow-lg z-20 p-4 space-y-3">
                <Select
                  label="Incluir Preços:"
                  options={[
                    { value: 'both', label: 'Ambos (À Vista e Cartão)' },
                    { value: 'cash', label: 'Apenas Preço à Vista' },
                    { value: 'card', label: 'Apenas Preço Cartão' },
                  ]}
                  value={priceExportOption}
                  onChange={(e) => setPriceExportOption(e.target.value as 'cash' | 'card' | 'both')}
                />
                <Button 
                  onClick={() => handleExportPdf('selected')} 
                  variant="primary" 
                  className="w-full"
                  disabled={selectedProductIds.size === 0}
                >
                  Exportar {selectedProductIds.size} Selecionado(s)
                </Button>
                <Button onClick={() => handleExportPdf('all_filtered')} variant="outline" className="w-full">
                  Exportar Lista Atual ({filteredProducts.length})
                </Button>
              </div>
            )}
          </div>
          <Button onClick={openModalForNew} variant="primary" size="sm" className="w-full sm:w-auto" title="Adicionar Produto">
            <PlusIcon className="w-4 h-4"/>
            <span className="hidden sm:inline ml-2">Adicionar Produto</span>
          </Button>
        </div>
      </div>

      {products.length === 0 && !isLoading ? (
        <div className="text-center py-10 bg-[#1d1d1d] shadow-xl rounded-lg">
          <SquaresPlusIcon className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-white">Nenhum produto cadastrado</h3>
          <p className="mt-1 text-sm text-gray-400">Comece adicionando um novo produto.</p>
          <div className="mt-6">
            <Button onClick={openModalForNew} variant="primary" iconLeft={<PlusIcon className="w-4 h-4"/>}>
              Adicionar Produto
            </Button>
          </div>
        </div>
      ) : filteredProducts.length === 0 && !isLoading ? (
        <div className="text-center py-10 bg-[#1d1d1d] shadow-xl rounded-lg">
          <SquaresPlusIcon className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-white">Nenhum produto encontrado</h3>
          <p className="mt-1 text-sm text-gray-400">
            {getNoResultsMessage()} Limpe a busca/filtro ou tente um termo diferente.
          </p>
        </div>
      ) : (
        <div className="bg-[#1d1d1d] shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-[#282828]">
            <thead className="bg-[#282828]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <Input 
                    type="checkbox" 
                    className="form-checkbox h-4 w-4 text-yellow-500 bg-[#282828] border-gray-600 rounded focus:ring-yellow-400"
                    checked={isAllFilteredSelected}
                    onChange={handleToggleSelectAllFiltered}
                    aria-label="Selecionar todos os produtos visíveis"
                    title={isAllFilteredSelected ? "Desmarcar todos os visíveis" : "Marcar todos os visíveis"}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Modelo Preço</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Preço Base (À Vista)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Preço Cartão (Calc.)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-[#282828]">
              {filteredProducts.map(product => {
                const { cashPrice, cardPrice } = getEffectivePrices(product);
                return (
                  <tr key={product.id} className={`hover:bg-[#1d1d1d] ${selectedProductIds.has(product.id) ? 'bg-[#282828]' : ''}`}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Input 
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-yellow-500 bg-[#282828] border-gray-600 rounded focus:ring-yellow-400"
                        checked={selectedProductIds.has(product.id)}
                        onChange={() => handleToggleSelectProduct(product.id)}
                        aria-label={`Selecionar produto ${product.name}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{product.name}</div>
                      <div className="text-xs text-gray-400 truncate max-w-xs">{product.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {getCategoryName(product.categoryId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {product.pricingModel === PricingModel.PER_UNIT ? `Por Unidade/Pacote (${product.unit || 'un'})` : `Por m²`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                      {formatCurrency(cashPrice)} {product.pricingModel === PricingModel.PER_SQUARE_METER ? '/m²' : `/ ${product.unit || 'un'}`}
                      {product.customCashPrice != null && <span className="text-xs text-yellow-400 ml-1">(Manual)</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                      {formatCurrency(cardPrice)} {product.pricingModel === PricingModel.PER_SQUARE_METER ? '/m²' : `/ ${product.unit || 'un'}`}
                      {product.customCardPrice != null && <span className="text-xs text-yellow-400 ml-1">(Manual)</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                          <Button 
                              onClick={() => openModalForEdit(product)} 
                              variant="secondary" 
                              size="sm" 
                              title="Editar"
                          >
                              <PencilIcon className="w-4 h-4" />
                              <span className="hidden md:inline ml-2">Editar</span>
                          </Button>
                          <Button 
                              onClick={() => handleDelete(product.id)} 
                              variant="danger" 
                              size="sm" 
                              title="Excluir"
                          >
                              <TrashIcon className="w-4 h-4" />
                              <span className="hidden md:inline ml-2">Excluir</span>
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
        <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-black p-6 md:p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-white border border-[#282828]">
            <h3 className="text-xl font-semibold mb-6 text-white">{isEditing ? 'Editar Produto' : 'Adicionar Novo Produto'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input 
                label="Nome do Produto" 
                name="name" 
                value={currentProduct.name} 
                onChange={handleInputChange} 
                placeholder={currentProduct.pricingModel === PricingModel.PER_UNIT ? "Ex: Cartão de Visita Pacote 500un" : "Ex: Lona Fosca"}
                required 
              />
              
              <div className="relative">
                <Textarea label="Descrição" name="description" value={currentProduct.description} onChange={handleInputChange} rows={3} />
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
              </div>
              
              <Select
                label="Categoria"
                name="categoryId"
                value={currentProduct.categoryId || ''}
                onChange={handleInputChange}
                options={modalCategoryOptions}
                placeholder="Selecione uma categoria"
              />

              <Select 
                label="Modelo de Precificação" 
                name="pricingModel" 
                value={currentProduct.pricingModel} 
                onChange={handlePricingModelChange} 
                options={pricingModelOptions} 
                required 
              />
              <Input 
                label={currentProduct.pricingModel === PricingModel.PER_SQUARE_METER ? "Unidade de Medida (m²)" : "Unidade de Venda"}
                name="unit" 
                value={currentProduct.unit} 
                onChange={handleInputChange} 
                placeholder={currentProduct.pricingModel === PricingModel.PER_SQUARE_METER ? 'm²' : "ex: pacote c/ 500, unidade, pç"}
                disabled={currentProduct.pricingModel === PricingModel.PER_SQUARE_METER && currentProduct.unit === 'm²'}
              />
              <Input 
                label={`Preço Base (para cálculo à vista, por ${unitLabel})`}
                name="basePrice" 
                type="number" 
                step="0.01" 
                value={currentProduct.basePrice} 
                onChange={handleInputChange} 
                required 
              />
              
              <div className="p-3 bg-[#1d1d1d] rounded-md mt-2">
                <p className="text-sm font-medium text-gray-200">Preços Calculados (por ${unitLabel}):</p>
                <p className="text-xs text-gray-300">À Vista (Base): {formatCurrency(currentProduct.basePrice)}</p>
                <p className="text-xs text-gray-300">Cartão (Base + {CARD_SURCHARGE_PERCENTAGE}%): {formatCurrency(calculateCardPrice(currentProduct.basePrice))}</p>
              </div>

              <Input 
                label={`Preço Manual à Vista (Opcional, por ${unitLabel})`}
                name="customCashPrice" 
                type="number" 
                step="0.01" 
                value={currentProduct.customCashPrice ?? ''} 
                onChange={handleInputChange} 
                placeholder="Deixe em branco para usar o preço base" 
              />
              <Input 
                label={`Preço Manual Cartão (Opcional, por ${unitLabel})`}
                name="customCardPrice" 
                type="number" 
                step="0.01" 
                value={currentProduct.customCardPrice ?? ''} 
                onChange={handleInputChange} 
                placeholder="Deixe em branco para usar o cálculo automático" 
              />
               <Input 
                label={`Custo Fornecedor (Opcional, por ${unitLabel})`}
                name="supplierCost" 
                type="number" 
                step="0.01" 
                value={currentProduct.supplierCost ?? ''} 
                onChange={handleInputChange} 
                placeholder="Custo do produto para cálculo de lucro"
              />
              
              <div className="flex flex-wrap justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>{isSubmitting ? "Salvando..." : (isEditing ? 'Salvar Alterações' : 'Adicionar Produto')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
