import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Quote } from '../types';
import Button from '../components/common/Button';
import DocumentTextIcon from '../components/icons/DocumentTextIcon';
import PlusIcon from '../components/icons/PlusIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import { translateQuoteStatus, formatCurrency } from '../utils';
import { api } from '../services/apiService';
import Spinner from '../components/common/Spinner';

interface AllQuotesPageProps {
  openGlobalViewDetailsModal: (quote: Quote) => void;
}

const AllQuotesPage: React.FC<AllQuotesPageProps> = ({ openGlobalViewDetailsModal }) => {
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchQuotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/api/quotes');
      // The API should ideally return sorted data, but sorting client-side is a good fallback.
      const sorted = data.sort((a: Quote, b: Quote) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllQuotes(sorted);
    } catch (error) {
      console.error("Failed to fetch quotes:", error);
      alert("Falha ao carregar orçamentos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const handleDeleteQuote = async (quoteId: string, quoteNumber: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o orçamento ${quoteNumber}? Esta ação não pode ser desfeita.`)) {
      try {
        await api.delete(`/api/quotes/${quoteId}`);
        alert(`Orçamento ${quoteNumber} excluído com sucesso.`);
        fetchQuotes(); // Refresh the list
      } catch (error) {
        console.error("Failed to delete quote:", error);
        alert(`Erro ao excluir orçamento: ${error}`);
      }
    }
  };

  const getStatusColorClass = (status: Quote['status']): string => {
    switch (status) {
      case 'draft': return 'bg-yellow-600 text-black';
      case 'sent': return 'bg-blue-500 text-white';
      case 'accepted':
      case 'converted_to_order': return 'bg-green-600 text-white';
      case 'rejected':
      case 'cancelled': return 'bg-red-600 text-white';
      default: return 'bg-gray-600 text-gray-200';
    }
  };

  if (isLoading) {
    return <div className="p-6 flex justify-center items-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-6 text-gray-300">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <DocumentTextIcon className="h-8 w-8 text-yellow-500 mr-3" />
          <h2 className="text-2xl font-semibold text-white">Todos os Orçamentos</h2>
        </div>
        <Button onClick={() => navigate('/quotes/new')} variant="primary" iconLeft={<PlusIcon className="w-5 h-5"/>}>
          Criar Novo Orçamento
        </Button>
      </div>

      {allQuotes.length === 0 ? (
        <div className="text-center py-10 bg-[#1d1d1d] shadow-xl rounded-lg">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-white">Nenhum orçamento encontrado</h3>
          <p className="mt-1 text-sm text-gray-400">Comece criando um novo orçamento.</p>
          <div className="mt-6">
            <Button onClick={() => navigate('/quotes/new')} variant="primary" iconLeft={<PlusIcon className="w-4 h-4"/>}>
              Criar Novo Orçamento
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-[#1d1d1d] shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-[#282828]">
            <thead className="bg-[#282828]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Número</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Data Criação</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Vendedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Valor (Base)</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-[#282828]">
              {allQuotes.map(quote => (
                <tr key={quote.id} className="hover:bg-[#282828]">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-yellow-400">{quote.quoteNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{quote.clientName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(quote.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{quote.salespersonFullName || quote.salespersonUsername}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${getStatusColorClass(quote.status)}`}>
                      {translateQuoteStatus(quote.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">{formatCurrency(quote.totalCash)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        onClick={() => openGlobalViewDetailsModal(quote)}
                        variant="secondary"
                        size="xs"
                        title="Ver Detalhes"
                      >
                        Detalhes
                      </Button>
                       <Button
                        onClick={() => navigate(`/quotes/edit/${quote.id}`)}
                        variant="secondary"
                        size="xs"
                        title="Editar"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteQuote(quote.id, quote.quoteNumber)}
                        variant="danger"
                        size="xs"
                        title="Excluir"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllQuotesPage;
