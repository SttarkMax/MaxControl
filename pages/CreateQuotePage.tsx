import React, { useState, useEffect, ChangeEvent } from 'react';
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
import Spinner from '../components/common/Spinner';
import { CARD_SURCHARGE_PERCENTAGE } from '../constants';
import { formatCurrency, formatDateForInput, apiGetProducts, apiGetCustomers, apiGetCompanyInfo, apiSaveQuote, apiGetQuoteById, apiSaveCustomer } from '../utils'; 

const initialQuickCustomerState: Customer = {
  id: '', name: '', documentType: 'CPF', documentNumber: '', phone: '', email: '', address: '', city: '', postalCode: '', downPayments: []
};

const today = new Date();
const sevenDaysFromToday = new Date();
sevenDaysFromToday.setDate(today.getDate() + 7);

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
  { value: 'Boleto Bancário', label: 'Boleto Bancário' }, 
  { value: 'Outro', label: 'Outro' },
];

const getInstallmentDetails = (paymentMethod: string | undefined, total: number) => {
    if (!paymentMethod || !paymentMethod.includes('x') || total <= 0) return null;
    const match = paymentMethod.match(/(\d+)x/);
    if (match && match[1]) {
        const installments = parseInt(match[1], 10);
        return { count: installments, value: total / installments };
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

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  // Loading and Error states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quote form states
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
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>('draft');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'none'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [customPaymentMethod, setCustomPaymentMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(formatDateForInput(today));
  const [deliveryDeadline, setDeliveryDeadline] = useState<string>(formatDateForInput(sevenDaysFromToday));
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [quoteToEdit, setQuoteToEdit] = useState<Quote | null>(null);
  
  // Modal states
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState<Customer>(initialQuickCustomerState);
  const [isSavingQuickCustomer, setIsSavingQuickCustomer] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [productsData, customersData, companyInfoData, quoteData] = await Promise.all([
                apiGetProducts(),
                apiGetCustomers(),
                apiGetCompanyInfo().catch(() => null),
                isEditMode ? apiGetQuoteById(quoteId) : Promise.resolve(null)
            ]);
            
            setProducts(productsData);
            setCustomers(customersData);
            setCompanyInfo(companyInfoData);

            if (quoteData) {
                setQuoteToEdit(quoteData);
                setSelectedCustomerId(quoteData.customerId || '');
                setClientName(quoteData.clientName);
                setClientContact(quoteData.clientContact || '');
                setQuoteItems(quoteData.items);
                setDiscountType(quoteData.discountType);
                setDiscountValue(quoteData.discountValue);
                setSelectedPaymentMethod(quoteData.selectedPaymentMethod || '');
                setPaymentDate(quoteData.paymentDate || formatDateForInput(new Date()));
                setDeliveryDeadline(quoteData.deliveryDeadline || formatDateForInput(sevenDaysFromToday));
                setQuoteNotes(quoteData.notes || '');
                setQuoteStatus(quoteData.status);
            }

        } catch (err: any) {
            setError(err.message || 'Falha ao carregar dados para a página de orçamento.');
        } finally {
            setIsLoading(false);
        }
    };
    fetchAllData();
  }, [quoteId, isEditMode]);

  // Calculate totals
  const subtotal = quoteItems.reduce((acc, item) => acc + item.totalPrice, 0);
  
  let discountAmountCalculated = 0;
  if (discountType === 'fixed') {
    discountAmountCalculated = Math.min(discountValue, subtotal);
  } else if (discountType === 'percentage') {
    discountAmountCalculated = subtotal * (discountValue / 100);
  }
  
  const subtotalAfterDiscount = subtotal - discountAmountCalculated;
  const totalCash = subtotalAfterDiscount;
  const totalCard = totalCash * (1 + CARD_SURCHARGE_PERCENTAGE / 100);

  // Customer selection handlers
  const handleCustomerChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    setSelectedCustomerId(customerId);
    
    if (customerId) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setClientName(customer.name);
        setClientContact(customer.phone || customer.email || '');
        // Calculate available credit
        const totalCredit = customer.downPayments?.reduce((sum, dp) => sum + dp.amount, 0) || 0;
        setCustomerAvailableCredit(totalCredit);
      }
    } else {
      setClientName('');
      setClientContact('');
      setCustomerAvailableCredit(0);
    }
  };

  // Product addition handlers
  const handleAddItem = () => {
    if (!selectedProductId) {
      alert("Selecione um produto primeiro.");
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    let quantity: number;
    let unitPrice: number;
    
    if (product.pricingModel === PricingModel.PER_SQUARE_METER) {
      if (itemWidth <= 0 || itemHeight <= 0 || itemCountForArea <= 0) {
        alert("Para produtos por m², informe largura, altura e quantidade válidas.");
        return;
      }
      quantity = itemWidth * itemHeight * itemCountForArea;
      unitPrice = product.customCashPrice ?? product.basePrice;
    } else {
      if (quantityForUnitProduct <= 0) {
        alert("Informe uma quantidade válida.");
        return;
      }
      quantity = quantityForUnitProduct;
      unitPrice = product.customCashPrice ?? product.basePrice;
    }

    const newItem: QuoteItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
      pricingModel: product.pricingModel,
      width: product.pricingModel === PricingModel.PER_SQUARE_METER ? itemWidth : undefined,
      height: product.pricingModel === PricingModel.PER_SQUARE_METER ? itemHeight : undefined,
      itemCountForAreaCalc: product.pricingModel === PricingModel.PER_SQUARE_METER ? itemCountForArea : undefined,
    };

    setQuoteItems(prev => [...prev, newItem]);
    
    // Reset form
    setSelectedProductId('');
    setQuantityForUnitProduct(1);
    setItemWidth(1);
    setItemHeight(1);
    setItemCountForArea(1);
  };

  const handleRemoveItem = (index: number) => {
    setQuoteItems(prev => prev.filter((_, i) => i !== index));
  };

  // Save handlers
  const handleSaveQuote = async (status: QuoteStatus) => {
    if (!clientName.trim()) {
      alert("O nome do cliente é obrigatório.");
      return;
    }
    if (quoteItems.length === 0) {
      alert("Adicione pelo menos um item ao orçamento.");
      return;
    }
    if (!currentUser) {
      alert("Usuário não autenticado.");
      return;
    }

    setIsSaving(true);

    const finalPaymentMethod = selectedPaymentMethod === 'Outro' ? customPaymentMethod : selectedPaymentMethod;

    const quotePayload = {
      id: quoteToEdit?.id,
      customerId: selectedCustomerId || undefined,
      clientName,
      clientContact: clientContact || undefined,
      items: quoteItems,
      subtotal,
      discountType,
      discountValue,
      discountAmountCalculated,
      subtotalAfterDiscount,
      totalCash,
      totalCard,
      downPaymentApplied: 0, // TODO: Implement down payment application
      selectedPaymentMethod: finalPaymentMethod,
      paymentDate: paymentDate || undefined,
      deliveryDeadline: deliveryDeadline || undefined,
      status,
      notes: quoteNotes || undefined,
      salespersonUsername: currentUser.username,
      salespersonFullName: currentUser.fullName,
    };
    
    try {
      await apiSaveQuote(quotePayload);
      alert('Orçamento salvo com sucesso!');
      navigate('/quotes/all');
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Customer handlers
  const handleQuickCustomerInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setQuickCustomer(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomer.name.trim()) {
      alert("Nome do cliente é obrigatório.");
      return;
    }
    setIsSavingQuickCustomer(true);
    try {
      const newCustomer = await apiSaveCustomer(quickCustomer);
      setCustomers(prev => [...prev, newCustomer]);
      setSelectedCustomerId(newCustomer.id);
      setClientName(newCustomer.name);
      setClientContact(newCustomer.phone || newCustomer.email || '');
      setIsQuickCustomerModalOpen(false);
      setQuickCustomer(initialQuickCustomerState);
    } catch (err: any) {
      alert(`Erro ao salvar cliente: ${err.message}`);
    } finally {
      setIsSavingQuickCustomer(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const customerOptions = [
    { value: '', label: 'Selecione um cliente ou deixe em branco' },
    ...customers.map(c => ({ value: c.id, label: c.name }))
  ];
  const productOptions = [
    { value: '', label: 'Selecione um produto' },
    ...products.map(p => ({ value: p.id, label: p.name }))
  ];
  const discountOptions = [
    { value: 'none', label: 'Sem desconto' },
    { value: 'percentage', label: 'Desconto em %' },
    { value: 'fixed', label: 'Desconto fixo (R$)' }
  ];

  if (isLoading) return <div className="p-6 text-center"><Spinner size="lg" /></div>;
  if (error) return <div className="p-6 text-center text-red-500 bg-red-900/20 rounded-md">{error}</div>;

  return (
    <div className="p-6 bg-gray-800 shadow-xl rounded-lg text-gray-300">
      <div className="flex items-center mb-6">
        <DocumentTextIcon className="h-8 w-8 text-yellow-500 mr-3" />
        <h2 className="text-2xl font-semibold text-white">
          {isEditMode ? `Editar Orçamento ${quoteToEdit?.quoteNumber || ''}` : 'Criar Novo Orçamento'}
        </h2>
      </div>

      {/* Customer Selection */}
      <div className="bg-gray-700 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Informações do Cliente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Cliente Cadastrado (Opcional)"
              value={selectedCustomerId}
              onChange={handleCustomerChange}
              options={customerOptions}
            />
            <div className="mt-2 flex gap-2">
              <Button 
                type="button" 
                variant="secondary" 
                size="sm"
                onClick={() => setIsQuickCustomerModalOpen(true)}
                iconLeft={<UserGroupIcon className="w-4 h-4" />}
              >
                Novo Cliente
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <Input
              label="Nome do Cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              placeholder="Nome obrigatório"
            />
            <Input
              label="Contato (Telefone/Email)"
              value={clientContact}
              onChange={(e) => setClientContact(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>
        {customerAvailableCredit > 0 && (
          <div className="mt-3 p-3 bg-green-900/30 border border-green-700 rounded-md">
            <p className="text-green-300 text-sm">
              💰 Cliente possui crédito disponível: {formatCurrency(customerAvailableCredit)}
            </p>
          </div>
        )}
      </div>

      {/* Add Items Section */}
      <div className="bg-gray-700 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Adicionar Produtos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            label="Produto"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            options={productOptions}
          />
          
          {selectedProduct && (
            <>
              {selectedProduct.pricingModel === PricingModel.PER_SQUARE_METER ? (
                <>
                  <Input
                    label="Largura (m)"
                    type="number"
                    step="0.01"
                    value={itemWidth}
                    onChange={(e) => setItemWidth(parseFloat(e.target.value) || 0)}
                    min="0.01"
                  />
                  <Input
                    label="Altura (m)"
                    type="number"
                    step="0.01"
                    value={itemHeight}
                    onChange={(e) => setItemHeight(parseFloat(e.target.value) || 0)}
                    min="0.01"
                  />
                  <Input
                    label="Quantidade de Peças"
                    type="number"
                    value={itemCountForArea}
                    onChange={(e) => setItemCountForArea(parseInt(e.target.value) || 0)}
                    min="1"
                  />
                  <div className="text-sm text-gray-400">
                    Área total: {(itemWidth * itemHeight * itemCountForArea).toFixed(2)} m²<br/>
                    Preço: {formatCurrency((selectedProduct.customCashPrice ?? selectedProduct.basePrice) * itemWidth * itemHeight * itemCountForArea)}
                  </div>
                </>
              ) : (
                <>
                  <Input
                    label={`Quantidade (${selectedProduct.unit || 'un'})`}
                    type="number"
                    value={quantityForUnitProduct}
                    onChange={(e) => setQuantityForUnitProduct(parseInt(e.target.value) || 0)}
                    min="1"
                  />
                  <div className="text-sm text-gray-400">
                    Preço unitário: {formatCurrency(selectedProduct.customCashPrice ?? selectedProduct.basePrice)}<br/>
                    Total: {formatCurrency((selectedProduct.customCashPrice ?? selectedProduct.basePrice) * quantityForUnitProduct)}
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <div className="mt-4">
          <Button
            type="button"
            variant="primary"
            onClick={handleAddItem}
            disabled={!selectedProductId}
            iconLeft={<PlusIcon className="w-4 h-4" />}
          >
            Adicionar Item
          </Button>
        </div>
      </div>

      {/* Items List */}
      {quoteItems.length > 0 && (
        <div className="bg-gray-700 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Itens do Orçamento</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-600">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Produto</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase">Qtd/Área</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Preço Unit.</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase">Total</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                {quoteItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-sm text-white">{item.productName}</td>
                    <td className="px-3 py-2 text-sm text-gray-300">
                      {item.pricingModel === PricingModel.PER_SQUARE_METER 
                        ? `${item.quantity.toFixed(2)} m²${item.width && item.height && item.itemCountForAreaCalc ? ` (${item.width}x${item.height}x${item.itemCountForAreaCalc})` : ''}`
                        : `${item.quantity} un`
                      }
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-300 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-3 py-2 text-sm text-white text-right font-semibold">{formatCurrency(item.totalPrice)}</td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        type="button"
                        variant="danger"
                        size="xs"
                        onClick={() => handleRemoveItem(index)}
                        iconLeft={<TrashIcon className="w-3 h-3" />}
                      >
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totals and Options */}
      <div className="bg-gray-700 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Totais e Configurações</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Discount */}
          <div>
            <Select
              label="Tipo de Desconto"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as any)}
              options={discountOptions}
            />
            {discountType !== 'none' && (
              <Input
                label={discountType === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'}
                type="number"
                step={discountType === 'percentage' ? '0.1' : '0.01'}
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                min="0"
                max={discountType === 'percentage' ? '100' : undefined}
              />
            )}
          </div>

          {/* Payment */}
          <div>
            <Select
              label="Forma de Pagamento"
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              options={paymentMethodOptions}
            />
            {selectedPaymentMethod === 'Outro' && (
              <Input
                label="Especificar Forma de Pagamento"
                value={customPaymentMethod}
                onChange={(e) => setCustomPaymentMethod(e.target.value)}
                placeholder="Ex: Transferência bancária"
              />
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Input
            label="Data de Pagamento"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
          <Input
            label="Prazo de Entrega"
            type="date"
            value={deliveryDeadline}
            onChange={(e) => setDeliveryDeadline(e.target.value)}
          />
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-gray-600 rounded-lg">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmountCalculated > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Desconto:</span>
                <span>- {formatCurrency(discountAmountCalculated)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t border-gray-500 pt-2">
              <span>Total à Vista:</span>
              <span className="text-green-400">{formatCurrency(totalCash)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total Cartão ({CARD_SURCHARGE_PERCENTAGE}% acréscimo):</span>
              <span className="text-yellow-400">{formatCurrency(totalCard)}</span>
            </div>
            {getInstallmentDetails(selectedPaymentMethod, selectedPaymentMethod?.toLowerCase().includes('cartão') ? totalCard : totalCash) && (
              <div className="text-xs text-gray-400">
                {(() => {
                  const details = getInstallmentDetails(selectedPaymentMethod, selectedPaymentMethod?.toLowerCase().includes('cartão') ? totalCard : totalCash);
                  return details ? `${details.count}x de ${formatCurrency(details.value)}` : '';
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-gray-700 p-4 rounded-lg mb-6">
        <Textarea
          label="Observações (Opcional)"
          value={quoteNotes}
          onChange={(e) => setQuoteNotes(e.target.value)}
          rows={3}
          placeholder="Observações adicionais sobre o orçamento..."
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <Button 
          type="button" 
          variant="secondary" 
          onClick={() => navigate('/quotes/all')}
          disabled={isSaving}
        >
          Cancelar
        </Button>
        <Button 
          type="button"
          variant="secondary" 
          onClick={() => handleSaveQuote('draft')} 
          isLoading={isSaving} 
          disabled={isSaving}
        >
          Salvar Rascunho
        </Button>
        <Button 
          type="button"
          variant="primary" 
          onClick={() => handleSaveQuote('sent')} 
          isLoading={isSaving} 
          disabled={isSaving}
        >
          {isEditMode ? 'Atualizar Orçamento' : 'Salvar e Enviar'}
        </Button>
      </div>

      {/* Quick Customer Modal */}
      {isQuickCustomerModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-6 text-white">Adicionar Novo Cliente</h3>
            <form onSubmit={handleSaveQuickCustomer} className="space-y-4">
              <Input
                label="Nome"
                name="name"
                value={quickCustomer.name}
                onChange={handleQuickCustomerInputChange}
                required
              />
              <Input
                label="Telefone"
                name="phone"
                value={quickCustomer.phone}
                onChange={handleQuickCustomerInputChange}
                required
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={quickCustomer.email}
                onChange={handleQuickCustomerInputChange}
              />
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsQuickCustomerModalOpen(false);
                    setQuickCustomer(initialQuickCustomerState);
                  }}
                  disabled={isSavingQuickCustomer}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSavingQuickCustomer}
                >
                  Salvar Cliente
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateQuotePage;