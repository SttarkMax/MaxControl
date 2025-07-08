import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Product, Quote, QuoteItem, CompanyInfo, PricingModel, Customer, QuoteStatus, LoggedInUser } from '../types';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import Textarea from '../components/common/Textarea';
import DocumentTextIcon from '../components/icons/DocumentTextIcon';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';
import UserGroupIcon from '../components/icons/UserGroupIcon';
import { CARD_SURCHARGE_PERCENTAGE } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '../utils';
import { api } from '../services/apiService';
import Spinner from '../components/common/Spinner';

const initialQuickCustomerState: Customer = {
  id: '', name: '', documentType: 'CPF', documentNumber: '', phone: '', email: '', address: '', city: '', postalCode: '', downPayments: []
};

const today = new Date();
const sevenDaysFromToday = new Date();
sevenDaysFromToday.setDate(today.getDate() + 7);

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const paymentMethodOptions = [
  { value: '', label: 'Selecione...' },
  { value: 'Dinheiro', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'Cartão de Débito', label: 'Cartão de Débito' },
  { value: 'Cartão de Crédito 1x', label: 'Cartão de Crédito 1x' },
  { value: 'Cartão de Crédito 2x', label: 'Cartão de Crédito 2x' },
  { value: 'Cartão de Crédito 3x', label: 'Cartão de Crédito 3x' },
  { value: 'Cartão de Crédito 4x', label: 'Cartão de Crédito 4x' },
  { value: 'Cartão de Crédito 5x', label: 'Cartão de Crédito 5x' },
  { value: 'Cartão de Crédito 6x', label: 'Cartão de Crédito 6x' },
  { value: 'Cartão de Crédito 7x', label: 'Cartão de Crédito 7x' },
  { value: 'Cartão de Crédito 8x', label: 'Cartão de Crédito 8x' },
  { value: 'Cartão de Crédito 9x', label: 'Cartão de Crédito 9x' },
  { value: 'Cartão de Crédito 10x', label: 'Cartão de Crédito 10x' },
  { value: 'Boleto Bancário', label: 'Boleto Bancário' },
  { value: 'Transferência Bancária', label: 'Transferência Bancária' },
  { value: 'Outro', label: 'Outro (especificar)' },
];

const getInstallmentDetails = (paymentMethod: string | undefined, totalAmountForInstallments: number) => {
    if (!paymentMethod || !paymentMethod.toLowerCase().includes('cartão de crédito') || !paymentMethod.includes('x') || totalAmountForInstallments <= 0) {
      return null;
    }
    const match = paymentMethod.match(/(\d+)x/);
    if (match && match[1]) {
      const installments = parseInt(match[1], 10);
      if (installments > 0) {
        return {
          count: installments,
          value: totalAmountForInstallments / installments,
        };
      }
    }
    return null;
};

interface CreateQuotePageProps {
  currentUser: LoggedInUser | null;
}

