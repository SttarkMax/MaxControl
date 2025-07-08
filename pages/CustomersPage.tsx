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
import { translateQuoteStatus, formatCurrency, formatDateForInput } from '../utils';
import { api } from '../services/apiService';
import Spinner from '../components/common/Spinner';

const initialCustomerState: Customer = {
  id: '',
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

const initialNewDownPaymentState = {
  amount: 0,
  date: formatDateForInput(new Date()),
  description: '',
};

interface CustomersPageProps {
  openGlobalViewDetailsModal: (quote: Quote) => void;
}

const CustomersPage: React.FC<CustomersPageProps> = ({ openGlobalViewDetailsModal }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<Customer>(initialCustomerState);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [quotesForEditModal, setQuotesForEditModal] = useState<Quote[]>([]);

  const [isViewDetailsInEditModalOpen, setIsViewDetailsInEditModalOpen] = useState(false);
  const [selectedQuoteForDetailsInEditModal, setSelectedQuoteForDetailsInEditModal] = useState<Quote | null>(null);

  const [isCustomerHistoryModalOpen, setIsCustomerHistoryModalOpen] = useState(false);
  const [quotesForCustomerHistoryModal, setQuotesForCustomerHistoryModal] = useState<Quote[]>([]);
  const [customerNameForHistoryModal, setCustomerNameForHistoryModal] = useState<string>('');

  const [newDownPayment, setNewDownPayment] = useState(initialNewDownPaymentState);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/api/customers');
      setCustomers(data);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      alert("Falha ao carregar clientes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleCustomerInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentCustomer(prev => ({ ...prev, [name]: value }));
  };

  const handleNewDownPaymentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewDownPayment(prev => ({
        ...prev,
        [name]: name === 'amount' ? (parseFloat(value) || 0) : value
    }));
  };

  const handleAddDownPayment = () => {
    if (newDownPayment.amount <= 0) {
        alert("O valor do sinal deve ser maior que zero.");
        return;
    }
    if (!newDownPayment.date) {
        alert("A data do sinal é obrigatória.");
        return;
    }
    const entry: DownPaymentEntry = {
        id: `dp-${Date.now()}`,
        ...newDownPayment
    };
    setCurrentCustomer(prev => ({
        ...prev,
        downPayments: [...(prev.downPayments || []), entry]
    }));
    setNewDownPayment(initialNewDownPaymentState);
  };

  const handleDeleteDownPayment = (downPaymentId: string) => {
    if (window.confirm("Tem certeza que deseja remover este sinal? Esta ação será salva permanentemente ao salvar o cliente.")) {
        setCurrentCustomer(prev => ({
            ...prev,
            downPayments: prev.downPayments.filter(dp => dp.id !== downPaymentId)
        }));
    }
  };

  const openModalForNew = () => {
    setCurrentCustomer(initialCustomerState);
    setNewDownPayment(initialNewDownPaymentState);
    setQuotesForEditModal([]);
    setIsEditing(false);
    setIsEditModalOpen(true);
  };

  const openModalForEdit = async (customer: Customer) => {
    setCurrentCustomer(customer);
    setNewDownPayment(initialNewDownPaymentState);
    try {
      const relatedQuotes = await api.get(`/api/quotes?customerId=${customer.id}`);
      setQuotesForEditModal(relatedQuotes);
    } catch (error) {
      console.error("Failed to fetch related quotes:", error);
      setQuotesForEditModal([]);
    }
    setIsEditing(true);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setCurrentCustomer(initialCustomerState);
    setNewDownPayment(initialNewDownPaymentState);
    setQuotesForEditModal([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/api/customers/${currentCustomer.id}`, currentCustomer);
      } else {
        await api.post('/api/customers', currentCustomer);
      }
      await fetchCustomers();
      closeEditModal();
    } catch (error) {
      console.error("Failed to save customer:", error);
      alert(`Erro ao salvar cliente: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (customerId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita e desvinculará todos os orçamentos associados.')) {
        try {
            await api.delete(`/api/customers/${customerId}`);
            await fetchCustomers();
        } catch(error) {
            console.error("Failed to delete customer:", error);
            alert(`Erro ao excluir cliente: ${error}`);
        }
    }
  };

  const handleOpenCustomerAllQuotesHistory = async (customer: Customer) => {
    try {
        const customerQuotes = await api.get(`/api/quotes?customerId=${customer.id}`);
        setQuotesForCustomerHistoryModal(customerQuotes);
        setCustomerNameForHistoryModal(customer.name);
        setIsCustomerHistoryModalOpen(true);
    } catch (error) {
        console.error("Failed to load customer quote history:", error);
        alert("Falha ao carregar histórico de orçamentos do cliente.");
    }
  };

  const documentTypeOptions = [
    { value: 'CPF', label: 'CPF' },
    { value: 'CNPJ', label: 'CNPJ' },
    { value: 'N/A', label: 'Não Aplicável / Outro' },
  ];

  const calculateTotalDownPayment = (downPayments: DownPaymentEntry[]): number => {
    return (downPayments || []).reduce((total, dp) => total + dp.amount, 0);
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
          <UserGroupIcon className="h-8 w-8 text-yellow-500 mr-3" />
          <h2 className="text-2xl font-semibold text-white">Gerenciamento de Clientes</h2>
        </div>
        <Button onClick={openModalForNew} variant="primary" iconLeft={<PlusIcon className="w-5 h-5"/>}>
          Adicionar Cliente
        </Button>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-10 bg-[#1d1d1d] shadow-xl rounded-lg">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-white">Nenhum cliente cadastrado</h3>
          <p className="mt-1 text-sm text-gray-400">Comece adicionando um novo cliente.</p>
          <div className="mt-6">
            <Button onClick={openModalForNew} variant="primary" iconLeft={<PlusIcon className="w-4 h-4"/>}>
              Adicionar Cliente
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-[#1d1d1d] shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-[#282828]">
            <thead className="bg-[#282828]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Pedidos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Sinal?</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nome / Razão Social</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Telefone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-[#282828]">
              {customers.map(customer => {
                const totalSinal = calculateTotalDownPayment(customer.downPayments);
                const hasSinal = totalSinal > 0;
                return (
                  <tr key={customer.id} className="hover:bg-[#1d1d1d]">
                    <td className="px-6 py-4 whitespace-nowrap">
                       <Button
                          onClick={() => handleOpenCustomerAllQuotesHistory(customer)}
                          variant="outline"
                          size="xs"
                          iconLeft={<ArchiveBoxIcon className="w-4 h-4"/>}
                          title="Ver Histórico de Pedidos"
                        />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {hasSinal ? (
                        <CurrencyDollarIcon
                            className="w-5 h-5 text-green-500 mx-auto"
                            title={`Total Sinal: ${formatCurrency(totalSinal)} (${customer.downPayments.length} entrada${customer.downPayments.length !== 1 ? 's' : ''})`}
                        />
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{customer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                      {customer.documentType !== 'N/A' ? `${customer.documentType}: ${customer.documentNumber || ''}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{customer.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{customer.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Button onClick={() => openModalForEdit(customer)} variant="secondary" size="xs" iconLeft={<PencilIcon className="w-4 h-4"/>} title="Editar Cliente"/>
                      <Button onClick={() => handleDelete(customer.id)} variant="danger" size="xs" iconLeft={<TrashIcon className="w-4 h-4"/>} title="Excluir Cliente"/>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="bg-black p-6 md:p-8 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto text-white border border-[#282828]">
            <h3 className="text-xl font-semibold mb-6 text-white">{isEditing ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Customer Info Fields */}
              <Input label="Nome / Razão Social" name="name" value={currentCustomer.name} onChange={handleCustomerInputChange} required />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="Tipo de Documento" name="documentType" value={currentCustomer.documentType} onChange={handleCustomerInputChange} options={documentTypeOptions} />
                <Input label="Número do Documento" name="documentNumber" value={currentCustomer.documentNumber || ''} onChange={handleCustomerInputChange} disabled={currentCustomer.documentType === 'N/A'} />
              </div>
              <Input label="Telefone" name="phone" type="tel" value={currentCustomer.phone} onChange={handleCustomerInputChange} required />
              <Input label="Email (Opcional)" name="email" type="email" value={currentCustomer.email || ''} onChange={handleCustomerInputChange} />
              <Textarea label="Endereço (Rua, Nº, Bairro)" name="address" value={currentCustomer.address || ''} onChange={handleCustomerInputChange} rows={2} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Cidade (Opcional)" name="city" value={currentCustomer.city || ''} onChange={handleCustomerInputChange} />
                <Input label="CEP (Opcional)" name="postalCode" value={currentCustomer.postalCode || ''} onChange={handleCustomerInputChange} placeholder="Ex: 00000-000"/>
              </div>

              {/* Down Payments Section */}
              <div className="pt-4 border-t border-gray-700 mt-6">
                <h4 className="text-lg font-semibold text-gray-100 mb-3">Sinais / Adiantamentos</h4>

                {/* List Existing Down Payments */}
                {currentCustomer.downPayments && currentCustomer.downPayments.length > 0 && (
                  <div className="mb-4 max-h-40 overflow-y-auto pr-2 space-y-2">
                    {currentCustomer.downPayments.map(dp => (
                      <div key={dp.id} className="p-3 bg-[#282828] rounded-md flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-white">{formatCurrency(dp.amount)}</p>
                          <p className="text-xs text-gray-300">Data: {new Date(dp.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                          {dp.description && <p className="text-xs text-gray-400 mt-1">Descrição: {dp.description}</p>}
                        </div>
                        <Button
                          onClick={() => handleDeleteDownPayment(dp.id)}
                          variant="danger"
                          size="xs"
                          iconLeft={<TrashIcon className="w-3 h-3"/>}
                          className="ml-2 flex-shrink-0"
                        >
                          Excluir
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {(!currentCustomer.downPayments || currentCustomer.downPayments.length === 0) && (
                    <p className="text-sm text-gray-400 mb-3">Nenhum sinal registrado.</p>
                )}

                {/* Add New Down Payment Form */}
                <div className="p-3 border border-gray-700 rounded-md space-y-3">
                  <h5 className="text-md font-medium text-gray-200">Adicionar Novo Sinal</h5>
                  <Input
                      label="Valor do Sinal (R$)"
                      name="amount"
                      type="number"
                      step="0.01"
                      value={newDownPayment.amount === 0 ? '' : newDownPayment.amount}
                      onChange={handleNewDownPaymentInputChange}
                      placeholder="Ex: 50.00"
                  />
                  <Input
                      label="Data do Sinal"
                      name="date"
                      type="date"
                      value={newDownPayment.date}
                      onChange={handleNewDownPaymentInputChange}
                      className="text-white"
                      style={{ colorScheme: 'dark' }}
                  />
                  <Textarea
                      label="Descrição do Sinal (Opcional)"
                      name="description"
                      value={newDownPayment.description}
                      onChange={handleNewDownPaymentInputChange}
                      rows={2}
                      placeholder="Ex: Adiantamento para material X"
                  />
                  <Button type="button" onClick={handleAddDownPayment} variant="success" size="sm" iconLeft={<PlusIcon className="w-4 h-4"/>}>
                    Adicionar Sinal à Lista
                  </Button>
                </div>
              </div>

              {isEditing && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-md font-semibold text-gray-100">Histórico de Orçamentos/Pedidos ({quotesForEditModal.length})</h4>
                  </div>
                  {quotesForEditModal.length === 0 ? (
                    <p className="text-sm text-gray-400">Nenhum orçamento/pedido encontrado para este cliente.</p>
                  ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {quotesForEditModal.map(quote => (
                      <li key={quote.id} className="p-3 border border-[#282828] rounded-md text-sm hover:bg-[#3a3a3a]">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="font-medium text-yellow-400">{quote.quoteNumber}</span>
                                <span className="ml-2 text-xs text-gray-500">{new Date(quote.createdAt).toLocaleDateString('pt-BR')}</span>
                            </div>
                           <span className={`px-2 py-0.5 text-xs rounded-full ${
                                quote.status === 'accepted' ? 'bg-green-600 text-white'
                                : quote.status === 'draft' ? 'bg-yellow-600 text-black'
                                : 'bg-gray-600 text-gray-200'
                              }`}>{translateQuoteStatus(quote.status)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-gray-300">Total: {formatCurrency(quote.totalCash)}</span>
                            <Button variant="outline" size="xs" onClick={() => setSelectedQuoteForDetailsInEditModal(quote)}>
                                Ver Detalhes
                            </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6">
                <Button type="button" variant="secondary" onClick={closeEditModal} className="w-full sm:w-auto">Cancelar</Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting} className="w-full sm:w-auto">{isSubmitting ? "Salvando..." : (isEditing ? 'Salvar Alterações do Cliente' : 'Adicionar Cliente')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ViewQuoteDetailsModal
        isOpen={!!selectedQuoteForDetailsInEditModal}
        onClose={() => setSelectedQuoteForDetailsInEditModal(null)}
        quote={selectedQuoteForDetailsInEditModal}
      />

      <GlobalQuoteHistoryModal
        isOpen={isCustomerHistoryModalOpen}
        onClose={() => setIsCustomerHistoryModalOpen(false)}
        quotes={quotesForCustomerHistoryModal}
        onViewDetails={openGlobalViewDetailsModal}
        modalTitle={`Histórico de Orçamentos/Pedidos de ${customerNameForHistoryModal}`}
      />

    </div>
  );
};

export default CustomersPage;
