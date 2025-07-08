import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AccountsPayableEntry } from '../types';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Textarea from '../components/common/Textarea';
import BanknotesIcon from '../components/icons/BanknotesIcon';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PencilIcon from '../components/icons/PencilIcon';
import { formatCurrency, formatDateForInput } from '../utils';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData, ChartOptions } from 'chart.js';
import { api } from '../services/apiService';
import Spinner from '../components/common/Spinner';

ChartJS.register(ArcElement, Tooltip, Legend);

type FilterStatus = 'all' | 'paid' | 'pending';
type TimeFilter = 'all' | 'week' | 'month' | 'specific_month';
type ParcelType = 'none' | 'weekly' | 'monthly';

const initialFormState = {
  name: '',
  totalAmount: 0,
  dueDate: formatDateForInput(new Date()),
  isPaid: false,
  parcelType: 'none' as ParcelType,
  numberOfInstallments: 1,
  notes: '',
};

const AccountsPayablePage: React.FC = () => {
  const [entries, setEntries] = useState<AccountsPayableEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFormData, setCurrentFormData] = useState(initialFormState);
  const [editingEntry, setEditingEntry] = useState<AccountsPayableEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageIsLoading, setPageIsLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedFilterYear, setSelectedFilterYear] = useState<number>(new Date().getFullYear());
  const [selectedFilterMonth, setSelectedFilterMonth] = useState<number>(new Date().getMonth() + 1);

  const fetchEntries = useCallback(async () => {
    setPageIsLoading(true);
    try {
      const data = await api.get('/api/accounts-payable');
      setEntries(data.sort((a: AccountsPayableEntry, b: AccountsPayableEntry) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
    } catch (error) {
      console.error("Failed to fetch accounts payable:", error);
      alert("Falha ao carregar contas a pagar.");
    } finally {
      setPageIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setCurrentFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setCurrentFormData(prev => ({ ...prev, [name]: (name === 'totalAmount' || name === 'numberOfInstallments') ? parseFloat(value) || 0 : value }));
    }
  };

  const openModalForNew = () => {
    setEditingEntry(null);
    setCurrentFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openModalForEdit = (entry: AccountsPayableEntry) => {
    setEditingEntry(entry);
    setCurrentFormData({
      name: entry.name,
      totalAmount: entry.amount,
      dueDate: entry.dueDate,
      isPaid: entry.isPaid,
      parcelType: 'none',
      numberOfInstallments: 1,
      notes: entry.notes || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
    setCurrentFormData(initialFormState);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingEntry) {
        await api.put(`/api/accounts-payable/${editingEntry.id}`, {
            name: currentFormData.name,
            amount: currentFormData.totalAmount,
            dueDate: currentFormData.dueDate,
            isPaid: currentFormData.isPaid,
            notes: currentFormData.notes,
        });
      } else {
        await api.post('/api/accounts-payable', currentFormData);
      }
      await fetchEntries();
      closeModal();
    } catch (error) {
      console.error("Failed to save entry:", error);
      alert(`Erro ao salvar conta: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    const entryToDelete = entries.find(e => e.id === entryId);
    if (!entryToDelete) return;
    const confirmMsg = entryToDelete.seriesId
      ? `Esta é uma parcela. Deseja excluir apenas esta parcela ou todas as ${entryToDelete.totalInstallmentsInSeries} parcelas desta dívida?`
      : 'Tem certeza que deseja excluir esta dívida?';

    if (window.confirm(confirmMsg)) {
      try {
        if (entryToDelete.seriesId && window.confirm("OK para excluir a série, Cancelar para excluir só a parcela.")) {
            await api.delete(`/api/accounts-payable/series/${entryToDelete.seriesId}`);
        } else {
            await api.delete(`/api/accounts-payable/${entryId}`);
        }
        await fetchEntries();
      } catch (error) {
        alert(`Erro ao excluir: ${error}`);
      }
    }
  };

  const handleTogglePaid = async (entry: AccountsPayableEntry) => {
    try {
      await api.put(`/api/accounts-payable/${entry.id}`, { ...entry, isPaid: !entry.isPaid });
      await fetchEntries();
    } catch (error) {
      alert(`Erro ao atualizar status: ${error}`);
    }
  };
  
  const filteredEntries = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)));
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 7));
    
    return entries.filter(entry => {
      const statusMatch = filterStatus === 'all' || (filterStatus === 'paid' ? entry.isPaid : !entry.isPaid);
      const searchMatch = entry.name.toLowerCase().includes(searchTerm.toLowerCase());
      const dueDate = new Date(entry.dueDate + "T00:00:00");
      let timeMatch = true;
      if (timeFilter === 'week') timeMatch = dueDate >= startOfWeek && dueDate <= endOfWeek;
      if (timeFilter === 'month') timeMatch = dueDate.getMonth() === new Date().getMonth() && dueDate.getFullYear() === new Date().getFullYear();
      if (timeFilter === 'specific_month') timeMatch = dueDate.getMonth() + 1 === selectedFilterMonth && dueDate.getFullYear() === selectedFilterYear;
      
      return statusMatch && searchMatch && timeMatch;
    });
  }, [entries, filterStatus, searchTerm, timeFilter, selectedFilterMonth, selectedFilterYear]);

  const { totalVisible, totalPaid, totalPending } = useMemo(() => ({
    totalVisible: filteredEntries.reduce((sum, e) => sum + e.amount, 0),
    totalPaid: filteredEntries.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0),
    totalPending: filteredEntries.filter(e => !e.isPaid).reduce((sum, e) => sum + e.amount, 0),
  }), [filteredEntries]);

  const pieChartData: ChartData<'pie'> = useMemo(() => {
    const monthlyData = entries.filter(e => new Date(e.dueDate).getMonth() === new Date().getMonth());
    return {
        labels: ['Pendentes no Mês', 'Pagas no Mês'],
        datasets: [{
            data: [
                monthlyData.filter(e => !e.isPaid).reduce((sum, e) => sum + e.amount, 0),
                monthlyData.filter(e => e.isPaid).reduce((sum, e) => sum + e.amount, 0)
            ],
            backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(34, 197, 94, 0.7)'],
            borderColor: ['rgba(239, 68, 68, 1)', 'rgba(34, 197, 94, 1)'],
        }]
    };
  }, [entries]);

  if (pageIsLoading) {
    return <div className="p-6 flex justify-center items-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-6 text-gray-300">
       <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center">
          <BanknotesIcon className="h-8 w-8 text-yellow-500 mr-3" />
          <h2 className="text-2xl font-semibold text-white">Contas a Pagar</h2>
        </div>
        <Button onClick={openModalForNew} variant="primary" iconLeft={<PlusIcon className="w-5 h-5"/>}>
          Adicionar Nova Conta
        </Button>
      </div>
        {/* Main Content */}
        <div className="bg-[#1d1d1d] shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-[#282828]">
              <tr>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-400 uppercase w-16">Paga?</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nome da Conta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Vencimento</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Valor (R$)</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-gray-700">
              {filteredEntries.map(entry => (
                <tr key={entry.id} className={`${entry.isPaid ? 'bg-green-900/20' : 'hover:bg-gray-800'}`}>
                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    <Input type="checkbox" checked={entry.isPaid} onChange={() => handleTogglePaid(entry)} className="form-checkbox h-5 w-5" />
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${entry.isPaid ? 'text-gray-500 line-through' : 'text-white'}`}>{entry.name}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${entry.isPaid ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{new Date(entry.dueDate + "T00:00:00").toLocaleDateString('pt-BR')}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${entry.isPaid ? 'text-gray-500 line-through' : 'text-yellow-400'}`}>{formatCurrency(entry.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                    <Button onClick={() => openModalForEdit(entry)} variant="secondary" size="xs" title="Editar"><PencilIcon className="w-4 h-4" /></Button>
                    <Button onClick={() => handleDeleteEntry(entry.id)} variant="danger" size="xs" title="Excluir" className="ml-2"><TrashIcon className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1d1d1d] p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto text-gray-300">
             <h3 className="text-xl font-semibold mb-6 text-white">{editingEntry ? 'Editar Conta' : 'Adicionar Conta'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Nome da Conta/Dívida" name="name" value={currentFormData.name} onChange={handleInputChange} required />
              <Input label={editingEntry || currentFormData.parcelType === 'none' ? "Valor" : "Valor Total"} name="totalAmount" type="number" step="0.01" value={currentFormData.totalAmount || ''} onChange={handleInputChange} required />
              <Input label={editingEntry || currentFormData.parcelType === 'none' ? "Vencimento" : "Venc. da 1ª Parcela"} name="dueDate" type="date" value={currentFormData.dueDate} onChange={handleInputChange} required />
              <Textarea label="Observações" name="notes" value={currentFormData.notes} onChange={handleInputChange} rows={2} />
              {!editingEntry && (
                <>
                  <Select label="Parcelamento" name="parcelType" options={[{ value: 'none', label: 'Pagamento Único' }, { value: 'weekly', label: 'Semanal' }, { value: 'monthly', label: 'Mensal' }]} value={currentFormData.parcelType} onChange={handleInputChange} />
                  {currentFormData.parcelType !== 'none' && <Input label="Nº de Parcelas" name="numberOfInstallments" type="number" min="2" step="1" value={currentFormData.numberOfInstallments > 1 ? currentFormData.numberOfInstallments : ''} onChange={handleInputChange} required />}
                </>
              )}
               <div className="flex items-center space-x-2 pt-2">
                 <Input id="isPaid" name="isPaid" type="checkbox" checked={currentFormData.isPaid} onChange={handleInputChange} />
                 <label htmlFor="isPaid">Marcar como Paga?</label>
               </div>
              <div className="flex justify-end space-x-3 pt-6">
                <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPayablePage;
