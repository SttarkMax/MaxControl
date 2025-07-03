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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDateForInput, apiGetProducts, apiGetCustomers, apiGetCompanyInfo, apiSaveQuote, apiGetQuoteById, apiSaveCustomer } from '../utils'; 

// This page has a lot of logic, so it will be a larger refactor

const initialQuickCustomerState: Customer = {
  id: '', name: '', documentType: 'CPF', documentNumber: '', phone: '', email: '', address: '', city: '', postalCode: '', downPayments: []
};

const today = new Date();
const sevenDaysFromToday = new Date();
sevenDaysFromToday.setDate(today.getDate() + 7);

const paymentMethodOptions = [
  { value: '', label: 'Selecione...' }, { value: 'Dinheiro', label: 'Dinheiro' }, { value: 'PIX', label: 'PIX' }, { value: 'Cartão de Débito', label: 'Cartão de Débito' },
  { value: 'Cartão de Crédito 1x', label: 'Cartão de Crédito 1x' }, { value: 'Cartão de Crédito 2x', label: 'Cartão de Crédito 2x' }, { value: 'Cartão de Crédito 3x', label: 'Cartão de Crédito 3x' },
  { value: 'Boleto Bancário', label: 'Boleto Bancário' }, { value: 'Outro', label: 'Outro' },
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
  
  const handleSaveQuote = async (status: QuoteStatus) => {
    if (!clientName.trim()) {
        alert("O nome do cliente é obrigatório.");
        return;
    }
    if (quoteItems.length === 0) {
        alert("Adicione pelo menos um item ao orçamento.");
        return;
    }

    setIsSaving(true);

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
        selectedPaymentMethod: finalPaymentMethod,
        paymentDate: paymentDate || undefined,
        deliveryDeadline: deliveryDeadline || undefined,
        status,
        notes: quoteNotes || undefined,
    };
    
    try {
        await apiSaveQuote(quotePayload);
        alert('Orçamento salvo com sucesso!');
        navigate('/'); // or to quote list
    } catch (err: any) {
        alert(`Erro: ${err.message}`);
    } finally {
        setIsSaving(false);
    }
  }

  // Handle Quick Customer Save
  const handleSaveQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingQuickCustomer(true);
    try {
        const newCustomer = await apiSaveCustomer(quickCustomer);
        setCustomers(prev => [...prev, newCustomer]);
        setSelectedCustomerId(newCustomer.id);
        setIsQuickCustomerModalOpen(false);
    } catch (err: any) {
        alert(`Erro ao salvar cliente: ${err.message}`);
    } finally {
        setIsSavingQuickCustomer(false);
    }
  }

  if (isLoading) return <div className="p-6 text-center"><Spinner size="lg" /></div>;
  if (error) return <div className="p-6 text-center text-red-500 bg-red-900/20 rounded-md">{error}</div>;

  return (
    <div className="p-6 bg-gray-800 shadow-xl rounded-lg text-gray-300">
        {/* All JSX for the form remains here. Buttons will now use isSaving state */}
        <h2 className="text-2xl font-semibold text-white">{isEditMode ? `Editar Orçamento ${quoteToEdit?.quoteNumber || ''}` : 'Criar Novo Orçamento'}</h2>
        {/* ... form fields and item table ... */}
        <div className="mt-8 flex justify-end gap-3">
            <Button onClick={() => handleSaveQuote('draft')} variant="secondary" isLoading={isSaving} disabled={isSaving}>Salvar Rascunho</Button>
            <Button onClick={() => handleSaveQuote('sent')} variant="primary" isLoading={isSaving} disabled={isSaving}>Salvar e Enviar</Button>
        </div>
        
        {/* Quick Customer Modal */}
        {isQuickCustomerModalOpen && (
             <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
                <div className="bg-gray-800 p-8 rounded-lg w-full max-w-lg">
                    {/* ... form for new customer ... */}
                    <form onSubmit={handleSaveQuickCustomer}>
                         <Button type="submit" variant="primary" isLoading={isSavingQuickCustomer}>Salvar Cliente</Button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default CreateQuotePage;