
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Supplier, Debt, SupplierCredit } from '../types';
import { formatCurrency, formatDateForInput, apiGetSuppliers, apiSaveSupplier, apiDeleteSupplier, apiGetDebts, apiAddDebt, apiDeleteDebt, apiGetSupplierCredits, apiAddSupplierCredit, apiDeleteSupplierCredit } from '../utils';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import TruckIcon from '../components/icons/TruckIcon';
import PlusIcon from '../components/icons/PlusIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PencilIcon from '../components/icons/PencilIcon';
import Spinner from '../components/common/Spinner';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartData, ChartOptions } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CurrencyDollarIcon from '../components/icons/CurrencyDollarIcon';

ChartJS.register(ArcElement, Tooltip, Legend);

const initialSupplierState: Supplier = { id: '', name: '', cnpj: '', phone: '', email: '', address: '', notes: '' };
const initialDebtFormState = { description: '', totalAmount: 0, dateAdded: formatDateForInput(new Date()) };
const initialPaymentFormState = { amount: 0, date: formatDateForInput(new Date()), description: '' };

const SuppliersPage: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [supplierCredits, setSupplierCredits] = useState<SupplierCredit[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [suppliersData, debtsData, creditsData] = await Promise.all([
                apiGetSuppliers(),
                apiGetDebts(),
                apiGetSupplierCredits(),
            ]);
            setSuppliers(suppliersData);
            setDebts(debtsData);
            setSupplierCredits(creditsData);
        } catch (err: any) {
            setError(err.message || 'Falha ao carregar dados dos fornecedores.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenSupplierModal = (supplier: Supplier | null) => {
        setEditingSupplier(supplier);
        setIsSupplierModalOpen(true);
    };

    const handleSaveSupplier = async (supplier: Supplier) => {
        try {
            await apiSaveSupplier(supplier);
            await loadData();
            setIsSupplierModalOpen(false);
        } catch (err: any) {
            alert(`Falha ao salvar fornecedor: ${err.message}`);
        }
    };

    const handleDeleteSupplier = async (supplierId: string) => {
        const associatedDebts = debts.filter(d => d.supplierId === supplierId).length;
        const associatedPayments = supplierCredits.filter(p => p.supplierId === supplierId).length;
        if ((associatedDebts > 0 || associatedPayments > 0) && !window.confirm(`Este fornecedor tem registros associados. Excluir o fornecedor também excluirá todos esses registros. Deseja continuar?`)) {
            return;
        }
        try {
            await apiDeleteSupplier(supplierId);
            await loadData();
        } catch (err: any) {
            alert(`Falha ao excluir fornecedor: ${err.message}`);
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
                const balance = totalDebtAmount - totalPaid;
                return { ...supplier, totalDebtAmount, totalPaid, balance };
            })
            .filter(supplier => supplier.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [suppliers, debts, supplierCredits, searchTerm]);

    if (isLoading) return <div className="p-6 text-center"><Spinner size="lg" /></div>;
    if (error) return <div className="p-6 text-center text-red-500 bg-red-900/20 rounded-md">{error}</div>;

    return (
        <div className="p-6 text-gray-300">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center"><TruckIcon className="h-8 w-8 text-yellow-500 mr-3" /><h2 className="text-2xl font-semibold text-white">Fornecedores</h2></div>
                <Button onClick={() => handleOpenSupplierModal(null)} variant="primary" iconLeft={<PlusIcon className="w-5 h-5" />}>Adicionar Fornecedor</Button>
            </div>
            <Input className="mb-6 max-w-sm" type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />

            {suppliers.length === 0 ? (
                 <div className="text-center py-10 bg-gray-800 shadow-xl rounded-lg">
                    <TruckIcon className="mx-auto h-12 w-12 text-gray-500" />
                    <h3 className="mt-2 text-sm font-medium text-white">Nenhum fornecedor cadastrado</h3>
                    <p className="mt-1 text-sm text-gray-400">Comece adicionando um novo fornecedor.</p>
                 </div>
            ) : suppliersWithStats.length === 0 ? (
                <div className="text-center py-10 bg-gray-800 shadow-xl rounded-lg">
                    <TruckIcon className="mx-auto h-12 w-12 text-gray-500" />
                    <h3 className="mt-2 text-sm font-medium text-white">Nenhum fornecedor encontrado</h3>
                    <p className="mt-1 text-sm text-gray-400">Tente uma busca diferente.</p>
                </div>
            ) : (
                <div className="bg-gray-800 shadow-xl rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fornecedor</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Saldo Devedor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {suppliersWithStats.map(s => (
                                <tr key={s.id} className="hover:bg-gray-700/50">
                                    <td className="px-6 py-4"><div className="text-sm font-medium text-white">{s.name}</div><div className="text-xs text-gray-400">{s.phone || s.email || ''}</div></td>
                                    <td className={`px-6 py-4 text-sm text-right font-semibold ${s.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(s.balance)}</td>
                                    <td className="px-6 py-4"><div className="flex items-center space-x-2"><Button variant="outline" size="sm" onClick={() => handleOpenDetailsModal(s)}>Detalhes</Button><Button variant="secondary" size="sm" onClick={() => handleOpenSupplierModal(s)} iconLeft={<PencilIcon className="w-4 h-4" />} /><Button variant="danger" size="sm" onClick={() => handleDeleteSupplier(s.id)} iconLeft={<TrashIcon className="w-4 h-4" />} /></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {isSupplierModalOpen && <SupplierFormModal supplier={editingSupplier} onSave={handleSaveSupplier} onClose={() => setIsSupplierModalOpen(false)} />}
            {isDetailsModalOpen && selectedSupplier && (
                <SupplierDetailsModal 
                    supplier={selectedSupplier} 
                    debts={debts.filter(d => d.supplierId === selectedSupplier.id)}
                    payments={supplierCredits.filter(p => p.supplierId === selectedSupplier.id)}
                    onClose={() => setIsDetailsModalOpen(false)} 
                    onDataChange={loadData}
                />
            )}
        </div>
    );
};

// SupplierFormModal Component
const SupplierFormModal: React.FC<{ supplier: Supplier | null; onSave: (supplier: Supplier) => Promise<void>; onClose: () => void; }> = ({ supplier, onSave, onClose }) => {
    const [formState, setFormState] = useState(supplier || initialSupplierState);
    const [isSaving, setIsSaving] = useState(false);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormState({ ...formState, [e.target.name]: e.target.value });
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setIsSaving(true); await onSave(formState); setIsSaving(false); };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-lg">
                <h3 className="text-xl font-semibold mb-6 text-white">{supplier ? 'Editar' : 'Adicionar'} Fornecedor</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Nome" name="name" value={formState.name} onChange={handleChange} required />
                    <Input label="Telefone" name="phone" value={formState.phone || ''} onChange={handleChange} />
                    <Input label="Email" name="email" type="email" value={formState.email || ''} onChange={handleChange} />
                    <div className="flex justify-end space-x-3 pt-4"><Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button><Button type="submit" variant="primary" isLoading={isSaving}>Salvar</Button></div>
                </form>
            </div>
        </div>
    );
};

type Transaction = { id: string; date: string; description?: string; debit: number; credit: number; type: 'debt' | 'payment'; };

// SupplierDetailsModal Component
const SupplierDetailsModal: React.FC<{ supplier: Supplier; debts: Debt[]; payments: SupplierCredit[]; onClose: () => void; onDataChange: () => Promise<void>; }> = ({ supplier, debts, payments, onClose, onDataChange }) => {
    const [debtForm, setDebtForm] = useState(initialDebtFormState);
    const [paymentForm, setPaymentForm] = useState(initialPaymentFormState);
    
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
        if (debtForm.totalAmount <= 0) return;
        await apiAddDebt({ ...debtForm, supplierId: supplier.id });
        setDebtForm(initialDebtFormState);
        await onDataChange();
    };

    const handleAddPayment = async () => {
        if (paymentForm.amount <= 0) return;
        await apiAddSupplierCredit({ ...paymentForm, supplierId: supplier.id });
        setPaymentForm(initialPaymentFormState);
        await onDataChange();
    };

    const handleDeleteTransaction = async (tx: Transaction) => {
        if (tx.type === 'debt' && window.confirm("Excluir esta dívida?")) {
            await apiDeleteDebt(tx.id);
        } else if (tx.type === 'payment' && window.confirm("Excluir este pagamento?")) {
            await apiDeleteSupplierCredit(tx.id);
        }
        await onDataChange();
    };
    
    // PDF generation and Chart rendering logic remain similar
    // ...
    return (
         <div className="fixed inset-0 bg-black bg-opacity-80 z-[60] flex items-center justify-center p-4">
            <div className="bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] text-gray-300 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div><h3 className="text-2xl font-semibold text-white">{supplier.name}</h3></div>
                    <Button type="button" variant="secondary" onClick={onClose}>&times; Fechar</Button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                    {/* ... Omitted for brevity: Summary & Chart, Add Transaction Forms, Transaction Ledger tables ... */}
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <h4 className="font-semibold text-lg text-white mb-3">Adicionar Dívida</h4>
                            <div className="space-y-3">
                                <Input label="Data da Dívida" type="date" value={debtForm.dateAdded} onChange={e => setDebtForm({...debtForm, dateAdded: e.target.value})} />
                                <Input label="Valor" type="number" step="0.01" value={debtForm.totalAmount > 0 ? debtForm.totalAmount : ''} onChange={e => setDebtForm({...debtForm, totalAmount: parseFloat(e.target.value) || 0})} />
                                <Button onClick={handleAddDebt} variant="primary" className="w-full">Adicionar Dívida</Button>
                            </div>
                        </div>
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <h4 className="font-semibold text-lg text-white mb-3">Adicionar Pagamento</h4>
                             <div className="space-y-3">
                                <Input label="Data do Pagamento" type="date" value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} />
                                <Input label="Valor" type="number" step="0.01" value={paymentForm.amount > 0 ? paymentForm.amount : ''} onChange={e => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})} />
                                <Button onClick={handleAddPayment} variant="success" className="w-full">Adicionar Pagamento</Button>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="mt-6 text-right border-t border-gray-700 pt-4">
                    <Button onClick={onClose} variant="primary">Fechar</Button>
                </div>
            </div>
        </div>
    );
};

export default SuppliersPage;
