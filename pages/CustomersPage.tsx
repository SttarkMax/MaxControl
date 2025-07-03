
import React, { useState, useEffect, useCallback } from 'react';
import { Customer, Quote, DownPaymentEntry } from '../types';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Select from '../components/common/Select';
import UserGroupIcon from '../components/icons/UserGroupIcon';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PencilIcon from '../components/icons/PencilIcon';
import ArchiveBoxIcon from '../components/icons/ArchiveBoxIcon'; 
import CurrencyDollarIcon from '../components/icons/CurrencyDollarIcon';
import ViewQuoteDetailsModal from '../components/ViewQuoteDetailsModal';
import GlobalQuoteHistoryModal from '../components/GlobalQuoteHistoryModal';
import { translateQuoteStatus, formatCurrency, formatDateForInput, apiGetCustomers, apiGetQuotes, apiSaveCustomer, apiDeleteCustomer } from '../utils'; 
import Spinner from '../components/common/Spinner';

const initialCustomerState: Omit<Customer, 'id'> = {
  name: '',
  documentType: 'CPF',
  documentNumber: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  postalCode: '',
  downPayments: [],
};

const initialNewDownPaymentState = { amount: 0, date: formatDateForInput(new Date()), description: '' };

interface CustomersPageProps {
  openGlobalViewDetailsModal: (quote: Quote) => void;
}

