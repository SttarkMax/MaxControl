import React from 'react';
import { Quote } from '../types';
import Button from './common/Button';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import { translateQuoteStatus, formatCurrency } from '../utils';

interface GlobalQuoteHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: Quote[]; // Expects pre-filtered quotes
  onViewDetails: (quote: Quote) => void;
  modalTitle: string; // New prop for dynamic title
}

const GlobalQuoteHistoryModal: React.FC<GlobalQuoteHistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  quotes, 
  onViewDetails,
  modalTitle 
}) => {
  if (!isOpen) {
    return null;
  }

  // Quotes are expected to be pre-filtered by the caller.
  // Sorting is still good to have.
  const sortedQuotes = [...quotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 overflow-y-auto h-full w-full z-[70] flex items-center justify-center p-4">
      <div className="bg-black p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] text-white border border-[#282828] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <ArchiveBoxIcon className="h-7 w-7 text-yellow-500 mr-3" />
            <h3 className="text-xl md:text-2xl font-semibold text-white">{modalTitle}</h3>
          </div>
          <Button onClick={onClose} variant="secondary" size="sm">&times; Fechar</Button>
        </div>

        {sortedQuotes.length === 0 ? (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-gray-400 text-lg">Nenhum item encontrado para exibir.</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-grow">
            <ul className="space-y-3">
              {sortedQuotes.map(quote => (
                <li key={quote.id} className="p-4 border border-[#282828] bg-[#1d1d1d] rounded-md hover:bg-[#3a3a3a] transition-colors duration-150">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div className="mb-2 sm:mb-0">
                      <p className="font-semibold text-yellow-400 text-lg">{quote.quoteNumber}</p>
                      <p className="text-sm text-white">Cliente: {quote.clientName}</p>
                    </div>
                    <div className="flex flex-col sm:items-end items-start mb-2 sm:mb-0">
                      <p className="text-sm text-gray-300">Data: {new Date(quote.createdAt).toLocaleDateString('pt-BR')}</p>
                      <p className="text-sm text-gray-200">Total: <span className="font-medium">{formatCurrency(quote.totalCash)}</span></p>
                    </div>
                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                       <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                            quote.status === 'accepted' ? 'bg-green-500 text-white' 
                            : quote.status === 'draft' ? 'bg-yellow-600 text-black'
                            : 'bg-gray-700 text-white'
                          }`}>{translateQuoteStatus(quote.status)}</span>
                      <Button variant="outline" size="sm" onClick={() => onViewDetails(quote)}>
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
         <div className="mt-6 text-right border-t border-[#282828] pt-4">
            <Button onClick={onClose} variant="primary">Fechar Histórico</Button>
        </div>
      </div>
    </div>
  );
};

export default GlobalQuoteHistoryModal;