const CreateQuotePage: React.FC<CreateQuotePageProps> = ({ currentUser }) => {
  const { quoteId } = useParams<{ quoteId?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!quoteId;

  // Data from API
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  // Quote state
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerAvailableCredit, setCustomerAvailableCredit] = useState<number>(0);
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantityForUnitProduct, setQuantityForUnitProduct] = useState<number>(1);
  const [itemWidth, setItemWidth] = useState<number>(1);
  const [itemHeight, setItemHeight] = useState<number>(1);
  const [itemCountForArea, setItemCountForArea] = useState<number>(1);
  const [currentQuoteNumber, setCurrentQuoteNumber] = useState<string>('');
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>('draft');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'none'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [customPaymentMethod, setCustomPaymentMethod] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(formatDateForInput(today));
  const [deliveryDeadline, setDeliveryDeadline] = useState<string>(formatDateForInput(sevenDaysFromToday));
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string>('');

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState<Customer>(initialQuickCustomerState);
  const [isSavingQuickCustomer, setIsSavingQuickCustomer] = useState(false);
  const [pageTitle, setPageTitle] = useState('Criar Novo Orçamento');

  const selectedProductDetails = products.find(p => p.id === selectedProductId);

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productsData, customersData, companyInfoData] = await Promise.all([
        api.get('/api/products'),
        api.get('/api/customers'),
        api.get('/api/settings/company-info')
      ]);
      setProducts(productsData);
      setCustomers(customersData);
      setCompanyInfo(companyInfoData);

      if (isEditMode && quoteId) {
        setPageTitle('Editando Orçamento...');
        const quoteToEdit = await api.get(`/api/quotes/${quoteId}`);
        setPageTitle(`Editar Orçamento - ${quoteToEdit.quoteNumber}`);
        setSelectedCustomerId(quoteToEdit.customerId || '');
        setClientName(quoteToEdit.clientName);
        setClientContact(quoteToEdit.clientContact || '');
        setQuoteItems(quoteToEdit.items);
        setDiscountType(quoteToEdit.discountType);
        setDiscountValue(quoteToEdit.discountValue);
        setSelectedPaymentMethod(quoteToEdit.selectedPaymentMethod || '');
        setPaymentDate(quoteToEdit.paymentDate ? quoteToEdit.paymentDate.split('T')[0] : formatDateForInput(today));
        setDeliveryDeadline(quoteToEdit.deliveryDeadline ? quoteToEdit.deliveryDeadline.split('T')[0] : formatDateForInput(sevenDaysFromToday));
        setQuoteNotes(quoteToEdit.notes || '');
        setCurrentQuoteNumber(quoteToEdit.quoteNumber);
        setQuoteStatus(quoteToEdit.status);
        setOriginalCreatedAt(quoteToEdit.createdAt);
      }
    } catch (error) {
      console.error("Failed to load initial data:", error);
      alert(`Falha ao carregar dados: ${error}`);
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  }, [quoteId, isEditMode, navigate]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        setClientName(customer.name);
        setClientContact(customer.phone || customer.email || '');
        const totalCredit = (customer.downPayments || []).reduce((sum, dp) => sum + dp.amount, 0);
        setCustomerAvailableCredit(totalCredit);
      }
    } else {
        if (!isEditMode) {
          setClientName('');
          setClientContact('');
        }
        setCustomerAvailableCredit(0);
    }
  }, [selectedCustomerId, customers, isEditMode]);

  const getProductPrice = (product: Product, type: 'cash' | 'card'): number => {
    const baseCash = product.customCashPrice ?? product.basePrice;
    if (type === 'cash') return baseCash;
    return product.customCardPrice ?? (baseCash * (1 + CARD_SURCHARGE_PERCENTAGE / 100));
  };

  const handleAddItem = () => {
    if (!selectedProductId) {
      alert("Selecione um produto.");
      return;
    }
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const unitPrice = getProductPrice(product, 'cash');
    let newItem: QuoteItem;

    if (product.pricingModel === PricingModel.PER_SQUARE_METER) {
      if (itemWidth <= 0 || itemHeight <= 0 || itemCountForArea <= 0) {
        alert("Para produtos por m², insira Largura, Altura e Nº de Peças válidos.");
        return;
      }
      const calculatedArea = itemWidth * itemHeight * itemCountForArea;
      newItem = {
        productId: product.id,
        productName: product.name,
        quantity: calculatedArea,
        unitPrice: unitPrice,
        totalPrice: unitPrice * calculatedArea,
        pricingModel: product.pricingModel,
        width: itemWidth,
        height: itemHeight,
        itemCountForAreaCalc: itemCountForArea,
      };
    } else {
      if (quantityForUnitProduct <= 0) {
        alert("Insira uma quantidade válida.");
        return;
      }
      newItem = {
        productId: product.id,
        productName: product.name,
        quantity: quantityForUnitProduct,
        unitPrice: unitPrice,
        totalPrice: unitPrice * quantityForUnitProduct,
        pricingModel: product.pricingModel,
      };
    }

    setQuoteItems([...quoteItems, newItem]);
    setSelectedProductId('');
    setQuantityForUnitProduct(1);
    setItemWidth(1);
    setItemHeight(1);
    setItemCountForArea(1);
  };

  const handleRemoveItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const calculateAllTotals = () => {
    const subtotal = quoteItems.reduce((acc, item) => acc + item.totalPrice, 0);
    let discountAmountCalculated = 0;
    if (discountType === 'percentage') {
      discountAmountCalculated = (subtotal * discountValue) / 100;
    } else if (discountType === 'fixed') {
      discountAmountCalculated = discountValue;
    }
    discountAmountCalculated = Math.max(0, Math.min(discountAmountCalculated, subtotal));
    const subtotalAfterDiscount = subtotal - discountAmountCalculated;
    const totalCash = subtotalAfterDiscount;
    const totalCard = totalCash * (1 + CARD_SURCHARGE_PERCENTAGE / 100);
    return { subtotal, discountAmountCalculated, subtotalAfterDiscount, totalCash, totalCard };
  };

  const { subtotal, discountAmountCalculated, subtotalAfterDiscount, totalCash, totalCard } = calculateAllTotals();

  const handleSaveQuote = async (statusToSave: QuoteStatus) => {
    if (!clientName && !selectedCustomerId) {
      alert("Selecione um cliente ou insira um nome."); return;
    }
    if (quoteItems.length === 0) {
      alert("Adicione pelo menos um item."); return;
    }
    if (!currentUser) {
      alert("Usuário não encontrado. Faça login novamente."); return;
    }

    setIsSaving(true);
    const quoteData: Partial<Quote> = {
      id: quoteId,
      customerId: selectedCustomerId || undefined,
      clientName,
      clientContact,
      items: quoteItems,
      subtotal,
      discountType,
      discountValue,
      discountAmountCalculated,
      subtotalAfterDiscount,
      totalCash,
      totalCard,
      selectedPaymentMethod: selectedPaymentMethod === 'Outro' ? customPaymentMethod : selectedPaymentMethod,
      paymentDate,
      deliveryDeadline,
      notes: quoteNotes,
      status: statusToSave,
      salespersonUsername: currentUser.username,
      salespersonFullName: currentUser.fullName,
      createdAt: isEditMode ? originalCreatedAt : new Date().toISOString()
    };
    
    try {
        let savedQuote;
        if (isEditMode) {
            savedQuote = await api.put(`/api/quotes/${quoteId}`, quoteData);
        } else {
            savedQuote = await api.post('/api/quotes', quoteData);
        }
        alert(`Orçamento ${savedQuote.quoteNumber} salvo com sucesso!`);
        if(statusToSave !== 'draft') {
            navigate('/');
        } else if (!isEditMode) {
            navigate(`/quotes/edit/${savedQuote.id}`); // Go to edit mode for the new draft
        }
        // If it is a draft and in edit mode, just stay
    } catch (error) {
        console.error("Failed to save quote:", error);
        alert(`Erro ao salvar orçamento: ${error}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleSaveQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomer.name || !quickCustomer.phone) {
        alert("Nome e telefone são obrigatórios.");
        return;
    }
    setIsSavingQuickCustomer(true);
    try {
        const newCustomer = await api.post('/api/customers', quickCustomer);
        setCustomers([...customers, newCustomer]);
        setSelectedCustomerId(newCustomer.id);
        setIsQuickCustomerModalOpen(false);
        setQuickCustomer(initialQuickCustomerState);
    } catch (error) {
        console.error("Failed to save quick customer:", error);
        alert(`Erro ao salvar cliente: ${error}`);
    } finally {
        setIsSavingQuickCustomer(false);
    }
  };
  
  if (isLoading) {
    return <div className="p-6 flex justify-center items-center"><Spinner size="lg" /></div>;
  }
  
  if (!currentUser || !companyInfo && !isEditMode) {
    return (
      <div className="p-6 bg-[#1d1d1d] shadow-xl rounded-lg text-center text-white">
        <DocumentTextIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white">Dados Incompletos</h2>
        <p className="text-gray-300">{!companyInfo ? "Configure as informações da empresa primeiro." : "Usuário não identificado. Faça login."}</p>
        <Button onClick={() => navigate(!companyInfo ? '/settings' : '/login')} variant="primary" className="mt-4">
          Ir para {!companyInfo ? "Configurações" : "Login"}
        </Button>
      </div>
    );
  }

  const productOptions = products.map(p => ({
    value: p.id,
    label: `${p.name} (${p.pricingModel === PricingModel.PER_UNIT ? `Por ${p.unit || 'un'}` : 'Por m²'}) - ${formatCurrency(getProductPrice(p, 'cash'))}`
  }));

  const customerOptions = [{ value: '', label: 'Selecione ou digite um nome...' }, ...customers.map(c => ({ value: c.id, label: `${c.name} (${c.documentNumber || c.phone || 'N/A'})` }))];
  
  // Render JSX
  return (
    <div className="p-6 bg-black text-white">
      <div className="flex items-center mb-6">
        <DocumentTextIcon className="h-8 w-8 text-yellow-500 mr-3" />
        <h2 className="text-2xl font-semibold text-white">{pageTitle}</h2>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 items-end">
        <div className="md:col-span-2">
            <Select
                label="Cliente"
                options={customerOptions}
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
            />
        </div>
        <Button
            onClick={() => setIsQuickCustomerModalOpen(true)}
            variant="secondary"
            iconLeft={<PlusIcon className="w-4 h-4 mr-1"/>}
        >
            Novo Cliente Rápido
        </Button>
      </div>
      {!selectedCustomerId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
            <Input label="Nome do Cliente (Manual)" value={clientName} onChange={(e) => setClientName(e.target.value)} disabled={!!selectedCustomerId} />
            <Input label="Contato do Cliente (Manual)" value={clientContact} onChange={(e) => setClientContact(e.target.value)} disabled={!!selectedCustomerId}/>
          </div>
      )}
      {selectedCustomerId && clientName && (
          <div className="mb-4 p-3 bg-[#1d1d1d] border border-[#282828] rounded-md text-sm text-white">
              <p><strong>Cliente Selecionado:</strong> {clientName}</p>
              {clientContact && <p><strong>Contato:</strong> {clientContact}</p>}
              {customers.find(c=>c.id === selectedCustomerId)?.documentNumber && <p><strong>Documento:</strong> {customers.find(c=>c.id === selectedCustomerId)?.documentType} {customers.find(c=>c.id === selectedCustomerId)?.documentNumber}</p>}
              {customerAvailableCredit > 0 && <p className="text-green-400"><strong>Sinal/Haver Disponível:</strong> {formatCurrency(customerAvailableCredit)}</p>}
          </div>
      )}

      <p className="text-sm text-gray-300 mb-6">
          Vendedor Responsável: <span className="font-medium text-white">{currentUser.fullName || currentUser.username}</span>
      </p>

       <div className="mb-6 p-4 border border-[#282828] rounded-md bg-[#1d1d1d]">
        <h3 className="text-lg font-medium text-white mb-3">Adicionar Itens ao Orçamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 items-end">
          <div className="md:col-span-2">
            <Select
              label="Produto"
              options={productOptions}
              value={selectedProductId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedProductId(e.target.value)}
              placeholder="Selecione um produto"
            />
          </div>

          {selectedProductDetails?.pricingModel === PricingModel.PER_SQUARE_METER && (
            <>
              <Input
                label="Largura (m)"
                type="number"
                value={itemWidth}
                onChange={(e) => setItemWidth(Number(e.target.value))}
                min="0.01" step="0.01"
              />
              <Input
                label="Altura (m)"
                type="number"
                value={itemHeight}
                onChange={(e) => setItemHeight(Number(e.target.value))}
                min="0.01" step="0.01"
              />
              <Input
                label="Nº de Peças"
                type="number"
                value={itemCountForArea}
                onChange={(e) => setItemCountForArea(Number(e.target.value))}
                min="1" step="1"
              />
              {itemWidth > 0 && itemHeight > 0 && itemCountForArea > 0 &&
                <p className="text-sm text-gray-300 md:mt-6">
                    Área calculada: {(itemWidth * itemHeight * itemCountForArea).toFixed(2)} m²
                </p>
              }
            </>
          )}

          {selectedProductDetails?.pricingModel === PricingModel.PER_UNIT && (
            <Input
              label={`Quantidade (${selectedProductDetails?.unit || 'un'})`}
              type="number"
              value={quantityForUnitProduct}
              onChange={(e) => setQuantityForUnitProduct(Number(e.target.value))}
              min="1"
            />
          )}

           <div className="md:col-span-2 grid grid-cols-1 items-end">
            <Button onClick={handleAddItem} iconLeft={<PlusIcon className="w-5 h-5"/>} disabled={!selectedProductId} className="w-full mt-4 md:mt-0">Adicionar Item</Button>
           </div>
        </div>
      </div>
      
        {quoteItems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">Itens do Orçamento</h3>
          <div className="overflow-x-auto border border-[#282828] rounded-md bg-[#1d1d1d]">
            <table className="min-w-full divide-y divide-[#282828]">
              <thead className="bg-[#282828]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Produto</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Qtd./Detalhes</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Preço Unit. (Base)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Total Item (Base)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Ação</th>
                </tr>
              </thead>
              <tbody className="bg-black divide-y divide-[#282828]">
                {quoteItems.map((item, index) => {
                  const product = products.find(p => p.id === item.productId);
                  let qtyDisplay = '';
                  if (item.pricingModel === PricingModel.PER_SQUARE_METER) {
                    qtyDisplay = `${item.quantity.toFixed(2)} m²`;
                    if(item.width && item.height && item.itemCountForAreaCalc) {
                        qtyDisplay += ` (${item.width}m x ${item.height}m x ${item.itemCountForAreaCalc}pç)`;
                    }
                  } else {
                    qtyDisplay = `${item.quantity} ${product?.unit || 'un'}`;
                  }
                  return (
                    <tr key={index} className="hover:bg-[#1d1d1d]">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-white">{item.productName}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-200">{qtyDisplay}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-200">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-200">{formatCurrency(item.totalPrice)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Button onClick={() => handleRemoveItem(index)} variant="danger" size="xs" iconLeft={<TrashIcon className="w-4 h-4"/>} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Other form parts */}
        <div className="mb-6 p-4 border border-[#282828] rounded-md bg-[#1d1d1d]">
        <h3 className="text-lg font-medium text-white mb-3">Descontos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Select
            label="Tipo de Desconto"
            options={[
              { value: 'none', label: 'Nenhum' },
              { value: 'percentage', label: 'Porcentagem (%)' },
              { value: 'fixed', label: 'Valor Fixo (R$)' },
            ]}
            value={discountType}
            onChange={(e) => {
              setDiscountType(e.target.value as 'percentage' | 'fixed' | 'none');
              if (e.target.value === 'none') setDiscountValue(0);
            }}
          />
          <Input
            label="Valor do Desconto"
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
            disabled={discountType === 'none'}
            min="0"
          />
          {discountAmountCalculated > 0 && (
             <p className="text-sm text-green-400 md:mt-6">Desconto aplicado: {formatCurrency(discountAmountCalculated)}</p>
          )}
        </div>
      </div>
       <div className="mb-6 p-4 border border-[#282828] rounded-md bg-[#1d1d1d]">
        <h3 className="text-lg font-medium text-white mb-3">Informações de Pagamento e Entrega</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            label="Forma de Pagamento"
            options={paymentMethodOptions}
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
          />
          {selectedPaymentMethod === 'Outro' && (
            <Input
              label="Especifique a Forma de Pagamento"
              type="text"
              value={customPaymentMethod}
              onChange={(e) => setCustomPaymentMethod(e.target.value)}
            />
          )}
          <Input
            label="Data de Pagamento (Estimada)"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="text-white"
            style={{ colorScheme: 'dark' }}
          />
          <Input
            label="Prazo de Entrega (Estimado)"
            type="date"
            value={deliveryDeadline}
            onChange={(e) => setDeliveryDeadline(e.target.value)}
            className="text-white"
            style={{ colorScheme: 'dark' }}
          />
        </div>
         <Textarea
            label="Observações Adicionais (para orçamento/recibo)"
            name="quoteNotes"
            value={quoteNotes}
            onChange={(e) => setQuoteNotes(e.target.value)}
            rows={3}
            className="mt-4"
        />
      </div>

       {quoteItems.length > 0 && (
        <div className="mt-6 p-6 bg-[#1d1d1d] rounded-lg shadow-xl">
          <h3 className="text-xl font-semibold text-white mb-4 text-center">Resumo do Orçamento</h3>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-300">Subtotal:</span>
              <span className="font-medium text-white">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmountCalculated > 0 && (
              <>
                <div className="flex justify-between text-red-400">
                  <span className="text-gray-300">Desconto Aplicado:</span>
                  <span className="font-medium">- {formatCurrency(discountAmountCalculated)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-100">
                  <span>Subtotal com Desconto:</span>
                  <span>{formatCurrency(subtotalAfterDiscount)}</span>
                </div>
              </>
            )}
          </div>
          <hr className="my-3 border-[#282828]"/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center mb-3">
            <div>
              <p className="text-md font-medium text-gray-200">TOTAL (À VISTA)</p>
              <p className="text-2xl font-bold text-yellow-500">{formatCurrency(totalCash)}</p>
            </div>
            <div>
              <p className="text-md font-medium text-gray-200">TOTAL (CARTÃO)</p>
              <p className="text-2xl font-bold text-yellow-400">{formatCurrency(totalCard)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col md:flex-row justify-end space-y-3 md:space-y-0 md:space-x-3 [&>*]:w-full md:[&>*]:w-auto">
        <Button onClick={() => handleSaveQuote('draft')} variant="secondary" size="lg" isLoading={isSaving} disabled={isSaving}>
            {isEditMode ? 'Salvar Alterações do Rascunho' : 'Salvar Rascunho'}
        </Button>
        <Button onClick={() => handleSaveQuote('sent')} variant="primary" size="lg" isLoading={isSaving} disabled={isSaving}>
            {isEditMode ? 'Atualizar e Marcar como Enviado' : 'Salvar e Marcar como Enviado'}
        </Button>
         <Button onClick={() => handleSaveQuote('accepted')} variant="success" size="lg" isLoading={isSaving} disabled={isSaving || !selectedPaymentMethod}>
            {isEditMode ? 'Atualizar e Marcar como Aceito' : 'Salvar e Marcar como Aceito'}
        </Button>
      </div>

       {isQuickCustomerModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-black p-8 rounded-lg shadow-xl w-full max-w-lg text-white border border-[#282828]">
            <h3 className="text-xl font-semibold mb-6 text-white">Adicionar Novo Cliente (Rápido)</h3>
            <form onSubmit={handleSaveQuickCustomer} className="space-y-4">
              <Input label="Nome / Razão Social" name="name" value={quickCustomer.name} onChange={(e) => setQuickCustomer({...quickCustomer, name: e.target.value})} required />
              <Input label="Telefone" name="phone" type="tel" value={quickCustomer.phone} onChange={(e) => setQuickCustomer({...quickCustomer, phone: e.target.value})} required />
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setIsQuickCustomerModalOpen(false)}>Cancelar</Button>
                <Button type="submit" variant="primary" isLoading={isSavingQuickCustomer}>{isSavingQuickCustomer ? "Salvando..." : 'Adicionar Cliente'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateQuotePage;