const CustomersPage: React.FC<CustomersPageProps> = ({ openGlobalViewDetailsModal }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); 
  const [currentCustomer, setCurrentCustomer] = useState<Partial<Customer>>(initialCustomerState);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isViewDetailsInEditModalOpen, setIsViewDetailsInEditModalOpen] = useState(false);
  const [selectedQuoteForDetailsInEditModal, setSelectedQuoteForDetailsInEditModal] = useState<Quote | null>(null);

  const [isCustomerHistoryModalOpen, setIsCustomerHistoryModalOpen] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);

  const [newDownPayment, setNewDownPayment] = useState(initialNewDownPaymentState);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [customersData, quotesData] = await Promise.all([apiGetCustomers(), apiGetQuotes()]);
      const parsedCustomers = customersData.map(c => ({ ...c, downPayments: c.downPayments || [] }));
      setCustomers(parsedCustomers);
      setAllQuotes(quotesData);
    } catch (err: any) {
      setError(err.message || "Falha ao carregar dados. Tente recarregar a página.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCustomerInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentCustomer(prev => ({ ...prev, [name]: value }));
  };

  const handleNewDownPaymentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewDownPayment(prev => ({ ...prev, [name]: name === 'amount' ? (parseFloat(value) || 0) : value }));
  };

  const handleAddDownPayment = () => {
    if (newDownPayment.amount <= 0) { alert("O valor do sinal deve ser maior que zero."); return; }
    if (!newDownPayment.date) { alert("A data do sinal é obrigatória."); return; }
    const entry: DownPaymentEntry = { id: `dp-${Date.now()}`, ...newDownPayment };
    setCurrentCustomer(prev => ({ ...prev, downPayments: [...(prev.downPayments || []), entry] }));
    setNewDownPayment(initialNewDownPaymentState);
  };

  const handleDeleteDownPayment = (downPaymentId: string) => {
    if (window.confirm("Tem certeza que deseja remover este sinal?")) {
      setCurrentCustomer(prev => ({ ...prev, downPayments: prev.downPayments?.filter(dp => dp.id !== downPaymentId) }));
    }
  };

  const openModalForNew = () => {
    setCurrentCustomer(initialCustomerState);
    setNewDownPayment(initialNewDownPaymentState);
    setIsEditing(false);
    setIsEditModalOpen(true);
  };

  const openModalForEdit = (customer: Customer) => {
    setCurrentCustomer({ ...customer, downPayments: customer.downPayments || [] });
    setNewDownPayment(initialNewDownPaymentState);
    setIsEditing(true);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setCurrentCustomer(initialCustomerState);
    setNewDownPayment(initialNewDownPaymentState);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiSaveCustomer(currentCustomer as Customer);
      await loadData();
      closeEditModal();
    } catch (err: any) {
      alert(`Falha ao salvar cliente: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (customerId: string) => {
    const relatedQuotesCount = allQuotes.filter(q => q.customerId === customerId).length;
    let confirmMessage = 'Tem certeza que deseja excluir este cliente?';
    if (relatedQuotesCount > 0) {
      confirmMessage += `\n\nATENÇÃO: Este cliente possui ${relatedQuotesCount} orçamento(s) associado(s). A exclusão do cliente também removerá estes orçamentos.`;
    }
    if (window.confirm(confirmMessage)) {
      try {
        await apiDeleteCustomer(customerId);
        await loadData();
      } catch (err: any) {
        alert(`Falha ao excluir cliente: ${err.message}`);
      }
    }
  };

  const handleOpenDetailsInEditModal = (quote: Quote) => {
    setSelectedQuoteForDetailsInEditModal(quote);
    setIsViewDetailsInEditModalOpen(true);
  };
  
  const handleOpenCustomerAllQuotesHistory = (customer: Customer) => {
    setSelectedCustomerForHistory(customer);
    setIsCustomerHistoryModalOpen(true);
  };
  
  const documentTypeOptions = [{ value: 'CPF', label: 'CPF' }, { value: 'CNPJ', label: 'CNPJ' }, { value: 'N/A', label: 'N/A' }];

  const calculateTotalDownPayment = (downPayments?: DownPaymentEntry[]): number => (downPayments || []).reduce((total, dp) => total + dp.amount, 0);

  if (isLoading) return <div className="p-6 text-center"><Spinner size="lg" /></div>;
  if (error) return <div className="p-6 text-center text-red-500 bg-red-900/20 rounded-md">{error}</div>;

  return (
    <div className="p-6 text-gray-300">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center"><UserGroupIcon className="h-8 w-8 text-yellow-500 mr-3" /><h2 className="text-2xl font-semibold text-white">Gerenciamento de Clientes</h2></div>
        <Button onClick={openModalForNew} variant="primary" iconLeft={<PlusIcon className="w-5 h-5"/>}>Adicionar Cliente</Button>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-10 bg-gray-800 shadow-xl rounded-lg">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-white">Nenhum cliente cadastrado</h3>
          <p className="mt-1 text-sm text-gray-400">Comece adicionando um novo cliente.</p>
          <div className="mt-6"><Button onClick={openModalForNew} variant="primary" iconLeft={<PlusIcon className="w-4 h-4"/>}>Adicionar Cliente</Button></div>
        </div>
      ) : (
        <div className="bg-gray-800 shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ações</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Sinal?</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Telefone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {customers.map(customer => {
                const totalSinal = calculateTotalDownPayment(customer.downPayments);
                return (
                  <tr key={customer.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap space-x-2"><Button onClick={() => handleOpenCustomerAllQuotesHistory(customer)} variant="outline" size="xs" iconLeft={<ArchiveBoxIcon className="w-4 h-4"/>} title="Histórico"/><Button onClick={() => openModalForEdit(customer)} variant="secondary" size="xs" iconLeft={<PencilIcon className="w-4 h-4"/>} title="Editar"/><Button onClick={() => handleDelete(customer.id)} variant="danger" size="xs" iconLeft={<TrashIcon className="w-4 h-4"/>} title="Excluir"/></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">{totalSinal > 0 ? <CurrencyDollarIcon className="w-5 h-5 text-green-500 mx-auto" title={`Total: ${formatCurrency(totalSinal)}`} /> : <span className="text-gray-500">-</span>}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{customer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{customer.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{customer.email || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto text-gray-300">
            <h3 className="text-xl font-semibold mb-6 text-white">{isEditing ? 'Editar Cliente' : 'Adicionar Cliente'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Nome / Razão Social" name="name" value={currentCustomer.name || ''} onChange={handleCustomerInputChange} required />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="Tipo Documento" name="documentType" value={currentCustomer.documentType || 'CPF'} onChange={handleCustomerInputChange} options={documentTypeOptions} />
                <Input label="Número Documento" name="documentNumber" value={currentCustomer.documentNumber || ''} onChange={handleCustomerInputChange} disabled={currentCustomer.documentType === 'N/A'} />
              </div>
              <Input label="Telefone" name="phone" type="tel" value={currentCustomer.phone || ''} onChange={handleCustomerInputChange} required />
              <Input label="Email" name="email" type="email" value={currentCustomer.email || ''} onChange={handleCustomerInputChange} />
              <Textarea label="Endereço" name="address" value={currentCustomer.address || ''} onChange={handleCustomerInputChange} rows={2} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Cidade" name="city" value={currentCustomer.city || ''} onChange={handleCustomerInputChange} />
                <Input label="CEP" name="postalCode" value={currentCustomer.postalCode || ''} onChange={handleCustomerInputChange} />
              </div>

              <div className="pt-4 border-t border-gray-600 mt-6">
                <h4 className="text-lg font-semibold text-gray-100 mb-3">Sinais / Adiantamentos</h4>
                {(currentCustomer.downPayments || []).length > 0 && (
                  <div className="mb-4 max-h-40 overflow-y-auto pr-2 space-y-2">
                    {currentCustomer.downPayments?.map(dp => (<div key={dp.id} className="p-3 bg-gray-700 rounded-md flex justify-between items-start"><div><p className="text-sm font-medium text-white">{formatCurrency(dp.amount)}</p><p className="text-xs text-gray-300">Data: {new Date(dp.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>{dp.description && <p className="text-xs text-gray-400 mt-1">{dp.description}</p>}</div><Button onClick={() => handleDeleteDownPayment(dp.id)} variant="danger" size="xs" iconLeft={<TrashIcon className="w-3 h-3"/>} /></div>))}
                  </div>
                )}
                <div className="p-3 border border-gray-600 rounded-md space-y-3">
                  <h5 className="text-md font-medium text-gray-200">Adicionar Novo Sinal</h5>
                  <Input label="Valor" name="amount" type="number" step="0.01" value={newDownPayment.amount === 0 ? '' : newDownPayment.amount} onChange={handleNewDownPaymentInputChange} />
                  <Input label="Data" name="date" type="date" value={newDownPayment.date} onChange={handleNewDownPaymentInputChange} />
                  <Textarea label="Descrição" name="description" value={newDownPayment.description} onChange={handleNewDownPaymentInputChange} rows={2} />
                  <Button type="button" onClick={handleAddDownPayment} variant="success" size="sm" iconLeft={<PlusIcon className="w-4 h-4"/>}>Adicionar Sinal</Button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6"><Button type="button" variant="secondary" onClick={closeEditModal}>Cancelar</Button><Button type="submit" variant="primary" isLoading={isSubmitting}>{isSubmitting ? "Salvando..." : 'Salvar'}</Button></div>
            </form>
          </div>
        </div>
      )}
      
      <ViewQuoteDetailsModal isOpen={isViewDetailsInEditModalOpen} onClose={() => setIsViewDetailsInEditModalOpen(false)} quote={selectedQuoteForDetailsInEditModal} />
      {selectedCustomerForHistory && <GlobalQuoteHistoryModal isOpen={isCustomerHistoryModalOpen} onClose={() => setIsCustomerHistoryModalOpen(false)} quotes={allQuotes.filter(q => q.customerId === selectedCustomerForHistory.id)} onViewDetails={openGlobalViewDetailsModal} modalTitle={`Histórico de ${selectedCustomerForHistory.name}`} />}
    </div>
  );
};

export default CustomersPage;
