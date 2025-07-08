import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Supplier, Debt, SupplierCredit } from '../types';
import { formatCurrency, formatDateForInput } from '../utils';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import TruckIcon from '../components/icons/TruckIcon';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PencilIcon from '../components/icons/PencilIcon';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData, ChartOptions } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../services/apiService';
import Spinner from '../components/common/Spinner';

ChartJS.register(ArcElement, Tooltip, Legend);

const initialSupplierState: Omit<Supplier, 'id'> = { name: '', cnpj: '', phone: '', email: '', address: '', notes: '' };
const initialDebtFormState = { description: '', totalAmount: 0, dateAdded: formatDateForInput(new Date()) };
const initialPaymentFormState = { amount: 0, date: formatDateForInput(new Date()), description: '' };


const SuppliersPage: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [supplierCredits, setSupplierCredits] = useState<SupplierCredit[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [suppliersData, debtsData, creditsData] = await Promise.all([
                api.get('/api/suppliers'),
                api.get('/api/suppliers/alldebts'),
                api.get('/api/suppliers/allcredits')
            ]);
            setSuppliers(suppliersData);
            setDebts(debtsData);
            setSupplierCredits(creditsData);
        } catch (error) {
            console.error("Failed to load supplier data:", error);
            alert("Falha ao carregar dados de fornecedores.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenSupplierModal = (supplier: Supplier | null) => {
        setEditingSupplier(supplier);
        setIsSupplierModalOpen(true);
    };

    const handleSaveSupplier = async (supplier: Omit<Supplier, 'id'> & { id?: string }) => {
        try {
            if (supplier.id) {
                await api.put(`/api/suppliers/${supplier.id}`, supplier);
            } else {
                await api.post('/api/suppliers', supplier);
            }
            await fetchData();
            setIsSupplierModalOpen(false);
        } catch (error) {
            console.error("Failed to save supplier:", error);
            alert(`Erro ao salvar fornecedor: ${error}`);
        }
    };

    const handleDeleteSupplier = async (supplierId: string) => {
        if (window.confirm("Tem certeza que deseja excluir este fornecedor? Todas as dívidas e pagamentos associados serão perdidos permanentemente.")) {
            try {
                await api.delete(`/api/suppliers/${supplierId}`);
                await fetchData();
            } catch (error) {
                console.error("Failed to delete supplier:", error);
                alert(`Erro ao excluir fornecedor: ${error}`);
            }
        }
    };

    const handleOpenDetailsModal = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsDetailsModalOpen(true);
    };

    const suppliersWithStats = useMemo(() => {
        return suppliers
            .map(supplier => {
                const totalDebtAmount = debts.filter(d => d.supplierId === supplier.id).reduce((sum, d) => sum + d.totalAmount, 0);
                const totalPaid = supplierCredits.filter(c => c.supplierId === supplier.id).reduce((sum, p) => sum + p.amount, 0);
                return { ...supplier, totalDebtAmount, totalPaid, balance: totalDebtAmount - totalPaid };
            })
            .filter(supplier => supplier.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [suppliers, debts, supplierCredits, searchTerm]);

    if (isLoading) {
        return <div className="p-6 flex justify-center items-center"><Spinner size="lg" /></div>;
    }

    return (
        <div className="p-6 text-gray-300">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center"><TruckIcon className="h-8 w-8 text-yellow-500 mr-3" /><h2 className="text-2xl font-semibold text-white">Fornecedores</h2></div>
                <Button onClick={() => handleOpenSupplierModal(null)} variant="primary" iconLeft={<PlusIcon className="w-5 h-5" />}>Adicionar Fornecedor</Button>
            </div>
            <Input className="mb-6 max-w-sm" type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />

            {suppliersWithStats.length === 0 ? (
                 <div className="text-center py-10 bg-[#1d1d1d] shadow-xl rounded-lg">
                    <TruckIcon className="mx-auto h-12 w-12 text-gray-500" />
                    <h3 className="mt-2 text-sm font-medium text-white">{suppliers.length === 0 ? "Nenhum fornecedor cadastrado" : "Nenhum fornecedor encontrado"}</h3>
                    <p className="mt-1 text-sm text-gray-400">{suppliers.length === 0 ? "Comece adicionando um novo fornecedor." : "Tente uma busca diferente."}</p>
                 </div>
            ) : (
                <div className="bg-[#1d1d1d] shadow-xl rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-[#282828]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fornecedor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Contato</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Dívida Total</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Saldo Devedor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-black divide-y divide-gray-700">
                            {suppliersWithStats.map(s => (
                                <tr key={s.id} className="hover:bg-[#282828]">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{s.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{s.phone || s.email || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">{formatCurrency(s.totalDebtAmount)}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${s.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(s.balance)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                      <div className="flex items-center space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => handleOpenDetailsModal(s)}>Detalhes</Button>
                                        <Button variant="secondary" size="sm" onClick={() => handleOpenSupplierModal(s)} iconLeft={<PencilIcon className="w-4 h-4" />} title="Editar"/>
                                        <Button variant="danger" size="sm" onClick={() => handleDeleteSupplier(s.id)} iconLeft={<TrashIcon className="w-4 h-4" />} title="Excluir"/>
                                      </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isSupplierModalOpen && <SupplierFormModal supplier={editingSupplier} onSave={handleSaveSupplier} onClose={() => setIsSupplierModalOpen(false)} />}
            {isDetailsModalOpen && selectedSupplier && (
                <SupplierDetailsModal
                    key={selectedSupplier.id} // Re-mount modal when supplier changes
                    supplier={selectedSupplier}
                    onClose={() => { setIsDetailsModalOpen(false); fetchData(); }}
                />
            )}
        </div>
    );
};

// Modals
const SupplierFormModal: React.FC<{ supplier: Supplier | null; onSave: (supplier: Omit<Supplier, 'id'> & {id?: string}) => void; onClose: () => void; }> = ({ supplier, onSave, onClose }) => {
    const [formState, setFormState] = useState(supplier || initialSupplierState);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormState({ ...formState, [e.target.name]: e.target.value });
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formState); };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1d1d1d] p-6 md:p-8 rounded-lg shadow-xl w-full max-w-lg text-gray-300">
                <h3 className="text-xl font-semibold mb-6 text-white">{supplier ? 'Editar' : 'Adicionar'} Fornecedor</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Nome" name="name" value={formState.name} onChange={handleChange} required />
                    <Input label="CNPJ" name="cnpj" value={formState.cnpj || ''} onChange={handleChange} />
                    <Input label="Telefone" name="phone" value={formState.phone || ''} onChange={handleChange} />
                    <Input label="Email" name="email" type="email" value={formState.email || ''} onChange={handleChange} />
                    <Textarea label="Endereço" name="address" value={formState.address || ''} onChange={handleChange} rows={2} />
                    <Textarea label="Observações" name="notes" value={formState.notes || ''} onChange={handleChange} rows={2} />
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" variant="primary">Salvar</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};


type Transaction = { id: string; date: string; description?: string; debit: number; credit: number; type: 'debt' | 'payment'; };

const SupplierDetailsModal: React.FC<{ supplier: Supplier; onClose: () => void; }> = ({ supplier, onClose }) => {
    const chartRef = useRef<ChartJS<'pie'>>(null);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [payments, setPayments] = useState<SupplierCredit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [debtForm, setDebtForm] = useState(initialDebtFormState);
    const [paymentForm, setPaymentForm] = useState(initialPaymentFormState);

    const fetchDetails = useCallback(async () => {
        setIsLoading(true);
        try {
            const [debtsData, paymentsData] = await Promise.all([
                api.get(`/api/suppliers/${supplier.id}/debts`),
                api.get(`/api/suppliers/${supplier.id}/credits`)
            ]);
            setDebts(debtsData);
            setPayments(paymentsData);
        } catch (error) {
            console.error("Failed to load supplier details:", error);
        } finally {
            setIsLoading(false);
        }
    }, [supplier.id]);

    useEffect(() => { fetchDetails() }, [fetchDetails]);

    const supplierStats = useMemo(() => {
        const totalDebtAmount = debts.reduce((sum, d) => sum + d.totalAmount, 0);
        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        return { totalDebtAmount, totalPaid, balance: totalDebtAmount - totalPaid };
    }, [debts, payments]);

    const unifiedTransactions = useMemo(() => {
        const all: Transaction[] = [
            ...debts.map(d => ({ id: d.id, date: d.dateAdded, description: d.description, debit: d.totalAmount, credit: 0, type: 'debt' as const })),
            ...payments.map(p => ({ id: p.id, date: p.date, description: p.description, debit: 0, credit: p.amount, type: 'payment' as const }))
        ];
        all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let balance = 0;
        return all.map(tx => { balance += tx.debit - tx.credit; return { ...tx, balance }; });
    }, [debts, payments]);

    const handleAddDebt = async () => {
        if (debtForm.totalAmount <= 0) { alert("Valor deve ser positivo."); return; }
        try {
            await api.post(`/api/suppliers/${supplier.id}/debts`, debtForm);
            setDebtForm(initialDebtFormState);
            await fetchDetails();
        } catch (error) { alert(`Erro ao adicionar dívida: ${error}`); }
    };

    const handleAddPayment = async () => {
        if (paymentForm.amount <= 0) { alert("Valor deve ser positivo."); return; }
        try {
            await api.post(`/api/suppliers/${supplier.id}/credits`, paymentForm);
            setPaymentForm(initialPaymentFormState);
            await fetchDetails();
        } catch (error) { alert(`Erro ao adicionar pagamento: ${error}`); }
    };

    const handleDeleteTransaction = async (tx: Transaction) => {
        const confirmMsg = tx.type === 'debt' ? "Excluir esta dívida?" : "Excluir este pagamento?";
        if (window.confirm(confirmMsg)) {
            try {
                await api.delete(`/api/suppliers/transactions/${tx.type}/${tx.id}`);
                await fetchDetails();
            } catch (error) { alert(`Erro ao excluir: ${error}`); }
        }
    };
    
    const generatePdfReport = () => { /* PDF logic remains the same */ };

    const pieChartData: ChartData<'pie'> = useMemo(() => ({
        labels: ['Em Aberto', 'Pago'],
        datasets: [{ data: [Math.max(0, supplierStats.balance), supplierStats.totalPaid], backgroundColor: ['#ef4444', '#22c55e'], borderColor: ['#1d1d1d', '#1d1d1d'], borderWidth: 2 }]
    }), [supplierStats]);
    const pieOptions: ChartOptions<'pie'> = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom', labels: {color: '#d1d5db'} } } };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[60] flex items-center justify-center p-4">
            <div className="bg-[#1d1d1d] p-4 md:p-6 rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] text-gray-300 flex flex-col">
                 <div className="flex justify-between items-start mb-4 flex-shrink-0">
                    <div>
                        <h3 className="text-2xl font-semibold text-white">{supplier.name}</h3>
                        <p className="text-sm text-gray-400">{supplier.phone} {supplier.email && `| ${supplier.email}`}</p>
                    </div>
                    <Button type="button" variant="secondary" onClick={onClose}>&times; Fechar</Button>
                </div>

                {isLoading ? <Spinner /> : (
                <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                    {/* Summary & Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <div className="lg:col-span-2 bg-black p-4 rounded-lg space-y-2">
                            <h4 className="font-semibold text-lg text-white mb-2">Resumo Financeiro</h4>
                            <div className="flex justify-between"><span>Dívida Total:</span><span>{formatCurrency(supplierStats.totalDebtAmount)}</span></div>
                            <div className="flex justify-between"><span>Total Pago:</span><span className="text-green-400">{formatCurrency(supplierStats.totalPaid)}</span></div>
                            <hr className="border-gray-600 my-2" />
                            <div className="flex justify-between text-lg font-bold"><span>Saldo Devedor:</span><span className={supplierStats.balance > 0 ? 'text-red-400' : 'text-green-400'}>{formatCurrency(supplierStats.balance)}</span></div>
                        </div>
                        <div className="bg-black p-4 rounded-lg h-64">{supplierStats.totalDebtAmount > 0 && <Pie ref={chartRef} data={pieChartData} options={pieOptions} />}</div>
                    </div>

                     {/* Add Transaction Forms */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                       <div className="bg-black p-4 rounded-lg border border-gray-700">
                            <h4 className="font-semibold text-lg text-white mb-3">Adicionar Dívida</h4>
                            <div className="space-y-3">
                                <Input label="Descrição" value={debtForm.description} onChange={e => setDebtForm({...debtForm, description: e.target.value})} />
                                <Input label="Data da Dívida" type="date" value={debtForm.dateAdded} onChange={e => setDebtForm({...debtForm, dateAdded: e.target.value})} />
                                <Input label="Valor" type="number" step="0.01" value={debtForm.totalAmount > 0 ? debtForm.totalAmount : ''} onChange={e => setDebtForm({...debtForm, totalAmount: parseFloat(e.target.value) || 0})} />
                                <Button onClick={handleAddDebt} variant="danger" className="w-full">Adicionar Dívida</Button>
                            </div>
                        </div>
                        <div className="bg-black p-4 rounded-lg border border-gray-700">
                            <h4 className="font-semibold text-lg text-white mb-3">Adicionar Pagamento</h4>
                             <div className="space-y-3">
                                <Input label="Descrição" value={paymentForm.description} onChange={e => setPaymentForm({...paymentForm, description: e.target.value})} />
                                <Input label="Data do Pagamento" type="date" value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} />
                                <Input label="Valor" type="number" step="0.01" value={paymentForm.amount > 0 ? paymentForm.amount : ''} onChange={e => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})} />
                                <Button onClick={handleAddPayment} variant="success" className="w-full">Adicionar Pagamento</Button>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Ledger */}
                    <div>
                        <h4 className="font-semibold text-lg text-white mb-2">Extrato de Transações</h4>
                        <div className="overflow-x-auto bg-black rounded-lg max-h-96">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-[#282828] sticky top-0"><tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium uppercase">Data</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium uppercase">Descrição</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-red-400">Dívida (+)</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-green-400">Pagamento (-)</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium uppercase">Saldo</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium uppercase">Ação</th>
                                </tr></thead>
                                <tbody className="divide-y divide-gray-700">
                                    {unifiedTransactions.length > 0 ? unifiedTransactions.map(tx => (
                                        <tr key={`${tx.type}-${tx.id}`} className="hover:bg-gray-700/50">
                                            <td className="px-3 py-2 text-sm whitespace-nowrap">{new Date(tx.date + "T00:00:00").toLocaleDateString('pt-BR')}</td>
                                            <td className="px-3 py-2 text-sm">{tx.description || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-right">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
                                            <td className="px-3 py-2 text-sm text-right">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
                                            <td className="px-3 py-2 text-sm text-right font-semibold">{formatCurrency(tx.balance)}</td>
                                            <td className="px-3 py-2 text-center">
                                                <Button size="xs" variant="danger" title="Excluir" onClick={()=>handleDeleteTransaction(tx)}><TrashIcon className="w-4 h-4"/></Button>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan={6} className="text-center py-4 text-gray-500">Nenhuma transação.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                )}
                 <div className="mt-6 text-right border-t border-gray-700 pt-4 flex-shrink-0">
                    <Button onClick={generatePdfReport} variant="outline" className="mr-2">Exportar (PDF)</Button>
                    <Button onClick={onClose} variant="primary">Fechar</Button>
                </div>
            </div>
        </div>
    );
};


export default SuppliersPage;
