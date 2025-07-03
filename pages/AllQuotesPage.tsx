import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Quote } from '../types';
import Button from '../components/common/Button';
import DocumentTextIcon from '../components/icons/DocumentTextIcon';
import PlusIcon from '../components/icons/PlusIcon';
import { translateQuoteStatus, formatCurrency, apiGetQuotes } from '../utils';
import Spinner from '../components/common/Spinner';

interface AllQuotesPageProps {
  openGlobalViewDetailsModal: (quote: Quote) => void;
}

const AllQuotesPage: React.FC<AllQuotesPageProps> = ({ openGlobalViewDetailsModal }) => {
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuotes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiGetQuotes();
        const sortedQuotes = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllQuotes(sortedQuotes);
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar orçamentos.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuotes();
  }, []);

  const getStatusColorClass = (status: Quote['status']): string => {
    switch (status) {
      case 'draft': return 'bg-yellow-600 text-black';
      case 'sent': return 'bg-blue-600 text-white';
      case 'accepted': case 'converted_to_order': return 'bg-green-600 text-white';
      case 'rejected': case 'cancelled': return 'bg-red-600 text-white';
      default: return 'bg-gray-600 text-gray-200';
    }
  };
  
  if (isLoading) {
    return <div className="p-6 text-center"><Spinner size="lg" /></div>;
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

      {error && <div className="p-4 text-center text-red-500 bg-red-900/20 rounded-md mb-4">{error}</div>}

      {!isLoading && allQuotes.length === 0 ? (
        <div className="text-center py-10 bg-gray-800 shadow-xl rounded-lg">
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
        <div className="bg-gray-800 shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Número</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Data Criação</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Vendedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Valor (À Vista)</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {allQuotes.map(quote => (
                <tr key={quote.id} className="hover:bg-gray-700/50">
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
                    <Button 
                      onClick={() => openGlobalViewDetailsModal(quote)}
                      variant="outline" 
                      size="sm"
                    >
                      Ver Detalhes
                    </Button>
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